"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as Id<"groups">;
  const pactInstanceId = params.pactId as Id<"groupPacts">;

  const pact = useQuery(api.pacts.getPactInstance, { pactInstanceId });

  if (!pact) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 pt-24 pb-28">
        <div className="mx-auto max-w-4xl">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => router.push(`/groups/${groupId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Group
          </Button>

          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
            <p className="mt-4 text-sm text-slate-500">Loading pact details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-24 pb-28">
      <div className="mx-auto max-w-4xl space-y-6">
        <Button
          variant="ghost"
          className="w-fit"
          onClick={() => router.push(`/groups/${groupId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Group
        </Button>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-900 px-6 py-8 text-white">
            <h1 className="text-3xl font-bold">{pact.instanceName}</h1>
            <p className="mt-2 text-sm text-slate-200">
              Created {new Date(pact.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Current Balance</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                ${pact.balance.toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Total Contributions</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">
                ${pact.totalContributions.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-900">Participants</h2>
          <ul className="mt-4 space-y-3">
            {pact.participants.map((participant) => (
              <li
                key={participant._id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3"
              >
                <span className="text-sm font-medium text-slate-900">
                  {participant.user?.name || "Unknown"}
                </span>
                <span className="text-xs text-slate-500">
                  Joined {new Date(participant.joinedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
