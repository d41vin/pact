"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle, Loader2 } from "lucide-react";
import { formatTimeAgo } from "@/lib/date-utils";
import NewMessageDialog from "./new-message-dialog";
import { useRouter, useSearchParams } from "next/navigation";
import type { Client } from "@xmtp/browser-sdk";
import { Client as XmtpClient } from "@xmtp/browser-sdk";
import { toast } from "sonner";

interface ConversationListProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    xmtpClient?: Client<any> | null;
    autoStartUser?: any;
    onAutoStartComplete?: () => void;
}

export default function ConversationList({
    xmtpClient,
    autoStartUser,
    onAutoStartComplete,
}: ConversationListProps) {
    const { address } = useAppKitAccount();
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedInboxId = searchParams.get("conversation");
    const [newMessageOpen, setNewMessageOpen] = useState(false);

    const getOrCreateConversation = useMutation(api.conversations.getOrCreateConversation);

    const conversations = useQuery(
        api.conversations.listConversations,
        address ? { userAddress: address } : "skip"
    );

    // Auto-start conversation if user provided
    useEffect(() => {
        if (!autoStartUser || !xmtpClient || !address) return;

        const startConversation = async () => {
            try {
                // Check if friend is reachable on XMTP
                const identifiers = [
                    {
                        identifier: autoStartUser.userAddress,
                        identifierKind: "Ethereum" as const,
                    },
                ];

                const reachable = await XmtpClient.canMessage(identifiers);
                const canMessage = reachable.get(autoStartUser.userAddress);

                if (!canMessage) {
                    toast.error(`${autoStartUser.name} hasn't set up messaging yet`);
                    if (onAutoStartComplete) onAutoStartComplete();
                    return;
                }

                // Create DM conversation on XMTP
                const dm = await xmtpClient.conversations.newDmWithIdentifier({
                    identifier: autoStartUser.userAddress,
                    identifierKind: "Ethereum" as const,
                });
                let peerInboxId = await dm.peerInboxId();


                // Ensure peerInboxId is cleaned of colons and 0x prefixes
                if (peerInboxId.includes(":")) {
                    peerInboxId = peerInboxId.split(":").pop()!;
                }
                if (peerInboxId.startsWith("0x")) {
                    peerInboxId = peerInboxId.slice(2);
                }

                // Get or create conversation metadata in Convex
                await getOrCreateConversation({
                    userAddress: address,
                    peerInboxId: peerInboxId,
                    peerUserId: autoStartUser.userId,
                });

                // Navigate to conversation
                router.push(`/messages?conversation=${peerInboxId}`);

                if (onAutoStartComplete) onAutoStartComplete();
            } catch (error) {
                console.error("Failed to start conversation:", error);
                toast.error("Failed to start conversation");
                if (onAutoStartComplete) onAutoStartComplete();
            }
        };

        startConversation();
    }, [autoStartUser, xmtpClient, address, router, getOrCreateConversation, onAutoStartComplete]);

    const handleSelectConversation = (inboxId: string) => {
        router.push(`/messages?conversation=${inboxId}`);
    };

    const handleNewMessage = () => {
        setNewMessageOpen(true);
    };

    if (conversations === undefined) {
        return (
            <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white">
                <div className="flex items-center justify-between border-b p-4">
                    <h2 className="text-lg font-semibold">Messages</h2>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white">
                {/* Header */}
                <div className="flex items-center justify-between border-b p-4">
                    <h2 className="text-lg font-semibold">Messages</h2>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleNewMessage}
                        className="h-8 w-8 p-0"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
                                <MessageCircle className="h-8 w-8 text-zinc-400" />
                            </div>
                            <h3 className="mb-2 font-semibold text-zinc-900">No messages yet</h3>
                            <p className="mb-4 text-sm text-zinc-500">
                                Start a conversation with your friends
                            </p>
                            <Button onClick={handleNewMessage}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Message
                            </Button>
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <button
                                key={conv._id}
                                onClick={() => handleSelectConversation(conv.peerInboxId)}
                                className={`flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-zinc-50 ${selectedInboxId === conv.peerInboxId ? "bg-blue-50" : ""
                                    }`}
                            >
                                <Avatar className="h-12 w-12 shrink-0">
                                    <AvatarImage src={conv.peerUser?.profileImageUrl} />
                                    <AvatarFallback className="bg-linear-to-br from-blue-400 to-purple-500 text-white">
                                        {conv.peerUser?.name?.charAt(0).toUpperCase() || "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate font-medium text-zinc-900">
                                            {conv.peerUser?.name || "Unknown User"}
                                        </span>
                                        <span className="shrink-0 text-xs text-zinc-500">
                                            {formatTimeAgo(conv.lastMessageAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="truncate text-sm text-zinc-600">
                                            {conv.lastMessagePreview || "No messages yet"}
                                        </p>
                                        {conv.unreadCount > 0 && (
                                            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-blue-500 px-1.5 text-xs font-bold text-white">
                                                {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            <NewMessageDialog
                open={newMessageOpen}
                onOpenChange={setNewMessageOpen}
                xmtpClient={xmtpClient}
            />
        </>
    );
}