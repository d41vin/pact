"use client";

import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import EditProfileModal from "@/components/edit-profile-modal";

export default function AccountSettings() {
  const { address } = useAppKitAccount();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const user = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip",
  );

  if (!user) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-8">
        <h2 className="mb-6 text-2xl font-bold text-slate-900">Account</h2>

        <div className="space-y-6">
          {/* Profile Section */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Profile Information
            </h3>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.profileImageUrl} alt={user.name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-xl font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-lg font-semibold text-slate-900">
                  {user.name}
                </div>
                <div className="text-slate-500">@{user.username}</div>
                {user.email && (
                  <div className="mt-1 text-sm text-slate-500">
                    {user.email}
                  </div>
                )}
              </div>
              <Button onClick={() => setEditModalOpen(true)} variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </div>

          <div className="border-t border-slate-200" />

          {/* Wallet Section */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Wallet
            </h3>
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="mb-1 text-sm text-slate-600">
                Connected Wallet
              </div>
              <div className="font-mono text-sm break-all text-slate-900">
                {address}
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditProfileModal
        user={user}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />
    </>
  );
}
