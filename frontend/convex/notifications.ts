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

// List all notifications for a user with populated data
export const list = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Populate fromUser and group data for each notification
    const populatedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        let fromUser = null;
        if (notification.fromUserId) {
          const user = await ctx.db.get(notification.fromUserId);
          if (user) {
            // Include full user data for payment requests
            fromUser = {
              _id: user._id,
              name: user.name,
              username: user.username,
              userAddress: user.userAddress,
              profileImageUrl: user.profileImageUrl,
            };
          }
        }

        let group = null;
        if (notification.groupId) {
          group = await ctx.db.get(notification.groupId);
        }

        let claimLink = null;
        if (notification.claimLinkId) {
          claimLink = await ctx.db.get(notification.claimLinkId);
        }

        return {
          ...notification,
          fromUser,
          group,
          claimLink,
        };
      }),
    );

    return populatedNotifications;
  },
});

// Get unread count
export const getUnreadCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", args.userId).eq("isRead", false),
      )
      .collect();

    return unreadNotifications.length;
  },
});

// Mark notification as read - SECURE
export const markAsRead = mutation({
  args: {
    userAddress: v.string(),
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new ConvexError("Notification not found");
    }

    if (notification.userId !== user._id) {
      throw new ConvexError("Not authorized to mark this notification as read");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
    });

    return true;
  },
});

// Mark all notifications as read for a user - SECURE
export const markAllAsRead = mutation({
  args: {
    userAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", user._id).eq("isRead", false),
      )
      .collect();

    await Promise.all(
      unreadNotifications.map((notification) =>
        ctx.db.patch(notification._id, { isRead: true }),
      ),
    );

    return unreadNotifications.length;
  },
});

// Delete a notification - SECURE
export const deleteNotification = mutation({
  args: {
    userAddress: v.string(),
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);
    const notification = await ctx.db.get(args.notificationId);

    if (!notification) {
      throw new ConvexError("Notification not found");
    }

    if (notification.userId !== user._id) {
      throw new ConvexError("Not authorized to delete this notification");
    }

    await ctx.db.delete(args.notificationId);

    return true;
  },
});
