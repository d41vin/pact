"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { FriendRequestNotification } from "@/components/notifications/friend-request";
import { FriendAcceptedNotification } from "@/components/notifications/friend-accepted";
import { GroupInviteNotification } from "@/components/notifications/group-invite";
import { GroupJoinedNotification } from "@/components/notifications/group-joined";
import { PaymentReceivedNotification } from "@/components/notifications/payments-received";
import {
  PaymentRequestNotification,
  PaymentRequestDeclinedNotification,
  PaymentRequestCompletedNotification,
} from "@/components/notifications/payment-request";
import { PaymentLinkReceivedNotification } from "@/components/notifications/payment-link";
import { ClaimLinkClaimedNotification } from "@/components/notifications/claim-link";
import {
  SplitBillRequestNotification,
  SplitBillPaidNotification,
  SplitBillReminderNotification,
  SplitBillDeclinedNotification,
  SplitBillCompletedNotification,
  SplitBillClosedNotification,
  SplitBillCancelledNotification,
} from "@/components/notifications/split-bill";

export default function Notifications() {
  const [isOpen, setIsOpen] = useState(false);
  const { address } = useAppKitAccount();

  const currentUser = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip",
  );

  const notifications = useQuery(
    api.notifications.list,
    currentUser ? { userId: currentUser._id } : "skip",
  );

  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  useEffect(() => {
    if (isOpen && address && unreadCount > 0) {
      markAllAsRead({ userAddress: address }).catch((error) => {
        console.error("Failed to mark all as read:", error);
      });
    }
  }, [isOpen, address, unreadCount, markAllAsRead]);

  useEffect(() => {
    const handleCloseSheet = () => {
      setIsOpen(false);
    };

    window.addEventListener("close-notification-sheet", handleCloseSheet);
    return () => {
      window.removeEventListener("close-notification-sheet", handleCloseSheet);
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const renderNotification = (notification: any, index: number) => {
    const commonProps = {
      notificationId: notification._id,
      timestamp: notification._creationTime,
      isRead: notification.isRead,
    };

    switch (notification.type) {
      case "friend_request":
        return (
          <FriendRequestNotification
            key={notification._id}
            {...commonProps}
            friendshipId={notification.friendshipId!}
            fromUser={notification.fromUser}
          />
        );
      case "friend_accepted":
        return (
          <FriendAcceptedNotification
            key={notification._id}
            {...commonProps}
            fromUser={notification.fromUser}
          />
        );
      case "split_bill_request":
        return (
          <SplitBillRequestNotification
            key={notification._id}
            {...commonProps}
            fromUser={notification.fromUser}
            splitBillId={notification.splitBillId}
            amount={notification.amount}
          />
        );
      case "split_bill_paid":
        return (
          <SplitBillPaidNotification
            key={notification._id}
            {...commonProps}
            fromUser={notification.fromUser}
            splitBillId={notification.splitBillId}
            amount={notification.amount}
          />
        );
      case "split_bill_reminder":
        return (
          <SplitBillReminderNotification
            key={notification._id}
            {...commonProps}
            fromUser={notification.fromUser}
            splitBillId={notification.splitBillId}
            amount={notification.amount}
          />
        );
      case "split_bill_declined":
        return (
          <SplitBillDeclinedNotification
            key={notification._id}
            {...commonProps}
            fromUser={notification.fromUser}
            splitBillId={notification.splitBillId}
          />
        );
      case "split_bill_completed":
        return (
          <SplitBillCompletedNotification
            key={notification._id}
            {...commonProps}
            fromUser={notification.fromUser}
            splitBillId={notification.splitBillId}
          />
        );
      case "split_bill_closed":
        return (
          <SplitBillClosedNotification
            key={notification._id}
            {...commonProps}
            fromUser={notification.fromUser}
            splitBillId={notification.splitBillId}
          />
        );
      case "split_bill_cancelled":
        return (
          <SplitBillCancelledNotification
            key={notification._id}
            {...commonProps}
            fromUser={notification.fromUser}
            splitBillId={notification.splitBillId}
          />
        );
      case "group_invite":
        return (
          <GroupInviteNotification
            key={notification._id}
            {...commonProps}
            invitationId={notification.invitationId}
            fromUser={notification.fromUser}
            group={notification.group}
            message={notification.message}
          />
        );
      case "group_joined":
        return (
          <GroupJoinedNotification
            key={notification._id}
            {...commonProps}
            fromUser={notification.fromUser}
            group={notification.group}
            message={notification.message}
          />
        );
      case "payment_received":
        return (
          <PaymentReceivedNotification
            key={notification._id}
            {...commonProps}
            fromUser={notification.fromUser}
            paymentId={notification.paymentId}
            amount={notification.amount}
            message={notification.message}
          />
        );
      case "payment_request":
        return (
          <PaymentRequestNotification
            key={notification._id}
            {...commonProps}
            fromUser={notification.fromUser}
            paymentRequestId={notification.paymentRequestId}
            amount={notification.amount || 0}
            message={notification.message}
          />
        );
      case "payment_request_declined":
        return (
          <PaymentRequestDeclinedNotification
            key={notification._id}
            {...commonProps}
            fromUser={notification.fromUser}
            paymentRequestId={notification.paymentRequestId}
            amount={notification.amount || 0}
          />
        );
      case "payment_request_completed":
        return (
          <PaymentRequestCompletedNotification
            key={notification._id}
            {...commonProps}
            fromUser={notification.fromUser}
            paymentRequestId={notification.paymentRequestId}
            amount={notification.amount || 0}
          />
        );
      case "payment_link_received":
        return (
          <PaymentLinkReceivedNotification
            key={notification._id}
            {...commonProps}
            fromUser={notification.fromUser}
            paymentId={notification.paymentId}
            paymentLinkId={notification.paymentLinkId}
            amount={notification.amount || 0}
            message={notification.message}
          />
        );
      case "claim_link_claimed":
        return (
          <ClaimLinkClaimedNotification
            key={notification._id}
            {...commonProps}
            fromUser={notification.fromUser}
            claimLinkId={notification.claimLinkId}
            claimLink={notification.claimLink}
            message={notification.message}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition-shadow hover:shadow-lg"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-5 w-5 text-zinc-700" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full p-0 sm:max-w-md">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-zinc-200 px-6 py-4">
            <SheetTitle className="text-xl font-semibold">
              Notifications
            </SheetTitle>
            <SheetDescription className="sr-only">
              View and manage your notifications
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 py-12">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
                  <Bell className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                  No notifications
                </h3>
                <p className="text-center text-sm text-zinc-500">
                  You&apos;re all caught up! We&apos;ll notify you when
                  something new happens.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                <AnimatePresence initial={false}>
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification._id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      {renderNotification(notification, index)}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
