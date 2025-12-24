import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper to verify user
async function verifyUser(ctx: any, userAddress: string) {
    const user = await ctx.db
        .query("users")
        .withIndex("by_userAddress", (q: any) => q.eq("userAddress", userAddress.toLowerCase()))
        .first();
    if (!user) {
        throw new ConvexError("User not found");
    }
    return user;
}

// Generate unique shortId
function generateShortId(): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Create claim link
// ⚠️ SECURITY: This mutation should NEVER receive the private key
// The private key is generated client-side and stored ONLY in the URL fragment
export const createClaimLink = mutation({
    args: {
        userAddress: v.string(),
        contractAddress: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        imageOrEmoji: v.string(),
        imageType: v.union(v.literal("emoji"), v.literal("image")),

        // Asset info
        assetType: v.union(v.literal("native"), v.literal("erc20")),
        assetAddress: v.optional(v.string()),
        assetSymbol: v.optional(v.string()),
        assetDecimals: v.optional(v.number()),
        totalAmount: v.string(),

        // Access control
        accessMode: v.union(v.literal("anyone"), v.literal("allowlist")),
        splitMode: v.union(v.literal("none"), v.literal("equal"), v.literal("custom")),
        maxClaimers: v.optional(v.number()),
        allowlist: v.optional(v.array(v.string())),
        customAmounts: v.optional(v.array(v.string())),

        // Cryptographic proof (PUBLIC KEY ONLY!)
        proofAddress: v.optional(v.string()),

        // Expiration (IN SECONDS)
        expiresAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await verifyUser(ctx, args.userAddress);

        // Generate unique shortId
        let shortId = generateShortId();
        let existing = await ctx.db
            .query("claimLinks")
            .withIndex("by_shortId", (q: any) => q.eq("shortId", shortId))
            .first();

        while (existing) {
            shortId = generateShortId();
            existing = await ctx.db
                .query("claimLinks")
                .withIndex("by_shortId", (q: any) => q.eq("shortId", shortId))
                .first();
        }

        // Create claim link record
        const claimLinkId = await ctx.db.insert("claimLinks", {
            creatorId: user._id,
            contractAddress: args.contractAddress,
            title: args.title,
            description: args.description,
            imageOrEmoji: args.imageOrEmoji,
            imageType: args.imageType,

            assetType: args.assetType,
            assetAddress: args.assetAddress,
            assetSymbol: args.assetSymbol,
            assetDecimals: args.assetDecimals,
            totalAmount: args.totalAmount,

            accessMode: args.accessMode,
            splitMode: args.splitMode,
            maxClaimers: args.maxClaimers,
            allowlist: args.allowlist,
            customAmounts: args.customAmounts,

            proofAddress: args.proofAddress,

            status: "active",
            shortId,
            expiresAt: args.expiresAt,

            viewCount: 0,
            claimCount: 0,
            totalClaimed: "0",
        });

        return {
            claimLinkId,
            shortId
        };
    },
});

// Get claim link by shortId (public - for claim page)
export const getClaimLinkByShortId = query({
    args: { shortId: v.string() },
    handler: async (ctx, args) => {
        const claimLink = await ctx.db
            .query("claimLinks")
            .withIndex("by_shortId", (q: any) => q.eq("shortId", args.shortId))
            .first();

        if (!claimLink) {
            return null;
        }

        // Get creator info
        const creator = await ctx.db.get(claimLink.creatorId);

        // Get claim count
        const claims = await ctx.db
            .query("claimLinkClaims")
            .withIndex("by_claimLink", (q: any) => q.eq("claimLinkId", claimLink._id))
            .collect();

        // Check if expired (timestamps in seconds)
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const isExpired = claimLink.expiresAt ? claimLink.expiresAt <= nowInSeconds : false;

        return {
            ...claimLink,
            creator: creator ? {
                _id: creator._id,
                name: creator.name,
                username: creator.username,
                profileImageUrl: creator.profileImageUrl,
            } : null,
            claims: claims.length,
            isExpired,
        };
    },
});

// Increment view count
export const incrementViewCount = mutation({
    args: { shortId: v.string() },
    handler: async (ctx, args) => {
        const claimLink = await ctx.db
            .query("claimLinks")
            .withIndex("by_shortId", (q: any) => q.eq("shortId", args.shortId))
            .first();

        if (claimLink) {
            await ctx.db.patch(claimLink._id, {
                viewCount: claimLink.viewCount + 1,
            });
        }
    },
});

