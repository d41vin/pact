// Update your convex/schema.ts

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

  friendships: defineTable({
    requesterId: v.id("users"),
    addresseeId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      // Removed: v.literal("declined")
    ),
    updatedAt: v.number(), // Track when status changed
  })
    .index("by_requester", ["requesterId"]) 
    .index("by_addressee", ["addresseeId"]) 
    .index("by_status", ["status"]) 
    .index("by_addressee_status", ["addresseeId", "status"]) 
    .index("by_users", ["requesterId", "addresseeId"]), // Check if friendship exists

  blocks: defineTable({
    blockerId: v.id("users"),
    blockedId: v.id("users"),
  })
    .index("by_blocker", ["blockerId"]) 
    .index("by_blocked", ["blockedId"]) 
    .index("by_both", ["blockerId", "blockedId"]),

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

    // Polymorphic fields based on type
    fromUserId: v.optional(v.id("users")),
    friendshipId: v.optional(v.id("friendships")),
    groupId: v.optional(v.id("groups")),
    paymentId: v.optional(v.id("payments")),
    amount: v.optional(v.number()),
    message: v.optional(v.string()),
  })
    .index("by_user", ["userId"]) 
    .index("by_user_unread", ["userId", "isRead"]) 
    .index("by_user_type", ["userId", "type"]),

  // Groups - core entities
  groups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()), // uploaded image URL
    emoji: v.optional(v.string()), // alternative to image
    accentColor: v.string(),
    creatorId: v.id("users"),
    createdAt: v.number(),
    privacy: v.union(v.literal("public"), v.literal("private")),
    joinMethod: v.union(
      v.literal("request"),
      v.literal("invite"),
      v.literal("nft"),
    ),
  })
    .index("by_creator", ["creatorId"]) 
    .index("by_creator_name", ["creatorId", "name"]),

  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
    invitedBy: v.optional(v.id("users")),
  })
    .index("by_group", ["groupId"]) 
    .index("by_user", ["userId"]) 
    .index("by_group_user", ["groupId", "userId"]) 
    .index("by_role", ["groupId", "role"]),

  groupInvitations: defineTable({
    groupId: v.id("groups"),
    inviterId: v.id("users"),
    inviteeId: v.id("users"),
    status: v.union(
      v.literal("invited"),
      v.literal("accepted"),
      v.literal("cancelled"),
    ),
    createdAt: v.number(),
  })
    .index("by_invitee", ["inviteeId"]) 
    .index("by_group", ["groupId"]) 
    .index("by_group_status", ["groupId", "status"]),

  groupActivities: defineTable({
    groupId: v.id("groups"),
    actorId: v.id("users"),
    type: v.union(
      v.literal("member_joined"),
      v.literal("member_left"),
      v.literal("pact_created"),
      v.literal("pact_used"),
      v.literal("settings_changed"),
      v.literal("admin_promoted"),
      v.literal("admin_demoted"),
    ),
    metadata: v.any(),
    createdAt: v.number(),
  })
    .index("by_group", ["groupId"]),

  // Pacts - blueprints
  pacts: defineTable({
    name: v.string(),
    description: v.string(),
    type: v.union(v.literal("personal"), v.literal("group")),
    category: v.union(
      v.literal("system"),
      v.literal("private"),
      v.literal("community"),
    ),
    contractAddress: v.optional(v.string()),
    creatorId: v.optional(v.id("users")),
    isActive: v.boolean(),
  })
    .index("by_type", ["type"]) 
    .index("by_category", ["category"]),

  // Pacts instantiated within groups
  groupPacts: defineTable({
    groupId: v.id("groups"),
    pactId: v.id("pacts"),
    instanceName: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    config: v.any(),
  }).index("by_group", ["groupId"]),
});
