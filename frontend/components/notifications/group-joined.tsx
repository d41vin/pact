"use client";

import { Users } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import NotificationBase from "./notification-base";

interface GroupJoinedNotificationProps {
  notificationId: Id<"notifications">;
  fromUser: {
    _id: Id<"users">;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  group?: {
    _id: Id<"groups">;
    name: string;
  };
  message?: string;
  timestamp: number;
  isRead: boolean;
}

export function GroupJoinedNotification({
  notificationId,
  fromUser,
  group,
  message,
  timestamp,
  isRead,
}: GroupJoinedNotificationProps) {
  const router = useRouter();

  const handleClick = () => {
    if (group?._id) {
      router.push(`/groups/${group._id}`);
    }
  };

  const getDescription = () => {
    if (message) return message;
    return `${fromUser.name} joined ${group?.name || "the group"}`;
  };

  return (
    <NotificationBase
      avatar={fromUser.profileImageUrl}
      fallbackIcon={<Users className="h-5 w-5" />}
      title="Group member joined"
      description={getDescription()}
      timestamp={timestamp}
      isRead={isRead}
      onClick={handleClick}
    />
  );
}
