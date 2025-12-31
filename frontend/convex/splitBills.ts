import { ConvexError, v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper to verify user
async function verifyUser(ctx: QueryCtx | MutationCtx, userAddress: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_userAddress", (q) =>
      q.eq("userAddress", userAddress.toLowerCase()),
    )
    .first();
  if (!user) {
    throw new ConvexError("User not found");
  }
  return user;
}

// Helper to recompute split totals
async function recomputeSplitTotals(
  ctx: MutationCtx,
  splitBillId: Id<"splitBills">,
) {
  const participants = await ctx.db
    .query("splitBillParticipants")
    .withIndex("by_split", (q) => q.eq("splitBillId", splitBillId))
    .collect();

  const totalParticipants = participants.length;

  const activeParticipants = participants.filter(
    (p) => p.status !== "declined",
  );
  const activeParticipantCount = activeParticipants.length;

  const paidParticipants = participants.filter(
    (p) => p.status === "paid" || p.status === "marked_paid",
  );
  const paidCount = paidParticipants.length;

  const totalCollected = paidParticipants
    .reduce((sum: bigint, p) => sum + BigInt(p.amount), 0n)
    .toString();

  await ctx.db.patch(splitBillId, {
    totalParticipants,
    activeParticipantCount,
    paidCount,
    totalCollected,
  });

  // Auto-complete if all active participants paid
  if (paidCount === activeParticipantCount && activeParticipantCount > 0) {
    const split = await ctx.db.get(splitBillId);
    if (split && split.status === "active") {
      await ctx.db.patch(splitBillId, { status: "completed" });

      // Notify creator + all participants
      const allParticipantIds = participants.map((p) => p.userId);

      for (const userId of [split.creatorId, ...allParticipantIds]) {
        await ctx.db.insert("notifications", {
          userId,
          type: "split_bill_completed",
          isRead: false,
          fromUserId: split.creatorId,
          splitBillId,
          amount: parseFloat(split.totalAmount),
        });
      }
    }
  }
}

// Create split bill
export const createSplitBill = mutation({
  args: {
    userAddress: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    imageOrEmoji: v.optional(v.string()),
    imageType: v.optional(v.union(v.literal("emoji"), v.literal("image"))),
    totalAmount: v.string(),
    splitMode: v.union(v.literal("equal"), v.literal("custom")),
    participants: v.array(
      v.object({
        userId: v.id("users"),
        amount: v.optional(v.string()),
      }),
    ),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    // Validate participants
    if (args.participants.length < 2 || args.participants.length > 50) {
      throw new ConvexError("Must have 2-50 participants");
    }

    // Ensure creator is not a participant
    const creatorIsParticipant = args.participants.some(
      (p) => p.userId === user._id,
    );
    if (creatorIsParticipant) {
      throw new ConvexError("Creator cannot be a participant");
    }

    // Calculate amounts
    const totalAmountBigInt = BigInt(args.totalAmount);
    let participantsWithAmounts: Array<{
      userId: Id<"users">;
      amount: string;
    }> = [];

    if (args.splitMode === "equal") {
      // Sort participants by userId for deterministic remainder distribution
      const sortedParticipants = [...args.participants].sort((a, b) =>
        a.userId.localeCompare(b.userId),
      );

      const baseAmount = totalAmountBigInt / BigInt(sortedParticipants.length);
      const remainder = totalAmountBigInt % BigInt(sortedParticipants.length);

      participantsWithAmounts = sortedParticipants.map((p, i) => ({
        userId: p.userId,
        amount: (baseAmount + (i < Number(remainder) ? 1n : 0n)).toString(),
      }));
    } else {
      // Custom amounts - validate sum
      if (!args.participants.every((p) => p.amount)) {
        throw new ConvexError(
          "All participants must have amounts in custom mode",
        );
      }

      const sum = args.participants.reduce(
        (acc, p) => acc + BigInt(p.amount!),
        0n,
      );

      if (sum !== totalAmountBigInt) {
        throw new ConvexError("Custom amounts must sum to total amount");
      }

      participantsWithAmounts = args.participants.map((p) => ({
        userId: p.userId,
        amount: p.amount!,
      }));
    }

    // Create split bill
    const splitBillId = await ctx.db.insert("splitBills", {
      creatorId: user._id,
      title: args.title,
      description: args.description,
      imageOrEmoji: args.imageOrEmoji,
      imageType: args.imageType,
      totalAmount: args.totalAmount,
      splitMode: args.splitMode,
      status: "active",
      expiresAt: args.expiresAt,
      totalParticipants: participantsWithAmounts.length,
      activeParticipantCount: participantsWithAmounts.length,
      paidCount: 0,
      totalCollected: "0",
      createdAt: Date.now(),
    });

    // Create participants
    const now = Date.now();
    for (const p of participantsWithAmounts) {
      await ctx.db.insert("splitBillParticipants", {
        splitBillId,
        userId: p.userId,
        amount: p.amount,
        status: "pending",
        totalReminderCount: 0,
        createdAt: now,
      });

      // Notify participant
      await ctx.db.insert("notifications", {
        userId: p.userId,
        type: "split_bill_request",
        isRead: false,
        fromUserId: user._id,
        splitBillId,
        amount: parseFloat(p.amount),
      });
    }

    return splitBillId;
  },
});

