import { ConvexError, v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Constants
const MAX_PENDING_REQUESTS = 50;
const DECLINE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to check if user is blocked
async function isBlocked(
  ctx: QueryCtx,
  userId: Id<"users">,
  otherUserId: Id<"users">,
) {
  const block = await ctx.db
    .query("blocks")
    .withIndex("by_both", (q) =>
      q.eq("blockerId", otherUserId).eq("blockedId", userId),
    )
    .first();
  return block !== null;
}

// Get friendship status between two users
export const getFriendshipStatus = query({
  args: {
    userId: v.id("users"),
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.userId === args.otherUserId) {
      return { status: "self" };
    }

    // Check if blocked
    const blocked = await isBlocked(ctx, args.userId, args.otherUserId);
    if (blocked) {
      return { status: "blocked" };
    }

    // Check for existing friendship (either direction)
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_users", (q) =>
        q.eq("requesterId", args.userId).eq("addresseeId", args.otherUserId),
      )
      .first();

    if (friendship) {
      return {
        status: friendship.status,
        friendshipId: friendship._id,
        isRequester: true,
      };
    }

    // Check reverse direction
    const reverseFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_users", (q) =>
        q.eq("requesterId", args.otherUserId).eq("addresseeId", args.userId),
      )
      .first();

    if (reverseFriendship) {
      return {
        status: reverseFriendship.status,
        friendshipId: reverseFriendship._id,
        isRequester: false,
      };
    }

    return { status: "none" };
  },
});

// Send friend request
export const sendFriendRequest = mutation({
  args: {
    requesterId: v.id("users"),
    addresseeId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get requester
    const requester = await ctx.db.get(args.requesterId);
    if (!requester) {
      throw new ConvexError("Requester not found");
    }

    if (args.requesterId === args.addresseeId) {
      throw new ConvexError("Cannot send friend request to yourself");
    }

    // Check if addressee exists
    const addressee = await ctx.db.get(args.addresseeId);
    if (!addressee) {
      throw new ConvexError("User not found");
    }

    // Check if blocked
    const blocked = await isBlocked(ctx, args.requesterId, args.addresseeId);
    if (blocked) {
      throw new ConvexError("Cannot send friend request to this user");
    }

    // Check for existing friendship
    const existingFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_users", (q) =>
        q
          .eq("requesterId", args.requesterId)
          .eq("addresseeId", args.addresseeId),
      )
      .first();

    if (existingFriendship) {
      if (existingFriendship.status === "accepted") {
        throw new ConvexError("Already friends");
      }
      if (existingFriendship.status === "pending") {
        throw new ConvexError("Friend request already sent");
      }
      // If declined, check cooldown
      if (existingFriendship.status === "declined") {
        const timeSinceDecline = Date.now() - existingFriendship.updatedAt;
        if (timeSinceDecline < DECLINE_COOLDOWN_MS) {
          const hoursLeft = Math.ceil(
            (DECLINE_COOLDOWN_MS - timeSinceDecline) / (60 * 60 * 1000),
          );
          throw new ConvexError(
            `Please wait ${hoursLeft} hours before sending another request`,
          );
        }
        // Cooldown passed, update to pending
        await ctx.db.patch(existingFriendship._id, {
          status: "pending",
          updatedAt: Date.now(),
        });

        // Create notification
        await ctx.db.insert("notifications", {
          userId: args.addresseeId,
          type: "friend_request",
          isRead: false,
          fromUserId: args.requesterId,
          friendshipId: existingFriendship._id,
        });

        return existingFriendship._id;
      }
    }

    // Check reverse direction
    const reverseFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_users", (q) =>
        q
          .eq("requesterId", args.addresseeId)
          .eq("addresseeId", args.requesterId),
      )
      .first();

    if (reverseFriendship) {
      if (reverseFriendship.status === "accepted") {
        throw new ConvexError("Already friends");
      }
      if (reverseFriendship.status === "pending") {
        throw new ConvexError(
          "This user has already sent you a friend request",
        );
      }
    }

    // Check pending request limit
    const pendingCount = await ctx.db
      .query("friendships")
      .withIndex("by_requester", (q) => q.eq("requesterId", args.requesterId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    if (pendingCount.length >= MAX_PENDING_REQUESTS) {
      throw new ConvexError(
        `Cannot have more than ${MAX_PENDING_REQUESTS} pending friend requests`,
      );
    }

    // Create friendship request
    const friendshipId = await ctx.db.insert("friendships", {
      requesterId: args.requesterId,
      addresseeId: args.addresseeId,
      status: "pending",
      updatedAt: Date.now(),
    });

    // Create notification for addressee
    await ctx.db.insert("notifications", {
      userId: args.addresseeId,
      type: "friend_request",
      isRead: false,
      fromUserId: args.requesterId,
      friendshipId: friendshipId,
    });

    return friendshipId;
  },
});

