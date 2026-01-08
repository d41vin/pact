import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    username: v.string(),
    email: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    userAddress: v.string(),
    requestPrivacy: v.optional(
      v.union(v.literal("anyone"), v.literal("friends_only")),
    ),
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
      v.literal("payment_request_declined"),
      v.literal("payment_request_completed"),
      v.literal("payment_link_received"),
      v.literal("claim_link_claimed"),
      v.literal("split_bill_request"),
      v.literal("split_bill_paid"),
      v.literal("split_bill_reminder"),
      v.literal("split_bill_declined"),
      v.literal("split_bill_completed"),
      v.literal("split_bill_closed"),
      v.literal("split_bill_cancelled"),
    ),
    isRead: v.boolean(),
    fromUserId: v.optional(v.id("users")),
    friendshipId: v.optional(v.id("friendships")),
    groupId: v.optional(v.id("groups")),
    invitationId: v.optional(v.id("groupInvitations")),
    paymentId: v.optional(v.id("payments")),
    paymentRequestId: v.optional(v.id("paymentRequests")),
    paymentLinkId: v.optional(v.id("paymentLinks")),
    claimLinkId: v.optional(v.id("claimLinks")),
    splitBillId: v.optional(v.id("splitBills")),
    amount: v.optional(v.number()),
    message: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_user_type", ["userId", "type"]),

  paymentRequests: defineTable({
    requesterId: v.id("users"),
    recipientId: v.id("users"),
    amount: v.string(),
    note: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("declined"),
      v.literal("completed"),
      v.literal("expired"),
    ),
    expiresAt: v.optional(v.number()),
    completedPaymentId: v.optional(v.id("payments")),
    declinedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_requester", ["requesterId"])
    .index("by_recipient", ["recipientId"])
    .index("by_status", ["status"])
    .index("by_recipient_status", ["recipientId", "status"]),

  payments: defineTable({
    senderId: v.id("users"),
    senderAddress: v.string(),
    recipientId: v.optional(v.id("users")),
    recipientAddress: v.string(),
    amount: v.string(),
    note: v.optional(v.string()),
    transactionHash: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    blockNumber: v.optional(v.number()),
    timestamp: v.number(),
    splitBillParticipantId: v.optional(v.id("splitBillParticipants")),
  })
    .index("by_sender", ["senderId"])
    .index("by_recipient", ["recipientId"])
    .index("by_sender_address", ["senderAddress"])
    .index("by_recipient_address", ["recipientAddress"])
    .index("by_transaction_hash", ["transactionHash"])
    .index("by_status", ["status"]),

  // Payment Links
  paymentLinks: defineTable({
    creatorId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    imageOrEmoji: v.string(),
    imageType: v.union(v.literal("emoji"), v.literal("image")),
    amount: v.string(),
    currency: v.literal("MNT"),
    linkType: v.union(v.literal("single-use"), v.literal("reusable")),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("expired"),
      v.literal("inactive"),
    ),
    shortId: v.string(),
    expiresAt: v.optional(v.number()),
    viewCount: v.number(),
    paymentCount: v.number(),
    totalCollected: v.string(),
    lastPaymentAt: v.optional(v.number()),
  })
    .index("by_creator", ["creatorId"])
    .index("by_shortId", ["shortId"])
    .index("by_status", ["status"])
    .index("by_creator_status", ["creatorId", "status"]),

  paymentLinkPayments: defineTable({
    paymentLinkId: v.id("paymentLinks"),
    paymentId: v.id("payments"),
    payerUserId: v.optional(v.id("users")),
    payerAddress: v.string(),
    amount: v.string(),
    transactionHash: v.string(),
    status: v.union(v.literal("completed"), v.literal("failed")),
    timestamp: v.number(),
  })
    .index("by_paymentLink", ["paymentLinkId"])
    .index("by_payer", ["payerUserId"])
    .index("by_transaction", ["transactionHash"]),

  claimLinks: defineTable({
    creatorId: v.id("users"),
    contractAddress: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    imageOrEmoji: v.string(),
    imageType: v.union(v.literal("emoji"), v.literal("image")),
    assetType: v.union(v.literal("native"), v.literal("erc20")),
    assetAddress: v.optional(v.string()),
    assetSymbol: v.optional(v.string()),
    assetDecimals: v.optional(v.number()),
    totalAmount: v.string(),
    accessMode: v.union(v.literal("anyone"), v.literal("allowlist")),
    splitMode: v.union(
      v.literal("none"),
      v.literal("equal"),
      v.literal("custom"),
    ),
    maxClaimers: v.optional(v.number()),
    allowlist: v.optional(v.array(v.string())),
    customAmounts: v.optional(v.array(v.string())),
    proofAddress: v.optional(v.string()),
    privateKey: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("expired"),
      v.literal("cancelled"),
    ),
    shortId: v.string(),
    expiresAt: v.optional(v.number()),
    viewCount: v.number(),
    claimCount: v.number(),
    totalClaimed: v.string(),
    lastClaimAt: v.optional(v.number()),
  })
    .index("by_creator", ["creatorId"])
    .index("by_shortId", ["shortId"])
    .index("by_contract", ["contractAddress"])
    .index("by_status", ["status"]),

  claimLinkClaims: defineTable({
    claimLinkId: v.id("claimLinks"),
    claimerUserId: v.optional(v.id("users")),
    claimerAddress: v.string(),
    amount: v.string(),
    transactionHash: v.string(),
    status: v.union(v.literal("completed"), v.literal("failed")),
    timestamp: v.number(),
  })
    .index("by_claimLink", ["claimLinkId"])
    .index("by_claimer", ["claimerUserId"])
    .index("by_address", ["claimerAddress"])
    .index("by_transaction", ["transactionHash"]),

  // Split Bills
  splitBills: defineTable({
    creatorId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    imageOrEmoji: v.optional(v.string()),
    imageType: v.optional(v.union(v.literal("emoji"), v.literal("image"))),
    totalAmount: v.string(),
    splitMode: v.union(v.literal("equal"), v.literal("custom")),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("closed"),
      v.literal("expired"),
      v.literal("cancelled"),
    ),
    expiresAt: v.optional(v.number()),
    totalParticipants: v.number(),
    activeParticipantCount: v.number(),
    paidCount: v.number(),
    totalCollected: v.string(),
    lastPaymentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_creator", ["creatorId"])
    .index("by_status", ["status"])
    .index("by_creator_status", ["creatorId", "status"])
    .index("by_created_at", ["createdAt"]),

  splitBillParticipants: defineTable({
    splitBillId: v.id("splitBills"),
    userId: v.id("users"),
    amount: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("declined"),
      v.literal("marked_paid"),
    ),
    paidAt: v.optional(v.number()),
    paymentId: v.optional(v.id("payments")),
    markedPaidNote: v.optional(v.string()),
    markedPaidBy: v.optional(v.id("users")),
    lastReminderSentAt: v.optional(v.number()),
    totalReminderCount: v.number(),
    declinedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_split", ["splitBillId"])
    .index("by_user", ["userId"])
    .index("by_split_user", ["splitBillId", "userId"])
    .index("by_split_status", ["splitBillId", "status"])
    .index("by_user_status", ["userId", "status"]),

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
      v.literal("declined"),
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


  groupPacts: defineTable({
    groupId: v.id("groups"),
    creatorId: v.id("users"),
    contractAddress: v.string(),
    pactType: v.literal("group_fund"),
    name: v.string(),
    description: v.optional(v.string()),
    chainId: v.number(),
    createdAt: v.number(),
  })
    .index("by_group", ["groupId"])
    .index("by_creator", ["creatorId"])
    .index("by_contract", ["contractAddress"]),
});
