"use client";

import { useState } from "react";
import { UserPlus, Search, Loader2, X, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Id } from "@/convex/_generated/dataModel";

interface InviteMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: Id<"groups">;
  groupName: string;
  accentColor: string;
  existingMemberIds: Id<"users">[];
}

export default function InviteMembersModal({
  open,
  onOpenChange,
  groupId,
  groupName,
  accentColor,
  existingMemberIds,
}: InviteMembersModalProps) {
  const { address } = useAppKitAccount();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<Id<"users">[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current user
  const currentUser = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip",
  );

  // Get friends list
  const friends = useQuery(
    api.friendships.listFriends,
    currentUser ? { userId: currentUser._id } : "skip",
  );

  // Mutation
  const sendInvitation = useMutation(api.groups.sendInvitation);

  // Filter friends who aren't already members
  const availableFriends =
    friends?.filter((friend) => !existingMemberIds.includes(friend._id)) || [];

  // Filter by search query
  const filteredFriends = availableFriends.filter(
    (friend) =>
      friend.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleFriend = (friendId: Id<"users">) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId],
    );
  };

  const handleInvite = async () => {
    if (!address || selectedFriends.length === 0) return;

    setIsSubmitting(true);

    try {
      // Send invitations
      await Promise.all(
        selectedFriends.map((friendId) =>
          sendInvitation({
            userAddress: address,
            groupId,
            inviteeId: friendId,
          }),
        ),
      );

      toast.success(
        `Invited ${selectedFriends.length} friend${selectedFriends.length !== 1 ? "s" : ""} to ${groupName}`,
      );

      // Reset and close
      setSelectedFriends([]);
      setSearchQuery("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Invitation error:", error);
      toast.error(error.message || "Failed to send invitations");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Members
          </DialogTitle>
          <DialogDescription>
            Invite friends to join {groupName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Selected Count */}
          {selectedFriends.length > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <span className="text-sm font-medium text-slate-700">
                {selectedFriends.length} friend
                {selectedFriends.length !== 1 ? "s" : ""} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFriends([])}
              >
                Clear
              </Button>
            </div>
          )}

          {/* Friends List */}
          <ScrollArea className="h-[300px]">
            {!friends ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : availableFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <UserPlus className="mb-3 h-12 w-12 text-slate-300" />
                <p className="mb-2 text-sm font-medium text-slate-900">
                  No friends to invite
                </p>
                <p className="text-sm text-slate-500">
                  All your friends are already in this group
                </p>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="mb-3 h-12 w-12 text-slate-300" />
                <p className="text-sm text-slate-500">No friends found</p>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {filteredFriends.map((friend) => {
                  const isSelected = selectedFriends.includes(friend._id);

                  return (
                    <button
                      key={friend._id}
                      onClick={() => toggleFriend(friend._id)}
                      className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                        isSelected
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={friend.profileImageUrl}
                            alt={friend.name || "Friend"}
                          />
                          <AvatarFallback
                            className="text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            {(friend.name || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isSelected && (
                          <div
                            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-slate-900">
                          {friend.name || "Unknown"}
                        </div>
                        <div className="truncate text-sm text-slate-500">
                          @{friend.username || "unknown"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 border-t border-slate-200 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleInvite}
            className="flex-1"
            disabled={selectedFriends.length === 0 || isSubmitting}
            style={{
              backgroundColor:
                selectedFriends.length > 0 ? accentColor : undefined,
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Inviting...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite{" "}
                {selectedFriends.length > 0 && `(${selectedFriends.length})`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
