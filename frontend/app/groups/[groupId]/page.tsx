"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Settings, Hammer } from "lucide-react";
import { useState } from "react";

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { address } = useAppKitAccount();
  const [activeTab, setActiveTab] = useState("activity");

  const currentUser = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip",
  );

  const group = useQuery(api.groups.getGroup, { groupId });
  const members = useQuery(api.groups.getGroupMembers, { groupId }) as
    | any[]
    | undefined;

  const membership = useQuery(
    api.groups.getUserMembership,
    currentUser ? { groupId, userId: currentUser._id } : "skip",
  ) as any;

  const activities = useQuery(api.groups.getGroupActivities, {
    groupId,
    limit: 20,
  }) as any[] | undefined;

  const isMember = !!membership;

  if (group === undefined || members === undefined) {
    return (
      <div className="min-h-screen px-4 pt-24 pb-28">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="text-slate-500">Loading group...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen px-4 pt-24 pb-28">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="text-slate-900 text-lg font-semibold">
              Group not found
            </div>
            <div className="text-slate-500 text-sm mt-1">
              The group you're looking for doesn't exist.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-24 pb-28">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header / Profile */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div
            className="h-24 w-full"
            style={{ backgroundColor: group.accentColor || "#e2e8f0" }}
          />
          <div className="p-6 -mt-12">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20 border-4 border-white shadow-lg ring-2 ring-slate-200">
                  {group.imageUrl ? (
                    <AvatarImage src={group.imageUrl} alt={group.name} />
                  ) : (
                    <AvatarFallback
                      className="text-2xl font-semibold text-white"
                      style={{ backgroundColor: group.accentColor || "#64748b" }}
                    >
                      {group.emoji || <Users className="h-6 w-6" />}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-900">
                  {group.name}
                </h1>
                {group.description && (
                  <p className="text-slate-600">{group.description}</p>
                )}
                {/* Member avatars */}
                {members && members.length > 0 && (
                  <div className="mt-2 flex -space-x-2">
                    {members.slice(0, 5).map((m: any) => (
                      <Avatar
                        key={m._id}
                        className="h-8 w-8 border-2 border-white ring-1 ring-slate-200"
                      >
                        <AvatarImage
                          src={m.user?.profileImageUrl}
                          alt={m.user?.name}
                        />
                        <AvatarFallback
                          className="text-xs font-semibold text-white"
                          style={{ backgroundColor: group.accentColor || "#64748b" }}
                        >
                          {m.user?.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {members.length > 5 && (
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white ring-1 ring-slate-200"
                        style={{ backgroundColor: group.accentColor || "#64748b" }}
                      >
                        +{members.length - 5}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => alert("Coming soon")}> 
                  <Hammer className="mr-2 h-4 w-4" /> Create / Use Pact
                </Button>
                <Button variant="outline" onClick={() => alert("Coming soon")}> 
                  <Settings className="mr-2 h-4 w-4" /> Group Settings
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        {isMember ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="pacts">Pacts</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>
            <TabsContent value="activity">
              {activities === undefined ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-slate-500">Loading activity...</div>
                </div>
              ) : activities.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-slate-500 text-sm">No activity yet</div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <ul className="space-y-3">
                    {activities.map((a: any) => (
                      <li
                        key={a._id}
                        className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                      >
                        <div className="text-sm font-medium text-slate-900">
                          {a.type === "member_joined" && "Member joined"}
                          {a.type === "settings_changed" && "Settings updated"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(a.createdAt).toLocaleString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>
            <TabsContent value="pacts">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-slate-500">
                Work in Progress
              </div>
            </TabsContent>
            <TabsContent value="chat">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-slate-500">
                Work in Progress
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-3">
              {address ? (
                <>
                  <div className="text-slate-900 font-semibold">
                    Access Required
                  </div>
                  <div className="text-slate-600 text-sm">
                    You don't have access to this group.
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => alert("Coming soon")}>Request Access</Button>
                    <Button variant="outline" onClick={() => alert("Coming soon")}>Enter Invite Code</Button>
                    <Button variant="outline" onClick={() => alert("Coming soon")}>Verify NFT</Button>
                  </div>
                </>
              ) : (
                <div className="text-slate-600 text-sm">
                  Sign up or log in to join this group.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
