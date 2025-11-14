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
    declinedAt: v.optional(v.number()),
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

  groupInviteCodes: defineTable({
    groupId: v.id("groups"),
    code: v.string(),
    createdBy: v.id("users"),
    expiresAt: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    uses: v.number(),
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
      v.literal("code_created"),
      v.literal("code_used"),
    ),
    metadata: v.any(),
  })
    .index("by_group", ["groupId"])
    .index("by_actor", ["actorId"])
    .index("by_type", ["type"]),

  // ENHANCED: Pacts table with full configuration
  pacts: defineTable({
    name: v.string(),
    description: v.string(),
    type: v.union(v.literal("personal"), v.literal("group")),
    category: v.union(
      v.literal("system"),
      v.literal("private"),
      v.literal("community"),
    ),
    icon: v.string(),
    color: v.string(),
    contractAddress: v.optional(v.string()),
    creatorId: v.optional(v.id("users")),
    isActive: v.boolean(),
    version: v.string(),
    config: v.object({
      requiredFields: v.array(v.string()),
      optionalFields: v.array(v.string()),
      minMembers: v.optional(v.number()),
      maxMembers: v.optional(v.number()),
    }),
  })
    .index("by_type", ["type"])
    .index("by_category", ["category"])
    .index("by_creator", ["creatorId"])
    .index("by_active", ["isActive"]),

  // ENHANCED: Group pacts with full state management
  groupPacts: defineTable({
    groupId: v.id("groups"),
    pactId: v.id("pacts"),
    instanceName: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    // Configuration
    config: v.object({
      goal: v.optional(v.number()),
      deadline: v.optional(v.number()),
      participants: v.array(v.id("users")),
      settings: v.any(),
    }),
    // Financial state
    balance: v.number(),
    totalContributions: v.number(),
    totalWithdrawals: v.number(),
    // Hedera integration
    hederaAccountId: v.optional(v.string()),
    contractState: v.optional(v.any()),
    // Metadata
    lastActivityAt: v.number(),
  })
    .index("by_group", ["groupId"])
    .index("by_pact", ["pactId"])
    .index("by_creator", ["createdBy"])
    .index("by_status", ["status"])
    .index("by_group_status", ["groupId", "status"]),

  // NEW: Pact transactions
  pactTransactions: defineTable({
    pactInstanceId: v.id("groupPacts"),
    userId: v.id("users"),
    type: v.union(
      v.literal("deposit"),
      v.literal("withdrawal"),
      v.literal("transfer"),
      v.literal("fee"),
    ),
    amount: v.number(),
    // Hedera
    hederaTransactionId: v.optional(v.string()),
    hederaTimestamp: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("failed"),
    ),
    // Context
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
    // Timestamps
    confirmedAt: v.optional(v.number()),
  })
    .index("by_pact", ["pactInstanceId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_pact_status", ["pactInstanceId", "status"]),

  // NEW: Pact participants
  pactParticipants: defineTable({
    pactInstanceId: v.id("groupPacts"),
    userId: v.id("users"),
    role: v.union(v.literal("creator"), v.literal("participant")),
    // Contributions
    totalContributed: v.number(),
    totalWithdrawn: v.number(),
    netPosition: v.number(),
    // Status
    isActive: v.boolean(),
    joinedAt: v.number(),
    leftAt: v.optional(v.number()),
  })
    .index("by_pact", ["pactInstanceId"])
    .index("by_user", ["userId"])
    .index("by_pact_user", ["pactInstanceId", "userId"])
    .index("by_active", ["isActive"]),

  // NEW: Pact actions (for approval workflows)
  pactActions: defineTable({
    pactInstanceId: v.id("groupPacts"),
    userId: v.id("users"),
    actionType: v.string(),
    actionData: v.any(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("completed"),
    ),
    // Approval
    requiredApprovals: v.optional(v.number()),
    approvals: v.array(v.id("users")),
    rejections: v.array(v.id("users")),
    // Timestamps
    resolvedAt: v.optional(v.number()),
  })
    .index("by_pact", ["pactInstanceId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_pact_status", ["pactInstanceId", "status"]),
});
