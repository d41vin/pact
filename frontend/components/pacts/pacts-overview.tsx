"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Wallet,
  Split,
  HandCoins,
  TrendingUp,
  DollarSign,
  Users,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CreatePactModal from "./create-pact-modal";

interface Member {
  _id: Id<"users">;
  name: string;
  username: string;
  profileImageUrl?: string;
}

interface PactsOverviewProps {
  groupId: Id<"groups">;
  groupName: string;
  members: Member[];
  accentColor: string;
  canCreatePacts?: boolean;
  createModalOpen?: boolean;
  onCreateModalOpenChange?: (open: boolean) => void;
}

// Icon mapper for pact templates
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  wallet: Wallet,
  split: Split,
  "hand-coins": HandCoins,
  "trending-up": TrendingUp,
};

export default function PactsOverview({
  groupId,
  groupName,
  members,
  accentColor,
  canCreatePacts = true,
  createModalOpen: externalCreateModalOpen,
  onCreateModalOpenChange: externalOnCreateModalOpenChange,
}: PactsOverviewProps) {
  const router = useRouter();
  const [internalCreateModalOpen, setInternalCreateModalOpen] = useState(false);

  // Use external state if provided, otherwise use internal state
  const createModalOpen = externalCreateModalOpen ?? internalCreateModalOpen;
  const setCreateModalOpen =
    externalOnCreateModalOpenChange ?? setInternalCreateModalOpen;

  // Fetch pacts for this group
  const pacts = useQuery(api.pacts.listGroupPacts, {
    groupId,
    status: "active",
  });

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  const PactCard = ({
    pact,
  }: {
    pact: NonNullable<typeof pacts>[number];
  }) => {
    const Icon = iconMap[pact.template?.icon || "wallet"] || Wallet;
    const progress = pact.config.goal
      ? (pact.balance / pact.config.goal) * 100
      : 0;

    return (
      <button
        onClick={() => router.push(`/groups/${groupId}/pacts/${pact._id}`)}
        className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 text-left transition-all hover:border-slate-300 hover:shadow-md"
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundColor: pact.template?.color || accentColor }}
        />

        <div className="relative space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: pact.template?.color || accentColor }}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {pact.instanceName}
                </h3>
                <p className="text-sm text-slate-500">
                  {pact.participantCount} participant
                  {pact.participantCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div>
            <div className="mb-1 text-sm text-slate-600">Current Balance</div>
            <div className="text-2xl font-bold text-slate-900">
              ${pact.balance.toFixed(2)}
            </div>
            {pact.config.goal && (
              <div className="text-sm text-slate-500">
                Goal: ${pact.config.goal.toFixed(2)}
              </div>
            )}
          </div>

          {/* Progress Bar (if goal exists) */}
          {pact.config.goal && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Progress</span>
                <span className="font-medium text-slate-900">
                  {progress.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(progress, 100)}%`,
                    backgroundColor: pact.template?.color || accentColor,
                  }}
                />
              </div>
            </div>
          )}

          {/* Last Activity */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3 w-3" />
            <span>Last activity {formatTimestamp(pact.lastActivityAt)}</span>
          </div>
        </div>
      </button>
    );
  };

  const PactCardSkeleton = () => (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full" />
        </div>
        <Skeleton className="h-3 w-36" />
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Pacts</h2>
            <p className="text-slate-600">
              Financial tools for group coordination
            </p>
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            style={{ backgroundColor: accentColor }}
            disabled={!canCreatePacts}
            aria-disabled={!canCreatePacts}
            title={
              canCreatePacts
                ? undefined
                : "Only admins can create pacts in this group"
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Pact
          </Button>
        </div>

        {/* Loading State */}
        {pacts === undefined && (
          <div className="grid gap-4 sm:grid-cols-2">
            <PactCardSkeleton />
            <PactCardSkeleton />
          </div>
        )}

        {/* Error State */}
        {pacts === null && (
          <div className="rounded-xl border-2 border-dashed border-red-200 bg-red-50 p-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h3 className="mb-2 text-lg font-semibold text-red-900">
              Failed to Load Pacts
            </h3>
            <p className="mb-4 text-sm text-red-700">
              There was an error loading the pacts for this group.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="border-red-300 text-red-900 hover:bg-red-100"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {pacts !== undefined && pacts !== null && pacts.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
              <Wallet className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              No Active Pacts
            </h3>
            <p className="mb-4 max-w-md text-center text-sm text-slate-500">
              Create your first pact to start coordinating finances with your
              group
            </p>
            <Button
              onClick={() => setCreateModalOpen(true)}
              style={{ backgroundColor: accentColor }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Pact
            </Button>
          </div>
        )}

        {/* Active Pacts */}
        {pacts !== undefined && pacts !== null && pacts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {pacts.map((pact) => (
              <PactCard key={pact._id} pact={pact} />
            ))}
          </div>
        )}
      </div>

      {/* Create Pact Modal */}
      <CreatePactModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        groupId={groupId}
        groupName={groupName}
        members={members}
        accentColor={accentColor}
      />
    </>
  );
}
