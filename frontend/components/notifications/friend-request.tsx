"use client";

import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useAppKitAccount } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import NotificationBase from "./notification-base";
import { Skeleton } from "@/components/ui/skeleton";

interface FriendRequestNotificationProps {
  notificationId: Id<"notifications">;
  friendshipId: Id<"friendships">;
  fromUser: {
    _id: Id<"users">;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  timestamp: number;
  isRead: boolean;
}

export function FriendRequestNotification({
  notificationId,
  friendshipId,
  fromUser,
  timestamp,
  isRead,
}: FriendRequestNotificationProps) {
  const router = useRouter();
  const acceptRequest = useMutation(api.friendships.acceptFriendRequest);
  const declineRequest = useMutation(api.friendships.declineFriendRequest);

  // Get current user's wallet address
  const { address } = useAppKitAccount();

  // Query the friendship status to check if already responded
  const friendship = useQuery(
    api.friendships.getFriendshipById,
    friendshipId ? { friendshipId } : "skip"
  );

  const isPending = friendship?.status === "pending";

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!address) return;
    try {
      await acceptRequest({ userAddress: address, friendshipId });
      toast.success(`You are now friends with ${fromUser.name}`);
    } catch (error) {
      toast.error("Failed to accept friend request");
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!address) return;
    try {
      await declineRequest({ userAddress: address, friendshipId });
      toast.success("Friend request declined");
    } catch (error) {
      toast.error("Failed to decline friend request");
    }
  };

  const handleClick = () => {
    router.push(`/${fromUser.username}`);
  };

  // Render status badge for responded requests
  const renderStatusBadge = () => {
    if (!friendship || isPending) return null;

    if (friendship.status === "accepted") {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-0">
          Accepted
        </Badge>
      );
    }

    if (friendship.status === "declined") {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-0">
          Declined
        </Badge>
      );
    }

    return null;
  };

  return (
    <NotificationBase
      avatar={fromUser.profileImageUrl}
      fallbackIcon={<UserPlus className="h-5 w-5" />}
      title="New friend request"
      description={`${fromUser.name} wants to connect with you`}
      timestamp={timestamp}
      isRead={isRead}
      onClick={handleClick}
      actions={
        !friendship && friendshipId ? (
          <div className="flex gap-2 w-40">
            <Skeleton className="h-8 flex-1 rounded-md" />
            <Skeleton className="h-8 flex-1 rounded-md" />
          </div>
        ) : isPending ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAccept} className="flex-1">
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDecline}
              className="flex-1"
            >
              Decline
            </Button>
          </div>
        ) : (
          renderStatusBadge()
        )
      }
    />
  );
}
