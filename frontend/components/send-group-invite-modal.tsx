"use client";

import { useState } from "react";
import Image from "next/image";
import { Users, Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Id } from "@/convex/_generated/dataModel";

interface SendGroupInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friendId: Id<"users">;
  friendName: string;
  friendUsername: string;
}

export default function SendGroupInviteModal({
  open,
  onOpenChange,
  friendId,
  friendName,
  friendUsername,
}: SendGroupInviteModalProps) {
  const { address } = useAppKitAccount();
  const [selectedGroups, setSelectedGroups] = useState<Id<"groups">[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current user
  const currentUser = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip",
  );

  // Get user's groups where they can invite
  const userGroups = useQuery(
    api.groups.listUserGroups,
    currentUser ? { userId: currentUser._id } : "skip",
  );

  // Get friend's existing group memberships
  const friendGroups = useQuery(api.groups.listUserGroups, {
    userId: friendId,
  });

  // Mutation
  const sendInvitation = useMutation(api.groups.sendInvitation);

  // Filter out groups the friend is already in
  const friendGroupIds = new Set(friendGroups?.map((g) => g._id) || []);
  const availableGroups =
    userGroups?.filter((group) => {
      // Friend not already in group
      if (friendGroupIds.has(group._id)) return false;

      // User has permission to invite (admins or based on permissions)
      return group.userRole === "admin";
    }) || [];

  const toggleGroup = (groupId: Id<"groups">) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId],
    );
  };

  const handleSend = async () => {
    if (!address || selectedGroups.length === 0) return;

    setIsSubmitting(true);

    try {
      // Send invitations to all selected groups
      await Promise.all(
        selectedGroups.map((groupId) =>
          sendInvitation({
            userAddress: address,
            groupId,
            inviteeId: friendId,
          }),
        ),
      );

      toast.success(
        `Invited ${friendName} to ${selectedGroups.length} group${selectedGroups.length !== 1 ? "s" : ""}`,
      );

      // Reset and close
      setSelectedGroups([]);
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Invitation error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send invitations",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invite to Groups
          </DialogTitle>
          <DialogDescription>
            Invite {friendName} (@{friendUsername}) to your groups
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected Count */}
          {selectedGroups.length > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <span className="text-sm font-medium text-slate-700">
                {selectedGroups.length} group
                {selectedGroups.length !== 1 ? "s" : ""} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedGroups([])}
              >
                Clear
              </Button>
            </div>
          )}

          {/* Groups List */}
          <ScrollArea className="h-[300px]">
            {!userGroups ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : availableGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="mb-3 h-12 w-12 text-slate-300" />
                <p className="mb-2 text-sm font-medium text-slate-900">
                  No groups available
                </p>
                <p className="text-sm text-slate-500">
                  {friendGroupIds.size > 0
                    ? `${friendName} is already in all your groups`
                    : "You don't have permission to invite members to any groups"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {availableGroups.map((group) => {
                  const isSelected = selectedGroups.includes(group._id);

                  return (
                    <button
                      key={group._id}
                      onClick={() => toggleGroup(group._id)}
                      className={`flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                        isSelected
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {/* Group Icon/Image */}
                      <div className="relative flex-shrink-0">
                        {group.imageType === "emoji" ? (
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                            style={{
                              backgroundColor: group.accentColor + "20",
                            }}
                          >
                            {group.imageOrEmoji}
                          </div>
                        ) : (
                          <div className="relative h-12 w-12 overflow-hidden rounded-full">
                            <Image
                              src={group.imageOrEmoji}
                              alt={group.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        {isSelected && (
                          <div
                            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white"
                            style={{ backgroundColor: group.accentColor }}
                          >
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>

                      {/* Group Info */}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-slate-900">
                          {group.name}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span>{group.memberCount} members</span>
                          {group.userRole === "admin" && (
                            <>
                              <span>•</span>
                              <span className="text-xs">Admin</span>
                            </>
                          )}
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
            onClick={() => {
              setSelectedGroups([]);
              onOpenChange(false);
            }}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            className="flex-1"
            disabled={selectedGroups.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4" />
                Send {selectedGroups.length > 0 && `(${selectedGroups.length})`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
