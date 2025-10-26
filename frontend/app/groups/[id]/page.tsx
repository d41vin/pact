"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Id } from "@/convex/_generated/dataModel";
import {
  Settings,
  UserPlus,
  Users,
  Loader2,
  Lock,
  LogOut,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MembersModal from "@/components/groups/members-modal";
import GroupSettingsModal from "@/components/groups/group-settings-modal";
import InviteMembersModal from "@/components/groups/invite-members-modal";

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as Id<"groups">;
  const { address } = useAppKitAccount();
  const [activeTab, setActiveTab] = useState("activity");

  // Modal states
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Get current user
  const currentUser = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip",
  );

  // Get group data
  const group = useQuery(
    api.groups.getGroup,
    groupId && currentUser ? { groupId, userId: currentUser._id } : "skip",
  );

  // Get group activities
  const activitiesData = useQuery(
    api.groups.getGroupActivities,
    group?.hasAccess ? { groupId, limit: 20 } : "skip",
  );

  // Mutations
  const requestAccess = useMutation(api.groups.requestAccess);
  const leaveGroup = useMutation(api.groups.leaveGroup);

  const handleRequestAccess = async () => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      await requestAccess({ userAddress: address, groupId });
      toast.success("Access request sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to request access");
    }
  };

  const handleLeaveGroup = async () => {
    if (!address) return;

    if (
      !confirm(
        "Are you sure you want to leave this group? You'll need to be reinvited to rejoin.",
      )
    ) {
      return;
    }

    try {
      await leaveGroup({ userAddress: address, groupId });
      toast.success("You left the group");
      router.push("/groups");
    } catch (error: any) {
      toast.error(error.message || "Failed to leave group");
    }
  };

  // Loading state
  if (group === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-24 pb-28">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">Loading group...</p>
        </div>
      </div>
    );
  }

  // Group not found
  if (group === null) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-24 pb-28">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-slate-900">
            Group not found
          </h2>
          <p className="mb-4 text-slate-500">
            This group doesn't exist or has been deleted.
          </p>
          <Button onClick={() => router.push("/groups")}>Back to Groups</Button>
        </div>
      </div>
    );
  }

  // Access denied - show access request component
  if (!group.hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-24 pb-28">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Lock className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-slate-900">
            Private Group
          </h2>
          <p className="mb-6 text-slate-500">
            This is a private group. Request access to join.
          </p>
          {currentUser ? (
            <Button onClick={handleRequestAccess} className="w-full">
              <UserPlus className="mr-2 h-4 w-4" />
              Request Access
            </Button>
          ) : (
            <p className="text-sm text-slate-500">
              Sign up or log in to request access
            </p>
          )}
        </div>
      </div>
    );
  }

  // Type guard: At this point, we know hasAccess is true, so memberCount and members exist
  if (!("memberCount" in group) || !("members" in group)) {
    return null; // This should never happen, but satisfies TypeScript
  }

  const formatTimestamp = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  const formatActivityText = (activity: any) => {
    const actorName = activity.actor?.name || "Someone";

    switch (activity.type) {
      case "group_created":
        return `${actorName} created the group`;
      case "member_joined":
        return `${actorName} joined`;
      case "member_left":
        return `${actorName} left`;
      case "member_removed":
        const removedUser = activity.metadata?.removedUserId;
        return `${actorName} removed a member`;
      case "admin_promoted":
        return `${actorName} was promoted to admin`;
      case "admin_demoted":
        return `${actorName} was demoted`;
      case "settings_changed":
        return `${actorName} updated group settings`;
      default:
        return `Activity by ${actorName}`;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "group_created":
        return "🎉";
      case "member_joined":
        return "👋";
      case "member_left":
        return "👋";
      case "member_removed":
        return "🚫";
      case "admin_promoted":
        return "⭐";
      case "admin_demoted":
        return "📉";
      case "settings_changed":
        return "⚙️";
      default:
        return "📌";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-24 pb-28">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Group Profile Card */}
        <div
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          style={{
            background: `linear-gradient(to bottom, ${group.accentColor}15 0%, white 40%)`,
          }}
        >
          <div className="p-8">
            {/* Group Icon/Image */}
            <div className="mb-4 flex justify-center">
              {group.imageType === "emoji" ? (
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full text-5xl shadow-lg"
                  style={{ backgroundColor: group.accentColor }}
                >
                  {group.imageOrEmoji}
                </div>
              ) : (
                <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-lg ring-2 ring-slate-200">
                  <img
                    src={group.imageOrEmoji}
                    alt={group.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Group Info */}
            <div className="mb-6 text-center">
              <h1 className="mb-2 text-3xl font-bold text-slate-900">
                {group.name}
              </h1>
              {group.description && (
                <p className="text-slate-600">{group.description}</p>
              )}
              <div className="mt-3 flex items-center justify-center gap-3 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                </span>
                {group.privacy === "private" && (
                  <span className="flex items-center gap-1">
                    <Lock className="h-4 w-4" />
                    Private
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mb-6 space-y-3">
              {group.userRole === "admin" && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setInviteModalOpen(true)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSettingsModalOpen(true)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </div>
              )}
              <Button variant="outline" disabled className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Use Pact
              </Button>
              {group.userRole !== "admin" &&
                group.creatorId !== currentUser?._id && (
                  <Button
                    variant="outline"
                    onClick={handleLeaveGroup}
                    className="w-full"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Leave Group
                  </Button>
                )}
            </div>

            {/* Members Avatar Stack (clickable) */}
            <div className="flex justify-center">
              <button
                onClick={() => setMembersModalOpen(true)}
                className="flex -space-x-2 transition-transform hover:scale-105"
              >
                {group.members.slice(0, 5).map((member: any) => (
                  <Avatar
                    key={member._id}
                    className="h-10 w-10 border-2 border-white ring-1 ring-slate-200"
                  >
                    <AvatarImage
                      src={member.profileImageUrl}
                      alt={member.name}
                    />
                    <AvatarFallback
                      className="text-sm font-semibold text-white"
                      style={{ backgroundColor: group.accentColor }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {group.memberCount > 5 && (
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-sm font-semibold text-white ring-1 ring-slate-200"
                    style={{ backgroundColor: group.accentColor }}
                  >
                    +{group.memberCount - 5}
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="pacts" disabled>
              Pacts
            </TabsTrigger>
            <TabsTrigger value="chat" disabled>
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Group Activity
              </h2>

              {!activitiesData ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : activitiesData.activities.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-slate-500">No activity yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activitiesData.activities.map((activity) => (
                    <div
                      key={activity._id}
                      className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-900">
                          {formatActivityText(activity)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatTimestamp(activity._creationTime)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pacts">
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <p className="text-slate-500">Pacts feature coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="chat">
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <p className="text-slate-500">Chat feature coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <MembersModal
        open={membersModalOpen}
        onOpenChange={setMembersModalOpen}
        groupId={groupId}
        members={group.members.map((m: any) => ({
          _id: m._id,
          name: m.name || "Unknown",
          username: m.username || "unknown",
          profileImageUrl: m.profileImageUrl,
          role: m.role,
          joinedAt: m.joinedAt,
        }))}
        creatorId={group.creatorId}
        currentUserRole={group.userRole}
        accentColor={group.accentColor}
      />

      <GroupSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        group={{
          _id: group._id,
          name: group.name,
          description: group.description,
          imageOrEmoji: group.imageOrEmoji,
          imageType: group.imageType,
          accentColor: group.accentColor,
          privacy: group.privacy,
          creatorId: group.creatorId,
        }}
        isCreator={group.creatorId === currentUser?._id}
      />

      <InviteMembersModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        groupId={groupId}
        groupName={group.name}
        accentColor={group.accentColor}
        existingMemberIds={group.members.map((m: any) => m._id)}
      />
    </div>
  );
}
