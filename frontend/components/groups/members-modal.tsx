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
  Check,
  ChevronDown,
  Activity,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
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
  const [selectedMembers, setSelectedMembers] = useState<Set<Id<"users">>>(
    new Set(),
  );
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showActivityFor, setShowActivityFor] = useState<Id<"users"> | null>(
    null,
  );

  // Mutations
  const promoteMember = useMutation(api.groups.promoteMember);
  const demoteMember = useMutation(api.groups.demoteMember);
  const removeMember = useMutation(api.groups.removeMember);

  // Get member activities if viewing history
  const memberActivities = useQuery(
    api.groups.getGroupActivities,
    showActivityFor ? { groupId, limit: 50 } : "skip",
  );

  const handlePromote = async (memberId: Id<"users">, memberName: string) => {
    if (!address) return;

    try {
      await promoteMember({
        userAddress: address,
        groupId,
        memberId,
      });
      toast.success(`${memberName} promoted to admin`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to promote member";
      toast.error(message);
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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to demote member";
      toast.error(message);
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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove member";
      toast.error(message);
    }
  };

  const handleViewProfile = (username: string) => {
    router.push(`/${username}`);
    onOpenChange(false);
  };

  const handleToggleSelect = (memberId: Id<"users">) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const handleSelectAll = () => {
    const selectableMembers = filteredMembers.filter(
      (m) => m._id !== creatorId && canManageMember(m),
    );
    setSelectedMembers(new Set(selectableMembers.map((m) => m._id)));
  };

  const handleDeselectAll = () => {
    setSelectedMembers(new Set());
  };

  const handleBulkPromote = async () => {
    if (!address || selectedMembers.size === 0) return;

    setBulkActionLoading(true);
    try {
      const memberArray = Array.from(selectedMembers);
      await Promise.all(
        memberArray.map((memberId) =>
          promoteMember({ userAddress: address, groupId, memberId }),
        ),
      );
      toast.success(`Promoted ${memberArray.length} member(s) to admin`);
      setSelectedMembers(new Set());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to promote members";
      toast.error(message);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDemote = async () => {
    if (!address || selectedMembers.size === 0) return;

    setBulkActionLoading(true);
    try {
      const memberArray = Array.from(selectedMembers);
      await Promise.all(
        memberArray.map((memberId) =>
          demoteMember({ userAddress: address, groupId, memberId }),
        ),
      );
      toast.success(`Demoted ${memberArray.length} member(s)`);
      setSelectedMembers(new Set());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to demote members";
      toast.error(message);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkRemove = async () => {
    if (!address || selectedMembers.size === 0) return;

    if (!confirm(`Remove ${selectedMembers.size} member(s) from the group?`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      const memberArray = Array.from(selectedMembers);
      await Promise.all(
        memberArray.map((memberId) =>
          removeMember({ userAddress: address, groupId, memberId }),
        ),
      );
      toast.success(`Removed ${memberArray.length} member(s)`);
      setSelectedMembers(new Set());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove members";
      toast.error(message);
    } finally {
      setBulkActionLoading(false);
    }
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
  const canManageMember = (member: Member) =>
    isCurrentUserAdmin && !isCreator(member._id);

  // Get member-specific activity count
  const getMemberActivityCount = (memberId: Id<"users">) => {
    if (!memberActivities) return 0;
    return memberActivities.activities.filter((a) => a.actorId === memberId)
      .length;
  };

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
          {/* Search & Actions */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {isCurrentUserAdmin && (
              <Button
                onClick={() => {
                  // TODO: Open invite modal
                  toast.info("Invite feature");
                }}
                style={{ backgroundColor: accentColor }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite
              </Button>
            )}
          </div>

          {/* Bulk Actions Bar */}
          {selectedMembers.size > 0 && isCurrentUserAdmin && (
            <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
              <span className="text-sm font-medium text-blue-900">
                {selectedMembers.size} member
                {selectedMembers.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={bulkActionLoading}
                    >
                      <ChevronDown className="mr-2 h-4 w-4" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleBulkPromote}>
                      <Shield className="mr-2 h-4 w-4" />
                      Promote to Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBulkDemote}>
                      Demote to Member
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleBulkRemove}
                      className="text-red-600"
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      Remove from Group
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Select All Option */}
          {isCurrentUserAdmin && filteredMembers.length > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedMembers.size > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleSelectAll();
                  } else {
                    handleDeselectAll();
                  }
                }}
              />
              <span className="text-zinc-600">
                Select all eligible members
              </span>
            </div>
          )}

          {/* Members List */}
          <ScrollArea className="h-[400px] pr-4">
            {filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="mb-3 h-12 w-12 text-zinc-300" />
                <p className="text-sm text-zinc-500">No members found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((member) => {
                  const memberIsCreator = isCreator(member._id);
                  const canManage = canManageMember(member);
                  const isSelected = selectedMembers.has(member._id);
                  const activityCount = getMemberActivityCount(member._id);

                  return (
                    <div
                      key={member._id}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${isSelected
                          ? "border-blue-300 bg-blue-50"
                          : "border-zinc-200 hover:bg-zinc-50"
                        }`}
                    >
                      {/* Checkbox for bulk selection */}
                      {canManage && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(member._id)}
                        />
                      )}

                      <button
                        onClick={() => handleViewProfile(member.username)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <Avatar className="h-12 w-12 shrink-0">
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
                            <div className="truncate font-medium text-zinc-900">
                              {member.name}
                            </div>
                            {memberIsCreator && (
                              <div title="Group Creator">
                                <Crown className="h-4 w-4 shrink-0 text-yellow-500" />
                              </div>
                            )}
                            {member.role === "admin" && !memberIsCreator && (
                              <div title="Admin">
                                <Shield
                                  className="h-4 w-4 shrink-0"
                                  style={{ color: accentColor }}
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-zinc-500">
                            <span className="truncate">@{member.username}</span>
                            <span>·</span>
                            <span className="whitespace-nowrap">
                              Joined {formatJoinDate(member.joinedAt)}
                            </span>
                            {activityCount > 0 && (
                              <>
                                <span>·</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowActivityFor(member._id);
                                  }}
                                  className="flex items-center gap-1 text-xs hover:text-zinc-700"
                                >
                                  <Activity className="h-3 w-3" />
                                  {activityCount} activities
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </button>

                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0"
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
