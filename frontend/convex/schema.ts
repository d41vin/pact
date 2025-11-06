import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    username: v.string(),
    email: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    userAddress: v.string(),
  })
    .index("by_userAddress", ["userAddress"])
    .index("by_username", ["username"])
    .index("by_email", ["email"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("friend_request"),
      v.literal("friend_accepted"),
      v.literal("group_invite"),
      v.literal("group_joined"),
      v.literal("payment_request"),
      v.literal("payment_received"),
    ),
    isRead: v.boolean(),
    fromUserId: v.optional(v.id("users")),
    friendshipId: v.optional(v.id("friendships")),
    groupId: v.optional(v.id("groups")),
    invitationId: v.optional(v.id("groupInvitations")),
    paymentId: v.optional(v.id("payments")),
    amount: v.optional(v.number()),
    message: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_user_type", ["userId", "type"]),
});
