"use client";

import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useAppKitAccount } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import NotificationBase from "./notification-base";

interface GroupInviteNotificationProps {
  notificationId: Id<"notifications">;
  invitationId?: Id<"groupInvitations">;
  fromUser: {
    _id: Id<"users">;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  group?: {
    _id: Id<"groups">;
    name: string;
    imageOrEmoji: string;
    imageType: "emoji" | "image";
    accentColor: string;
  };
  message?: string;
  timestamp: number;
  isRead: boolean;
}

export function GroupInviteNotification({
  notificationId,
  invitationId,
  fromUser,
  group,
  message,
  timestamp,
  isRead,
}: GroupInviteNotificationProps) {
  const router = useRouter();
  const { address } = useAppKitAccount();

  // Query invitation status
  const invitation = useQuery(
    api.groups.getInvitationById,
    invitationId ? { invitationId } : "skip"
  );

  const acceptInvitation = useMutation(api.groups.acceptInvitation);
  const declineInvitation = useMutation(api.groups.declineInvitation);

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!address || !invitationId) return;

    try {
      await acceptInvitation({ userAddress: address, invitationId });
      toast.success(`You joined ${group?.name || "the group"}!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to accept invitation");
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!address || !invitationId) return;

    try {
      await declineInvitation({ userAddress: address, invitationId });
      toast.success("Invitation declined");
    } catch (error: any) {
      toast.error(error.message || "Failed to decline invitation");
    }
  };

  const handleClick = () => {
    if (group?._id) {
      router.push(`/groups/${group._id}`);
    }
  };

  // If there's a custom message (like "removed from group"), show it differently
  if (message) {
    return (
      <NotificationBase
        avatar={fromUser.profileImageUrl}
        fallbackIcon={<Users className="h-5 w-5" />}
        title={message}
        description={`from ${group?.name || "a group"}`}
        timestamp={timestamp}
        isRead={isRead}
        onClick={handleClick}
      />
    );
  }

  const isPending = invitation?.status === "pending";

  const renderStatusBadge = () => {
    if (!invitation || isPending) return null;

    if (invitation.status === "accepted") {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          Joined
        </Badge>
      );
    }

    if (invitation.status === "declined") {
      return (
        <Badge variant="secondary" className="bg-zinc-100 text-zinc-600">
          Declined
        </Badge>
      );
    }

    return null;
  };

  // Regular group invitation
  return (
    <NotificationBase
      avatar={fromUser.profileImageUrl}
      fallbackIcon={<Users className="h-5 w-5" />}
      title="Group invitation"
      description={`${fromUser.name} invited you to join ${group?.name || "a group"}`}
      timestamp={timestamp}
      isRead={isRead}
      onClick={handleClick}
      actions={
        invitationId && isPending ? (
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
