import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

// Activity types for the feed
export type ActivityType =
  | "payment_sent"
  | "payment_received"
  | "request_sent"
  | "request_received"
  | "request_completed"
  | "request_declined"
  | "payment_link_received"
  | "claim_link_claimed"
  | "friend_accepted";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  timestamp: number;
  amount?: string;
  note?: string;
  otherUser?: {
    _id: Id<"users">;
    name: string;
    username: string;
    profileImageUrl?: string;
    userAddress: string;
  } | null;
  // For payment link received
  paymentLinkTitle?: string;
  paymentLinkId?: Id<"paymentLinks">;
  // For claim link claimed
  claimLinkTitle?: string;
  claimLinkId?: Id<"claimLinks">;
  // Reference IDs for modals
  paymentId?: Id<"payments">;
  paymentRequestId?: Id<"paymentRequests">;
  friendshipId?: Id<"friendships">;
}

// Get recent activity feed for a user
export const getRecentActivityFeed = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ActivityItem[]> => {
    const limit = args.limit || 10;
    const activities: ActivityItem[] = [];

    // 1. Get sent payments
    const sentPayments = await ctx.db
      .query("payments")
      .withIndex("by_sender", (q) => q.eq("senderId", args.userId))
      .order("desc")
      .take(limit);

    for (const payment of sentPayments) {
      let recipient = null;
      if (payment.recipientId) {
        recipient = await ctx.db.get(payment.recipientId);
      }
      activities.push({
        id: `payment_sent_${payment._id}`,
        type: "payment_sent",
        timestamp: payment.timestamp,
        amount: payment.amount,
        note: payment.note,
        paymentId: payment._id,
        otherUser: recipient
          ? {
              _id: recipient._id,
              name: recipient.name,
              username: recipient.username,
              profileImageUrl: recipient.profileImageUrl,
              userAddress: recipient.userAddress,
            }
          : null,
      });
    }

    // 2. Get received payments
    const receivedPayments = await ctx.db
      .query("payments")
      .withIndex("by_recipient", (q) => q.eq("recipientId", args.userId))
      .order("desc")
      .take(limit);

    for (const payment of receivedPayments) {
      const sender = await ctx.db.get(payment.senderId);
      activities.push({
        id: `payment_received_${payment._id}`,
        type: "payment_received",
        timestamp: payment.timestamp,
        amount: payment.amount,
        note: payment.note,
        paymentId: payment._id,
        otherUser: sender
          ? {
              _id: sender._id,
              name: sender.name,
              username: sender.username,
              profileImageUrl: sender.profileImageUrl,
              userAddress: sender.userAddress,
            }
          : null,
      });
    }

    // 3. Get payment requests sent by user
    const sentRequests = await ctx.db
      .query("paymentRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", args.userId))
      .order("desc")
      .take(limit);

    for (const request of sentRequests) {
      const recipient = await ctx.db.get(request.recipientId);

      // Determine activity type based on status
      let type: ActivityType = "request_sent";
      if (request.status === "completed") {
        type = "request_completed";
      } else if (request.status === "declined") {
        type = "request_declined";
      }

      activities.push({
        id: `request_sent_${request._id}_${request.status}`,
        type,
        timestamp:
          request.completedAt || request.declinedAt || request._creationTime,
        amount: request.amount,
        note: request.note,
        paymentRequestId: request._id,
        otherUser: recipient
          ? {
              _id: recipient._id,
              name: recipient.name,
              username: recipient.username,
              profileImageUrl: recipient.profileImageUrl,
              userAddress: recipient.userAddress,
            }
          : null,
      });
    }

    // 4. Get payment requests received by user
    const receivedRequests = await ctx.db
      .query("paymentRequests")
      .withIndex("by_recipient", (q) => q.eq("recipientId", args.userId))
      .order("desc")
      .take(limit);

    for (const request of receivedRequests) {
      const requester = await ctx.db.get(request.requesterId);
      activities.push({
        id: `request_received_${request._id}`,
        type: "request_received",
        timestamp: request._creationTime,
        amount: request.amount,
        note: request.note,
        paymentRequestId: request._id,
        otherUser: requester
          ? {
              _id: requester._id,
              name: requester.name,
              username: requester.username,
              profileImageUrl: requester.profileImageUrl,
              userAddress: requester.userAddress,
            }
          : null,
      });
    }

    // 5. Get payment link payments received (user is the link creator)
    const userPaymentLinks = await ctx.db
      .query("paymentLinks")
      .withIndex("by_creator", (q) => q.eq("creatorId", args.userId))
      .collect();

    for (const link of userPaymentLinks) {
      const linkPayments = await ctx.db
        .query("paymentLinkPayments")
        .withIndex("by_paymentLink", (q) => q.eq("paymentLinkId", link._id))
        .order("desc")
        .take(5); // Limit per link to avoid too many

      for (const payment of linkPayments) {
        let payer = null;
        if (payment.payerUserId) {
          payer = await ctx.db.get(payment.payerUserId);
        }
        activities.push({
          id: `payment_link_${payment._id}`,
          type: "payment_link_received",
          timestamp: payment.timestamp,
          amount: payment.amount,
          paymentLinkTitle: link.title,
          paymentLinkId: link._id,
          paymentId: payment.paymentId,
          otherUser: payer
            ? {
                _id: payer._id,
                name: payer.name,
                username: payer.username,
                profileImageUrl: payer.profileImageUrl,
                userAddress: payer.userAddress,
              }
            : null,
        });
      }
    }

    // 6. Get claim link claims (user is the link creator)
    const userClaimLinks = await ctx.db
      .query("claimLinks")
      .withIndex("by_creator", (q) => q.eq("creatorId", args.userId))
      .collect();

    for (const link of userClaimLinks) {
      const claims = await ctx.db
        .query("claimLinkClaims")
        .withIndex("by_claimLink", (q) => q.eq("claimLinkId", link._id))
        .order("desc")
        .take(5);

      for (const claim of claims) {
        let claimer = null;
        if (claim.claimerUserId) {
          claimer = await ctx.db.get(claim.claimerUserId);
        }
        activities.push({
          id: `claim_link_${claim._id}`,
          type: "claim_link_claimed",
          timestamp: claim.timestamp * 1000, // Convert from seconds to ms
          amount: claim.amount,
          claimLinkTitle: link.title,
          claimLinkId: link._id,
          otherUser: claimer
            ? {
                _id: claimer._id,
                name: claimer.name,
                username: claimer.username,
                profileImageUrl: claimer.profileImageUrl,
                userAddress: claimer.userAddress,
              }
            : null,
        });
      }
    }

    // 7. Get accepted friendships (both directions)
    const friendshipsAsRequester = await ctx.db
      .query("friendships")
      .withIndex("by_requester", (q) => q.eq("requesterId", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .order("desc")
      .take(limit);

    for (const friendship of friendshipsAsRequester) {
      const friend = await ctx.db.get(friendship.addresseeId);
      activities.push({
        id: `friend_${friendship._id}`,
        type: "friend_accepted",
        timestamp: friendship.updatedAt,
        friendshipId: friendship._id,
        otherUser: friend
          ? {
              _id: friend._id,
              name: friend.name,
              username: friend.username,
              profileImageUrl: friend.profileImageUrl,
              userAddress: friend.userAddress,
            }
          : null,
      });
    }

    const friendshipsAsAddressee = await ctx.db
      .query("friendships")
      .withIndex("by_addressee", (q) => q.eq("addresseeId", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .order("desc")
      .take(limit);

    for (const friendship of friendshipsAsAddressee) {
      const friend = await ctx.db.get(friendship.requesterId);
      activities.push({
        id: `friend_${friendship._id}`,
        type: "friend_accepted",
        timestamp: friendship.updatedAt,
        friendshipId: friendship._id,
        otherUser: friend
          ? {
              _id: friend._id,
              name: friend.name,
              username: friend.username,
              profileImageUrl: friend.profileImageUrl,
              userAddress: friend.userAddress,
            }
          : null,
      });
    }

    // Sort by timestamp and take top N
    activities.sort((a, b) => b.timestamp - a.timestamp);
    return activities.slice(0, limit);
  },
});
