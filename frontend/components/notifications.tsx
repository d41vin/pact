"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Check,
  X,
  UserPlus,
  Users,
  DollarSign,
  FileText,
} from "lucide-react";
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
// import { useQuery, useMutation } from 'convex/react'
// import { api } from '@/convex/_generated/api'

// TODO: Replace with your actual Notification type from Convex
interface Notification {
  _id: string;
  type:
    | "friend_request"
    | "group_invite"
    | "payment_received"
    | "payment_request"
    | "general";
  title: string;
  description: string;
  isRead: boolean;
  createdAt: number;
  fromUser?: {
    name: string;
    username: string;
    avatar?: string | null;
  };
  metadata?: {
    groupName?: string;
    amount?: number;
    transactionId?: string;
    requestId?: string;
  };
}

// TODO: Remove mock data once Convex is integrated
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    _id: "1",
    type: "friend_request",
    title: "New friend request",
    description: "Sarah Johnson wants to connect with you",
    isRead: false,
    createdAt: Date.now() - 120000, // 2 minutes ago
    fromUser: {
      name: "Sarah Johnson",
      username: "sarahj",
      avatar: null,
    },
  },
  {
    _id: "2",
    type: "payment_received",
    title: "Payment received",
    description: "You received $50.00 from Michael Chen",
    isRead: false,
    createdAt: Date.now() - 3600000, // 1 hour ago
    fromUser: {
      name: "Michael Chen",
      username: "mchen",
      avatar: null,
    },
    metadata: {
      amount: 50.0,
      transactionId: "txn_123456",
    },
  },
  {
    _id: "3",
    type: "group_invite",
    title: "Group invitation",
    description: 'Emily Rodriguez invited you to join "Weekend Trip Fund"',
    isRead: false,
    createdAt: Date.now() - 7200000, // 2 hours ago
    fromUser: {
      name: "Emily Rodriguez",
      username: "emilyrod",
      avatar: null,
    },
    metadata: {
      groupName: "Weekend Trip Fund",
    },
  },
  {
    _id: "4",
    type: "payment_request",
    title: "Payment request",
    description: "James Wilson requested $25.00 for dinner",
    isRead: true,
    createdAt: Date.now() - 86400000, // 1 day ago
    fromUser: {
      name: "James Wilson",
      username: "jwilson",
      avatar: null,
    },
    metadata: {
      amount: 25.0,
      requestId: "req_789012",
    },
  },
];

// Format timestamp to relative time
const formatTimestamp = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
};

// Get icon based on notification type
const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "friend_request":
      return UserPlus;
    case "group_invite":
      return Users;
    case "payment_received":
      return DollarSign;
    case "payment_request":
      return FileText;
    default:
      return Bell;
  }
};

export default function Notifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] =
    useState<Notification[]>(MOCK_NOTIFICATIONS);

  // TODO: Replace with Convex queries and mutations
  // const notifications = useQuery(api.notifications.list)
  // const markAsRead = useMutation(api.notifications.markAsRead)
  // const markAllAsRead = useMutation(api.notifications.markAllAsRead)
  // const acceptFriendRequest = useMutation(api.friends.acceptRequest)
  // const declineFriendRequest = useMutation(api.friends.declineRequest)
  // const acceptGroupInvite = useMutation(api.groups.acceptInvite)
  // const declineGroupInvite = useMutation(api.groups.declineInvite)

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = (id: string) => {
    // TODO: Replace with Convex mutation
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
    );
  };

  const handleMarkAllAsRead = () => {
    // TODO: Replace with Convex mutation
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleAcceptFriendRequest = (id: string) => {
    console.log("Accept friend request:", id);
    // TODO: Implement with Convex mutation
    handleMarkAsRead(id);
  };

  const handleDeclineFriendRequest = (id: string) => {
    console.log("Decline friend request:", id);
    // TODO: Implement with Convex mutation
    handleMarkAsRead(id);
  };

  const handleAcceptGroupInvite = (id: string) => {
    console.log("Accept group invite:", id);
    // TODO: Implement with Convex mutation
    handleMarkAsRead(id);
  };

  const handleDeclineGroupInvite = (id: string) => {
    console.log("Decline group invite:", id);
    // TODO: Implement with Convex mutation
    handleMarkAsRead(id);
  };

  const handlePayRequest = (id: string) => {
    console.log("Pay request:", id);
    // TODO: Implement payment flow
    handleMarkAsRead(id);
  };

  const handleDeclinePaymentRequest = (id: string) => {
    console.log("Decline payment request:", id);
    // TODO: Implement with Convex mutation
    handleMarkAsRead(id);
  };

  const handleViewTransaction = (id: string) => {
    console.log("View transaction:", id);
    // TODO: Navigate to transaction details
    handleMarkAsRead(id);
  };

  const renderNotificationActions = (notification: Notification) => {
    if (notification.isRead) return null;

    switch (notification.type) {
      case "friend_request":
        return (
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleAcceptFriendRequest(notification._id);
              }}
              className="flex-1"
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleDeclineFriendRequest(notification._id);
              }}
              className="flex-1"
            >
              Decline
            </Button>
          </div>
        );
      case "group_invite":
        return (
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleAcceptGroupInvite(notification._id);
              }}
              className="flex-1"
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleDeclineGroupInvite(notification._id);
              }}
              className="flex-1"
            >
              Decline
            </Button>
          </div>
        );
      case "payment_request":
        return (
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handlePayRequest(notification._id);
              }}
              className="flex-1"
            >
              Pay ${notification.metadata?.amount?.toFixed(2)}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleDeclinePaymentRequest(notification._id);
              }}
              className="flex-1"
            >
              Decline
            </Button>
          </div>
        );
      case "payment_received":
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleViewTransaction(notification._id);
            }}
            className="mt-3 w-full"
          >
            View Transaction
          </Button>
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
            {notifications.length === 0 ? (
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
                  {notifications.map((notification, index) => {
                    const Icon = getNotificationIcon(notification.type);
                    return (
                      <motion.div
                        key={notification._id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() =>
                          !notification.isRead &&
                          handleMarkAsRead(notification._id)
                        }
                        className={`cursor-pointer px-6 py-4 transition-colors ${
                          notification.isRead
                            ? "bg-white hover:bg-slate-50"
                            : "bg-blue-50/50 hover:bg-blue-50"
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                              {notification.fromUser?.avatar ? (
                                <img
                                  src={notification.fromUser.avatar}
                                  alt=""
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                <Icon className="h-5 w-5" />
                              )}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-start justify-between gap-2">
                              <h4 className="text-sm font-semibold text-slate-900">
                                {notification.title}
                              </h4>
                              <span className="text-xs whitespace-nowrap text-slate-500">
                                {formatTimestamp(notification.createdAt)}
                              </span>
                            </div>
                            <p className="mb-1 text-sm text-slate-600">
                              {notification.description}
                            </p>
                            {!notification.isRead && (
                              <div className="flex items-center gap-1 text-xs font-medium text-blue-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                                New
                              </div>
                            )}
                            {renderNotificationActions(notification)}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