// Pay share
export const payShare = mutation({
  args: {
    userAddress: v.string(),
    splitBillId: v.id("splitBills"),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    const split = await ctx.db.get(args.splitBillId);
    if (!split) {
      throw new ConvexError("Split bill not found");
    }

    // Check expiration with grace period
    const GRACE_PERIOD_MS = 5 * 60 * 1000;
    if (split.expiresAt && Date.now() > split.expiresAt + GRACE_PERIOD_MS) {
      throw new ConvexError("This split bill has expired");
    }

    // Get participant
    const participant = await ctx.db
      .query("splitBillParticipants")
      .withIndex("by_split_user", (q) =>
        q.eq("splitBillId", args.splitBillId).eq("userId", user._id),
      )
      .unique();

    if (!participant) {
      throw new ConvexError("You are not a participant in this split");
    }

    // Idempotency check
    if (participant.status === "paid" && participant.paymentId) {
      return participant.paymentId;
    }

    if (participant.status !== "pending") {
      throw new ConvexError("Cannot pay: already declined or marked paid");
    }

    // Get creator
    const creator = await ctx.db.get(split.creatorId);
    if (!creator) {
      throw new ConvexError("Creator not found");
    }

    // Create payment record
    const paymentId = await ctx.db.insert("payments", {
      senderId: user._id,
      senderAddress: args.userAddress.toLowerCase(),
      recipientId: split.creatorId,
      recipientAddress: creator.userAddress,
      amount: participant.amount,
      transactionHash: "", // Will be updated after on-chain tx
      status: "pending",
      timestamp: Date.now(),
      splitBillParticipantId: participant._id,
    });

    // Update participant
    await ctx.db.patch(participant._id, {
      status: "paid",
      paidAt: Date.now(),
      paymentId,
    });

    // Recompute totals
    await recomputeSplitTotals(ctx, args.splitBillId);

    // Notify creator
    await ctx.db.insert("notifications", {
      userId: split.creatorId,
      type: "split_bill_paid",
      isRead: false,
      fromUserId: user._id,
      splitBillId: args.splitBillId,
      amount: parseFloat(participant.amount),
    });

    return paymentId;
  },
});

