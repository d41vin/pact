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
      v.literal("declined"),
    ),
    updatedAt: v.number(),
    declinedAt: v.optional(v.number()), // Timestamp when request was declined
  })
    .index("by_requester", ["requesterId"])
    .index("by_addressee", ["addresseeId"])
    .index("by_status", ["status"])
    .index("by_addressee_status", ["addresseeId", "status"])
    .index("by_users", ["requesterId", "addresseeId"]),

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

  groups: defineTable({
    name: v.string(),
    description: v.string(),
    imageOrEmoji: v.string(),
    imageType: v.union(v.literal("emoji"), v.literal("image")),
    accentColor: v.string(),
    creatorId: v.id("users"),
    privacy: v.union(v.literal("public"), v.literal("private")),
    joinMethod: v.union(
      v.literal("request"),
      v.literal("invite"),
      v.literal("code"),
      v.literal("nft"),
    ),
    // NEW: Permissions configuration
    permissions: v.optional(
      v.object({
        whoCanInvite: v.union(
          v.literal("all"),
          v.literal("admins"),
          v.literal("creator"),
        ),
        whoCanCreatePacts: v.union(v.literal("all"), v.literal("admins")),
      }),
    ),
  })
    .index("by_creator", ["creatorId"])
    .index("by_privacy", ["privacy"])
    .index("by_name", ["name"]),

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
    .index("by_group_role", ["groupId", "role"]),

  groupInvitations: defineTable({
    groupId: v.id("groups"),
    inviterId: v.id("users"),
    inviteeId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("cancelled"),
    ),
    respondedAt: v.optional(v.number()),
  })
    .index("by_group", ["groupId"])
    .index("by_invitee", ["inviteeId"])
    .index("by_inviter", ["inviterId"])
    .index("by_group_invitee", ["groupId", "inviteeId"])
    .index("by_status", ["status"])
    .index("by_invitee_status", ["inviteeId", "status"]),

  // NEW: Invite codes table
  groupInviteCodes: defineTable({
    groupId: v.id("groups"),
    code: v.string(), // 8-character unique code
    createdBy: v.id("users"),
    expiresAt: v.optional(v.number()), // Optional expiration
    maxUses: v.optional(v.number()), // Optional use limit
    uses: v.number(), // Current use count
    isActive: v.boolean(),
  })
    .index("by_group", ["groupId"])
    .index("by_code", ["code"])
    .index("by_creator", ["createdBy"])
    .index("by_active", ["isActive"]),

  groupActivities: defineTable({
    groupId: v.id("groups"),
    actorId: v.id("users"),
    type: v.union(
      v.literal("member_joined"),
      v.literal("member_left"),
      v.literal("member_removed"),
      v.literal("pact_created"),
      v.literal("pact_used"),
      v.literal("settings_changed"),
      v.literal("admin_promoted"),
      v.literal("admin_demoted"),
      v.literal("group_created"),
      v.literal("code_created"), // NEW
      v.literal("code_used"), // NEW
    ),
    metadata: v.any(),
  })
    .index("by_group", ["groupId"])
    .index("by_actor", ["actorId"])
    .index("by_type", ["type"]),

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
    .index("by_category", ["category"])
    .index("by_creator", ["creatorId"]),

  groupPacts: defineTable({
    groupId: v.id("groups"),
    pactId: v.id("pacts"),
    instanceName: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    config: v.any(),
  })
    .index("by_group", ["groupId"])
    .index("by_pact", ["pactId"])
    .index("by_creator", ["createdBy"]),
});