// Accept friend request
export const acceptFriendRequest = mutation({
  args: {
    userId: v.id("users"),
    friendshipId: v.id("friendships"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) {
      throw new ConvexError("Friend request not found");
    }

    if (friendship.addresseeId !== args.userId) {
      throw new ConvexError("Not authorized to accept this request");
    }

    if (friendship.status !== "pending") {
      throw new ConvexError("Friend request is not pending");
    }

    // Update friendship status
    await ctx.db.patch(args.friendshipId, {
      status: "accepted",
      updatedAt: Date.now(),
    });

    // Create notification for requester
    await ctx.db.insert("notifications", {
      userId: friendship.requesterId,
      type: "friend_accepted",
      isRead: false,
      fromUserId: args.userId,
      friendshipId: args.friendshipId,
    });

    // Mark the friend request notification as read
    const notification = await ctx.db
      .query("notifications")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("type", "friend_request"),
      )
      .filter((q) => q.eq(q.field("friendshipId"), args.friendshipId))
      .first();

    if (notification) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return args.friendshipId;
  },
});

// Decline friend request
export const declineFriendRequest = mutation({
  args: {
    userId: v.id("users"),
    friendshipId: v.id("friendships"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) {
      throw new ConvexError("Friend request not found");
    }

    if (friendship.addresseeId !== args.userId) {
      throw new ConvexError("Not authorized to decline this request");
    }

    if (friendship.status !== "pending") {
      throw new ConvexError("Friend request is not pending");
    }

    // Update to declined status
    await ctx.db.patch(args.friendshipId, {
      status: "declined",
      updatedAt: Date.now(),
    });

    // Mark the friend request notification as read
    const notification = await ctx.db
      .query("notifications")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("type", "friend_request"),
      )
      .filter((q) => q.eq(q.field("friendshipId"), args.friendshipId))
      .first();

    if (notification) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return args.friendshipId;
  },
});

// Cancel friend request (requester cancels their own request)
export const cancelFriendRequest = mutation({
  args: {
    userId: v.id("users"),
    friendshipId: v.id("friendships"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) {
      throw new ConvexError("Friend request not found");
    }

    if (friendship.requesterId !== args.userId) {
      throw new ConvexError("Not authorized to cancel this request");
    }

    if (friendship.status !== "pending") {
      throw new ConvexError("Can only cancel pending requests");
    }

    // Delete the friendship
    await ctx.db.delete(args.friendshipId);

    // Delete the notification
    const notification = await ctx.db
      .query("notifications")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", friendship.addresseeId).eq("type", "friend_request"),
      )
      .filter((q) => q.eq(q.field("friendshipId"), args.friendshipId))
      .first();

    if (notification) {
      await ctx.db.delete(notification._id);
    }

    return true;
  },
});

// Unfriend (remove friendship)
export const unfriend = mutation({
  args: {
    userId: v.id("users"),
    friendshipId: v.id("friendships"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) {
      throw new ConvexError("Friendship not found");
    }

    // Verify user is part of this friendship
    if (
      friendship.requesterId !== args.userId &&
      friendship.addresseeId !== args.userId
    ) {
      throw new ConvexError("Not authorized to remove this friendship");
    }

    if (friendship.status !== "accepted") {
      throw new ConvexError("Can only unfriend accepted friendships");
    }

    // Delete the friendship
    await ctx.db.delete(args.friendshipId);

    return true;
  },
});

// Get list of friends
export const listFriends = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all accepted friendships where user is requester
    const asRequester = await ctx.db
      .query("friendships")
      .withIndex("by_requester", (q) => q.eq("requesterId", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    // Get all accepted friendships where user is addressee
    const asAddressee = await ctx.db
      .query("friendships")
      .withIndex("by_addressee", (q) => q.eq("addresseeId", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    // Get friend user details
    const friendIds = [
      ...asRequester.map((f) => f.addresseeId),
      ...asAddressee.map((f) => f.requesterId),
    ];

    const friends = await Promise.all(
      friendIds.map(async (id) => {
        const user = await ctx.db.get(id);
        return user;
      }),
    );

    // Sort by most recent friendship (using _creationTime from friendship)
    const friendsWithDate = friends.map((friend, index) => {
      const friendship =
        index < asRequester.length
          ? asRequester[index]
          : asAddressee[index - asRequester.length];
      return {
        ...friend,
        friendshipDate: friendship._creationTime,
        friendshipId: friendship._id,
      };
    });

    return friendsWithDate.sort((a, b) => b.friendshipDate - a.friendshipDate);
  },
});

// Get pending incoming requests
export const listPendingRequests = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("friendships")
      .withIndex("by_addressee_status", (q) =>
        q.eq("addresseeId", args.userId).eq("status", "pending"),
      )
      .collect();

    const requestsWithUsers = await Promise.all(
      requests.map(async (request) => {
        const user = await ctx.db.get(request.requesterId);
        return {
          ...request,
          requester: user,
        };
      }),
    );

    return requestsWithUsers;
  },
});

// Get sent pending requests
export const listSentRequests = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("friendships")
      .withIndex("by_requester", (q) => q.eq("requesterId", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const requestsWithUsers = await Promise.all(
      requests.map(async (request) => {
        const user = await ctx.db.get(request.addresseeId);
        return {
          ...request,
          addressee: user,
        };
      }),
    );

    return requestsWithUsers;
  },
});

// Get friend count
export const getFriendCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const asRequester = await ctx.db
      .query("friendships")
      .withIndex("by_requester", (q) => q.eq("requesterId", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const asAddressee = await ctx.db
      .query("friendships")
      .withIndex("by_addressee", (q) => q.eq("addresseeId", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    return asRequester.length + asAddressee.length;
  },
});
