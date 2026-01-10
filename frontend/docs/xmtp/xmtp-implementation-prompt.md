I need you to implement the XMTP Direct Messaging feature described in this implementation prompt which you generated in another chat session with me. I've provided the relevant files from the codebase and the XMTP reference documentation. Please follow the implementation prompt phases and create all necessary files. Start with Phase 1. 

---

# 🎯 XMTP Direct Messaging (DM) Feature - Complete Implementation Prompt

## Overview

Build a lightweight, Instagram-style direct messaging system for 1-to-1 conversations using the XMTP Browser SDK. The feature should feel familiar, calm, and not distract from the app's core financial functionality.

---

## 🏗️ Architecture Decisions

### XMTP Client Initialization
- **Lazy initialization**: Initialize XMTP client when user first accesses Messages tab
- Show loading state during client creation
- Cache client instance after creation for session

### Data Architecture (Hybrid Approach)
**XMTP stores:**
- Actual message content
- Message reactions
- Delivery/encryption metadata

**Convex stores:**
- Conversation list metadata
- Last read message IDs per conversation
- Conversation mute preferences
- Unread counts
- Friend relationship data (existing)

### Privacy & Consent
- **App-level:** friends-only setting (existing in users table)
- **XMTP-level:** consent state (Allowed/Unknown/Denied)
- When users become friends → automatically set XMTP consent to "Allowed"
- When users unfriend → set XMTP consent to "Denied" and hide conversation
- When users block → set XMTP consent to "Denied" and hide conversation

---

## 📊 Data Models (Convex Schema)

Add to `convex/schema.ts`:

```typescript
// Direct message conversations metadata
conversations: defineTable({
  userId: v.id("users"),
  peerInboxId: v.string(), // XMTP inbox ID
  peerUserId: v.optional(v.id("users")), // App user ID if they're a user
  lastMessageAt: v.number(),
  lastMessagePreview: v.optional(v.string()),
  lastReadMessageId: v.optional(v.string()), // XMTP message ID
  unreadCount: v.number(),
  isMuted: v.boolean(),
})
  .index("by_user", ["userId"])
  .index("by_user_lastMessage", ["userId", "lastMessageAt"])
  .index("by_user_peer", ["userId", "peerInboxId"]),
```

---

## 🎨 Component Structure

### New Files to Create

```
frontend/
├── app/
│   └── messages/
│       ├── page.tsx                          # Main messages page
│       └── [inboxId]/
│           └── page.tsx                      # Individual conversation (mobile)
├── components/
│   └── messages/
│       ├── messages-layout.tsx               # Responsive layout wrapper
│       ├── conversation-list.tsx             # Sidebar conversation list
│       ├── conversation-view.tsx             # Main conversation panel
│       ├── message-bubble.tsx                # Individual message display
│       ├── message-input.tsx                 # Message compose input
│       ├── new-message-dialog.tsx            # Friend search for new DM
│       ├── conversation-header.tsx           # User info header
│       └── message-reactions.tsx             # Reaction picker/display
├── hooks/
│   ├── use-xmtp-client.ts                    # XMTP client management
│   ├── use-conversations.ts                  # Conversation list state
│   ├── use-messages.ts                       # Message stream for conversation
│   └── use-message-input.ts                  # Input state management
└── lib/
    └── xmtp/
        ├── client.ts                         # XMTP client initialization
        ├── consent.ts                        # Consent management helpers
        └── types.ts                          # XMTP type definitions
```

### Files to Modify

```
- components/bottom-nav.tsx                    # Add Messages tab
- components/profile-card.tsx                  # Add Message button
- convex/friendships.ts                        # Add XMTP consent sync
- convex/blocks.ts                             # Add XMTP consent sync
- package.json                                 # Add XMTP dependencies
```

---

## 🔧 Technical Implementation

### 1. Install Dependencies

```bash
npm install @xmtp/browser-sdk @xmtp/content-type-reaction
```

### 2. XMTP Client Management (`hooks/use-xmtp-client.ts`)

```typescript
import { Client } from "@xmtp/browser-sdk";
import { ReactionCodec } from "@xmtp/content-type-reaction";
import { useAppKitAccount } from "@reown/appkit/react";
import { useWalletClient } from "wagmi";

export function useXmtpClient() {
  const [client, setClient] = useState<Client | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAppKitAccount();
  const { data: walletClient } = useWalletClient();

  const initializeClient = useCallback(async () => {
    if (!address || !walletClient) return;
    if (client) return; // Already initialized

    setIsInitializing(true);
    try {
      // Create XMTP signer from wallet
      const signer = {
        type: "EOA" as const,
        getIdentifier: () => ({
          identifier: address,
          identifierKind: "Ethereum" as const,
        }),
        signMessage: async (message: Uint8Array) => {
          const signature = await walletClient.signMessage({
            message: { raw: message },
          });
          return new Uint8Array(Buffer.from(signature.slice(2), "hex"));
        },
      };

      // Create client
      const xmtpClient = await Client.create(signer, {
        env: "production",
        codecs: [new ReactionCodec()],
      });

      setClient(xmtpClient);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsInitializing(false);
    }
  }, [address, walletClient, client]);

  return { client, isInitializing, error, initializeClient };
}
```

