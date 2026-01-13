"use client";

import { useEffect, useRef } from "react";
import type { Client, Conversation } from "@xmtp/browser-sdk";
import { useMessages } from "@/hooks/use-messages";
import { Loader2 } from "lucide-react";
import MessageBubble from "./message-bubble";
import MessageInput from "./message-input";
import { areAddressesEqual, formatAddress } from "@/lib/utils";
import ConversationHeader from "./conversation-header";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ConversationViewProps {
    inboxId?: string; // Optional for Groups
    conversation?: Conversation; // Optional passed conversation object
    isGroup?: boolean;
    members?: { userAddress?: string; name?: string }[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    xmtpClient?: Client<any> | null; // Optional if using context hook inside, but we pass it
    onBack?: () => void;
    peerAddress?: string; // For key uniqueness in groups
}

export default function ConversationView({
    inboxId,
    conversation,
    isGroup = false,
    members = [],
    xmtpClient,
    onBack,
    peerAddress,
}: ConversationViewProps) {
    const { messages, isLoading, isSending, sendMessage, sendReaction, peerUser } = useMessages(
        xmtpClient || null,
        inboxId || null,
        conversation
    );

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Auto-scroll to bottom on mount
    useEffect(() => {
        if (!isLoading && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "auto" });
        }
    }, [isLoading]);

    return (
        <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white">
            {/* Header */}
            <ConversationHeader inboxId={inboxId} onBack={onBack} />

            {/* Messages Area */}
            <div className="relative flex-1 overflow-hidden">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center">
                        <div className="px-6">
                            <p className="text-lg text-zinc-600">Say hi 👋</p>
                            <p className="mt-2 text-sm text-zinc-500">
                                Start the conversation
                            </p>
                        </div>
                    </div>
                ) : (
                    <ScrollArea className="h-full">
                        <div className="p-4">
                            ) : (
                            <ScrollArea className="h-full">
                                <div className="p-4">
                                    {messages.map((message, index) => {
                                        // Group messages by sender and time gaps
                                        const prevMessage = messages[index - 1];
                                        const isSequence = prevMessage &&
                                            areAddressesEqual(prevMessage.senderInboxId, message.senderInboxId) &&
                                            (message.sentAt - prevMessage.sentAt < 5 * 60 * 1000); // 5 min gap

                                        const showTimestamp = !isSequence && (
                                            index === 0 ||
                                            (message.sentAt - (prevMessage?.sentAt || 0) > 5 * 60 * 1000)
                                        );

                                        const showSenderName = isGroup && !message.isFromSelf && !isSequence;

                                        return (
                                            <MessageBubble
                                                key={message.id}
                                                message={message}
                                                reactions={
                                                    message.reactions && typeof message.reactions === 'object' && !('mine' in message.reactions)
                                                        ? message.reactions as unknown as Record<string, number>
                                                        : message.reactions
                                                            ? Object.entries(message.reactions as Record<string, { count: number }>).reduce((acc, [emoji, data]) => ({ ...acc, [emoji]: data.count }), {} as Record<string, number>)
                                                            : undefined
                                                }
                                                showTimestamp={showTimestamp}
                                                senderName={
                                                    showSenderName
                                                        ? members.find(m =>
                                                            areAddressesEqual(m.userAddress, message.senderInboxId)
                                                        )?.name || formatAddress(message.senderInboxId)
                                                        : undefined
                                                }
                                                onReact={sendReaction}
                                                peerUser={peerUser}
                                            />



                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>
                )}
                        </div>

                        {/* Input */}
                        <MessageInput onSend={sendMessage} isSending={isSending} />
                    </div>
                );
}