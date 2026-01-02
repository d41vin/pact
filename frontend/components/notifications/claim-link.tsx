"use client";

import { useState } from "react";
import { Link2, ExternalLink } from "lucide-react";
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
import { formatMntValue, formatAddress } from "@/lib/format-utils";
import { ACTION_COLORS, getActionLightGradient } from "@/lib/action-colors";
import { formatEther } from "viem";

interface ClaimLinkClaimedNotificationProps {
  notificationId: Id<"notifications">;
  fromUser?: {
    _id: Id<"users">;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  claimLinkId?: Id<"claimLinks">;
  claimLink?: {
    title: string;
    imageOrEmoji: string;
    shortId?: string; // Added this to support claimLink.shortId
    totalAmount?: string; // Added this to support claimLink.totalAmount
  };
  amount?: number;
  message?: string; // JSON string with address and amount
  timestamp: number;
  isRead: boolean;
}

export function ClaimLinkClaimedNotification({
  notificationId,
  fromUser,
  claimLinkId,
  claimLink,
  amount: deprecatedAmount, // Schema has optional amount, but we put it in message
  message,
  timestamp,
  isRead,
}: ClaimLinkClaimedNotificationProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Parse message for details
  let claimedAmount = "0";
  let claimerAddress = "";

  try {
    if (message) {
      const parsed = JSON.parse(message);
      // Amount is stored in Wei, convert to Ether
      claimedAmount = parsed.amount ? formatEther(BigInt(parsed.amount)) : "0";
      claimerAddress = parsed.address || "";
    }
  } catch (e) {
    console.error("Failed to parse claim notification message", e);
  }

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const claimerName = fromUser
    ? fromUser.name
    : claimerAddress
      ? formatAddress(claimerAddress)
      : "Someone";
  const title = claimLink?.title || "Claim Link";

  return (
    <>
      <NotificationBase
        avatar={fromUser?.profileImageUrl}
        fallbackIcon={<Link2 className="h-5 w-5" />}
        title="Claim Link Claimed"
        description={`${claimerName} claimed ${claimedAmount} MNT from "${title}"`}
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
            <DialogTitle className="text-center">Claim Details</DialogTitle>
            <DialogDescription className="sr-only">
              Funds claimed from your claim link
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

          <div className="space-y-6">
            {/* Claimer Info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={fromUser?.profileImageUrl} />
                <AvatarFallback>
                  <User className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-zinc-900">
                  {fromUser
                    ? fromUser.name
                    : claimerAddress
                      ? formatAddress(claimerAddress)
                      : "Unknown User"}
                </div>
                {fromUser && (
                  <div className="text-sm text-zinc-500">
                    @{fromUser.username}
                  </div>
                )}
                {!fromUser && claimerAddress && (
                  <div className="text-sm text-zinc-500">
                    {formatAddress(claimerAddress)}
                  </div>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className={`corner-squircle rounded-[40px] bg-linear-to-br ${getActionLightGradient('claimLink')} p-6 text-center`}>
              <div className="mb-1 text-sm font-medium text-zinc-600">
                Amount Claimed
              </div>
              <div className={`text-4xl font-bold ${ACTION_COLORS.claimLink.text.primary}`}>
                {formatMntValue(claimLink?.totalAmount || "0")} MNT
              </div>
            </div>

            {/* Link Info */}
            {claimLink && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-zinc-700">
                  From Link
                </div>
                <div className="corner-squircle rounded-[15px] bg-zinc-50 p-4">
                  <div className="font-medium text-zinc-900">
                    {claimLink.imageOrEmoji} {claimLink.title}
                  </div>
                  {claimLink.shortId && (
                    <a
                      href={`/claim/${claimLink.shortId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 hover:underline"
                    >
                      View Claim Link
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Transaction Details */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Date</span>
                <span className="font-medium text-zinc-900">
                  {formatFullDate(timestamp)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Status</span>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700"
                >
                  Claimed
                </Badge>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                className="corner-squircle w-fit rounded-[15px]"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
