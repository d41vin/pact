"use client";

import { useMemo, useState } from "react";
import {
  Users,
  TrendingUp,
  Activity,
  Calendar,
  Crown,
  Shield,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface Member {
  _id: Id<"users">;
  name: string;
  username: string;
  role: "admin" | "member";
  joinedAt: number;
}

interface GroupAnalyticsProps {
  groupId: Id<"groups">;
  members: Member[];
  creatorId: Id<"users">;
  accentColor: string;
}

// StatCard component defined outside to avoid recreation on each render
const StatCard = ({
  icon: Icon,
  label,
  value,
  change,
  color,
}: {
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  label: string;
  value: string | number;
  change?: string;
  color: string;
}) => (
  <div className="rounded-lg border border-zinc-200 bg-white p-4">
    <div className="mb-2 flex items-center gap-2">
      <div
        className="rounded-full p-2"
        style={{ backgroundColor: color + "20" }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <span className="text-sm text-zinc-600">{label}</span>
    </div>
    <div className="text-2xl font-bold text-zinc-900">{value}</div>
    {change && <div className="mt-1 text-xs text-zinc-500">{change}</div>}
  </div>
);

export default function GroupAnalytics({
  groupId,
  members,
  creatorId,
  accentColor,
}: GroupAnalyticsProps) {
  // Use lazy initialization to get current time once
  const [currentTime] = useState(() => Date.now());

  // Get group activities for analytics
  const activitiesData = useQuery(api.groups.getGroupActivities, {
    groupId,
    limit: 100,
  });

  // Calculate statistics using useMemo
  const stats = useMemo(() => {
    if (!activitiesData || currentTime === null) {
      return null;
    }

    const activities = activitiesData.activities;
    const last7Days = currentTime - 7 * 24 * 60 * 60 * 1000;
    const last30Days = currentTime - 30 * 24 * 60 * 60 * 1000;

    // Calculate statistics
    const adminCount = members.filter((m) => m.role === "admin").length;

    // Activity statistics
    const recentActivity = activities.filter(
      (a) => a._creationTime > last7Days,
    ).length;
    const monthlyActivity = activities.filter(
      (a) => a._creationTime > last30Days,
    ).length;

    // Member join statistics
    const recentJoins = members.filter((m) => m.joinedAt > last7Days).length;
    const monthlyJoins = members.filter((m) => m.joinedAt > last30Days).length;

    return {
      adminCount,
      recentActivity,
      monthlyActivity,
      recentJoins,
      monthlyJoins,
      activities,
    };
  }, [members, activitiesData, currentTime]);

  if (!stats) {
    return null;
  }

  const {
    adminCount,
    recentActivity,
    monthlyActivity,
    recentJoins,
    monthlyJoins,
    activities,
  } = stats;

  // Most active members (by activity count)
  const memberActivityCounts = new Map<Id<"users">, number>();
  activities.forEach((activity) => {
    const count = memberActivityCounts.get(activity.actorId) || 0;
    memberActivityCounts.set(activity.actorId, count + 1);
  });

  const topMembers = Array.from(memberActivityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId, count]) => {
      const member = members.find((m) => m._id === userId);
      return { member, count };
    })
    .filter(
      (item): item is { member: Member; count: number } =>
        item.member !== undefined,
    );

  // Activity type breakdown
  const activityTypes = new Map<string, number>();
  activities.forEach((activity) => {
    const count = activityTypes.get(activity.type) || 0;
    activityTypes.set(activity.type, count + 1);
  });

  const topActivityTypes = Array.from(activityTypes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">Overview</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total Members"
            value={members.length}
            change={`+${recentJoins} this week`}
            color={accentColor}
          />
          <StatCard
            icon={Shield}
            label="Admins"
            value={adminCount}
            color="#6366F1"
          />
          <StatCard
            icon={Activity}
            label="Recent Activity"
            value={recentActivity}
            change={`${monthlyActivity} this month`}
            color="#10B981"
          />
          <StatCard
            icon={TrendingUp}
            label="Growth"
            value={`+${monthlyJoins}`}
            change="New members (30d)"
            color="#F59E0B"
          />
        </div>
      </div>

      {/* Most Active Members */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">
          Most Active Members
        </h3>
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4">
          {topMembers.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">
              No activity data yet
            </p>
          ) : (
            topMembers.map(({ member, count }, index) => (
              <div
                key={member._id}
                className="flex items-center justify-between rounded-lg p-2 hover:bg-zinc-50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">
                        {member.name}
                      </span>
                      {member._id === creatorId && (
                        <Crown className="h-3 w-3 text-yellow-500" />
                      )}
                      {member.role === "admin" && member._id !== creatorId && (
                        <Shield
                          className="h-3 w-3"
                          style={{ color: accentColor }}
                        />
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">
                      @{member.username}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-zinc-700">
                  {count} {count === 1 ? "action" : "actions"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Activity Breakdown */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">
          Activity Breakdown
        </h3>
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4">
          {topActivityTypes.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">
              No activity yet
            </p>
          ) : (
            topActivityTypes.map(([type, count]) => {
              const percentage = (count / activities.length) * 100;
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-zinc-900 capitalize">
                      {type.replace(/_/g, " ")}
                    </span>
                    <span className="text-zinc-600">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: accentColor,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Recent Growth */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">
          Member Growth
        </h3>
        <div className="grid grid-cols-3 gap-4 rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-center">
            <div className="mb-1 flex items-center justify-center gap-1">
              <Calendar className="h-4 w-4 text-zinc-600" />
              <span className="text-sm text-zinc-600">This Week</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900">
              +{recentJoins}
            </div>
          </div>
          <div className="text-center">
            <div className="mb-1 flex items-center justify-center gap-1">
              <Calendar className="h-4 w-4 text-zinc-600" />
              <span className="text-sm text-zinc-600">This Month</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900">
              +{monthlyJoins}
            </div>
          </div>
          <div className="text-center">
            <div className="mb-1 flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4 text-zinc-600" />
              <span className="text-sm text-zinc-600">Total</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900">
              {members.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
