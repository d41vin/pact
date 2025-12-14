import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper to verify user
async function verifyUser(ctx: any, userAddress: string) {
    const user = await ctx.db
        .query("users")
        .withIndex("by_userAddress", (q: any) =>
            q.eq("userAddress", userAddress.toLowerCase())
        )
        .unique();
    if (!user) throw new ConvexError("User not found");
    return user;
}

// Generate unique shortId
function generateShortId(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Create payment link
export const createPaymentLink = mutation({
    args: {
        userAddress: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        imageOrEmoji: v.string(),
        imageType: v.union(v.literal("emoji"), v.literal("image")),
        amount: v.string(),
        linkType: v.union(v.literal("single-use"), v.literal("reusable")),
        expiresAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const creator = await verifyUser(ctx, args.userAddress);

        // Validate inputs
        if (!args.title || args.title.trim().length === 0) {
            throw new ConvexError("Title is required");
        }
        if (args.title.length > 100) {
            throw new ConvexError("Title must be 100 characters or less");
        }
        if (args.description && args.description.length > 500) {
            throw new ConvexError("Description must be 500 characters or less");
        }

        const amountNum = parseFloat(args.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            throw new ConvexError("Amount must be greater than 0");
        }

        if (args.expiresAt && args.expiresAt <= Date.now()) {
            throw new ConvexError("Expiry date must be in the future");
        }

        // Generate unique shortId
        let shortId = generateShortId();
        let attempts = 0;
        while (attempts < 10) {
            const existing = await ctx.db
                .query("paymentLinks")
                .withIndex("by_shortId", (q) => q.eq("shortId", shortId))
                .first();
            if (!existing) break;
            shortId = generateShortId();
            attempts++;
        }

        if (attempts >= 10) {
            throw new ConvexError("Failed to generate unique link ID");
        }

        // If image, verify it exists in storage
        if (args.imageType === "image") {
            const url = await ctx.storage.getUrl(args.imageOrEmoji as Id<"_storage">);
            if (!url) {
                throw new ConvexError("Invalid image");
            }
        }

        // Create payment link
        const linkId = await ctx.db.insert("paymentLinks", {
            creatorId: creator._id,
            title: args.title.trim(),
            description: args.description?.trim(),
            imageOrEmoji: args.imageOrEmoji,
            imageType: args.imageType,
            amount: args.amount,
            currency: "MNT",
            linkType: args.linkType,
            status: "active",
            shortId,
            expiresAt: args.expiresAt,
            viewCount: 0,
            paymentCount: 0,
            totalCollected: "0",
        });

        return { paymentLinkId: linkId, shortId };
    },
});

// Get payment link by shortId (public)
export const getPaymentLinkByShortId = query({
    args: { shortId: v.string() },
    handler: async (ctx, args) => {
        const link = await ctx.db
            .query("paymentLinks")
            .withIndex("by_shortId", (q) => q.eq("shortId", args.shortId))
            .first();

        if (!link) return null;

        // Check if expired
        const now = Date.now();
        let status = link.status;
        if (
            link.status === "active" &&
            link.expiresAt &&
            link.expiresAt <= now
        ) {
            status = "expired";
        }

        // Get creator info
        const creator = await ctx.db.get(link.creatorId);

        // Get image URL if applicable
        let imageUrl = link.imageOrEmoji;
        if (link.imageType === "image") {
            const url = await ctx.storage.getUrl(link.imageOrEmoji as Id<"_storage">);
            imageUrl = url || link.imageOrEmoji;
        }

        return {
            ...link,
            status,
            imageUrl,
            creator: creator
                ? {
                    _id: creator._id,
                    name: creator.name,
                    username: creator.username,
                    userAddress: creator.userAddress,
                    profileImageUrl: creator.profileImageUrl,
                }
                : null,
        };
    },
});

// Increment view count
export const incrementViewCount = mutation({
    args: { shortId: v.string() },
    handler: async (ctx, args) => {
        const link = await ctx.db
            .query("paymentLinks")
            .withIndex("by_shortId", (q) => q.eq("shortId", args.shortId))
            .first();

        if (link) {
            await ctx.db.patch(link._id, {
                viewCount: link.viewCount + 1,
            });
        }
    },
});

// Record payment link payment
export const recordPaymentLinkPayment = mutation({
    args: {
        payerAddress: v.string(),
        paymentLinkId: v.id("paymentLinks"),
        transactionHash: v.string(),
        amount: v.string(),
    },
    handler: async (ctx, args) => {
        const link = await ctx.db.get(args.paymentLinkId);
        if (!link) throw new ConvexError("Payment link not found");

        // Verify link is active
        if (link.status !== "active") {
            throw new ConvexError("Payment link is not active");
        }

        // Check not expired
        if (link.expiresAt && link.expiresAt <= Date.now()) {
            throw new ConvexError("Payment link has expired");
        }

        // For single-use, check not already paid
        if (link.linkType === "single-use" && link.paymentCount > 0) {
            throw new ConvexError("This payment link has already been used");
        }

        // Verify amount matches
        if (args.amount !== link.amount) {
            throw new ConvexError("Payment amount does not match link amount");
        }

        // Get payer user (if exists)
        const payerUser = await ctx.db
            .query("users")
            .withIndex("by_userAddress", (q) =>
                q.eq("userAddress", args.payerAddress.toLowerCase())
            )
            .unique();

        // Create payment record
        const paymentId = await ctx.db.insert("payments", {
            senderId: payerUser?._id || link.creatorId, // Fallback to creator if no user
            senderAddress: args.payerAddress.toLowerCase(),
            recipientId: link.creatorId,
            recipientAddress: (await ctx.db.get(link.creatorId))!.userAddress,
            amount: args.amount,
            note: `Payment for: ${link.title}`,
            transactionHash: args.transactionHash,
            status: "completed",
            timestamp: Date.now(),
        });

        // Create payment link payment record
        await ctx.db.insert("paymentLinkPayments", {
            paymentLinkId: args.paymentLinkId,
            paymentId,
            payerUserId: payerUser?._id,
            payerAddress: args.payerAddress.toLowerCase(),
            amount: args.amount,
            transactionHash: args.transactionHash,
            status: "completed",
            timestamp: Date.now(),
        });

        // Update payment link stats
        const newTotal = (
            parseFloat(link.totalCollected) + parseFloat(args.amount)
        ).toString();
        const newCount = link.paymentCount + 1;

        await ctx.db.patch(args.paymentLinkId, {
            paymentCount: newCount,
            totalCollected: newTotal,
            lastPaymentAt: Date.now(),
            // Mark as completed if single-use
            ...(link.linkType === "single-use" && { status: "completed" }),
        });

        // Create notification for creator
        const creator = await ctx.db.get(link.creatorId);
        if (creator) {
            await ctx.db.insert("notifications", {
                userId: link.creatorId,
                type: "payment_link_received",
                isRead: false,
                fromUserId: payerUser?._id,
                paymentId,
                paymentLinkId: args.paymentLinkId,
                amount: parseFloat(args.amount),
                message: link.title,
            });
        }

        return { success: true, paymentId };
    },
});

// List user's payment links
export const listPaymentLinks = query({
    args: {
        userId: v.id("users"),
        status: v.optional(
            v.union(
                v.literal("active"),
                v.literal("paused"),
                v.literal("completed"),
                v.literal("expired"),
                v.literal("all")
            )
        ),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 50;

        let links = await ctx.db
            .query("paymentLinks")
            .withIndex("by_creator", (q) => q.eq("creatorId", args.userId))
            .order("desc")
            .take(limit);

        // Check for expired links and filter by status
        const now = Date.now();
        links = links.map((link) => {
            if (
                link.status === "active" &&
                link.expiresAt &&
                link.expiresAt <= now
            ) {
                return { ...link, status: "expired" as const };
            }
            return link;
        });

        // Filter by status if specified
        if (args.status && args.status !== "all") {
            links = links.filter((link) => link.status === args.status);
        }

        // Get image URLs
        const linksWithImages = await Promise.all(
            links.map(async (link) => {
                let imageUrl = link.imageOrEmoji;
                if (link.imageType === "image") {
                    const url = await ctx.storage.getUrl(
                        link.imageOrEmoji as Id<"_storage">
                    );
                    imageUrl = url || link.imageOrEmoji;
                }
                return { ...link, imageUrl };
            })
        );

        return linksWithImages;
    },
});

// Get payment link details
export const getPaymentLinkDetails = query({
    args: { paymentLinkId: v.id("paymentLinks") },
    handler: async (ctx, args) => {
        const link = await ctx.db.get(args.paymentLinkId);
        if (!link) return null;

        // Check if expired
        const now = Date.now();
        let status = link.status;
        if (
            link.status === "active" &&
            link.expiresAt &&
            link.expiresAt <= now
        ) {
            status = "expired";
        }

        // Get image URL
        let imageUrl = link.imageOrEmoji;
        if (link.imageType === "image") {
            const url = await ctx.storage.getUrl(link.imageOrEmoji as Id<"_storage">);
            imageUrl = url || link.imageOrEmoji;
        }

        return { ...link, status, imageUrl };
    },
});

// Get payment link history
export const getPaymentLinkHistory = query({
    args: { paymentLinkId: v.id("paymentLinks") },
    handler: async (ctx, args) => {
        const payments = await ctx.db
            .query("paymentLinkPayments")
            .withIndex("by_paymentLink", (q) =>
                q.eq("paymentLinkId", args.paymentLinkId)
            )
            .order("desc")
            .collect();

        // Populate payer info
        const populated = await Promise.all(
            payments.map(async (payment) => {
                let payer = null;
                if (payment.payerUserId) {
                    const user = await ctx.db.get(payment.payerUserId);
                    if (user) {
                        payer = {
                            _id: user._id,
                            name: user.name,
                            username: user.username,
                            profileImageUrl: user.profileImageUrl,
                        };
                    }
                }
                return { ...payment, payer };
            })
        );

        return populated;
    },
});

// Update payment link settings
export const updatePaymentLinkSettings = mutation({
    args: {
        userAddress: v.string(),
        paymentLinkId: v.id("paymentLinks"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        expiresAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await verifyUser(ctx, args.userAddress);
        const link = await ctx.db.get(args.paymentLinkId);

        if (!link) throw new ConvexError("Payment link not found");
        if (link.creatorId !== user._id) {
            throw new ConvexError("Not authorized");
        }

        // Validate inputs
        if (args.title !== undefined) {
            if (!args.title || args.title.trim().length === 0) {
                throw new ConvexError("Title cannot be empty");
            }
            if (args.title.length > 100) {
                throw new ConvexError("Title must be 100 characters or less");
            }
        }

        if (args.description !== undefined && args.description.length > 500) {
            throw new ConvexError("Description must be 500 characters or less");
        }

        if (
            args.expiresAt !== undefined &&
            args.expiresAt !== null &&
            args.expiresAt <= Date.now()
        ) {
            throw new ConvexError("Expiry date must be in the future");
        }

        // Update
        await ctx.db.patch(args.paymentLinkId, {
            ...(args.title !== undefined && { title: args.title.trim() }),
            ...(args.description !== undefined && {
                description: args.description?.trim(),
            }),
            ...(args.expiresAt !== undefined && { expiresAt: args.expiresAt }),
        });

        return true;
    },
});

// Toggle payment link status
export const togglePaymentLinkStatus = mutation({
    args: {
        userAddress: v.string(),
        paymentLinkId: v.id("paymentLinks"),
        action: v.union(
            v.literal("pause"),
            v.literal("resume"),
            v.literal("deactivate")
        ),
    },
    handler: async (ctx, args) => {
        const user = await verifyUser(ctx, args.userAddress);
        const link = await ctx.db.get(args.paymentLinkId);

        if (!link) throw new ConvexError("Payment link not found");
        if (link.creatorId !== user._id) {
            throw new ConvexError("Not authorized");
        }

        let newStatus: "active" | "paused" | "inactive";
        if (args.action === "pause") {
            if (link.status !== "active") {
                throw new ConvexError("Can only pause active links");
            }
            newStatus = "paused";
        } else if (args.action === "resume") {
            if (link.status !== "paused") {
                throw new ConvexError("Can only resume paused links");
            }
            newStatus = "active";
        } else {
            // deactivate
            newStatus = "inactive";
        }

        await ctx.db.patch(args.paymentLinkId, { status: newStatus });
        return true;
    },
});