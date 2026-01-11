import { ConvexError, v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper to verify user
async function verifyUser(ctx: QueryCtx | MutationCtx, userAddress: string) {
    const user = await ctx.db
        .query("users")
        .withIndex("by_userAddress", (q) =>
            q.eq("userAddress", userAddress.toLowerCase())
        )
        .first();
    if (!user) {
        throw new ConvexError("User not found");
    }
    return user;
}

// Get or create conversation metadata
export const getOrCreateConversation = mutation({
    args: {
        userAddress: v.string(),
        peerInboxId: v.string(),
        peerUserId: v.optional(v.id("users")),
    },
    handler: async (ctx, args) => {
        const user = await verifyUser(ctx, args.userAddress);

        // Check if conversation exists
        let conversation = await ctx.db
            .query("conversations")
            .withIndex("by_user_peer", (q) =>
                q.eq("userId", user._id).eq("peerInboxId", args.peerInboxId)
            )
            .first();

        if (!conversation) {
            // Create new conversation
            const conversationId = await ctx.db.insert("conversations", {
                userId: user._id,
                peerInboxId: args.peerInboxId,
                peerUserId: args.peerUserId,
                lastMessageAt: Date.now(),
                unreadCount: 0,
                isMuted: false,
            });
            conversation = await ctx.db.get(conversationId);
        }

        return conversation;
    },
});

// Update conversation with new message
export const updateConversation = mutation({
    args: {
        userAddress: v.string(),
        peerInboxId: v.string(),
        messagePreview: v.string(),
        isFromSelf: v.boolean(),
        messageTimestamp: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await verifyUser(ctx, args.userAddress);

        const conversation = await ctx.db
            .query("conversations")
            .withIndex("by_user_peer", (q) =>
                q.eq("userId", user._id).eq("peerInboxId", args.peerInboxId)
            )
            .first();

        if (!conversation) return;

        await ctx.db.patch(conversation._id, {
            lastMessageAt: args.messageTimestamp,
            lastMessagePreview: args.messagePreview,
            unreadCount: args.isFromSelf ? 0 : 1, // Boolean logic: 1 = Unread, 0 = Read
        });
    },
});

// Update unread count for background messages
export const updateUnreadCount = mutation({
    args: {
        userAddress: v.string(),
        peerInboxId: v.string(),
        messagePreview: v.string(),
        messageId: v.string(),
        messageTimestamp: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await verifyUser(ctx, args.userAddress);

        let conversation = await ctx.db
            .query("conversations")
            .withIndex("by_user_peer", (q) =>
                q.eq("userId", user._id).eq("peerInboxId", args.peerInboxId)
            )
            .first();

        if (conversation) {
            // Idempotency check 1: Exact message ID match
            if (conversation.lastMessageId === args.messageId) {
                return;
            }

            // Idempotency check 2: Time-based strict ordering
            // If the incoming message is older than or equal to the last processed message, ignore it.
            // This prevents "Stream Replay" from incrementing counts.
            if (conversation.lastMessageAt >= args.messageTimestamp) {
                return;
            }

            await ctx.db.patch(conversation._id, {
                lastMessageAt: args.messageTimestamp,
                lastMessagePreview: args.messagePreview,
                lastMessageId: args.messageId,
                unreadCount: 1, // Boolean logic: 1 = Unread, 0 = Read
            });
        } else {
            // Stranger Handling: Create missing conversation
            await ctx.db.insert("conversations", {
                userId: user._id,
                peerInboxId: args.peerInboxId,
                peerUserId: undefined,
                lastMessageAt: args.messageTimestamp,
                lastMessagePreview: args.messagePreview,
                lastMessageId: args.messageId,
                unreadCount: 1,
                isMuted: false,
            });
        }
    },
});


// Mark conversation as read
export const markAsRead = mutation({

    args: {
        userAddress: v.string(),
        peerInboxId: v.string(),
        lastReadMessageId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await verifyUser(ctx, args.userAddress);

        const conversation = await ctx.db
            .query("conversations")
            .withIndex("by_user_peer", (q) =>
                q.eq("userId", user._id).eq("peerInboxId", args.peerInboxId)
            )
            .first();

        if (!conversation) return;

        await ctx.db.patch(conversation._id, {
            unreadCount: 0,
            lastReadMessageId: args.lastReadMessageId,
        });
    },
});

// List conversations
export const listConversations = query({
    args: { userAddress: v.string() },
    handler: async (ctx, args) => {
        const user = await verifyUser(ctx, args.userAddress);

        const conversations = await ctx.db
            .query("conversations")
            .withIndex("by_user_lastMessage", (q) => q.eq("userId", user._id))
            .order("desc")
            .collect();

        // Populate peer user data
        return await Promise.all(
            conversations.map(async (conv) => {
                let peerUser = null;
                if (conv.peerUserId) {
                    peerUser = await ctx.db.get(conv.peerUserId);
                }
                return { ...conv, peerUser };
            })
        );
    },
});

// Toggle mute conversation
export const toggleMute = mutation({
    args: {
        userAddress: v.string(),
        peerInboxId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await verifyUser(ctx, args.userAddress);

        const conversation = await ctx.db
            .query("conversations")
            .withIndex("by_user_peer", (q) =>
                q.eq("userId", user._id).eq("peerInboxId", args.peerInboxId)
            )
            .first();

        if (!conversation) {
            throw new ConvexError("Conversation not found");
        }

        await ctx.db.patch(conversation._id, {
            isMuted: !conversation.isMuted,
        });

        return !conversation.isMuted;
    },
});

// Delete conversation
export const deleteConversation = mutation({
    args: {
        userAddress: v.string(),
        peerInboxId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await verifyUser(ctx, args.userAddress);

        const conversation = await ctx.db
            .query("conversations")
            .withIndex("by_user_peer", (q) =>
                q.eq("userId", user._id).eq("peerInboxId", args.peerInboxId)
            )
            .first();

        if (!conversation) {
            throw new ConvexError("Conversation not found");
        }

        await ctx.db.delete(conversation._id);
        return true;
    },
});

// Get single conversation by peerInboxId
export const getConversationByInboxId = query({
    args: {
        userAddress: v.string(),
        peerInboxId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await verifyUser(ctx, args.userAddress);

        const conversation = await ctx.db
            .query("conversations")
            .withIndex("by_user_peer", (q) =>
                q.eq("userId", user._id).eq("peerInboxId", args.peerInboxId)
            )
            .first();

        if (!conversation) return null;

        let peerUser = null;
        if (conversation.peerUserId) {
            peerUser = await ctx.db.get(conversation.peerUserId);
        }

        return { ...conversation, peerUser };
    },
});

// Get total unread count
export const getTotalUnreadCount = query({
    args: { userAddress: v.string() },
    handler: async (ctx, args) => {
        const user = await verifyUser(ctx, args.userAddress);

        const conversations = await ctx.db
            .query("conversations")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .collect();

        // Boolean logic: Count how many conversations have unreadCount > 0
        const unreadConversations = conversations.filter((c) => c.unreadCount > 0).length;

        return unreadConversations;
    },
});
