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

// Check if user A has blocked user B
export const isBlocked = query({
  args: {
    blockerId: v.id("users"),
    blockedId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const block = await ctx.db
      .query("blocks")
      .withIndex("by_both", (q) =>
        q.eq("blockerId", args.blockerId).eq("blockedId", args.blockedId),
      )
      .first();

    return block !== null;
  },
});

// Check if there's a block in either direction
export const checkBlockStatus = query({
  args: {
    userId: v.id("users"),
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if current user blocked other user
    const youBlockedThem = await ctx.db
      .query("blocks")
      .withIndex("by_both", (q) =>
        q.eq("blockerId", args.userId).eq("blockedId", args.otherUserId),
      )
      .first();

    // Check if other user blocked current user
    const theyBlockedYou = await ctx.db
      .query("blocks")
      .withIndex("by_both", (q) =>
        q.eq("blockerId", args.otherUserId).eq("blockedId", args.userId),
      )
      .first();

    return {
      youBlockedThem: youBlockedThem !== null,
      theyBlockedYou: theyBlockedYou !== null,
      isBlocked: youBlockedThem !== null || theyBlockedYou !== null,
    };
  },
});

// Block a user - SECURE
export const blockUser = mutation({
  args: {
    userAddress: v.string(), // Caller's wallet address
    blockedId: v.id("users"), // User to block
  },
  handler: async (ctx, args) => {
    // Verify the caller's identity
    const user = await verifyUser(ctx, args.userAddress);

    if (user._id === args.blockedId) {
      throw new ConvexError("Cannot block yourself");
    }

    // Check if blocked user exists
    const blockedUser = await ctx.db.get(args.blockedId);
    if (!blockedUser) {
      throw new ConvexError("User not found");
    }

    // Check if already blocked
    const existingBlock = await ctx.db
      .query("blocks")
      .withIndex("by_both", (q) =>
        q.eq("blockerId", user._id).eq("blockedId", args.blockedId),
      )
      .first();

    if (existingBlock) {
      throw new ConvexError("User is already blocked");
    }

    // Create block
    await ctx.db.insert("blocks", {
      blockerId: user._id,
      blockedId: args.blockedId,
    });

    // Delete any existing friendship (either direction)
    const friendship1 = await ctx.db
      .query("friendships")
      .withIndex("by_users", (q) =>
        q.eq("requesterId", user._id).eq("addresseeId", args.blockedId),
      )
      .first();

    if (friendship1) {
      await ctx.db.delete(friendship1._id);
    }

    const friendship2 = await ctx.db
      .query("friendships")
      .withIndex("by_users", (q) =>
        q.eq("requesterId", args.blockedId).eq("addresseeId", user._id),
      )
      .first();

    if (friendship2) {
      await ctx.db.delete(friendship2._id);
    }

    // Delete any notifications from blocked user to current user
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("fromUserId"), args.blockedId))
      .collect();

    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    return true;
  },
});

// Unblock a user - SECURE
export const unblockUser = mutation({
  args: {
    userAddress: v.string(), // Caller's wallet address
    blockedId: v.id("users"), // User to unblock
  },
  handler: async (ctx, args) => {
    // Verify the caller's identity
    const user = await verifyUser(ctx, args.userAddress);

    const block = await ctx.db
      .query("blocks")
      .withIndex("by_both", (q) =>
        q.eq("blockerId", user._id).eq("blockedId", args.blockedId),
      )
      .first();

    if (!block) {
      throw new ConvexError("User is not blocked");
    }

    await ctx.db.delete(block._id);

    return true;
  },
});

// List all blocked users
export const listBlockedUsers = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerId", args.userId))
      .collect();

    const blockedUsers = await Promise.all(
      blocks.map(async (block) => {
        const user = await ctx.db.get(block.blockedId);
        return {
          ...user,
          blockId: block._id,
          blockedAt: block._creationTime,
        };
      }),
    );

    return blockedUsers.sort((a, b) => b.blockedAt - a.blockedAt);
  },
});
