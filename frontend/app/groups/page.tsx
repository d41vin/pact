"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppKitAccount } from "@reown/appkit/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import CreateGroupModal from "@/components/create-group-modal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Plus, Loader2 } from "lucide-react";

export default function GroupsPage() {
  const router = useRouter();
  const { address } = useAppKitAccount();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const currentUser = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip",
  );

  const groups = useQuery(
    api.groups.listUserGroups,
    currentUser ? { userId: currentUser._id } : "skip",
  ) as
    | {
        _id: string;
        name: string;
        description?: string;
        groupImageUrl?: string;
        emoji?: string;
        groupColor?: string;
        members: { userId: string; profileImageUrl?: string; name: string }[];
      }[]
    | undefined;

  const activity = useQuery(
    api.groups.listGlobalActivityForUser,
    currentUser ? { userId: currentUser._id, limit: 5 } : "skip",
  ) as any[] | undefined;

  const handleGroupCreated = (groupId: string) => {
    router.push(`/groups/${groupId}`);
  };

  return (
    <div className="min-h-screen px-4 pt-24 pb-28">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Create Group */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">Groups</h1>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Group
          </Button>
        </div>

        {/* Global Activity Feed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Recent Activity
          </h2>
          {!currentUser || activity === undefined ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : activity.length === 0 ? (
            <div className="text-sm text-slate-500">
              No recent activity. Create or join a group to get started!
            </div>
          ) : (
            <ul className="space-y-3">
              {activity.map((item: any) => (
                <li
                  key={item._id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-full"
                      style={{ backgroundColor: item.group?.accentColor || "#e2e8f0" }}
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {item.type === "member_joined" && "Member joined"}
                        {item.type === "settings_changed" && "Settings updated"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.group?.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Your Groups */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Your Groups
          </h2>
          {!currentUser || groups === undefined ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : !groups || groups.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                No groups yet
              </h3>
              <p className="text-sm text-slate-500">
                Create your first group to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {groups.map((group) => (
                <button
                  key={group._id}
                  onClick={() => router.push(`/groups/${group._id}`)}
                  className="group relative overflow-hidden rounded-xl border border-slate-200 transition-all hover:border-slate-300 hover:shadow-md"
                  style={{
                    backgroundColor: group.groupColor
                      ? `${group.groupColor}15`
                      : "#f8fafc",
                  }}
                >
                  <div className="space-y-3 p-4">
                    {/* Group Avatar or Icon */}
                    <div className="flex justify-center">
                      {group.groupImageUrl ? (
                        <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-white shadow-sm">
                          <img
                            src={group.groupImageUrl}
                            alt={group.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-sm"
                          style={{
                            backgroundColor: group.groupColor || "#64748b",
                          }}
                        >
                          {group.emoji ? (
                            <span className="text-2xl">{group.emoji}</span>
                          ) : (
                            <Users className="h-7 w-7" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Group Name */}
                    <div className="text-center">
                      <h3 className="truncate text-sm font-semibold text-slate-900">
                        {group.name}
                      </h3>
                    </div>

                    {/* Member Avatar Stack */}
                    {group.members.length > 0 && (
                      <div className="flex justify-center">
                        <div className="flex -space-x-2">
                          {group.members.slice(0, 3).map((member) => (
                            <Avatar
                              key={member.userId}
                              className="h-8 w-8 border-2 border-white ring-1 ring-slate-200"
                            >
                              <AvatarImage
                                src={member.profileImageUrl}
                                alt={member.name}
                              />
                              <AvatarFallback
                                className="text-xs font-semibold text-white"
                                style={{
                                  backgroundColor: group.groupColor || "#64748b",
                                }}
                              >
                                {member.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {group.members.length > 3 && (
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white ring-1 ring-slate-200"
                              style={{
                                backgroundColor: group.groupColor || "#64748b",
                              }}
                            >
                              +{group.members.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hover Effect */}
                  <div
                    className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-10"
                    style={{
                      backgroundColor: group.groupColor || "#64748b",
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateGroupModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={handleGroupCreated}
      />
    </div>
  );
}