// Record claim
export const recordClaim = mutation({
    args: {
        claimerAddress: v.string(),
        claimLinkId: v.id("claimLinks"),
        transactionHash: v.string(),
        amount: v.string(),
    },
    handler: async (ctx, args) => {
        // Check if claim already recorded
        const existingClaim = await ctx.db
            .query("claimLinkClaims")
            .withIndex("by_transaction", (q: any) => q.eq("transactionHash", args.transactionHash))
            .first();

        if (existingClaim) {
            throw new ConvexError("Claim already recorded");
        }

        // Get claim link
        const claimLink = await ctx.db.get(args.claimLinkId);
        if (!claimLink) {
            throw new ConvexError("Claim link not found");
        }

        // Try to find claimer user
        const claimer = await ctx.db
            .query("users")
            .withIndex("by_userAddress", (q: any) => q.eq("userAddress", args.claimerAddress.toLowerCase()))
            .first();

        // Record the claim (timestamp in seconds)
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const claimId = await ctx.db.insert("claimLinkClaims", {
            claimLinkId: args.claimLinkId,
            claimerUserId: claimer?._id,
            claimerAddress: args.claimerAddress,
            amount: args.amount,
            transactionHash: args.transactionHash,
            status: "completed",
            timestamp: nowInSeconds,
        });

        // Update claim link stats
        const newClaimCount = claimLink.claimCount + 1;
        const newTotalClaimed = (
            BigInt(claimLink.totalClaimed) + BigInt(args.amount)
        ).toString();

        // Check if fully claimed
        const isFullyClaimed = newTotalClaimed === claimLink.totalAmount;
        const isMaxClaimersReached = claimLink.maxClaimers
            ? newClaimCount >= claimLink.maxClaimers
            : false;

        await ctx.db.patch(args.claimLinkId, {
            claimCount: newClaimCount,
            totalClaimed: newTotalClaimed,
            lastClaimAt: nowInSeconds,
            status: isFullyClaimed || isMaxClaimersReached ? "completed" : claimLink.status,
        });

        // Notify creator if they are not the claimer
        console.log(`[recordClaim] Checking notification: creator ${claimLink.creatorId} vs claimer ${claimer?._id}`);

        if (claimLink.creatorId !== claimer?._id) {
            console.log("[recordClaim] Creating notification for owner");
            const notifId = await ctx.db.insert("notifications", {
                userId: claimLink.creatorId,
                type: "claim_link_claimed",
                isRead: false,
                claimLinkId: args.claimLinkId,
                fromUserId: claimer?._id, // Might be undefined if claimer has no profile, which is fine
                // We'll store the claimer address in the message for now since notifications schema doesn't have address field
                // Ideally we should use fromUserId if available, or just rely on fetching claim details
                message: JSON.stringify({
                    address: args.claimerAddress,
                    amount: args.amount
                }),
            });
            console.log(`[recordClaim] Notification created: ${notifId}`);
        } else {
            console.log("[recordClaim] Skipping notification (self-claim)");
        }

        return { claimId };
    },
});

// List user's claim links
export const listClaimLinks = query({
    args: {
        userId: v.id("users"),
        status: v.optional(
            v.union(
                v.literal("active"),
                v.literal("paused"),
                v.literal("completed"),
                v.literal("expired"),
                v.literal("cancelled"),
                v.literal("all")
            )
        ),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let claimLinksQuery = ctx.db
            .query("claimLinks")
            .withIndex("by_creator", (q: any) => q.eq("creatorId", args.userId));

        const claimLinks = await claimLinksQuery.collect();

        // Filter by status
        const nowInSeconds = Math.floor(Date.now() / 1000);
        let filtered = claimLinks;

        if (args.status && args.status !== "all") {
            if (args.status === "expired") {
                filtered = claimLinks.filter(
                    (cl) => cl.expiresAt && cl.expiresAt <= nowInSeconds
                );
            } else {
                filtered = claimLinks.filter((cl) => {
                    const isExpired = cl.expiresAt && cl.expiresAt <= nowInSeconds;
                    if (isExpired && cl.status === "active") return false;
                    return cl.status === args.status;
                });
            }
        }

        // Sort by creation time (newest first)
        filtered.sort((a, b) => b._creationTime - a._creationTime);

        // Apply limit
        if (args.limit) {
            filtered = filtered.slice(0, args.limit);
        }

        // Add isExpired flag
        return filtered.map((cl) => ({
            ...cl,
            isExpired: cl.expiresAt ? cl.expiresAt <= nowInSeconds : false,
        }));
    },
});

