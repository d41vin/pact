"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useXmtp } from "@/providers/xmtp-provider";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { DecodedMessage, ConsentState } from "@xmtp/browser-sdk";
import { ContentTypeReaction } from "@xmtp/content-type-reaction";

// Helper to clean peerInboxId
const cleanInboxId = (id: string | null | undefined) => {
    if (!id) return "";
    const result = id.includes(":") ? id.split(":").pop()! : id;
    return result.startsWith("0x") ? result.slice(2) : result;
};

export function GlobalMessageListener() {
    const { client } = useXmtp();
    const { address } = useAppKitAccount();
    const searchParams = useSearchParams();
    const updateUnreadCount = useMutation(api.conversations.updateUnreadCount);

    // Store latest searchParams in ref to access fresh value inside closure
    const searchParamsRef = useRef(searchParams);

    useEffect(() => {
        searchParamsRef.current = searchParams;
    }, [searchParams]);

    useEffect(() => {
        if (!client || !address) return;

        let streamCleanup: (() => void) | null = null;
        let isMounted = true;
        const listenerId = Math.random().toString(36).slice(2, 7);

        const startStream = async () => {
            console.log(`GlobalMessageListener [${listenerId}]: Starting global stream...`);

            try {
                const stream = await client.conversations.streamAllMessages({
                    consentStates: [ConsentState.Allowed],
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onValue: async (msg: DecodedMessage<any>) => {
                        if (!isMounted) return;

                        // 1. Ignore if sent by self
                        if (msg.senderInboxId === client.inboxId) return;

                        // 2. Ignore if it's a reaction
                        if (msg.contentType?.sameAs(ContentTypeReaction)) return;

                        // 3. Check if we are currently viewing this conversation
                        const currentConversationId = searchParamsRef.current?.get("conversation");
                        const senderId = cleanInboxId(msg.senderInboxId);
                        const activeId = cleanInboxId(currentConversationId);

                        if (senderId === activeId) {
                            // User is looking at this conversation, ignore
                            // User is looking at this conversation, ignore
                            return;
                        }

                        // Robust timestamp extraction
                        let messageTimestamp: number;
                        if (msg.sent && typeof msg.sent.getTime === 'function') {
                            messageTimestamp = msg.sent.getTime();
                        } else if (typeof msg.sentAtNs === 'bigint') {
                            messageTimestamp = Number(msg.sentAtNs / BigInt(1000000));
                        } else {
                            messageTimestamp = Date.now();
                        }



                        // 4. Update Convex
                        await updateUnreadCount({
                            userAddress: address,
                            peerInboxId: senderId,
                            messagePreview: (typeof msg.content === 'string')
                                ? msg.content.substring(0, 50)
                                : "New message",
                            messageId: msg.id,
                            messageTimestamp: messageTimestamp,
                        });

                    },
                    onError: (err) => {
                        console.error(`GlobalMessageListener [${listenerId}]: Stream error:`, err);
                    }
                });

                if (!isMounted) {
                    console.log(`GlobalMessageListener [${listenerId}]: Mounted check failed, closing stream immediately.`);
                    stream.return?.();
                    return;
                }

                streamCleanup = () => {
                    console.log(`GlobalMessageListener [${listenerId}]: Cleaning up stream.`);
                    stream.return?.();
                };

            } catch (error) {
                console.error(`GlobalMessageListener [${listenerId}]: Failed to start stream:`, error);
            }
        };

        startStream();

        return () => {
            isMounted = false;
            console.log(`GlobalMessageListener [${listenerId}]: Unmounting...`);
            if (streamCleanup) streamCleanup();
        };
    }, [client, address, updateUnreadCount]);



    return null; // Headless component
}
