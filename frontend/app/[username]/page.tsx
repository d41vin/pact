"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import ProfileCard from "@/components/profile-card";
import QuickActions from "@/components/quick-actions";
import PublicGroups from "@/components/public-groups";
import { Loader2 } from "lucide-react";

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;

  // Get current connected user's wallet address from AppKit
  const { address: currentUserAddress } = useAppKitAccount();

  // Query the user by username
  const user = useQuery(api.users.getUserByUsername, { username });

  // Query current user to check if viewing own profile
  const currentUser = useQuery(
    api.users.getUser,
    currentUserAddress ? { userAddress: currentUserAddress } : "skip",
  );

  // Loading state
  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-24 pb-28">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  // User not found
  if (user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-24 pb-28">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-slate-900">
            User not found
          </h2>
          <p className="text-slate-500">
            The profile you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.userAddress === user.userAddress;

  return (
    <div className="min-h-screen px-4 pt-24 pb-28">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Profile Card */}
        <ProfileCard user={user} isOwnProfile={isOwnProfile} />

        {/* Quick Actions - Only show on own profile */}
        {isOwnProfile && <QuickActions />}

        {/* Public Groups */}
        <PublicGroups username={username} />
      </div>
    </div>
  );
}