// Decline share
export const declineShare = mutation({
  args: {
    userAddress: v.string(),
    splitBillId: v.id("splitBills"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    const split = await ctx.db.get(args.splitBillId);
    if (!split) {
      throw new ConvexError("Split bill not found");
    }

    const participant = await ctx.db
      .query("splitBillParticipants")
      .withIndex("by_split_user", (q) =>
        q.eq("splitBillId", args.splitBillId).eq("userId", user._id),
      )
      .unique();

    if (!participant) {
      throw new ConvexError("You are not a participant in this split");
    }

    if (participant.status !== "pending") {
      throw new ConvexError("Can only decline pending requests");
    }

    // Update participant
    await ctx.db.patch(participant._id, {
      status: "declined",
      declinedAt: Date.now(),
    });

    // Recompute totals
    await recomputeSplitTotals(ctx, args.splitBillId);

    // Notify creator
    await ctx.db.insert("notifications", {
      userId: split.creatorId,
      type: "split_bill_declined",
      isRead: false,
      fromUserId: user._id,
      splitBillId: args.splitBillId,
    });

    return true;
  },
});

// Mark as paid outside app
export const markAsPaidOutsideApp = mutation({
  args: {
    userAddress: v.string(),
    splitBillId: v.id("splitBills"),
    participantUserId: v.id("users"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    const split = await ctx.db.get(args.splitBillId);
    if (!split) {
      throw new ConvexError("Split bill not found");
    }

    if (split.creatorId !== user._id) {
      throw new ConvexError("Only creator can mark payments");
    }

    const participant = await ctx.db
      .query("splitBillParticipants")
      .withIndex("by_split_user", (q) =>
        q
          .eq("splitBillId", args.splitBillId)
          .eq("userId", args.participantUserId),
      )
      .unique();

    if (!participant) {
      throw new ConvexError("Participant not found");
    }

    // Update participant
    await ctx.db.patch(participant._id, {
      status: "marked_paid",
      paidAt: Date.now(),
      markedPaidNote: args.note,
      markedPaidBy: user._id,
    });

    // Recompute totals
    await recomputeSplitTotals(ctx, args.splitBillId);

    return true;
  },
});

// Send reminder
export const sendReminder = mutation({
  args: {
    userAddress: v.string(),
    splitBillId: v.id("splitBills"),
    participantUserIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    const split = await ctx.db.get(args.splitBillId);
    if (!split) {
      throw new ConvexError("Split bill not found");
    }

    if (split.creatorId !== user._id) {
      throw new ConvexError("Only creator can send reminders");
    }

    if (split.status !== "active") {
      throw new ConvexError("Can only send reminders for active splits");
    }

    // Get pending participants
    let targetParticipants;
    if (args.participantUserIds) {
      targetParticipants = await Promise.all(
        args.participantUserIds.map((userId) =>
          ctx.db
            .query("splitBillParticipants")
            .withIndex("by_split_user", (q) =>
              q.eq("splitBillId", args.splitBillId).eq("userId", userId),
            )
            .unique(),
        ),
      );
    } else {
      targetParticipants = await ctx.db
        .query("splitBillParticipants")
        .withIndex("by_split_status", (q) =>
          q.eq("splitBillId", args.splitBillId).eq("status", "pending"),
        )
        .collect();
    }

    const COOLDOWN_MS = 24 * 60 * 60 * 1000;
    const failedReminders: string[] = [];
    let successCount = 0;

    for (const participant of targetParticipants) {
      if (!participant) continue;

      // Check rate limits
      if (
        participant.lastReminderSentAt &&
        Date.now() - participant.lastReminderSentAt < COOLDOWN_MS
      ) {
        const participantUser = await ctx.db.get(participant.userId);
        failedReminders.push(
          `${participantUser?.name || "User"} (24h cooldown)`,
        );
        continue;
      }

      if ((participant.totalReminderCount ?? 0) >= 5) {
        const participantUser = await ctx.db.get(participant.userId);
        failedReminders.push(
          `${participantUser?.name || "User"} (max reminders reached)`,
        );
        continue;
      }

      // Send reminder
      await ctx.db.patch(participant._id, {
        lastReminderSentAt: Date.now(),
        totalReminderCount: (participant.totalReminderCount ?? 0) + 1,
      });

      await ctx.db.insert("notifications", {
        userId: participant.userId,
        type: "split_bill_reminder",
        isRead: false,
        fromUserId: user._id,
        splitBillId: args.splitBillId,
        amount: parseFloat(participant.amount),
      });

      successCount++;
    }

    return {
      successCount,
      failedReminders,
    };
  },
});

// Close split
export const closeSplit = mutation({
  args: {
    userAddress: v.string(),
    splitBillId: v.id("splitBills"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    const split = await ctx.db.get(args.splitBillId);
    if (!split) {
      throw new ConvexError("Split bill not found");
    }

    if (split.creatorId !== user._id) {
      throw new ConvexError("Only creator can close split");
    }

    if (split.status !== "active") {
      throw new ConvexError("Can only close active splits");
    }

    if (split.paidCount === 0) {
      throw new ConvexError("At least one payment must be made before closing");
    }

    // Update status
    await ctx.db.patch(args.splitBillId, {
      status: "closed",
    });

    // Notify pending participants only
    const pendingParticipants = await ctx.db
      .query("splitBillParticipants")
      .withIndex("by_split_status", (q) =>
        q.eq("splitBillId", args.splitBillId).eq("status", "pending"),
      )
      .collect();

    for (const participant of pendingParticipants) {
      await ctx.db.insert("notifications", {
        userId: participant.userId,
        type: "split_bill_closed",
        isRead: false,
        fromUserId: user._id,
        splitBillId: args.splitBillId,
      });
    }

    return true;
  },
});

// Cancel split
export const cancelSplit = mutation({
  args: {
    userAddress: v.string(),
    splitBillId: v.id("splitBills"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    const split = await ctx.db.get(args.splitBillId);
    if (!split) {
      throw new ConvexError("Split bill not found");
    }

    if (split.creatorId !== user._id) {
      throw new ConvexError("Only creator can cancel split");
    }

    if (split.status !== "active") {
      throw new ConvexError("Can only cancel active splits");
    }

    if (split.paidCount > 0) {
      throw new ConvexError(
        "Cannot cancel: payments have been made. Use close instead.",
      );
    }

    // Update status
    await ctx.db.patch(args.splitBillId, {
      status: "cancelled",
    });

    // Notify all participants
    const allParticipants = await ctx.db
      .query("splitBillParticipants")
      .withIndex("by_split", (q) => q.eq("splitBillId", args.splitBillId))
      .collect();

    for (const participant of allParticipants) {
      await ctx.db.insert("notifications", {
        userId: participant.userId,
        type: "split_bill_cancelled",
        isRead: false,
        fromUserId: user._id,
        splitBillId: args.splitBillId,
      });
    }

    return true;
  },
});

// Extend expiration
export const extendExpiration = mutation({
  args: {
    userAddress: v.string(),
    splitBillId: v.id("splitBills"),
    newExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    const split = await ctx.db.get(args.splitBillId);
    if (!split) {
      throw new ConvexError("Split bill not found");
    }

    if (split.creatorId !== user._id) {
      throw new ConvexError("Only creator can extend expiration");
    }

    if (split.expiresAt && args.newExpiresAt <= split.expiresAt) {
      throw new ConvexError("New expiration must be later than current");
    }

    await ctx.db.patch(args.splitBillId, {
      expiresAt: args.newExpiresAt,
      status: "active", // Reactivate if expired
    });

    return true;
  },
});

// Queries

// List my splits (creator)
export const listMySplits = query({
  args: {
    userId: v.id("users"),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("completed"),
        v.literal("closed"),
        v.literal("expired"),
        v.literal("cancelled"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("splitBills")
      .withIndex("by_creator", (q) => q.eq("creatorId", args.userId))
      .order("desc");

    const splits = await query.collect();

    // Filter by status
    let filtered = splits;
    if (args.status) {
      filtered = splits.filter((s) => s.status === args.status);
    }

    // Apply limit
    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    // Enrich with participant data
    const enriched = await Promise.all(
      filtered.map(async (split) => {
        const participants = await ctx.db
          .query("splitBillParticipants")
          .withIndex("by_split", (q) => q.eq("splitBillId", split._id))
          .collect();

        const participantsWithUsers = await Promise.all(
          participants.map(async (p) => {
            const user = await ctx.db.get(p.userId);
            return { ...p, user };
          }),
        );

        return {
          ...split,
          participants: participantsWithUsers,
        };
      }),
    );

    return enriched;
  },
});

// List splits I'm in
export const listSplitsImIn = query({
  args: {
    userId: v.id("users"),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("paid"), v.literal("declined")),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("splitBillParticipants")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc");

    let participants = await query.collect();

    // Filter by status
    if (args.status) {
      participants = participants.filter((p) => p.status === args.status);
    }

    // Apply limit
    if (args.limit) {
      participants = participants.slice(0, args.limit);
    }

    // Enrich with split data
    const enriched = await Promise.all(
      participants.map(async (participant) => {
        const split = await ctx.db.get(participant.splitBillId);
        const creator = split ? await ctx.db.get(split.creatorId) : null;

        return {
          split: split ? { ...split, creator } : null,
          myParticipation: participant,
        };
      }),
    );

    return enriched.filter((e) => e.split !== null);
  },
});

// Get split details
export const getSplitDetails = query({
  args: {
    splitBillId: v.id("splitBills"),
  },
  handler: async (ctx, args) => {
    const split = await ctx.db.get(args.splitBillId);
    if (!split) return null;

    const creator = await ctx.db.get(split.creatorId);

    const participants = await ctx.db
      .query("splitBillParticipants")
      .withIndex("by_split", (q) => q.eq("splitBillId", args.splitBillId))
      .collect();

    const participantsWithUsers = await Promise.all(
      participants.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        return { ...p, user };
      }),
    );

    return {
      ...split,
      creator,
      participants: participantsWithUsers,
    };
  },
});

// Get my participation
export const getMyParticipation = query({
  args: {
    userId: v.id("users"),
    splitBillId: v.id("splitBills"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("splitBillParticipants")
      .withIndex("by_split_user", (q) =>
        q.eq("splitBillId", args.splitBillId).eq("userId", args.userId),
      )
      .unique();
  },
});
