"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";
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
import ActivityFeedFilters from "@/components/groups/activity-feed-filters";
import MockPacts from "@/components/groups/mock-pacts";
import { formatTimeAgo } from "@/lib/date-utils";

// Type for activity as returned from the backend
interface Activity {
  _id: string;
  _creationTime: number;
  type: string;
  actor?: {
    _id: Id<"users">;
    _creationTime: number;
    email?: string;
    profileImageUrl?: string;
    name: string;
    username: string;
    userAddress: string;
  } | null;
  group?: {
    _id?: Id<"groups">;
    _creationTime?: number;
    permissions?: {
      whoCanInvite: "all" | "admins" | "creator";
      whoCanCreatePacts: "all" | "admins";
    };
    name: string;
    description?: string;
    imageOrEmoji?: string;
    imageType?: "emoji" | "image";
    accentColor?: string;
    creatorId?: Id<"users">;
    privacy?: "public" | "private";
    joinMethod?: "request" | "invite" | "code" | "nft";
  } | null;
  metadata?: Record<string, unknown>;
}

// Planned type for members (for future use when backend returns clean member objects)
interface Member {
  _id: Id<"users">;
  name: string;
  username: string;
  profileImageUrl?: string;
  role: "admin" | "member";
  joinedAt: number;
}

// Type for members as returned from the backend (with optional fields)
interface BackendMember {
  _id?: Id<"users">;
  _creationTime?: number;
  email?: string;
  profileImageUrl?: string;
  name?: string;
  username?: string;
  userAddress?: string;
  role: "admin" | "member";
  joinedAt: number;
}

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

  // Activity filter state
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [showAllActivities, setShowAllActivities] = useState(false);

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
    group?.hasAccess
      ? { groupId, limit: showAllActivities ? 100 : 20 }
      : "skip",
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to request access";
      toast.error(errorMessage);
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to leave group";
      toast.error(errorMessage);
    }
  };

  // Loading state
  if (group === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-8 pb-28">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-500">Loading group...</p>
        </div>
      </div>
    );
  }

  // Group not found
  if (group === null) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-8 pb-28">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-zinc-900">
            Group not found
          </h2>
          <p className="mb-4 text-zinc-500">
            This group doesn&apos;t exist or has been deleted.
          </p>
          <Button onClick={() => router.push("/groups")}>Back to Groups</Button>
        </div>
      </div>
    );
  }

  // Access denied - show access request component
  if (!group.hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-8 pb-28">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
            <Lock className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-zinc-900">
            Private Group
          </h2>
          <p className="mb-6 text-zinc-500">
            This is a private group. Request access to join.
          </p>
          {currentUser ? (
            <Button onClick={handleRequestAccess} className="w-full">
              <UserPlus className="mr-2 h-4 w-4" />
              Request Access
            </Button>
          ) : (
            <p className="text-sm text-zinc-500">
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

  const formatActivityText = (activity: Activity): string => {
    const actorName = activity.actor?.name || "Someone";

    switch (activity.type) {
      case "group_created":
        return `${actorName} created the group`;
      case "member_joined":
        return `${actorName} joined`;
      case "member_left":
        return `${actorName} left`;
      case "member_removed":
        return `${actorName} removed a member`;
      case "admin_promoted":
        return `${actorName} was promoted to admin`;
      case "admin_demoted":
        return `${actorName} was demoted`;
      case "settings_changed":
        return `${actorName} updated group settings`;
      case "code_created":
        return `${actorName} created an invite code`;
      case "code_used":
        return `${actorName} joined with a code`;
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
      case "code_created":
        return "🔗";
      case "code_used":
        return "🎟️";
      default:
        return "📌";
    }
  };

  // Get activities to display (filtered or all)
  const displayActivities =
    filteredActivities.length > 0 || activitiesData?.activities.length === 0
      ? filteredActivities
      : activitiesData?.activities || [];

  return (
    <div className="min-h-screen bg-zinc-50 px-4 pt-8 pb-28">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Group Profile Card */}
        <div
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
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
                <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-lg ring-2 ring-zinc-200">
                  <Image
                    src={group.imageOrEmoji}
                    alt={group.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>

            {/* Group Info */}
            <div className="mb-6 text-center">
              <h1 className="mb-2 text-3xl font-bold text-zinc-900">
                {group.name}
              </h1>
              {group.description && (
                <p className="text-zinc-600">{group.description}</p>
              )}
              <div className="mt-3 flex items-center justify-center gap-3 text-sm text-zinc-500">
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
                {group.members.slice(0, 5).map((member: BackendMember) => {
                  if (!member._id || !member.name) return null;
                  return (
                    <Avatar
                      key={member._id}
                      className="h-10 w-10 border-2 border-white ring-1 ring-zinc-200"
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
                  );
                })}
                {group.memberCount > 5 && (
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-sm font-semibold text-white ring-1 ring-zinc-200"
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
            <TabsTrigger value="pacts">Pacts</TabsTrigger>
            <TabsTrigger value="chat" disabled>
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900">
                Group Activity
              </h2>

              {/* Activity Filters */}
              {activitiesData && activitiesData.activities.length > 0 && (
                <div className="mb-4">
                  <ActivityFeedFilters
                    activities={activitiesData.activities}
                    onFilteredActivitiesChange={setFilteredActivities}
                  />
                </div>
              )}

              {!activitiesData ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
              ) : displayActivities.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-zinc-500">
                    {activitiesData.activities.length === 0
                      ? "No activity yet"
                      : "No matching activities"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayActivities.map((activity) => (
                    <div
                      key={activity._id}
                      className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-zinc-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xl">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-900">
                          {formatActivityText(activity)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {formatTimeAgo(activity._creationTime)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Show More/Less Button */}
                  {activitiesData.hasMore && !showAllActivities && (
                    <Button
                      variant="ghost"
                      onClick={() => setShowAllActivities(true)}
                      className="w-full"
                    >
                      Show More
                    </Button>
                  )}
                  {showAllActivities && (
                    <Button
                      variant="ghost"
                      onClick={() => setShowAllActivities(false)}
                      className="w-full"
                    >
                      Show Less
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pacts">
            <MockPacts
              groupId={groupId}
              groupName={group.name}
              members={group.members
                .filter((m: BackendMember) => m._id && m.name)
                .map((m: BackendMember) => ({
                  _id: m._id!,
                  name: m.name!,
                  profileImageUrl: m.profileImageUrl,
                }))}
              accentColor={group.accentColor}
            />
          </TabsContent>

          <TabsContent value="chat">
            <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
              <p className="text-zinc-500">Chat feature coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <MembersModal
        open={membersModalOpen}
        onOpenChange={setMembersModalOpen}
        groupId={groupId}
        members={group.members
          .filter((m: BackendMember) => m._id && m.name && m.username)
          .map((m: BackendMember) => ({
            _id: m._id!,
            name: m.name!,
            username: m.username!,
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
        members={group.members
          .filter((m: BackendMember) => m._id && m.name && m.username)
          .map((m: BackendMember) => ({
            _id: m._id!,
            name: m.name!,
            username: m.username!,
            role: m.role,
            joinedAt: m.joinedAt,
          }))}
        isCreator={group.creatorId === currentUser?._id}
      />

      <InviteMembersModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        groupId={groupId}
        groupName={group.name}
        accentColor={group.accentColor}
        existingMemberIds={group.members
          .filter((m: BackendMember) => m._id)
          .map((m: BackendMember) => m._id!)}
      />
    </div>
  );
}
