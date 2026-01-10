"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import type { Client } from "@xmtp/browser-sdk";
import { Client as XmtpClient } from "@xmtp/browser-sdk";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface NewMessageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    xmtpClient?: Client<any> | null;
}

export default function NewMessageDialog({
    open,
    onOpenChange,
    xmtpClient,
}: NewMessageDialogProps) {
    const { address } = useAppKitAccount();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [isChecking, setIsChecking] = useState(false);

    const getOrCreateConversation = useMutation(api.conversations.getOrCreateConversation);

    // Get current user
    const currentUser = useQuery(
        api.users.getUser,
        address ? { userAddress: address } : "skip"
    );

    // Get friends list
    const friends = useQuery(
        api.friendships.listFriends,
        currentUser ? { userId: currentUser._id } : "skip"
    );

    // Filter friends based on search
    const filteredFriends = friends?.filter((friend) => {
        const query = searchQuery.toLowerCase();
        return (
            friend.name.toLowerCase().includes(query) ||
            friend.username.toLowerCase().includes(query)
        );
    });

    // Listen for event to start conversation with specific user
    useEffect(() => {
        const handleStartConversation = (event: any) => {
            const { userId, userAddress, name, username, profileImageUrl } = event.detail;

            // Find the friend
            const friend = friends?.find(f => f._id === userId);
            if (friend) {
                handleSelectFriend(friend);
            }
        };

        window.addEventListener("start-conversation-with-user", handleStartConversation);
        return () => {
            window.removeEventListener("start-conversation-with-user", handleStartConversation);
        };
    }, [friends, xmtpClient, address]);

    // Reset search when dialog closes
    useEffect(() => {
        if (!open) {
            setSearchQuery("");
        }
    }, [open]);

    const handleSelectFriend = async (friend: any) => {
        if (!address || !xmtpClient) {
            toast.error("Messaging client not ready");
            return;
        }

        setIsChecking(true);

        try {
            // Check if friend is reachable on XMTP
            const identifiers = [
                {
                    identifier: friend.userAddress,
                    identifierKind: "Ethereum" as const,
                },
            ];

            const reachable = await XmtpClient.canMessage(identifiers);
            const canMessage = reachable.get(friend.userAddress);

            if (!canMessage) {
                toast.error(`${friend.name} hasn't set up messaging yet`);
                setIsChecking(false);
                return;
            }

            // Create DM conversation on XMTP
            const dm = await xmtpClient.conversations.newDmWithIdentifier({
                identifier: friend.userAddress,
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
                peerUserId: friend._id,
            });

            // Close dialog and navigate to conversation
            onOpenChange(false);
            router.push(`/messages?conversation=${peerInboxId}`);
            toast.success(`Started conversation with ${friend.name}`);
        } catch (error: any) {
            console.error("Failed to start conversation:", error);
            toast.error("Failed to start conversation");
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>New Message</DialogTitle>
                    <DialogDescription>
                        Start a conversation with one of your friends
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <Input
                            placeholder="Search friends..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Friends List */}
                    <ScrollArea className="h-[300px]">
                        {!friends || friends.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
                                    <Users className="h-8 w-8 text-zinc-400" />
                                </div>
                                <h3 className="mb-2 text-sm font-semibold text-zinc-900">
                                    No friends yet
                                </h3>
                                <p className="text-xs text-zinc-500">
                                    Add friends to start messaging
                                </p>
                            </div>
                        ) : filteredFriends && filteredFriends.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Search className="mb-4 h-12 w-12 text-zinc-300" />
                                <p className="text-sm text-zinc-500">No friends found</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredFriends?.map((friend) => (
                                    <button
                                        key={friend._id}
                                        onClick={() => handleSelectFriend(friend)}
                                        disabled={isChecking}
                                        className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-zinc-50 disabled:opacity-50"
                                    >
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={friend.profileImageUrl} />
                                            <AvatarFallback className="bg-linear-to-br from-blue-400 to-purple-500 text-white">
                                                {friend.name.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate font-medium text-zinc-900">
                                                    {friend.name}
                                                </span>
                                                <Badge variant="secondary" className="text-xs">
                                                    Friend
                                                </Badge>
                                            </div>
                                            <p className="truncate text-sm text-zinc-500">
                                                @{friend.username}
                                            </p>
                                        </div>
                                        {isChecking && (
                                            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    {/* Info Message */}
                    {!xmtpClient && (
                        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <p className="font-medium">Messaging not ready</p>
                                <p className="text-xs text-amber-800">
                                    Please wait for messaging to initialize
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}