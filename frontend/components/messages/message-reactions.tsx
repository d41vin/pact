"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Smile } from "lucide-react";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface MessageReactionsProps {
    messageId: string;
    reactions?: Record<string, { count: number; reactors: string[]; mine: boolean }>;
    onReact: (emoji: string) => void;
    disabled?: boolean;
    peerUser?: any;
}

export default function MessageReactions({
    messageId,
    reactions = {},
    onReact,
    disabled = false,
    peerUser,
}: MessageReactionsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { address } = useAppKitAccount();

    const currentUser = useQuery(
        api.users.getUser,
        address ? { userAddress: address } : "skip"
    );


    const handleReaction = (emoji: string) => {
        // If it's already "mine", we don't need to send it again
        // (XMTP v5 doesn't have a simple "remove" yet without sending a "removed" action)
        if (reactions[emoji]?.mine) return;

        onReact(emoji);
        setIsOpen(false);
    };

    const hasReactions = Object.keys(reactions).length > 0;

    return (
        <div className="flex items-center gap-2">
            {/* Display existing reactions */}
            {hasReactions && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    {Object.entries(reactions).map(([emoji, data]) => (
                        <button
                            key={emoji}
                            onClick={() => handleReaction(emoji)}
                            disabled={disabled || data.mine}
                            className={cn(
                                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors disabled:opacity-80",
                                data.mine
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                            )}
                            title={`${data.mine ? "You" : ""} ${data.mine && data.count > 1 ? "and " : ""} ${data.count > (data.mine ? 1 : 0) ? peerUser?.name || "Peer" : ""} reacted`}
                        >
                            <span className="mr-0.5">{emoji}</span>
                            <div className="flex -space-x-1.5">
                                {data.mine && currentUser && (
                                    <Avatar className="h-4 w-4 border border-white">
                                        <AvatarImage src={currentUser.profileImageUrl} />
                                        <AvatarFallback className="bg-blue-500 text-[8px] text-white">
                                            {currentUser.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                                {(data.count > (data.mine ? 1 : 0)) && (
                                    <Avatar className="h-4 w-4 border border-white">
                                        <AvatarImage src={peerUser?.profileImageUrl} />
                                        <AvatarFallback className="bg-purple-500 text-[8px] text-white">
                                            {peerUser?.name?.charAt(0) || "P"}
                                        </AvatarFallback>
                                    </Avatar>
                                )}

                            </div>
                        </button>
                    ))}
                </div>
            )}



            {/* Reaction picker */}
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                        <Smile className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                    <div className="flex gap-1">
                        {QUICK_REACTIONS.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => handleReaction(emoji)}
                                className="flex h-9 w-9 items-center justify-center rounded-md text-xl transition-colors hover:bg-zinc-100"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}