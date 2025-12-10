import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper function to verify and get user by wallet address
async function verifyUser(ctx: any, userAddress: string) {
    const user = await ctx.db
        .query("users")
        .withIndex("by_userAddress", (q: any) =>
            q.eq("userAddress", userAddress.toLowerCase())
        )
        .unique();

    if (!user) {
        throw new ConvexError("User not found or not authenticated");
    }

    return user;
}

// Helper to check if users are friends
async function areFriends(
    ctx: any,
    userId1: Id<"users">,
    userId2: Id<"users">
): Promise<boolean> {
    const friendship1 = await ctx.db
        .query("friendships")
        .withIndex("by_users", (q: any) =>
            q.eq("requesterId", userId1).eq("addresseeId", userId2)
        )
        .filter((q: any) => q.eq(q.field("status"), "accepted"))
        .first();

    const friendship2 = await ctx.db
        .query("friendships")
        .withIndex("by_users", (q: any) =>
            q.eq("requesterId", userId2).eq("addresseeId", userId1)
        )
        .filter((q: any) => q.eq(q.field("status"), "accepted"))
        .first();

    return !!(friendship1 || friendship2);
}

// Create a payment request
export const createRequest = mutation({
    args: {
        userAddress: v.string(),
        recipientId: v.id("users"),
        amount: v.string(),
        note: v.optional(v.string()),
        expiresAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const requester = await verifyUser(ctx, args.userAddress);

        if (requester._id === args.recipientId) {
            throw new ConvexError("Cannot request payment from yourself");
        }

        // Get recipient
        const recipient = await ctx.db.get(args.recipientId);
        if (!recipient) {
            throw new ConvexError("Recipient not found");
        }

        // Check recipient's privacy settings
        const recipientPrivacy = recipient.requestPrivacy || "anyone";
        if (recipientPrivacy === "friends_only") {
            const isFriend = await areFriends(ctx, requester._id, args.recipientId);
            if (!isFriend) {
                throw new ConvexError(
                    "This user only accepts payment requests from friends"
                );
            }
        }

        // Validate amount
        const amountNum = parseFloat(args.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            throw new ConvexError("Invalid amount");
        }

        // Validate expiration if provided
        if (args.expiresAt && args.expiresAt <= Date.now()) {
            throw new ConvexError("Expiration date must be in the future");
        }

        // Create the request
        const requestId = await ctx.db.insert("paymentRequests", {
            requesterId: requester._id,
            recipientId: args.recipientId,
            amount: args.amount,
            note: args.note,
            status: "pending",
            expiresAt: args.expiresAt,
        });

        // Create notification for recipient
        await ctx.db.insert("notifications", {
            userId: args.recipientId,
            type: "payment_request",
            isRead: false,
            fromUserId: requester._id,
            paymentRequestId: requestId,
            amount: amountNum,
            message: args.note,
        });

        return requestId;
    },
});

// Decline a payment request
export const declineRequest = mutation({
    args: {
        userAddress: v.string(),
        requestId: v.id("paymentRequests"),
    },
    handler: async (ctx, args) => {
        const user = await verifyUser(ctx, args.userAddress);

        const request = await ctx.db.get(args.requestId);
        if (!request) {
            throw new ConvexError("Payment request not found");
        }

        // Verify user is the recipient
        if (request.recipientId !== user._id) {
            throw new ConvexError("Not authorized to decline this request");
        }

        if (request.status !== "pending") {
            throw new ConvexError("Can only decline pending requests");
        }

        // Update request status
        await ctx.db.patch(args.requestId, {
            status: "declined",
            declinedAt: Date.now(),
        });

        // Create notification for requester
        await ctx.db.insert("notifications", {
            userId: request.requesterId,
            type: "payment_request_declined",
            isRead: false,
            fromUserId: user._id,
            paymentRequestId: args.requestId,
            amount: parseFloat(request.amount),
        });

        // Mark the original request notification as read
        const notification = await ctx.db
            .query("notifications")
            .withIndex("by_user_type", (q: any) =>
                q.eq("userId", user._id).eq("type", "payment_request")
            )
            .filter((q: any) => q.eq(q.field("paymentRequestId"), args.requestId))
            .first();

        if (notification) {
            await ctx.db.patch(notification._id, { isRead: true });
        }

        return true;
    },
});

