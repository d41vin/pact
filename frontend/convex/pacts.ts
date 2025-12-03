import { ConvexError, v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper: Verify user
async function verifyUser(ctx: MutationCtx, userAddress: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_userAddress", (q) => q.eq("userAddress", userAddress.toLowerCase()))
    .unique();

  if (!user) {
    throw new ConvexError("User not found or not authenticated");
  }

  return user;
}

// Helper: Check if user is group member
async function isGroupMember(
  ctx: QueryCtx,
  groupId: Id<"groups">,
  userId: Id<"users">,
) {
  const member = await ctx.db
    .query("groupMembers")
    .withIndex("by_group_user", (q) =>
      q.eq("groupId", groupId).eq("userId", userId),
    )
    .first();

  return member !== null;
}

// Helper: Check if user is group admin
async function isGroupAdmin(
  ctx: QueryCtx,
  groupId: Id<"groups">,
  userId: Id<"users">,
) {
  const member = await ctx.db
    .query("groupMembers")
    .withIndex("by_group_user", (q) =>
      q.eq("groupId", groupId).eq("userId", userId),
    )
    .first();

  return member?.role === "admin";
}

// Helper: Log group activity
async function logActivity(
  ctx: MutationCtx,
  groupId: Id<"groups">,
  actorId: Id<"users">,
  type:
    | "member_joined"
    | "member_left"
    | "member_removed"
    | "pact_created"
    | "pact_used"
    | "settings_changed"
    | "admin_promoted"
    | "admin_demoted"
    | "group_created"
    | "code_created"
    | "code_used",
  metadata?: Record<string, unknown>,
) {
  await ctx.db.insert("groupActivities", {
    groupId,
    actorId,
    type,
    metadata: metadata || {},
  });
}

// ==================== QUERIES ====================

// List available pact templates
export const listPactTemplates = query({
  args: {
    type: v.optional(v.union(v.literal("personal"), v.literal("group"))),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("pacts")
      .withIndex("by_active", (q) => q.eq("isActive", true));

    const results = await query.collect();

    if (args.type) {
      return results.filter((p) => p.type === args.type);
    }

    return results;
  },
});

// Get pact template details
export const getPactTemplate = query({
  args: {
    pactId: v.id("pacts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.pactId);
  },
});

// List group's active pacts
export const listGroupPacts = query({
  args: {
    groupId: v.id("groups"),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("paused"),
        v.literal("completed"),
        v.literal("cancelled"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("groupPacts")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId));

    const pacts = await query.collect();

    // Filter by status if provided
    const filtered = args.status
      ? pacts.filter((p) => p.status === args.status)
      : pacts;

    // Populate pact template info
    const populated = await Promise.all(
      filtered.map(async (pact) => {
        const template = await ctx.db.get(pact.pactId);
        const creator = await ctx.db.get(pact.createdBy);

        // Get participant count
        const participants = await ctx.db
          .query("pactParticipants")
          .withIndex("by_pact", (q) => q.eq("pactInstanceId", pact._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        return {
          ...pact,
          template,
          creator,
          participantCount: participants.length,
        };
      }),
    );

    return populated.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get pact instance details
export const getPactInstance = query({
  args: {
    pactInstanceId: v.id("groupPacts"),
  },
  handler: async (ctx, args) => {
    const pact = await ctx.db.get(args.pactInstanceId);
    if (!pact) return null;

    // Get template
    const template = await ctx.db.get(pact.pactId);

    // Get creator
    const creator = await ctx.db.get(pact.createdBy);

    // Get participants
    const participants = await ctx.db
      .query("pactParticipants")
      .withIndex("by_pact", (q) => q.eq("pactInstanceId", args.pactInstanceId))
      .collect();

    const participantsWithUsers = await Promise.all(
      participants.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        return { ...p, user };
      }),
    );

    return {
      ...pact,
      template,
      creator,
      participants: participantsWithUsers,
    };
  },
});

// Get pact transactions
export const getPactTransactions = query({
  args: {
    pactInstanceId: v.id("groupPacts"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    const transactions = await ctx.db
      .query("pactTransactions")
      .withIndex("by_pact", (q) => q.eq("pactInstanceId", args.pactInstanceId))
      .order("desc")
      .take(limit);

    // Populate user data
    const populated = await Promise.all(
      transactions.map(async (tx) => {
        const user = await ctx.db.get(tx.userId);
        return { ...tx, user };
      }),
    );

    return populated;
  },
});

// ==================== MUTATIONS ====================

// Create pact instance
export const createPactInstance = mutation({
  args: {
    userAddress: v.string(),
    groupId: v.id("groups"),
    pactId: v.id("pacts"),
    instanceName: v.string(),
    config: v.object({
      goal: v.optional(v.number()),
      deadline: v.optional(v.number()),
      participants: v.optional(v.array(v.id("users"))),
      settings: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    // Verify group membership
    if (!(await isGroupMember(ctx, args.groupId, user._id))) {
      throw new ConvexError("You must be a member of this group");
    }

    // Get pact template
    const template = await ctx.db.get(args.pactId);
    if (!template || !template.isActive) {
      throw new ConvexError("Pact template not found or inactive");
    }

    // Validate name
    if (args.instanceName.length < 2 || args.instanceName.length > 100) {
      throw new ConvexError("Pact name must be between 2 and 100 characters");
    }

    // Create pact instance
    const pactInstanceId = await ctx.db.insert("groupPacts", {
      groupId: args.groupId,
      pactId: args.pactId,
      instanceName: args.instanceName,
      createdBy: user._id,
      createdAt: Date.now(),
      status: "active",
      config: {
        goal: args.config.goal || undefined,
        deadline: args.config.deadline || undefined,
        participants: args.config.participants || [],
        settings: args.config.settings || {},
      },
      balance: 0,
      totalContributions: 0,
      totalWithdrawals: 0,
      lastActivityAt: Date.now(),
    });

    // Add creator as participant
    await ctx.db.insert("pactParticipants", {
      pactInstanceId,
      userId: user._id,
      role: "creator",
      totalContributed: 0,
      totalWithdrawn: 0,
      netPosition: 0,
      isActive: true,
      joinedAt: Date.now(),
    });

    // Add other participants if specified
    if (args.config.participants && args.config.participants.length > 0) {
      for (const participantId of args.config.participants) {
        if (participantId !== user._id) {
          await ctx.db.insert("pactParticipants", {
            pactInstanceId,
            userId: participantId,
            role: "participant",
            totalContributed: 0,
            totalWithdrawn: 0,
            netPosition: 0,
            isActive: true,
            joinedAt: Date.now(),
          });
        }
      }
    }

    // Log activity
    await logActivity(ctx, args.groupId, user._id, "pact_created", {
      pactInstanceId,
      pactName: args.instanceName,
      templateName: template.name,
    });

    return pactInstanceId;
  },
});

// Contribute to pact (deposit)
export const contributeToPact = mutation({
  args: {
    userAddress: v.string(),
    pactInstanceId: v.id("groupPacts"),
    amount: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    // Get pact instance
    const pact = await ctx.db.get(args.pactInstanceId);
    if (!pact) {
      throw new ConvexError("Pact not found");
    }

    if (pact.status !== "active") {
      throw new ConvexError("Pact is not active");
    }

    // Validate amount
    if (args.amount <= 0) {
      throw new ConvexError("Amount must be greater than 0");
    }

    // Check if user is participant
    const participant = await ctx.db
      .query("pactParticipants")
      .withIndex("by_pact_user", (q) =>
        q.eq("pactInstanceId", args.pactInstanceId).eq("userId", user._id),
      )
      .first();

    if (!participant || !participant.isActive) {
      throw new ConvexError("You are not an active participant in this pact");
    }

    // Create transaction (pending)
    const transactionId = await ctx.db.insert("pactTransactions", {
      pactInstanceId: args.pactInstanceId,
      userId: user._id,
      type: "deposit",
      amount: args.amount,
      status: "pending",
      description: args.description,
    });

    // TODO: Hedera transaction here
    // For now, auto-confirm
    await ctx.db.patch(transactionId, {
      status: "confirmed",
      confirmedAt: Date.now(),
    });

    // Update pact balance
    await ctx.db.patch(args.pactInstanceId, {
      balance: pact.balance + args.amount,
      totalContributions: pact.totalContributions + args.amount,
      lastActivityAt: Date.now(),
    });

    // Update participant stats
    await ctx.db.patch(participant._id, {
      totalContributed: participant.totalContributed + args.amount,
      netPosition: participant.netPosition + args.amount,
    });

    return transactionId;
  },
});

// Withdraw from pact
export const withdrawFromPact = mutation({
  args: {
    userAddress: v.string(),
    pactInstanceId: v.id("groupPacts"),
    amount: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    // Get pact instance
    const pact = await ctx.db.get(args.pactInstanceId);
    if (!pact) {
      throw new ConvexError("Pact not found");
    }

    if (pact.status !== "active") {
      throw new ConvexError("Pact is not active");
    }

    // Validate amount
    if (args.amount <= 0) {
      throw new ConvexError("Amount must be greater than 0");
    }

    if (args.amount > pact.balance) {
      throw new ConvexError("Insufficient pact balance");
    }

    // Check if user is participant or admin
    const participant = await ctx.db
      .query("pactParticipants")
      .withIndex("by_pact_user", (q) =>
        q.eq("pactInstanceId", args.pactInstanceId).eq("userId", user._id),
      )
      .first();

    const isAdmin = await isGroupAdmin(ctx, pact.groupId, user._id);

    if (!participant && !isAdmin) {
      throw new ConvexError("You must be a participant or admin to withdraw");
    }

    // Create transaction (pending)
    const transactionId = await ctx.db.insert("pactTransactions", {
      pactInstanceId: args.pactInstanceId,
      userId: user._id,
      type: "withdrawal",
      amount: args.amount,
      status: "pending",
      description: args.description,
    });

    // TODO: Hedera transaction here
    // For now, auto-confirm
    await ctx.db.patch(transactionId, {
      status: "confirmed",
      confirmedAt: Date.now(),
    });

    // Update pact balance
    await ctx.db.patch(args.pactInstanceId, {
      balance: pact.balance - args.amount,
      totalWithdrawals: pact.totalWithdrawals + args.amount,
      lastActivityAt: Date.now(),
    });

    // Update participant stats if they exist
    if (participant) {
      await ctx.db.patch(participant._id, {
        totalWithdrawn: participant.totalWithdrawn + args.amount,
        netPosition: participant.netPosition - args.amount,
      });
    }

    return transactionId;
  },
});

// Update pact status
export const updatePactStatus = mutation({
  args: {
    userAddress: v.string(),
    pactInstanceId: v.id("groupPacts"),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    const pact = await ctx.db.get(args.pactInstanceId);
    if (!pact) {
      throw new ConvexError("Pact not found");
    }

    // Only creator or admin can change status
    const isAdmin = await isGroupAdmin(ctx, pact.groupId, user._id);
    const isCreator = pact.createdBy === user._id;

    if (!isAdmin && !isCreator) {
      throw new ConvexError("Only admin or creator can change pact status");
    }

    await ctx.db.patch(args.pactInstanceId, {
      status: args.status,
      lastActivityAt: Date.now(),
    });

    return true;
  },
});
