"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Split,
  Check,
  XCircle,
  Bell,
  CheckCircle2,
  Pause,
  Ban,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import NotificationBase from "./notification-base";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, X } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatFullDate } from "@/lib/date-utils";
import { formatWeiToMnt } from "@/lib/format-utils";
import { ACTION_COLORS, getActionLightGradient, getActionBadge } from "@/lib/action-colors";
import { useAppKitAccount } from "@reown/appkit/react";
import { Send, ExternalLink } from "lucide-react";

// Split Bill Request Notification
export function SplitBillRequestNotification({
  notificationId,
  fromUser,
  splitBillId,
  amount,
  timestamp,
  isRead,
}: {
  notificationId: Id<"notifications">;
  fromUser: {
    _id: Id<"users">;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  splitBillId?: Id<"splitBills">;
  amount?: number;
  timestamp: number;
  isRead: boolean;
}) {
  const { address } = useAppKitAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const splitDetails = useQuery(
    api.splitBills.getSplitDetails,
    splitBillId ? { splitBillId } : "skip",
  );

  const myPart = splitDetails?.participants.find(
    (p) => p.user?.userAddress?.toLowerCase() === address?.toLowerCase(),
  );

  const handleViewDetails = () => {
    // Close the notification sheet first
    window.dispatchEvent(new CustomEvent("close-notification-sheet"));

    // Deep link to split details
    window.dispatchEvent(
      new CustomEvent("open-split-bill-details", {
        detail: { splitBillId },
      }),
    );

    setIsModalOpen(false);
  };

  const handleClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <NotificationBase
        avatar={fromUser.profileImageUrl}
        fallbackIcon={<Split className="h-5 w-5" />}
        title="Split Bill Request"
        description={`${fromUser.name} added you to a split bill${amount ? ` • Your share: ${formatWeiToMnt(amount.toString())}` : ""}`}
        timestamp={timestamp}
        isRead={isRead}
        onClick={handleClick}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="corner-squircle rounded-[40px] sm:max-w-md"
          showCloseButton={false}
        >
          <DialogHeader className="relative">
            <DialogTitle className="text-center">
              Split Bill Request
            </DialogTitle>
            <DialogDescription className="sr-only">
              Split bill request details
            </DialogDescription>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                autoFocus={false}
                className="absolute -top-2 -right-2 focus:outline-none focus-visible:outline-none"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </DialogHeader>

          {splitDetails && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={fromUser.profileImageUrl} />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-zinc-900">
                    {fromUser.name}
                  </div>
                  <div className="text-sm text-zinc-500">
                    @{fromUser.username}
                  </div>
                </div>
              </div>

              <div className="text-center">
                {splitDetails.imageOrEmoji && (
                  <div className="mb-4 text-5xl">
                    {splitDetails.imageOrEmoji}
                  </div>
                )}
                <h3 className="mb-2 text-xl font-bold text-zinc-900">
                  {splitDetails.title}
                </h3>
                {splitDetails.description && (
                  <p className="text-sm text-zinc-600">
                    {splitDetails.description}
                  </p>
                )}
              </div>

              <div className={`corner-squircle rounded-[25px] ${getActionLightGradient('splitBill')} p-6 text-center border ${ACTION_COLORS.splitBill.bg.lighter}`}>
                <div className={`mb-1 text-sm font-medium ${ACTION_COLORS.splitBill.text.secondary}`}>
                  Your Share
                </div>
                <div className={`text-3xl font-bold ${ACTION_COLORS.splitBill.text.primary}`}>
                  {formatWeiToMnt(myPart?.amount || "0")} MNT
                </div>
              </div>

              <div className="space-y-3 px-1">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">From</span>
                  <div className="flex items-center gap-1.5 font-medium text-zinc-900">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={fromUser.profileImageUrl} />
                      <AvatarFallback><User className="h-2 w-2" /></AvatarFallback>
                    </Avatar>
                    {fromUser.name}
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Date</span>
                  <span className="font-medium text-zinc-900">
                    {formatFullDate(timestamp)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Status</span>
                  <Badge className={`${ACTION_COLORS.splitBill.badge.bg} ${ACTION_COLORS.splitBill.badge.text} hover:${ACTION_COLORS.splitBill.badge.bg} border-none`}>
                    {myPart?.status === "paid"
                      ? "Paid"
                      : myPart?.status === "declined"
                        ? "Declined"
                        : "Pending"}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  className="corner-squircle flex-1 rounded-[15px]"
                  onClick={() => setIsModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  className={`corner-squircle flex-1 rounded-[15px] bg-linear-to-r ${getActionBadge('splitBill').bg} hover:opacity-90 text-white`}
                  onClick={handleViewDetails}
                >
                  View Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Split Bill Paid Notification
export function SplitBillPaidNotification({
  notificationId,
  fromUser,
  splitBillId,
  amount,
  timestamp,
  isRead,
}: {
  notificationId: Id<"notifications">;
  fromUser: {
    _id: Id<"users">;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  splitBillId?: Id<"splitBills">;
  amount?: number;
  timestamp: number;
  isRead: boolean;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const splitDetails = useQuery(
    api.splitBills.getSplitDetails,
    splitBillId ? { splitBillId } : "skip",
  );

  const handleViewDetails = () => {
    window.dispatchEvent(new CustomEvent("close-notification-sheet"));
    window.dispatchEvent(
      new CustomEvent("open-split-bill-details", {
        detail: { splitBillId },
      }),
    );
    setIsModalOpen(false);
  };

  return (
    <>
      <NotificationBase
        avatar={fromUser.profileImageUrl}
        fallbackIcon={<Check className="h-5 w-5" />}
        title="Payment Received"
        description={`${fromUser.name} paid their share${amount ? ` • ${formatWeiToMnt(amount.toString())}` : ""}`}
        timestamp={timestamp}
        isRead={isRead}
        onClick={() => setIsModalOpen(true)}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="corner-squircle rounded-[40px] sm:max-w-md"
          showCloseButton={false}
        >
          <DialogHeader className="relative">
            <DialogTitle className="text-center">Payment Received</DialogTitle>
            <DialogDescription className="sr-only">
              Payment received notification
            </DialogDescription>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                autoFocus={false}
                className="absolute -top-2 -right-2 focus:outline-none focus-visible:outline-none"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <Check className="h-10 w-10 text-green-600" />
              </div>
            </div>

            <div className="text-center">
              <div className="mb-1 text-sm text-zinc-600">
                {fromUser.name} paid for
              </div>
              <div className="mb-4 text-xl font-bold text-zinc-900">
                {splitDetails?.title || "Split Bill"}
              </div>
              <div className={`corner-squircle rounded-[25px] ${getActionLightGradient('receive')} p-6 text-center`}>
                <div className={`mb-1 text-sm font-medium ${ACTION_COLORS.receive.text.secondary}`}>
                  Amount Received
                </div>
                <div className={`text-3xl font-bold ${ACTION_COLORS.receive.text.primary}`}>
                  {formatWeiToMnt((amount || 0).toString())}
                </div>
              </div>
            </div>

            <div className="space-y-3 px-1">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">From</span>
                <div className="flex items-center gap-1.5 font-medium text-zinc-900">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={fromUser.profileImageUrl} />
                    <AvatarFallback><User className="h-2 w-2" /></AvatarFallback>
                  </Avatar>
                  {fromUser.name}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Date</span>
                <span className="font-medium text-zinc-900">
                  {formatFullDate(timestamp)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Status</span>
                <Badge className={`${ACTION_COLORS.receive.badge.bg} ${ACTION_COLORS.receive.badge.text} hover:${ACTION_COLORS.receive.badge.bg} border-none`}>
                  Completed
                </Badge>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                className="corner-squircle flex-1 rounded-[15px]"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </Button>
              <Button
                className={`corner-squircle flex-1 rounded-[15px] ${ACTION_COLORS.receive.bg.solid} hover:opacity-90 text-white`}
                onClick={handleViewDetails}
              >
                View Details
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Split Bill Reminder Notification
export function SplitBillReminderNotification({
  notificationId,
  fromUser,
  splitBillId,
  amount,
  timestamp,
  isRead,
}: {
  notificationId: Id<"notifications">;
  fromUser: {
    _id: Id<"users">;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  splitBillId?: Id<"splitBills">;
  amount?: number;
  timestamp: number;
  isRead: boolean;
}) {
  const { address } = useAppKitAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const splitDetails = useQuery(
    api.splitBills.getSplitDetails,
    splitBillId ? { splitBillId } : "skip",
  );

  const participant = splitDetails?.participants.find(
    (p) => p.user?.userAddress?.toLowerCase() === address?.toLowerCase(),
  );
  const isPaid = participant?.status === "paid" || participant?.status === "marked_paid";

  const handleViewDetails = () => {
    window.dispatchEvent(new CustomEvent("close-notification-sheet"));
    window.dispatchEvent(
      new CustomEvent("open-split-bill-details", {
        detail: { splitBillId },
      }),
    );
    setIsModalOpen(false);
  };

  let description = `${fromUser.name} sent a reminder`;
  if (amount) {
    description += ` • Your share: ${formatWeiToMnt(amount.toString())}`;
  }

  return (
    <>
      <NotificationBase
        avatar={fromUser.profileImageUrl}
        fallbackIcon={<Bell className="h-5 w-5" />}
        title="Payment Reminder"
        description={description}
        timestamp={timestamp}
        isRead={isRead}
        onClick={() => setIsModalOpen(true)}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="corner-squircle rounded-[40px] sm:max-w-md"
          showCloseButton={false}
        >
          <DialogHeader className="relative">
            <DialogTitle className="text-center">Payment Reminder</DialogTitle>
            <DialogDescription className="sr-only">
              Payment reminder details
            </DialogDescription>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                autoFocus={false}
                className="absolute -top-2 -right-2 focus:outline-none focus-visible:outline-none"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>

          {splitDetails && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mb-2 text-xl font-bold text-zinc-900">
                  {splitDetails.title}
                </div>
                <div className="text-sm text-zinc-500">
                  {isPaid
                    ? "You've already paid your share! 🙌"
                    : `${fromUser.name} is waiting for your payment`}
                </div>
              </div>

              <div className={cn(
                "corner-squircle rounded-[25px] p-6 text-center",
                isPaid ? "bg-green-50" : "bg-amber-50"
              )}>
                <div className={cn(
                  "mb-1 text-sm font-medium",
                  isPaid ? "text-green-700" : "text-amber-700"
                )}>
                  Your Share
                </div>
                <div className={cn(
                  "text-3xl font-bold",
                  isPaid ? "text-green-600" : "text-amber-600"
                )}>
                  {formatWeiToMnt((amount || 0).toString())}
                </div>
                {isPaid && (
                  <Badge className="mt-2 bg-green-100 text-green-700 border-green-200">
                    Paid
                  </Badge>
                )}
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  className="corner-squircle flex-1 rounded-[15px]"
                  onClick={() => setIsModalOpen(false)}
                >
                  Close
                </Button>
                {!isPaid && (
                  <Button
                    className="corner-squircle flex-1 rounded-[15px] bg-amber-600 hover:bg-amber-700"
                    onClick={handleViewDetails}
                  >
                    Pay Now
                  </Button>
                )}
                {isPaid && (
                  <Button
                    className="corner-squircle flex-1 rounded-[15px]"
                    onClick={handleViewDetails}
                  >
                    View Split
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Split Bill Declined Notification
export function SplitBillDeclinedNotification({
  notificationId,
  fromUser,
  splitBillId,
  timestamp,
  isRead,
}: {
  notificationId: Id<"notifications">;
  fromUser: {
    _id: Id<"users">;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  splitBillId?: Id<"splitBills">;
  timestamp: number;
  isRead: boolean;
}) {
  return (
    <NotificationBase
      avatar={fromUser.profileImageUrl}
      fallbackIcon={<XCircle className="h-5 w-5" />}
      title="Share Declined"
      description={`${fromUser.name} declined to pay their share`}
      timestamp={timestamp}
      isRead={isRead}
    />
  );
}

// Split Bill Completed Notification
export function SplitBillCompletedNotification({
  notificationId,
  fromUser,
  splitBillId,
  timestamp,
  isRead,
}: {
  notificationId: Id<"notifications">;
  fromUser: {
    _id: Id<"users">;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  splitBillId?: Id<"splitBills">;
  timestamp: number;
  isRead: boolean;
}) {
  return (
    <NotificationBase
      avatar={fromUser.profileImageUrl}
      fallbackIcon={<CheckCircle2 className="h-5 w-5" />}
      title="Split Bill Completed"
      description="All participants have paid! The split is complete."
      timestamp={timestamp}
      isRead={isRead}
    />
  );
}

// Split Bill Closed Notification
export function SplitBillClosedNotification({
  notificationId,
  fromUser,
  splitBillId,
  timestamp,
  isRead,
}: {
  notificationId: Id<"notifications">;
  fromUser: {
    _id: Id<"users">;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  splitBillId?: Id<"splitBills">;
  timestamp: number;
  isRead: boolean;
}) {
  return (
    <NotificationBase
      avatar={fromUser.profileImageUrl}
      fallbackIcon={<Pause className="h-5 w-5" />}
      title="Split Bill Closed"
      description={`${fromUser.name} closed the split bill`}
      timestamp={timestamp}
      isRead={isRead}
    />
  );
}

// Split Bill Cancelled Notification
export function SplitBillCancelledNotification({
  notificationId,
  fromUser,
  splitBillId,
  timestamp,
  isRead,
}: {
  notificationId: Id<"notifications">;
  fromUser: {
    _id: Id<"users">;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  splitBillId?: Id<"splitBills">;
  timestamp: number;
  isRead: boolean;
}) {
  return (
    <NotificationBase
      avatar={fromUser.profileImageUrl}
      fallbackIcon={<Ban className="h-5 w-5" />}
      title="Split Bill Cancelled"
      description={`${fromUser.name} cancelled the split bill`}
      timestamp={timestamp}
      isRead={isRead}
    />
  );
}