// Get claim link details with claims history
export const getClaimLinkDetails = query({
    args: { claimLinkId: v.id("claimLinks") },
    handler: async (ctx, args) => {
        const claimLink = await ctx.db.get(args.claimLinkId);
        if (!claimLink) {
            return null;
        }

        // Get creator
        const creator = await ctx.db.get(claimLink.creatorId);

        // Get all claims
        const claims = await ctx.db
            .query("claimLinkClaims")
            .withIndex("by_claimLink", (q: any) => q.eq("claimLinkId", args.claimLinkId))
            .collect();

        // Enrich claims with user info
        const enrichedClaims = await Promise.all(
            claims.map(async (claim) => {
                const claimer = claim.claimerUserId
                    ? await ctx.db.get(claim.claimerUserId)
                    : null;
                return {
                    ...claim,
                    claimer: claimer ? {
                        _id: claimer._id,
                        name: claimer.name,
                        username: claimer.username,
                        profileImageUrl: claimer.profileImageUrl,
                    } : null,
                };
            })
        );

        // Sort claims by timestamp (newest first)
        enrichedClaims.sort((a, b) => b.timestamp - a.timestamp);

        const nowInSeconds = Math.floor(Date.now() / 1000);

        return {
            ...claimLink,
            isExpired: claimLink.expiresAt ? claimLink.expiresAt <= nowInSeconds : false,
            creator: creator ? {
                _id: creator._id,
                name: creator.name,
                username: creator.username,
                profileImageUrl: creator.profileImageUrl,
            } : null,
            claims: enrichedClaims,
        };
    },
});

// Update claim link status (pause/unpause/cancel)
export const updateClaimLinkStatus = mutation({
    args: {
        userAddress: v.string(),
        claimLinkId: v.id("claimLinks"),
        action: v.union(
            v.literal("pause"),
            v.literal("resume"),
            v.literal("cancel")
        ),
    },
    handler: async (ctx, args) => {
        const user = await verifyUser(ctx, args.userAddress);

        const claimLink = await ctx.db.get(args.claimLinkId);
        if (!claimLink) {
            throw new ConvexError("Claim link not found");
        }

        if (claimLink.creatorId !== user._id) {
            throw new ConvexError("Not authorized");
        }

        let newStatus: "active" | "paused" | "cancelled";

        switch (args.action) {
            case "pause":
                if (claimLink.status !== "active") {
                    throw new ConvexError("Can only pause active links");
                }
                newStatus = "paused";
                break;
            case "resume":
                if (claimLink.status !== "paused") {
                    throw new ConvexError("Can only resume paused links");
                }
                newStatus = "active";
                break;
            case "cancel":
                if (claimLink.status === "completed" || claimLink.status === "cancelled") {
                    throw new ConvexError("Cannot cancel completed or already cancelled links");
                }
                newStatus = "cancelled";
                break;
        }

        await ctx.db.patch(args.claimLinkId, { status: newStatus });

        return { success: true, newStatus };
    },
});

// Check if address has claimed
export const hasAddressClaimed = query({
    args: {
        shortId: v.string(),
        claimerAddress: v.string(),
    },
    handler: async (ctx, args) => {
        const claimLink = await ctx.db
            .query("claimLinks")
            .withIndex("by_shortId", (q: any) => q.eq("shortId", args.shortId))
            .first();

        if (!claimLink) {
            return { hasClaimed: false, claimLink: null };
        }

        const existingClaim = await ctx.db
            .query("claimLinkClaims")
            .withIndex("by_address", (q: any) => q.eq("claimerAddress", args.claimerAddress))
            .filter((q: any) => q.eq(q.field("claimLinkId"), claimLink._id))
            .first();

        return {
            hasClaimed: !!existingClaim,
            claimLink: {
                _id: claimLink._id,
                status: claimLink.status,
                accessMode: claimLink.accessMode,
            }
        };
    },
});
