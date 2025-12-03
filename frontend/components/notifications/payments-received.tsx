"use client";

import { useState } from "react";
import { DollarSign, ExternalLink } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import NotificationBase from "./notification-base";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatFullDate, formatAddress } from "@/lib/date-utils";

interface PaymentReceivedNotificationProps {
  notificationId: Id<"notifications">;
  fromUser: {
    _id: Id<"users">;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  paymentId: Id<"payments">;
  amount: number;
  message?: string;
  timestamp: number;
  isRead: boolean;
}

export function PaymentReceivedNotification({
  notificationId,
  fromUser,
  paymentId,
  amount,
  message,
  timestamp,
  isRead,
}: PaymentReceivedNotificationProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get full payment details
  const payment = useQuery(
    api.payments.getPaymentById,
    isModalOpen ? { paymentId } : "skip",
  );

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const truncatedNote =
    message && message.length > 50 ? `${message.substring(0, 50)}...` : message;

  return (
    <>
      <NotificationBase
        avatar={fromUser.profileImageUrl}
        fallbackIcon={<DollarSign className="h-5 w-5" />}
        title="Payment received"
        description={`${fromUser.name} sent you ${amount} MNT${truncatedNote ? ` • ${truncatedNote}` : ""}`}
        timestamp={timestamp}
        isRead={isRead}
        onClick={handleClick}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Received</DialogTitle>
            <DialogDescription className="sr-only">
              Payment details from {fromUser.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Sender Info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={fromUser.profileImageUrl} />
                <AvatarFallback>
                  <User className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900">
                  {fromUser.name}
                </div>
                <div className="text-sm text-slate-500">
                  @{fromUser.username}
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 p-6 text-center">
              <div className="mb-1 text-sm font-medium text-slate-600">
                Amount Received
              </div>
              <div className="text-4xl font-bold text-green-600">
                {payment?.amount || amount} MNT
              </div>
            </div>

            {/* Note */}
            {message && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-700">Note</div>
                <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                  {message}
                </div>
              </div>
            )}

            {/* Transaction Details */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-medium text-slate-900">
                  {formatFullDate(timestamp)}
                </span>
              </div>
              {payment?.transactionHash && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Transaction</span>
                  <a
                    href={`https://explorer.testnet.mantle.xyz/tx/${payment.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700"
                  >
                    {formatAddress(payment.transactionHash)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700"
                >
                  Completed
                </Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  // TODO: Implement send back
                  setIsModalOpen(false);
                }}
              >
                Send Back
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
