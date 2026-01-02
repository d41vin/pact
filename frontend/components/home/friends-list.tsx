"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Users, Send, HandCoins, Loader2, ArrowUpDown } from "lucide-react";

type SortOption = "alphabetical" | "recent";

export type Friend = Doc<"users"> & {
    friendshipDate: number;
    friendshipId: Id<"friendships">;
};

interface FriendsListProps {
    userId: Id<"users">;
    onPayClick?: (friend: Friend) => void;
    onRequestClick?: (friend: Friend) => void;
}

export default function FriendsList({
    userId,
    onPayClick,
    onRequestClick,
}: FriendsListProps) {
    const router = useRouter();
    const [sortBy, setSortBy] = useState<SortOption>("recent");

    const friends = useQuery(api.friendships.listFriends, { userId });

    // Sort friends based on selected option
    const sortedFriends = useMemo(() => {
        if (!friends) return [];

        const friendsCopy = [...friends];

        switch (sortBy) {
            case "alphabetical":
                return friendsCopy.sort((a, b) => a.name.localeCompare(b.name));
            case "recent":
                return friendsCopy.sort((a, b) => b.friendshipDate - a.friendshipDate);
            default:
                return friendsCopy;
        }
    }, [friends, sortBy]);

    const handleProfileClick = (username: string) => {
        router.push(`/${username}`);
    };

    const handlePay = (e: React.MouseEvent, friend: Friend) => {
        e.stopPropagation();
        if (onPayClick) {
            onPayClick(friend);
        }

        // Always dispatch event to open send payment sheet
        window.dispatchEvent(
            new CustomEvent("open-send-payment", {
                detail: {
                    recipient: {
                        _id: friend._id,
                        name: friend.name,
                        username: friend.username,
                        userAddress: friend.userAddress,
                        profileImageUrl: friend.profileImageUrl,
                    },
                    amount: "",
                },
            })
        );
    };

    const handleRequest = (e: React.MouseEvent, friend: Friend) => {
        e.stopPropagation();
        if (onRequestClick) {
            onRequestClick(friend);
        }

        // Always dispatch event to open request payment sheet
        window.dispatchEvent(
            new CustomEvent("open-request-payment", {
                detail: {
                    recipient: {
                        _id: friend._id,
                        name: friend.name,
                        username: friend.username,
                        userAddress: friend.userAddress,
                        profileImageUrl: friend.profileImageUrl,
                    },
                },
            })
        );
    };

    if (friends === undefined) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (friends.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
                    <Users className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                    No friends yet
                </h3>
                <p className="text-sm text-zinc-500">
                    Start connecting with people to see them here
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Sort Controls */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-600">
                    {friends.length} friend{friends.length !== 1 ? "s" : ""}
                </div>
                <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
                    <SelectTrigger className="w-[180px]">
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="recent">Recently Friended</SelectItem>
                        <SelectItem value="alphabetical">Alphabetical</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Friends List */}
            <div className="space-y-3">
                {sortedFriends.map((friend) => (
                    <div
                        key={friend._id}
                        onClick={() => handleProfileClick(friend.username)}
                        className="flex cursor-pointer items-center gap-3 rounded-[40px] corner-squircle border border-zinc-200 bg-white p-4 transition-all hover:bg-zinc-50 hover:shadow-sm"
                    >
                        {/* Avatar & Info */}
                        <Avatar className="h-12 w-12 shrink-0">
                            <AvatarImage src={friend.profileImageUrl} alt={friend.name} />
                            <AvatarFallback className="bg-linear-to-br from-blue-400 to-purple-500 text-white">
                                {friend.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-zinc-900">
                                {friend.name}
                            </div>
                            <div className="truncate text-sm text-zinc-500">
                                @{friend.username}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex shrink-0 gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handlePay(e, friend)}
                                className="gap-1.5"
                            >
                                <Send className="h-3.5 w-3.5" />
                                Pay
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => handleRequest(e, friend)}
                                className="gap-1.5"
                            >
                                <HandCoins className="h-3.5 w-3.5" />
                                Request
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}