"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { useQuery } from 'convex/react'
// import { api } from '@/convex/_generated/api'

interface PublicGroupsProps {
  username: string;
}

// TODO: Replace with actual Group type from Convex
interface Group {
  _id: string;
  name: string;
  groupImageUrl?: string;
  groupColor?: string;
  members: {
    userId: string;
    profileImageUrl?: string;
    name: string;
  }[];
}

// TODO: Remove mock data once Convex is integrated
const MOCK_GROUPS: Group[] = [
  {
    _id: "1",
    name: "Weekend Trip",
    groupColor: "#3b82f6",
    members: [
      { userId: "1", name: "Sarah", profileImageUrl: undefined },
      { userId: "2", name: "Mike", profileImageUrl: undefined },
      { userId: "3", name: "Emily", profileImageUrl: undefined },
    ],
  },
  {
    _id: "2",
    name: "Office Lunch",
    groupColor: "#8b5cf6",
    members: [
      { userId: "4", name: "James", profileImageUrl: undefined },
      { userId: "5", name: "Lisa", profileImageUrl: undefined },
    ],
  },
  {
    _id: "3",
    name: "Gym Buddies",
    groupColor: "#10b981",
    members: [
      { userId: "6", name: "Tom", profileImageUrl: undefined },
      { userId: "7", name: "Anna", profileImageUrl: undefined },
      { userId: "8", name: "Chris", profileImageUrl: undefined },
    ],
  },
];

export default function PublicGroups({ username }: PublicGroupsProps) {
  const router = useRouter();

  // TODO: Replace with actual Convex query
  // const groups = useQuery(api.groups.listPublicByUsername, { username })
  const groups = MOCK_GROUPS; // Mock data

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
                    <Users className="h-7 w-7" />
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
                    {group.members.slice(0, 3).map((member, index) => (
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
    </div>
  );
}
