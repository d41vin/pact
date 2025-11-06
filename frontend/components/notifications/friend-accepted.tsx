"use client";

import { UserCheck } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import NotificationBase from "./notification-base";

interface FriendAcceptedNotificationProps {
  notificationId: Id<"notifications">;
  fromUser: {
    _id: Id<"users">;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  timestamp: number;
  isRead: boolean;
}

export function FriendAcceptedNotification({
  notificationId,
  fromUser,
  timestamp,
  isRead,
}: FriendAcceptedNotificationProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/${fromUser.username}`);
  };

  return (
    <NotificationBase
      avatar={fromUser.profileImageUrl}
      fallbackIcon={<UserCheck className="h-5 w-5" />}
      title="Friend request accepted"
      description={`${fromUser.name} accepted your friend request`}
      timestamp={timestamp}
      isRead={isRead}
      onClick={handleClick}
    />
  );
}
