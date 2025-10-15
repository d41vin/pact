"use client";

import { useState } from "react";
import {
  User,
  Copy,
  Check,
  UserPlus,
  MessageCircle,
  Settings,
  UserMinus,
  UserX,
  Clock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Id } from "@/convex/_generated/dataModel";
import EditProfileModal from "@/components/edit-profile-modal";
import FriendsListModal from "@/components/friends-list-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ProfileCardProps {
  user: {
    _id: Id<"users">;
    name: string;
    username: string;
    userAddress: string;
    profileImageUrl?: string;
  };
  isOwnProfile: boolean;
}

const truncateAddress = (address: string) => {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function ProfileCard({ user, isOwnProfile }: ProfileCardProps) {
  const [copied, setCopied] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [friendsModalOpen, setFriendsModalOpen] = useState(false);
  const { address } = useAppKitAccount();

  // Get current user
  const currentUser = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip",
  );

  // Get friendship status
  const friendshipStatus = useQuery(
    api.friendships.getFriendshipStatus,
    currentUser && !isOwnProfile
      ? { userId: currentUser._id, otherUserId: user._id }
      : "skip",
  );

  // Get friend count
  const friendCount = useQuery(api.friendships.getFriendCount, {
    userId: user._id,
  });

  // Mutations
  const sendFriendRequest = useMutation(api.friendships.sendFriendRequest);
  const cancelFriendRequest = useMutation(api.friendships.cancelFriendRequest);
  const acceptFriendRequest = useMutation(api.friendships.acceptFriendRequest);
  const unfriend = useMutation(api.friendships.unfriend);
  const blockUser = useMutation(api.blocks.blockUser);

  // TODO: Replace with actual group count query
  const groupsCount = 0;

  // Determine if current user can view friends list
  const canViewFriendsList =
    isOwnProfile || friendshipStatus?.status === "accepted";

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(user.userAddress);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy address");
    }
  };

  const handleAddFriend = async () => {
    if (!currentUser) return;
    try {
      await sendFriendRequest({
        requesterId: currentUser._id,
        addresseeId: user._id,
      });
      toast.success(`Friend request sent to ${user.name}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to send friend request");
    }
  };

  const handleCancelRequest = async () => {
    if (!friendshipStatus?.friendshipId || !currentUser) return;
    try {
      await cancelFriendRequest({
        userId: currentUser._id,
        friendshipId: friendshipStatus.friendshipId,
      });
      toast.success("Friend request cancelled");
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel request");
    }
  };

  const handleAcceptRequest = async () => {
    if (!friendshipStatus?.friendshipId || !currentUser) return;
    try {
      await acceptFriendRequest({
        userId: currentUser._id,
        friendshipId: friendshipStatus.friendshipId,
      });
      toast.success(`You are now friends with ${user.name}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to accept request");
    }
  };

  const handleUnfriend = async () => {
    if (!friendshipStatus?.friendshipId || !currentUser) return;
    try {
      await unfriend({
        userId: currentUser._id,
        friendshipId: friendshipStatus.friendshipId,
      });
      toast.success(`Removed ${user.name} from friends`);
    } catch (error: any) {
      toast.error(error.message || "Failed to unfriend");
    }
  };

  const handleBlock = async () => {
    if (!currentUser) return;
    try {
      await blockUser({
        blockerId: currentUser._id,
        blockedId: user._id,
      });
      toast.success(`Blocked ${user.name}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to block user");
    }
  };

  const handleMessage = () => {
    console.log("Message user:", user.username);
    // TODO: Navigate to messages or open chat modal
    toast.info("Messaging feature coming soon");
  };

  const renderActionButtons = () => {
    if (isOwnProfile) {
      return (
        <Button
          onClick={() => setEditModalOpen(true)}
          className="w-full"
          variant="outline"
        >
          <Settings className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      );
    }

    if (!friendshipStatus) return null;

    switch (friendshipStatus.status) {
      case "none":
        // No relationship - show Add Friend
        return (
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handleAddFriend} className="w-full">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Friend
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full">
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleBlock}>
                  <UserX className="mr-2 h-4 w-4" />
                  Block User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );

      case "pending":
        if (friendshipStatus.isRequester) {
          // Current user sent the request - show Request Sent
          return (
            <Button
              onClick={handleCancelRequest}
              variant="outline"
              className="w-full"
            >
              <Clock className="mr-2 h-4 w-4" />
              Request Sent
            </Button>
          );
        } else {
          // Other user sent the request - show Accept/Decline
          return (
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleAcceptRequest} className="w-full">
                Accept Request
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full">
                    More
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleBlock}>
                    <UserX className="mr-2 h-4 w-4" />
                    Block User
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        }

      case "accepted":
        // Friends - show Message and Friends dropdown
        return (
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handleMessage} className="w-full">
              <MessageCircle className="mr-2 h-4 w-4" />
              Message
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Check className="mr-2 h-4 w-4" />
                  Friends
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleUnfriend}>
                  <UserMinus className="mr-2 h-4 w-4" />
                  Unfriend
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleBlock}
                  className="text-red-600"
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Block User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );

      case "blocked":
        return (
          <div className="rounded-lg bg-slate-100 p-4 text-center">
            <p className="text-sm text-slate-600">This user is not available</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-8">
          {/* Avatar */}
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-white shadow-lg ring-2 ring-slate-200">
                <AvatarImage src={user.profileImageUrl} alt={user.name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-2xl font-semibold text-white">
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
            <button
              onClick={() => setFriendsModalOpen(true)}
              disabled={!canViewFriendsList}
              className={`rounded-lg bg-slate-50 p-3 text-center transition-all ${
                canViewFriendsList
                  ? "cursor-pointer hover:bg-slate-100"
                  : "cursor-not-allowed opacity-60"
              }`}
            >
              <div className="text-2xl font-bold text-slate-900">
                {friendCount ?? 0}
              </div>
              <div className="text-sm text-slate-500">Friends</div>
            </button>
            <div className="cursor-not-allowed rounded-lg bg-slate-50 p-3 text-center opacity-60">
              <div className="text-2xl font-bold text-slate-900">
                {groupsCount}
              </div>
              <div className="text-sm text-slate-500">Groups</div>
            </div>
          </div>

          {/* Action Buttons */}
          {renderActionButtons()}
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

      {/* Friends List Modal */}
      <FriendsListModal
        userId={user._id}
        open={friendsModalOpen}
        onOpenChange={setFriendsModalOpen}
        canViewList={canViewFriendsList}
      />
    </>
  );
}
