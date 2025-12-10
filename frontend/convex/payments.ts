import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper function to verify and get user by wallet address
async function verifyUser(ctx: any, userAddress: string) {
    const user = await ctx.db
        .query("users")
        .withIndex("by_userAddress", (q: any) => q.eq("userAddress", userAddress.toLowerCase()))
        .unique();

    if (!user) {
        throw new ConvexError("User not found or not authenticated");
    }

    return user;
}

// Create a payment record
export const createPayment = mutation({
    args: {
        senderAddress: v.string(),
        recipientAddress: v.string(),
        amount: v.string(),
        note: v.optional(v.string()),
        transactionHash: v.string(),
        // Skip notification when payment is fulfilling a request (to avoid duplicate notifications)
        skipNotification: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        // Verify sender
        const sender = await verifyUser(ctx, args.senderAddress);

        // Check if recipient is a user in the app
        const recipient = await ctx.db
            .query("users")
            .withIndex("by_userAddress", (q) =>
                q.eq("userAddress", args.recipientAddress.toLowerCase())
            )
            .unique();

        // Create payment record
        const paymentId = await ctx.db.insert("payments", {
            senderId: sender._id,
            senderAddress: args.senderAddress.toLowerCase(),
            recipientId: recipient?._id,
            recipientAddress: args.recipientAddress.toLowerCase(),
            amount: args.amount,
            note: args.note,
            transactionHash: args.transactionHash,
            status: "completed",
            timestamp: Date.now(),
        });

        // If recipient is a user, create notification (unless skipped for request fulfillment)
        if (recipient && recipient._id !== sender._id && !args.skipNotification) {
            await ctx.db.insert("notifications", {
                userId: recipient._id,
                type: "payment_received",
                isRead: false,
                fromUserId: sender._id,
                paymentId: paymentId,
                amount: parseFloat(args.amount),
                message: args.note,
            });
        }

        return paymentId;
    },
});

// Get user's sent payment history
export const getSentPayments = query({
    args: {
        userAddress: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_userAddress", (q) => q.eq("userAddress", args.userAddress.toLowerCase()))
            .unique();

        if (!user) return [];

        const limit = args.limit || 50;

        const payments = await ctx.db
            .query("payments")
            .withIndex("by_sender", (q) => q.eq("senderId", user._id))
            .order("desc")
            .take(limit);

        // Populate recipient data
        const populated = await Promise.all(
            payments.map(async (payment) => {
                let recipient = null;
                if (payment.recipientId) {
                    recipient = await ctx.db.get(payment.recipientId);
                }
                return {
                    ...payment,
                    recipient,
                };
            })
        );

        return populated;
    },
});

// Get user's received payment history
export const getReceivedPayments = query({
    args: {
        userAddress: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_userAddress", (q) => q.eq("userAddress", args.userAddress.toLowerCase()))
            .unique();

        if (!user) return [];

        const limit = args.limit || 50;

        const payments = await ctx.db
            .query("payments")
            .withIndex("by_recipient", (q) => q.eq("recipientId", user._id))
            .order("desc")
            .take(limit);

        // Populate sender data
        const populated = await Promise.all(
            payments.map(async (payment) => {
                const sender = await ctx.db.get(payment.senderId);
                return {
                    ...payment,
                    sender,
                };
            })
        );

        return populated;
    },
});

// Get payment by ID
export const getPaymentById = query({
    args: {
        paymentId: v.id("payments"),
    },
    handler: async (ctx, args) => {
        const payment = await ctx.db.get(args.paymentId);
        if (!payment) return null;

        // Populate sender and recipient
        const sender = await ctx.db.get(payment.senderId);
        let recipient = null;
        if (payment.recipientId) {
            recipient = await ctx.db.get(payment.recipientId);
        }

        return {
            ...payment,
            sender,
            recipient,
        };
    },
});

// Check if an address belongs to an app user
export const checkUserByAddress = query({
    args: {
        address: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_userAddress", (q) =>
                q.eq("userAddress", args.address.toLowerCase())
            )
            .unique();

        if (!user) {
            return { exists: false };
        }

        // Get current user to check friendship
        const currentUserAddress = args.address; // We'll need to pass this separately
        // For now, just return user without friendship check in this query
        // Friendship check will be done in searchUsers

        return {
            exists: true,
            user: {
                _id: user._id,
                name: user.name,
                username: user.username,
                userAddress: user.userAddress,
                profileImageUrl: user.profileImageUrl,
                isFriend: false, // Will be determined by searchUsers or client-side
            },
        };
    },
});