### 3. Conversation Management (`convex/conversations.ts`)

```typescript
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
      lastMessageAt: Date.now(),
      lastMessagePreview: args.messagePreview,
      unreadCount: args.isFromSelf ? 0 : conversation.unreadCount + 1,
    });
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
```

### 4. Consent Management Integration

Update `convex/friendships.ts`:

```typescript
// After accepting friendship, set XMTP consent to Allowed
// Add this after friendship status update in acceptFriendRequest:

// TODO: Trigger client-side to set XMTP consent
// We'll do this via a notification or event that the client listens for
```

Update `convex/blocks.ts`:

```typescript
// After blocking, set XMTP consent to Denied
// Similar pattern - client-side will handle XMTP consent update
```

**Note:** XMTP consent must be set client-side since it requires the XMTP client instance. We'll handle this via events or polling.

---

## 🎨 UI Components

### Messages Layout (`components/messages/messages-layout.tsx`)

```typescript
"use client";

import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import ConversationList from "./conversation-list";
import ConversationView from "./conversation-view";
import { useSearchParams } from "next/navigation";

export default function MessagesLayout() {
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const selectedConversation = searchParams.get("conversation");

  if (isMobile) {
    // Mobile: show list or conversation, not both
    return selectedConversation ? (
      <ConversationView inboxId={selectedConversation} />
    ) : (
      <ConversationList />
    );
  }

  // Desktop: sidebar + panel layout
  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4">
      <div className="w-80 shrink-0">
        <ConversationList />
      </div>
      <div className="flex-1">
        {selectedConversation ? (
          <ConversationView inboxId={selectedConversation} />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-500">
            <div className="text-center">
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Conversation List (`components/messages/conversation-list.tsx`)

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle } from "lucide-react";
import { formatTimeAgo } from "@/lib/date-utils";
import { useState } from "react";
import NewMessageDialog from "./new-message-dialog";
import { useRouter, useSearchParams } from "next/navigation";

export default function ConversationList() {
  const { address } = useAppKitAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedInboxId = searchParams.get("conversation");
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  const conversations = useQuery(
    api.conversations.listConversations,
    address ? { userAddress: address } : "skip"
  );

  const handleSelectConversation = (inboxId: string) => {
    router.push(`/messages?conversation=${inboxId}`);
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">Messages</h2>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setNewMessageOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {!conversations || conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="mb-4 h-12 w-12 text-zinc-300" />
            <h3 className="mb-2 font-semibold text-zinc-900">No messages yet</h3>
            <p className="mb-4 text-sm text-zinc-500">
              Start a conversation with your friends
            </p>
            <Button onClick={() => setNewMessageOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Message
            </Button>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv._id}
              onClick={() => handleSelectConversation(conv.peerInboxId)}
              className={`flex w-full items-center gap-3 border-b p-4 transition-colors hover:bg-zinc-50 ${
                selectedInboxId === conv.peerInboxId ? "bg-blue-50" : ""
              }`}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={conv.peerUser?.profileImageUrl} />
                <AvatarFallback>
                  {conv.peerUser?.name.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-900">
                    {conv.peerUser?.name || "Unknown User"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatTimeAgo(conv.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm text-zinc-600">
                    {conv.lastMessagePreview || "No messages yet"}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <NewMessageDialog open={newMessageOpen} onOpenChange={setNewMessageOpen} />
    </div>
  );
}
```

### Conversation View (`components/messages/conversation-view.tsx`)

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { useXmtpClient } from "@/hooks/use-xmtp-client";
import { useMessages } from "@/hooks/use-messages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import MessageBubble from "./message-bubble";
import MessageInput from "./message-input";
import ConversationHeader from "./conversation-header";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";

interface ConversationViewProps {
  inboxId: string;
}