// Complete a payment request (called after payment is sent)
export const completeRequest = mutation({
    args: {
        userAddress: v.string(),
        requestId: v.id("paymentRequests"),
        paymentId: v.id("payments"),
    },
    handler: async (ctx, args) => {
        const user = await verifyUser(ctx, args.userAddress);

        const request = await ctx.db.get(args.requestId);
        if (!request) {
            throw new ConvexError("Payment request not found");
        }

        // Verify user is the recipient (sender of payment)
        if (request.recipientId !== user._id) {
            throw new ConvexError("Not authorized to complete this request");
        }

        if (request.status !== "pending") {
            throw new ConvexError("Request is not pending");
        }

        // Update request status
        await ctx.db.patch(args.requestId, {
            status: "completed",
            completedAt: Date.now(),
            completedPaymentId: args.paymentId,
        });

        // Create notification for requester
        await ctx.db.insert("notifications", {
            userId: request.requesterId,
            type: "payment_request_completed",
            isRead: false,
            fromUserId: user._id,
            paymentRequestId: args.requestId,
            paymentId: args.paymentId,
            amount: parseFloat(request.amount),
        });

        // Mark the original request notification as read
        const notification = await ctx.db
            .query("notifications")
            .withIndex("by_user_type", (q: any) =>
                q.eq("userId", user._id).eq("type", "payment_request")
            )
            .filter((q: any) => q.eq(q.field("paymentRequestId"), args.requestId))
            .first();

        if (notification) {
            await ctx.db.patch(notification._id, { isRead: true });
        }

        return true;
    },
});

// Get sent payment requests
export const getSentRequests = query({
    args: {
        userId: v.id("users"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 50;

        const requests = await ctx.db
            .query("paymentRequests")
            .withIndex("by_requester", (q) => q.eq("requesterId", args.userId))
            .order("desc")
            .take(limit);

        // Check for expired requests and mark them (read-only check)
        const now = Date.now();
        const processedRequests = requests.map((request) => {
            if (
                request.status === "pending" &&
                request.expiresAt &&
                request.expiresAt <= now
            ) {
                return { ...request, status: "expired" as const };
            }
            return request;
        });

        // Populate recipient data
        const populated = await Promise.all(
            processedRequests.map(async (request) => {
                const recipient = await ctx.db.get(request.recipientId);
                return {
                    ...request,
                    recipient,
                };
            })
        );

        return populated;
    },
});

// Get received payment requests
export const getReceivedRequests = query({
    args: {
        userId: v.id("users"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 50;

        const requests = await ctx.db
            .query("paymentRequests")
            .withIndex("by_recipient", (q) => q.eq("recipientId", args.userId))
            .order("desc")
            .take(limit);

        // Check for expired requests (read-only check)
        const now = Date.now();
        const processedRequests = requests.map((request) => {
            if (
                request.status === "pending" &&
                request.expiresAt &&
                request.expiresAt <= now
            ) {
                return { ...request, status: "expired" as const };
            }
            return request;
        });

        // Populate requester data
        const populated = await Promise.all(
            processedRequests.map(async (request) => {
                const requester = await ctx.db.get(request.requesterId);
                return {
                    ...request,
                    requester,
                };
            })
        );

        return populated;
    },
});

// Get request by ID
export const getRequestById = query({
    args: {
        requestId: v.id("paymentRequests"),
    },
    handler: async (ctx, args) => {
        const request = await ctx.db.get(args.requestId);
        if (!request) return null;

        // Check if expired (read-only check)
        const now = Date.now();
        let processedRequest = request;
        if (
            request.status === "pending" &&
            request.expiresAt &&
            request.expiresAt <= now
        ) {
            processedRequest = { ...request, status: "expired" as const };
        }

        // Populate user data
        const requester = await ctx.db.get(processedRequest.requesterId);
        const recipient = await ctx.db.get(processedRequest.recipientId);

        return {
            ...processedRequest,
            requester,
            recipient,
        };
    },
});

// Check if user can receive requests (for UI validation)
export const canReceiveRequest = query({
    args: {
        currentUserId: v.id("users"),
        targetUserId: v.id("users"),
    },
    handler: async (ctx, args) => {
        if (args.currentUserId === args.targetUserId) {
            return { canReceive: false, reason: "Cannot request from yourself" };
        }

        const targetUser = await ctx.db.get(args.targetUserId);
        if (!targetUser) {
            return { canReceive: false, reason: "User not found" };
        }

        const privacy = targetUser.requestPrivacy || "anyone";

        if (privacy === "friends_only") {
            const isFriend = await areFriends(
                ctx,
                args.currentUserId,
                args.targetUserId
            );
            if (!isFriend) {
                return {
                    canReceive: false,
                    reason: "This user only accepts requests from friends",
                };
            }
        }

        return { canReceive: true };
    },
});

// Mutation to mark expired requests (called when attempting to act on expired request)
export const markRequestExpired = mutation({
    args: {
        requestId: v.id("paymentRequests"),
    },
    handler: async (ctx, args) => {
        const request = await ctx.db.get(args.requestId);
        if (!request) {
            throw new ConvexError("Request not found");
        }

        const now = Date.now();
        if (
            request.status === "pending" &&
            request.expiresAt &&
            request.expiresAt <= now
        ) {
            await ctx.db.patch(args.requestId, { status: "expired" });
            return true;
        }

        return false;
    },
});