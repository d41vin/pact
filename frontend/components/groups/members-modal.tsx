"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Crown,
  Shield,
  MoreVertical,
  UserMinus,
  UserPlus,
  Loader2,
  X,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Id } from "@/convex/_generated/dataModel";

interface Member {
  _id: Id<"users">;
  name: string;
  username: string;
  profileImageUrl?: string;
  role: "admin" | "member";
  joinedAt: number;
}

interface MembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: Id<"groups">;
  members: Member[];
  creatorId: Id<"users">;
  currentUserRole: "admin" | "member" | null;
  accentColor: string;
}

export default function MembersModal({
  open,
  onOpenChange,
  groupId,
  members,
  creatorId,
  currentUserRole,
  accentColor,
}: MembersModalProps) {
  const router = useRouter();
  const { address } = useAppKitAccount();
  const [searchQuery, setSearchQuery] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  // Mutations
  const promoteMember = useMutation(api.groups.promoteMember);
  const demoteMember = useMutation(api.groups.demoteMember);
  const removeMember = useMutation(api.groups.removeMember);

  const handlePromote = async (memberId: Id<"users">, memberName: string) => {
    if (!address) return;

    try {
      await promoteMember({
        userAddress: address,
        groupId,
        memberId,
      });
      toast.success(`${memberName} promoted to admin`);
    } catch (error: any) {
      toast.error(error.message || "Failed to promote member");
    }
  };

  const handleDemote = async (memberId: Id<"users">, memberName: string) => {
    if (!address) return;

    try {
      await demoteMember({
        userAddress: address,
        groupId,
        memberId,
      });
      toast.success(`${memberName} demoted to member`);
    } catch (error: any) {
      toast.error(error.message || "Failed to demote member");
    }
  };

  const handleRemove = async (memberId: Id<"users">, memberName: string) => {
    if (!address) return;

    if (!confirm(`Remove ${memberName} from the group?`)) {
      return;
    }

    try {
      await removeMember({
        userAddress: address,
        groupId,
        memberId,
      });
      toast.success(`${memberName} removed from group`);
    } catch (error: any) {
      toast.error(error.message || "Failed to remove member");
    }
  };

  const handleViewProfile = (username: string) => {
    router.push(`/${username}`);
    onOpenChange(false);
  };

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const adminCount = members.filter((m) => m.role === "admin").length;
  const memberCount = members.filter((m) => m.role === "member").length;

  const formatJoinDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isCreator = (memberId: Id<"users">) => memberId === creatorId;
  const isCurrentUserAdmin = currentUserRole === "admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members ({members.length})
          </DialogTitle>
          <DialogDescription>
            {adminCount} admin{adminCount !== 1 ? "s" : ""} · {memberCount}{" "}
            member
            {memberCount !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search & Invite */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search members..."
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
            {isCurrentUserAdmin && (
              <Button
                onClick={() => {
                  setIsInviting(true);
                  onOpenChange(false);
                  // TODO: Open invite modal
                  toast.info("Invite feature coming in next component");
                }}
                style={{ backgroundColor: accentColor }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite
              </Button>
            )}
          </div>

          {/* Members List */}
          <ScrollArea className="h-[400px] pr-4">
            {filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="mb-3 h-12 w-12 text-slate-300" />
                <p className="text-sm text-slate-500">No members found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((member) => {
                  const memberIsCreator = isCreator(member._id);
                  const canManage = isCurrentUserAdmin && !memberIsCreator;

                  return (
                    <div
                      key={member._id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50"
                    >
                      <button
                        onClick={() => handleViewProfile(member.username)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage
                            src={member.profileImageUrl}
                            alt={member.name}
                          />
                          <AvatarFallback
                            className="text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate font-medium text-slate-900">
                              {member.name}
                            </div>
                            {memberIsCreator && (
                              <div title="Group Creator">
                                <Crown className="h-4 w-4 flex-shrink-0 text-yellow-500" />
                              </div>
                            )}
                            {member.role === "admin" && !memberIsCreator && (
                              <div title="Admin">
                                <Shield
                                  className="h-4 w-4 flex-shrink-0"
                                  style={{ color: accentColor }}
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="truncate">@{member.username}</span>
                            <span>·</span>
                            <span className="whitespace-nowrap">
                              Joined {formatJoinDate(member.joinedAt)}
                            </span>
                          </div>
                        </div>
                      </button>

                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-shrink-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleViewProfile(member.username)}
                            >
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {member.role === "member" ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  handlePromote(member._id, member.name)
                                }
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                Promote to Admin
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDemote(member._id, member.name)
                                }
                              >
                                Demote to Member
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                handleRemove(member._id, member.name)
                              }
                              className="text-red-600"
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              Remove from Group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