export default function ConversationView({ inboxId }: ConversationViewProps) {
  const { client, isInitializing, initializeClient } = useXmtpClient();
  const { messages, isLoading, sendMessage } = useMessages(client, inboxId);
  const router = useRouter();
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize XMTP client on mount
  useEffect(() => {
    initializeClient();
  }, [initializeClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleBack = () => {
    if (isMobile) {
      router.push("/messages");
    }
  };

  if (isInitializing) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white">
      {/* Header */}
      <ConversationHeader inboxId={inboxId} onBack={handleBack} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <p className="text-lg text-zinc-600">Say hi 👋</p>
              <p className="mt-2 text-sm text-zinc-500">
                Start the conversation
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

---

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure (Priority 1)
1. ✅ Add XMTP dependencies
2. ✅ Create Convex schema for conversations
3. ✅ Build XMTP client hook
4. ✅ Create basic messages layout
5. ✅ Add Messages tab to bottom nav

### Phase 2: Conversation List (Priority 1)
1. ✅ Build conversation list component
2. ✅ Implement new message dialog
3. ✅ Add friend search for new DMs
4. ✅ Handle conversation selection

### Phase 3: Message View (Priority 1)
1. ✅ Build conversation view component
2. ✅ Implement message streaming
3. ✅ Create message bubble component
4. ✅ Add message input
5. ✅ Handle message sending

### Phase 4: Additional Features (Priority 2)
1. ✅ Add message reactions
2. ✅ Implement unread tracking
3. ✅ Add conversation header with profile link
4. ✅ Handle message grouping by time
5. ✅ Add date separators

### Phase 5: Integration (Priority 2)
1. ✅ Add Message button to profile cards
2. ✅ Sync XMTP consent with friendship changes
3. ✅ Sync XMTP consent with blocking
4. ✅ Handle friends-only messaging restriction

### Phase 6: Polish (Priority 3)
1. ✅ Add loading states
2. ✅ Handle errors gracefully
3. ✅ Add empty states
4. ✅ Optimize mobile experience
5. ✅ Test cross-device sync

---

## 🎯 Key User Flows

### Flow 1: Start New Conversation
1. User clicks Messages in bottom nav
2. Client lazy-loads XMTP (first time only)
3. User clicks "New Message"
4. Search dialog shows friends only
5. User selects friend
6. Empty conversation opens with "Say hi 👋"
7. User sends first message
8. Conversation appears in list

### Flow 2: Receive Message
1. User has XMTP client active
2. Message arrives via stream
3. Convex conversation updated (unread count++)
4. Conversation list re-renders with unread badge
5. If conversation open, mark as read automatically

### Flow 3: Message from Profile
1. User views friend's profile
2. Clicks "Message" button
3. Navigates to /messages?conversation={inboxId}
4. Opens existing conversation or creates new one

### Flow 4: Friends-Only Restriction
1. User A enables friends-only in settings
2. User B (not friend) views User A's profile
3. Message button shows disabled with tooltip
4. User B cannot search for User A in "New Message"

---

## ⚠️ Edge Cases & Error Handling

### XMTP Client Failures
- Show error message if client initialization fails
- Provide retry button
- Don't block app - allow user to navigate away

### Network Issues
- Show "Sending..." state for messages
- Show error icon if message fails to send
- Allow retry on failed messages

### Blocked/Unfriended Users
- Hide conversations from blocked users
- Show "User unavailable" for unfriended users
- Prevent new messages to blocked/unfriended users

### Consent State Mismatches
- If XMTP consent is "Denied" but app allows, respect XMTP
- Show appropriate error messages
- Guide user to check their settings

### Cross-Device Sync
- Convex handles unread state sync
- XMTP handles message sync
- Handle race conditions gracefully

---

## 📝 Testing Checklist

- [ ] Can initialize XMTP client
- [ ] Can start new conversation with friend
- [ ] Can send text messages
- [ ] Can receive messages in real-time
- [ ] Unread count updates correctly
- [ ] Conversation list sorts by recent
- [ ] Message button on profile works
- [ ] Friends-only restriction works
- [ ] Blocked users can't message
- [ ] Mobile navigation works
- [ ] Desktop sidebar works
- [ ] Reactions work (Phase 4)
- [ ] Empty states display correctly
- [ ] Loading states work
- [ ] Error states show appropriately

---

## 🎨 Design Notes

### Colors & Styling
- Use existing app color scheme
- Message bubbles: 
  - Sent: blue gradient (similar to Send action button)
  - Received: light gray
- Keep consistent with other features
- Use corner-squircle for message bubbles

### Animations
- Smooth scroll to new messages
- Subtle hover states on conversations
- Loading spinners for async operations

### Accessibility
- Keyboard navigation in conversation list
- Focus management for message input
- ARIA labels for buttons and controls

---

This implementation prompt gives you everything needed to build the DM feature. Start with Phase 1 and work through systematically. The architecture is designed to be extensible.

Ready to start implementing? 🚀