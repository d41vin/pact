"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, MoreVertical, User, BellOff, Bell, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

interface ConversationHeaderProps {
    inboxId: string;
    onBack?: () => void;
}

export default function ConversationHeader({
    inboxId,
    onBack,
}: ConversationHeaderProps) {
    const { address } = useAppKitAccount();
    const router = useRouter();
    const isMobile = useIsMobile();

    // Clean inboxId (handles "address:inboxId" and "0x" prefixes)
    const cleanId = inboxId.includes(":") ? inboxId.split(":").pop()! : inboxId;
    const finalInboxId = cleanId.startsWith("0x") ? cleanId.slice(2) : cleanId;

    const toggleMute = useMutation(api.conversations.toggleMute);
    const deleteConversation = useMutation(api.conversations.deleteConversation);

    // Get conversation to find peer user
    const conversations = useQuery(
        api.conversations.listConversations,
        address ? { userAddress: address } : "skip"
    );

    const conversation = conversations?.find((c) => c.peerInboxId === finalInboxId);
    const peerUser = conversation?.peerUser;
    const isMuted = conversation?.isMuted || false;

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (isMobile) {
            router.push("/messages");
        }
    };

    const handleProfileClick = () => {
        if (peerUser?.username) {
            router.push(`/${peerUser.username}`);
        }
    };

    const handleToggleMute = async () => {
        if (!address) return;

        try {
            const newMuteState = await toggleMute({
                userAddress: address,
                peerInboxId: finalInboxId,
            });
            toast.success(newMuteState ? "Conversation muted" : "Conversation unmuted");
        } catch (error) {
            toast.error("Failed to update mute setting");
        }
    };

    const handleDelete = async () => {
        if (!address) return;

        if (!confirm("Delete this conversation? Messages will remain on XMTP but won't show in your list.")) {
            return;
        }

        try {
            await deleteConversation({
                userAddress: address,
                peerInboxId: finalInboxId,
            });
            toast.success("Conversation deleted");
            router.push("/messages");
        } catch (error) {
            toast.error("Failed to delete conversation");
        }
    };

    return (
        <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3">
            {/* Back Button (Mobile) */}
            {isMobile && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="shrink-0"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            )}

            {/* User Info */}
            <button
                onClick={handleProfileClick}
                disabled={!peerUser}
                className="flex min-w-0 flex-1 items-center gap-3 text-left transition-opacity hover:opacity-80 disabled:cursor-default disabled:opacity-100"
            >
                <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={peerUser?.profileImageUrl} />
                    <AvatarFallback className="bg-linear-to-br from-blue-400 to-purple-500 text-white">
                        {peerUser?.name?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-zinc-900">
                        {peerUser?.name || "Unknown User"}
                    </div>
                    {peerUser?.username && (
                        <div className="truncate text-sm text-zinc-500">
                            @{peerUser.username}
                        </div>
                    )}
                </div>
            </button>

            {/* Options Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreVertical className="h-5 w-5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {peerUser && (
                        <>
                            <DropdownMenuItem onClick={handleProfileClick}>
                                <User className="mr-2 h-4 w-4" />
                                View Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                        </>
                    )}
                    <DropdownMenuItem onClick={handleToggleMute}>
                        {isMuted ? (
                            <>
                                <Bell className="mr-2 h-4 w-4" />
                                Unmute
                            </>
                        ) : (
                            <>
                                <BellOff className="mr-2 h-4 w-4" />
                                Mute
                            </>
                        )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Conversation
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}