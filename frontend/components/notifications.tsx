"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Id } from "@/convex/_generated/dataModel";
// import {
//   FriendRequestNotification,
//   FriendAcceptedNotification,
// } from "@/components/notifications";
import { FriendRequestNotification } from "./notifications/friend-request";
import { FriendAcceptedNotification } from "./notifications/friend-accepted";

export default function Notifications() {
  const [isOpen, setIsOpen] = useState(false);
  const { address } = useAppKitAccount();

  // Get current user
  const currentUser = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip",
  );

  // Get notifications for current user
  const notifications = useQuery(
    api.notifications.list,
    currentUser ? { userId: currentUser._id } : "skip",
  );

  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  const handleMarkAsRead = async (id: Id<"notifications">) => {
    if (!currentUser) return;
    try {
      await markAsRead({ userId: currentUser._id, notificationId: id });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    try {
      await markAllAsRead({ userId: currentUser._id });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const renderNotification = (notification: any, index: number) => {
    const commonProps = {
      notificationId: notification._id,
      timestamp: notification._creationTime,
      isRead: notification.isRead,
      onMarkRead: handleMarkAsRead,
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
      // TODO: Add other notification types (group_invite, payment_request, etc.)
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
          <Bell className="h-5 w-5 text-slate-700" />
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
          <SheetHeader className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-semibold">
                Notifications
              </SheetTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                >
                  Mark all read
                </Button>
              )}
            </div>
            <SheetDescription className="sr-only">
              View and manage your notifications
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            {!notifications || notifications.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 py-12">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <Bell className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  No notifications
                </h3>
                <p className="text-center text-sm text-slate-500">
                  You're all caught up! We'll notify you when something new
                  happens.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
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
