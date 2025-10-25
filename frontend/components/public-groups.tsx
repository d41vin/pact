"use client";

import { useRouter } from "next/navigation";
import { Users, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface PublicGroupsProps {
  username: string;
}

export default function PublicGroups({ username }: PublicGroupsProps) {
  const router = useRouter();

  // Fetch public groups for this user
  const groups = useQuery(api.groups.listPublicGroupsByUsername, { username });

  if (groups === undefined) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Public Groups
        </h2>
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Public Groups
        </h2>
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Users className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            No public groups
          </h3>
          <p className="text-sm text-slate-500">
            This user hasn't joined any public groups yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Public Groups
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {groups.map((group: any) => (
          <button
            key={group._id}
            onClick={() => router.push(`/groups/${group._id}`)}
            className="group relative overflow-hidden rounded-xl border border-slate-200 transition-all hover:border-slate-300 hover:shadow-md"
            style={{
              backgroundColor: `${group.accentColor}15`,
            }}
          >
            <div className="space-y-3 p-4">
              {/* Group Avatar or Icon */}
              <div className="flex justify-center">
                {group.imageType === "emoji" ? (
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-sm"
                    style={{ backgroundColor: group.accentColor }}
                  >
                    {group.imageOrEmoji}
                  </div>
                ) : (
                  <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-white shadow-sm">
                    <img
                      src={group.imageOrEmoji}
                      alt={group.name}
                      className="h-full w-full object-cover"
                    />
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
              {group.members && group.members.length > 0 && (
                <div className="flex justify-center">
                  <div className="flex -space-x-2">
                    {group.members.slice(0, 3).map((member: any) => (
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
                            backgroundColor: group.accentColor,
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
                          backgroundColor: group.accentColor,
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
                backgroundColor: group.accentColor,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
