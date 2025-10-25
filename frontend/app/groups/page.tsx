"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CreateGroupModal from "@/components/groups/create-group-modal";

export default function GroupsPage() {
  const router = useRouter();
  const { address } = useAppKitAccount();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);

  // Get current user
  const currentUser = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip",
  );

  // Get user's groups
  const groups = useQuery(
    api.groups.listUserGroups,
    currentUser ? { userId: currentUser._id } : "skip",
  );

  // Get global activity feed
  const activities = useQuery(
    api.groups.getGlobalActivityFeed,
    currentUser
      ? { userId: currentUser._id, limit: showAllActivities ? 50 : 20 }
      : "skip",
  );

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-24 pb-28">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  const formatActivityText = (activity: any) => {
    const actorName = activity.actor?.name || "Someone";
    const groupName = activity.group?.name || "a group";

    switch (activity.type) {
      case "group_created":
        return `${actorName} created ${groupName}`;
      case "member_joined":
        return `${actorName} joined ${groupName}`;
      case "member_left":
        return `${actorName} left ${groupName}`;
      case "member_removed":
        return `${actorName} was removed from ${groupName}`;
      case "admin_promoted":
        return `${actorName} was promoted to admin in ${groupName}`;
      case "admin_demoted":
        return `${actorName} was demoted in ${groupName}`;
      case "settings_changed":
        return `${actorName} updated ${groupName} settings`;
      default:
        return `Activity in ${groupName}`;
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

  const formatTimestamp = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 px-4 pt-24 pb-28">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Groups</h1>
              <p className="mt-1 text-slate-600">
                Manage your groups and see recent activity
              </p>
            </div>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </div>

          {/* Activity Feed */}
          {activities && activities.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Recent Activity
              </h2>
              <div className="space-y-3">
                {activities.map((activity) => (
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
              {activities.length >= 20 && !showAllActivities && (
                <Button
                  variant="ghost"
                  onClick={() => setShowAllActivities(true)}
                  className="mt-4 w-full"
                >
                  Show More
                </Button>
              )}
            </div>
          )}

          {/* Groups Grid */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Your Groups {groups && `(${groups.length})`}
            </h2>

            {!groups ? (
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : groups.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  No groups yet
                </h3>
                <p className="mb-4 text-sm text-slate-500">
                  Create your first group to get started
                </p>
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Group
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groups.map((group) => (
                  <button
                    key={group._id}
                    onClick={() => router.push(`/groups/${group._id}`)}
                    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
                  >
                    {/* Accent Color Background */}
                    <div
                      className="absolute inset-0 opacity-5 transition-opacity group-hover:opacity-10"
                      style={{ backgroundColor: group.accentColor }}
                    />

                    <div className="relative space-y-4">
                      {/* Group Icon/Image */}
                      <div className="flex justify-center">
                        {group.imageType === "emoji" ? (
                          <div
                            className="flex h-16 w-16 items-center justify-center rounded-full text-3xl shadow-sm"
                            style={{
                              backgroundColor: group.accentColor + "20",
                            }}
                          >
                            {group.imageOrEmoji}
                          </div>
                        ) : (
                          <div className="h-16 w-16 overflow-hidden rounded-full shadow-sm">
                            <img
                              src={group.imageOrEmoji}
                              alt={group.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                      </div>

                      {/* Group Info */}
                      <div className="text-center">
                        <h3 className="truncate text-lg font-semibold text-slate-900">
                          {group.name}
                        </h3>
                        {group.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                            {group.description}
                          </p>
                        )}
                      </div>

                      {/* Members Avatar Stack */}
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {group.members
                            .slice(0, 3)
                            .map((member: any, idx: number) => (
                              <Avatar
                                key={member._id}
                                className="h-8 w-8 border-2 border-white ring-1 ring-slate-200"
                              >
                                <AvatarImage
                                  src={member.profileImageUrl}
                                  alt={member.name}
                                />
                                <AvatarFallback
                                  className="text-xs font-semibold text-white"
                                  style={{ backgroundColor: group.accentColor }}
                                >
                                  {member.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          {group.memberCount > 3 && (
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white ring-1 ring-slate-200"
                              style={{ backgroundColor: group.accentColor }}
                            >
                              +{group.memberCount - 3}
                            </div>
                          )}
                        </div>

                        {/* Role Badge */}
                        {group.userRole === "admin" && (
                          <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-medium text-white">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateGroupModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </>
  );
}
