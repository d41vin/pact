"use client";

import { useState } from "react";
import {
  User,
  Copy,
  Check,
  UserPlus,
  MessageCircle,
  Settings,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import EditProfileModal from "@/components/edit-profile-modal";

interface ProfileCardProps {
  user: {
    _id: string;
    name: string;
    username: string;
    userAddress: string;
    profileImageUrl?: string;
  };
  isOwnProfile: boolean;
}

// Truncate wallet address: 0x1234...5678
const truncateAddress = (address: string) => {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-6)}`;
};

export default function ProfileCard({ user, isOwnProfile }: ProfileCardProps) {
  const [copied, setCopied] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // TODO: Replace with actual Convex queries
  const friendsCount = 0; // useQuery(api.friends.count, { userId: user._id })
  const groupsCount = 0; // useQuery(api.groups.countPublic, { userId: user._id })

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(user.userAddress);
      setCopied(true);
      toast.success("Address copied!", {
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy", {
        description: "Could not copy address to clipboard",
      });
    }
  };

  const handleAddFriend = () => {
    console.log("Add friend:", user.username);
    // TODO: Implement with Convex mutation
    toast.success("Friend request sent", {
      description: `Sent friend request to ${user.name}`,
    });
  };

  const handleMessage = () => {
    console.log("Message user:", user.username);
    // TODO: Navigate to messages or open chat modal
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Profile Info Section */}
        <div className="p-8">
          {/* Avatar */}
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-white shadow-lg ring-2 ring-slate-200">
                <AvatarImage src={user.profileImageUrl} alt={user.name} />
                <AvatarFallback className="bg-gradient-to-br from-teal-400 to-blue-500 text-2xl font-semibold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Name & Username */}
          <div className="mb-3 text-center">
            <h1 className="mb-1 text-2xl font-bold text-slate-900">
              {user.name}
            </h1>
            <p className="text-slate-500">@{user.username}</p>
          </div>

          {/* Wallet Address */}
          <div className="mb-6 flex items-center justify-center gap-2">
            <button
              onClick={handleCopyAddress}
              className="group flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 transition-colors hover:bg-slate-200"
            >
              <span className="font-mono text-sm text-slate-600">
                {truncateAddress(user.userAddress)}
              </span>
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-slate-600" />
              )}
            </button>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <div className="text-2xl font-bold text-slate-900">
                {friendsCount}
              </div>
              <div className="text-sm text-slate-500">Friends</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <div className="text-2xl font-bold text-slate-900">
                {groupsCount}
              </div>
              <div className="text-sm text-slate-500">Groups</div>
            </div>
          </div>

          {/* Action Buttons */}
          {isOwnProfile ? (
            <Button
              onClick={() => setEditModalOpen(true)}
              className="w-full"
              variant="outline"
            >
              <Settings className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleAddFriend} className="w-full">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Friend
              </Button>
              <Button
                onClick={handleMessage}
                variant="outline"
                className="w-full"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Message
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <EditProfileModal
          user={user}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
        />
      )}
    </>
  );
}
