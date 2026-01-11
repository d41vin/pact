import { useState, useEffect, useCallback } from "react";
import { Client, ConsentState, ContentTypeId, type DecodedMessage } from "@xmtp/browser-sdk";
import { ContentTypeReaction, type Reaction } from "@xmtp/content-type-reaction";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";

// Helper to clean peerInboxId (handles "address:inboxId" and "0x" prefixes)
const cleanInboxId = (id: string | null | undefined) => {
    if (!id) return "";
    const result = id.includes(":") ? id.split(":").pop()! : id;
    return result.startsWith("0x") ? result.slice(2) : result;
};


interface Message {
    id: string;
    content: string;
    senderInboxId: string;
    sentAt: number;
    isFromSelf: boolean;
    reactions?: Record<string, { count: number; reactors: string[]; mine: boolean }>;
}


export function useMessages(client: Client | null, peerInboxId: string | null) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [reactions, setReactions] = useState<Record<string, Record<string, Set<string>>>>({});

    const { address } = useAppKitAccount();

    const updateConversation = useMutation(api.conversations.updateConversation);
    const markAsRead = useMutation(api.conversations.markAsRead);

    // Fetch conversation metadata from Convex to get the peer's address in case we need it
    const conversationMetadata = useQuery(
        api.conversations.getConversationByInboxId,
        address && peerInboxId ? { userAddress: address, peerInboxId: cleanInboxId(peerInboxId) } : "skip"
    );


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const peerAddress = conversationMetadata?.peerUser?.userAddress || (conversationMetadata as any)?.peerInboxId;



    // Helper to get or sync DM conversation
    const getOrSyncDm = useCallback(async (id: string) => {
        if (!client) return null;

        const dmId = cleanInboxId(id);

        // 1. Try to get by ID
        let dm = await client.conversations.getDmByInboxId(dmId);

        // 2. If not found, try syncing
        if (!dm) {
            console.log(`useMessages: DM ${dmId} not found, syncing...`);
            await client.conversations.sync();
            dm = await client.conversations.getDmByInboxId(dmId);
        }

        // 3. If still not found, try to create/get by address if we have it
        if (!dm && peerAddress) {
            console.log(`useMessages: DM ${dmId} still not found, trying by address ${peerAddress}...`);
            try {
                dm = await client.conversations.newDmWithIdentifier({
                    identifier: peerAddress,
                    identifierKind: "Ethereum" as const,
                    reactions: true, // Added reactions: true
                });
            } catch (e) {
                console.error("Failed to create DM with reactions:", e);
            }
        }



        return dm;
    }, [client, peerAddress]);

    // Fetch message history and set up streaming
    useEffect(() => {
        if (!client || !peerInboxId || !address) {
            setIsLoading(false);
            return;
        }

        let streamCleanup: (() => void) | null = null;

        const setupMessaging = async () => {
            try {
                setIsLoading(true);

                const dmId = cleanInboxId(peerInboxId);
                console.log(`useMessages: Setting up messaging for ${dmId}...`);
                let dm = await getOrSyncDm(dmId);

                if (!dm) {
                    console.error(`useMessages: Could not find or create DM for ${dmId}`);
                    setIsLoading(false);
                    return;
                }

                console.log(`useMessages: DM found/created, fetching history...`);
                // Fetch message history - XMTP v5 may have issues with limit conversion in some environments
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let history: DecodedMessage<any>[] = [];

                try {

                    history = await dm.messages();
                    console.log(`useMessages: Fetched ${history.length} messages`);
                } catch (e) {
                    console.error("useMessages: Failed to fetch messages:", e);
                }


                // Process history for both text and reactions
                const textMessages: Message[] = [];
                const historyReactions: Record<string, Record<string, Set<string>>> = {};

                for (const msg of history) {
                    if (msg.contentType?.sameAs(ContentTypeReaction)) {
                        const reaction = msg.content as Reaction;
                        const targetId = reaction.reference;
                        const emoji = reaction.content;
                        const action = reaction.action;
                        const reactorId = msg.senderInboxId;

                        if (!historyReactions[targetId]) historyReactions[targetId] = {};
                        if (!historyReactions[targetId][emoji]) historyReactions[targetId][emoji] = new Set();

                        if (action === "added") {
                            historyReactions[targetId][emoji].add(reactorId);
                        } else if (action === "removed") {
                            historyReactions[targetId][emoji].delete(reactorId);
                        }
                    } else if (typeof msg.content === 'string') {

                        textMessages.push({
                            id: msg.id,
                            content: msg.content,
                            senderInboxId: msg.senderInboxId,
                            sentAt: typeof msg.sentAtNs === 'bigint'
                                ? Number(msg.sentAtNs / BigInt(1000000))
                                : Date.now(),
                            isFromSelf: msg.senderInboxId === client.inboxId,
                        });
                    }
                }

                setMessages(textMessages);
                setReactions(historyReactions);



                // Mark as read when viewing
                if (textMessages.length > 0) {
                    const lastMessage = textMessages[textMessages.length - 1];
                    const actualPeerInboxId = await dm.peerInboxId();

                    // Zombie Check
                    const currentParams = new URLSearchParams(window.location.search);
                    const activeConversationId = currentParams.get("conversation");
                    const isActive = cleanInboxId(activeConversationId) === cleanInboxId(peerInboxId);

                    if (isActive) {
                        await markAsRead({
                            userAddress: address,
                            peerInboxId: cleanInboxId(actualPeerInboxId),
                            lastReadMessageId: lastMessage.id,
                        });
                    }
                }




                // Set up message streaming
                const stream = await client.conversations.streamAllMessages({
                    consentStates: [ConsentState.Allowed],
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onValue: async (msg: DecodedMessage<any>) => {
                        // Only add messages from this conversation
                        if (msg.conversationId && msg.senderInboxId) {
                            // Filter: Ensure message belongs to this DM (either from peer or from self)
                            // We use robust ID comparison
                            const msgSender = cleanInboxId(msg.senderInboxId);
                            const currentPeer = cleanInboxId(peerInboxId);
                            const myInbox = cleanInboxId(client.inboxId);

                            if (msgSender !== currentPeer && msgSender !== myInbox) {
                                return;
                            }

                            // Check if this is a reaction
                            if (msg.contentType?.sameAs(ContentTypeReaction)) {
                                const reaction = msg.content as Reaction;
                                const targetMessageId = reaction.reference;
                                const emoji = reaction.content;
                                const action = reaction.action; // "added" or "removed"

                                setReactions((prev) => {
                                    const emojiMap = prev[targetMessageId] || {};
                                    const reactors = new Set(emojiMap[emoji] || []);
                                    const reactorId = msg.senderInboxId;

                                    if (action === "added") {
                                        reactors.add(reactorId);
                                    } else if (action === "removed") {
                                        reactors.delete(reactorId);
                                    }

                                    return {
                                        ...prev,
                                        [targetMessageId]: {
                                            ...emojiMap,
                                            [emoji]: reactors,
                                        },
                                    };
                                });


                            } else if (typeof msg.content === 'string') {
                                // Regular text message
                                const newMessage: Message = {
                                    id: msg.id,
                                    content: msg.content,
                                    senderInboxId: msg.senderInboxId,
                                    sentAt: typeof msg.sentAtNs === 'bigint'
                                        ? Number(msg.sentAtNs / BigInt(1000000))
                                        : Date.now(),
                                    isFromSelf: msg.senderInboxId === client.inboxId,
                                };

                                setMessages((prev) => {
                                    // Avoid duplicates
                                    if (prev.some((m) => m.id === newMessage.id)) {
                                        return prev;
                                    }
                                    return [...prev, newMessage];
                                });

                                // Update conversation metadata using the actual DM's peer inbox ID
                                const actualPeerInboxId = await dm.peerInboxId();
                                updateConversation({
                                    userAddress: address,
                                    peerInboxId: cleanInboxId(actualPeerInboxId),
                                    messagePreview: msg.content.substring(0, 50),
                                    isFromSelf: newMessage.isFromSelf,
                                    messageTimestamp: newMessage.sentAt,
                                });


                                // Mark as read if viewing
                                if (!newMessage.isFromSelf) {
                                    // Zombie Check: Ensure we are actually looking at this conversation
                                    // This prevents background/stale hooks from clearing unread counts
                                    const currentParams = new URLSearchParams(window.location.search);
                                    const activeConversationId = currentParams.get("conversation");
                                    const isActive = cleanInboxId(activeConversationId) === cleanInboxId(peerInboxId);

                                    if (isActive) {
                                        markAsRead({
                                            userAddress: address,
                                            peerInboxId: cleanInboxId(actualPeerInboxId),
                                            lastReadMessageId: newMessage.id,
                                        });
                                    } else {
                                        console.log("useMessages: Skipped markAsRead (inactive view)");
                                    }
                                }


                            }
                        }
                    },
                    onError: (error: Error) => {
                        console.error("Message stream error:", error);
                    },
                });

                // Store cleanup function
                streamCleanup = () => {
                    stream.return?.();
                };

                setIsLoading(false);
            } catch (error) {
                console.error("Failed to setup messaging:", error);
                setIsLoading(false);
            }
        };

        // Only setup if we have the metadata (so we have the fallback address if needed)
        // We check this inside the effect now, but we use a ref or derived boolean to control execution
        if (conversationMetadata !== undefined) {
            setupMessaging();
        }

        // Cleanup on unmount
        return () => {
            if (streamCleanup) {
                streamCleanup();
            }
        };
        // Removed `conversationMetadata` from dependencies to prevent re-fetching on timestamp updates
        // We only care if `peerInboxId` changes or if we initially get metadata.
        // `updateConversation` and `markAsRead` are stable.
        // `getOrSyncDm` uses `peerAddress` which is stable (string).
    }, [client, peerInboxId, address, updateConversation, markAsRead, conversationMetadata !== undefined, getOrSyncDm]);

    // Send message
    const sendMessage = useCallback(
        async (content: string) => {
            if (!client || !peerInboxId || !address || !content.trim()) {
                return false;
            }

            setIsSending(true);

            try {
                const dmId = cleanInboxId(peerInboxId);
                console.log(`useMessages: Sending message to ${dmId}:`, content);

                // Get the DM conversation using robust retrieval
                const dm = await getOrSyncDm(dmId);

                if (!dm) {
                    console.error(`useMessages: Cannot send message, DM ${dmId} not found`);
                    return false;
                }

                // Send the message
                await dm.send(content.trim());
                console.log(`useMessages: Message sent successfully to ${dmId}`);

                // Update conversation metadata using the actual peer inbox ID
                const actualPeerInboxId = await dm.peerInboxId();
                await updateConversation({
                    userAddress: address,
                    peerInboxId: cleanInboxId(actualPeerInboxId),
                    messagePreview: content.trim().substring(0, 50),
                    isFromSelf: true,
                    messageTimestamp: Date.now(),
                });


                return true;
            } catch (error) {
                console.error("Failed to send message:", error);
                return false;
            } finally {
                setIsSending(false);
            }

        },
        [client, peerInboxId, address, updateConversation, getOrSyncDm]
    );

    // Send reaction
    const sendReaction = useCallback(
        async (messageId: string, emoji: string) => {
            if (!client || !peerInboxId) {
                return false;
            }

            try {
                // Get the DM conversation using robust retrieval
                const dm = await getOrSyncDm(peerInboxId);

                if (!dm) {
                    console.error("useMessages: DM conversation not found for reaction");
                    return false;
                }

                // Send the reaction
                const reaction: Reaction = {
                    reference: messageId,
                    action: "added",
                    content: emoji,
                    schema: "unicode",
                };


                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await dm.send(reaction as any, ContentTypeReaction);







                return true;
            } catch (error) {
                console.error("Failed to send reaction:", error);
                return false;
            }
        },
        [client, peerInboxId, getOrSyncDm]
    );

    return {
        messages: messages.map((msg) => {
            const msgEmojiReactions = reactions[msg.id] || {};
            const formattedReactions: Record<string, { count: number; reactors: string[]; mine: boolean }> = {};

            Object.entries(msgEmojiReactions).forEach(([emoji, reactors]) => {
                if (reactors.size > 0) {
                    formattedReactions[emoji] = {
                        count: reactors.size,
                        reactors: Array.from(reactors),
                        mine: reactors.has(client?.inboxId || ""),
                    };
                }
            });

            return {
                ...msg,
                reactions: formattedReactions,
            };
        }),

        isLoading,
        isSending,
        sendMessage,
        sendReaction,
        peerUser: conversationMetadata?.peerUser,
    };
}

