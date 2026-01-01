"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Spinner } from "@/components/ui/spinner";
import ActivityItem from "./activity-item";
import {
  ArrowUpRight,
  ArrowDownLeft,
  HandCoins,
  CheckCircle,
  XCircle,
  Link2,
  Gift,
  UserPlus,
  Clock,
  Split,
} from "lucide-react";

// Import modals from notifications (reuse existing)
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
import { User, ExternalLink } from "lucide-react";
import { formatFullDate } from "@/lib/date-utils";
import { formatAddress, formatSmartMnt } from "@/lib/format-utils";

interface RecentActivityFeedProps {
  userId: Id<"users">;
}

type ActivityType =
  | "payment_sent"
  | "payment_received"
  | "request_sent"
  | "request_received"
  | "request_completed"
  | "request_declined"
  | "payment_link_received"
  | "claim_link_claimed"
  | "friend_accepted"
  | "split_bill_created"
  | "split_bill_paid"
  | "split_bill_participant";

interface ModalState {
  type: ActivityType | null;
  paymentId?: Id<"payments">;
  paymentRequestId?: Id<"paymentRequests">;
  friendshipId?: Id<"friendships">;
  paymentLinkId?: Id<"paymentLinks">;
  claimLinkId?: Id<"claimLinks">;
  splitBillId?: Id<"splitBills">;
}

export default function RecentActivityFeed({
  userId,
}: RecentActivityFeedProps) {
  const [modalState, setModalState] = useState<ModalState>({ type: null });

  const activities = useQuery(api.activityFeed.getRecentActivityFeed, {
    userId,
    limit: 10,
  });

  const getActivityConfig = (type: ActivityType) => {
    switch (type) {
      case "payment_sent":
        return {
          icon: <ArrowUpRight className="h-5 w-5 text-white" />,
          iconBgClass: "bg-blue-500",
          titlePrefix: "Sent to",
          amountPrefix: "-",
          amountClass: "text-blue-600",
        };
      case "payment_received":
        return {
          icon: <ArrowDownLeft className="h-5 w-5 text-white" />,
          iconBgClass: "bg-green-500",
          titlePrefix: "Received from",
          amountPrefix: "+",
          amountClass: "text-green-600",
        };
      case "request_sent":
        return {
          icon: <HandCoins className="h-5 w-5 text-white" />,
          iconBgClass: "bg-amber-500",
          titlePrefix: "Requested from",
          amountPrefix: "",
          amountClass: "text-amber-600",
        };
      case "request_received":
        return {
          icon: <HandCoins className="h-5 w-5 text-white" />,
          iconBgClass: "bg-purple-500",
          titlePrefix: "Request from",
          amountPrefix: "",
          amountClass: "text-purple-600",
        };
      case "request_completed":
        return {
          icon: <CheckCircle className="h-5 w-5 text-white" />,
          iconBgClass: "bg-green-500",
          titlePrefix: "Request paid by",
          amountPrefix: "+",
          amountClass: "text-green-600",
        };
      case "request_declined":
        return {
          icon: <XCircle className="h-5 w-5 text-white" />,
          iconBgClass: "bg-red-500",
          titlePrefix: "Declined by",
          amountPrefix: "",
          amountClass: "text-red-600",
        };
      case "payment_link_received":
        return {
          icon: <Link2 className="h-5 w-5 text-white" />,
          iconBgClass: "bg-indigo-500",
          titlePrefix: "Link payment from",
          amountPrefix: "+",
          amountClass: "text-green-600",
        };
      case "claim_link_claimed":
        return {
          icon: <Gift className="h-5 w-5 text-white" />,
          iconBgClass: "bg-pink-500",
          titlePrefix: "Claimed by",
          amountPrefix: "-",
          amountClass: "text-pink-600",
        };
      case "friend_accepted":
        return {
          icon: <UserPlus className="h-5 w-5 text-white" />,
          iconBgClass: "bg-teal-500",
          titlePrefix: "Now friends with",
          amountPrefix: "",
          amountClass: "",
        };
      case "split_bill_created":
        return {
          icon: <Split className="h-5 w-5 text-white" />,
          iconBgClass: "bg-cyan-500",
          titlePrefix: "Created split bill",
          amountPrefix: "",
          amountClass: "text-cyan-600",
        };
      case "split_bill_paid":
        return {
          icon: <CheckCircle className="h-5 w-5 text-white" />,
          iconBgClass: "bg-teal-500",
          titlePrefix: "Split paid by",
          amountPrefix: "+",
          amountClass: "text-green-600",
        };
      case "split_bill_participant":
        return {
          icon: <Split className="h-5 w-5 text-white" />,
          iconBgClass: "bg-teal-500",
          titlePrefix: "Added to split by",
          amountPrefix: "",
          amountClass: "text-teal-600",
        };
      default:
        return {
          icon: <Clock className="h-5 w-5 text-white" />,
          iconBgClass: "bg-zinc-500",
          titlePrefix: "",
          amountPrefix: "",
          amountClass: "text-zinc-600",
        };
    }
  };

  if (activities === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="size-6 text-zinc-400" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
          <Clock className="h-6 w-6 text-zinc-400" />
        </div>
        <p className="text-sm text-zinc-500">
          Your recent transactions will appear here
        </p>
      </div>
    );
  }

  const handleActivityClick = (activity: (typeof activities)[0]) => {
    setModalState({
      type: activity.type,
      paymentId: activity.paymentId,
      paymentRequestId: activity.paymentRequestId,
      friendshipId: activity.friendshipId,
      paymentLinkId: activity.paymentLinkId,
      claimLinkId: activity.claimLinkId,
      splitBillId: activity.splitBillId,
    });
  };

  const getDescription = (activity: (typeof activities)[0]) => {
    // Payment with split bill context takes priority
    if (activity.type === "payment_sent" && activity.splitBillTitle) {
      return `for split: "${activity.splitBillTitle}"`;
    }

    if (
      activity.type === "payment_link_received" &&
      activity.paymentLinkTitle
    ) {
      return `via "${activity.paymentLinkTitle}"`;
    }
    if (activity.type === "claim_link_claimed" && activity.claimLinkTitle) {
      return `from "${activity.claimLinkTitle}"`;
    }
    // Split bill descriptions
    if (activity.type === "split_bill_created" && activity.splitBillTitle) {
      return `"${activity.splitBillTitle}"`;
    }
    if (activity.type === "split_bill_paid" && activity.splitBillTitle) {
      return `for "${activity.splitBillTitle}"`;
    }
    if (activity.type === "split_bill_participant" && activity.splitBillTitle) {
      return `"${activity.splitBillTitle}"`;
    }
    if (activity.note) {
      return activity.note.length > 40
        ? `${activity.note.substring(0, 40)}...`
        : activity.note;
    }
    return "";
  };

  return (
    <>
      <div className="divide-y divide-zinc-100">
        {activities.map((activity) => {
          const config = getActivityConfig(activity.type);
          const userName =
            activity.otherUser?.name ||
            (activity.type === "split_bill_created" ? "" : "Someone");
          const description = getDescription(activity);

          return (
            <ActivityItem
              key={activity.id}
              icon={config.icon}
              iconBgClass={config.iconBgClass}
              title={`${config.titlePrefix}${userName ? ` ${userName}` : ""}`}
              description={description}
              amount={
                activity.amount ? formatSmartMnt(activity.amount) : undefined
              }
              amountPrefix={config.amountPrefix}
              amountClass={config.amountClass}
              timestamp={activity.timestamp}
              avatar={activity.otherUser?.profileImageUrl}
              onClick={() => handleActivityClick(activity)}
            />
          );
        })}
      </div>

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        modalState={modalState}
        onClose={() => setModalState({ type: null })}
      />
    </>
  );
}

// Activity Detail Modal Component
function ActivityDetailModal({
  modalState,
  onClose,
}: {
  modalState: ModalState;
  onClose: () => void;
}) {
  const isOpen = modalState.type !== null;

  // Fetch payment details when needed
  const payment = useQuery(
    api.payments.getPaymentById,
    modalState.paymentId ? { paymentId: modalState.paymentId } : "skip",
  );

  // Fetch payment request details when needed
  const paymentRequest = useQuery(
    api.paymentRequests.getRequestById,
    modalState.paymentRequestId
      ? { requestId: modalState.paymentRequestId }
      : "skip",
  );

  // Fetch claim link details when needed
  const claimLink = useQuery(
    api.claimLinks.getClaimLinkDetails,
    modalState.claimLinkId ? { claimLinkId: modalState.claimLinkId } : "skip",
  );

  // Fetch payment link details when needed
  const paymentLink = useQuery(
    api.paymentLinks.getPaymentLinkDetails,
    modalState.paymentLinkId
      ? { paymentLinkId: modalState.paymentLinkId }
      : "skip",
  );

  if (!isOpen) return null;

  const getModalTitle = () => {
    switch (modalState.type) {
      case "payment_sent":
        return "Payment Sent";
      case "payment_received":
        return "Payment Received";
      case "request_sent":
        return "Request Sent";
      case "request_received":
        return "Request Received";
      case "request_completed":
        return "Request Completed";
      case "request_declined":
        return "Request Declined";
      case "payment_link_received":
        return "Payment Link Payment";
      case "claim_link_claimed":
        return "Claim Link Claimed";
      case "friend_accepted":
        return "New Friend";
      case "split_bill_created":
        return "Split Bill Created";
      case "split_bill_paid":
        return "Split Bill Payment";
      case "split_bill_participant":
        return "Split Bill Request";
      default:
        return "Activity Details";
    }
  };

  const renderContent = () => {
    // Payment details (sent or received)
    if (
      (modalState.type === "payment_sent" ||
        modalState.type === "payment_received" ||
        modalState.type === "payment_link_received") &&
      payment
    ) {
      const otherUser =
        modalState.type === "payment_sent" ? payment.recipient : payment.sender;
      const isReceived = modalState.type !== "payment_sent";

      return (
        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={otherUser?.profileImageUrl} />
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-zinc-900">
                {otherUser?.name || "Unknown User"}
              </div>
              {otherUser?.username && (
                <div className="text-sm text-zinc-500">
                  @{otherUser.username}
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div
            className={`rounded-lg p-6 text-center ${isReceived
              ? "bg-linear-to-br from-green-50 to-emerald-50"
              : "bg-linear-to-br from-blue-50 to-indigo-50"
              }`}
          >
            <div className="mb-1 text-sm font-medium text-zinc-600">
              {isReceived ? "Amount Received" : "Amount Sent"}
            </div>
            <div
              className={`text-4xl font-bold ${isReceived ? "text-green-600" : "text-blue-600"
                }`}
            >
              {formatSmartMnt(payment.amount)}
            </div>
          </div>

          {/* Note */}
          {payment.note && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-zinc-700">
                {modalState.type === "payment_link_received"
                  ? "Payment For"
                  : "Note"}
              </div>
              <div className="rounded-lg bg-zinc-50 p-4">
                <div className="text-sm text-zinc-600">{payment.note}</div>
                {modalState.type === "payment_link_received" &&
                  paymentLink?.shortId && (
                    <a
                      href={`/pay/${paymentLink.shortId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      View Payment Link
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
                {formatFullDate(payment.timestamp)}
              </span>
            </div>
            {payment.transactionHash && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Transaction</span>
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
              <span className="text-zinc-500">Status</span>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700"
              >
                Completed
              </Badge>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      );
    }

    // Payment request details
    if (
      (modalState.type === "request_sent" ||
        modalState.type === "request_received" ||
        modalState.type === "request_completed" ||
        modalState.type === "request_declined") &&
      paymentRequest
    ) {
      const otherUser =
        modalState.type === "request_received"
          ? paymentRequest.requester
          : paymentRequest.recipient;

      const getStatusBadge = () => {
        switch (paymentRequest.status) {
          case "pending":
            return (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-700"
              >
                Pending
              </Badge>
            );
          case "completed":
            return (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700"
              >
                Completed
              </Badge>
            );
          case "declined":
            return (
              <Badge variant="secondary" className="bg-red-100 text-red-700">
                Declined
              </Badge>
            );
          case "expired":
            return (
              <Badge variant="secondary" className="bg-zinc-200 text-zinc-700">
                Expired
              </Badge>
            );
          default:
            return null;
        }
      };

      return (
        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={otherUser?.profileImageUrl} />
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-zinc-900">
                {otherUser?.name || "Unknown User"}
              </div>
              {otherUser?.username && (
                <div className="text-sm text-zinc-500">
                  @{otherUser.username}
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="rounded-lg bg-linear-to-br from-amber-50 to-yellow-50 p-6 text-center">
            <div className="mb-1 text-sm font-medium text-zinc-600">
              Requested Amount
            </div>
            <div className="text-4xl font-bold text-amber-600">
              {formatSmartMnt(paymentRequest.amount)}
            </div>
          </div>

          {/* Note */}
          {paymentRequest.note && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-zinc-700">Note</div>
              <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600">
                {paymentRequest.note}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Date</span>
              <span className="font-medium text-zinc-900">
                {formatFullDate(paymentRequest._creationTime)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Status</span>
              {getStatusBadge()}
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      );
    }

    // Friend accepted - simple modal
    if (modalState.type === "friend_accepted") {
      return (
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
              <UserPlus className="h-8 w-8 text-teal-600" />
            </div>
          </div>
          <p className="text-zinc-600">
            You&apos;re now connected! You can send payments and requests to each
            other.
          </p>
          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      );
    }

    // Claim link claimed - detailed modal
    if (modalState.type === "claim_link_claimed" && claimLink) {
      // Find the most recent claim for this modal
      const recentClaim =
        claimLink.claims && claimLink.claims.length > 0
          ? claimLink.claims[0]
          : null;

      const claimer = recentClaim?.claimer;
      const claimerName = claimer?.name || "Someone";

      return (
        <div className="space-y-6">
          {/* Claimer Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={claimer?.profileImageUrl} />
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-zinc-900">{claimerName}</div>
              {claimer?.username && (
                <div className="text-sm text-zinc-500">@{claimer.username}</div>
              )}
            </div>
          </div>

          {/* Claim Link Title */}
          <div className="rounded-lg bg-pink-50 p-4 text-center">
            <div className="mb-1 text-sm font-medium text-zinc-600">
              Claimed from
            </div>
            <div className="text-lg font-bold text-pink-600">
              {claimLink.title}
            </div>
            {claimLink.description && (
              <div className="mt-1 text-sm text-zinc-600">
                {claimLink.description}
              </div>
            )}
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

          {/* Amount */}
          {recentClaim && (
            <div className="rounded-lg bg-linear-to-br from-pink-50 to-rose-50 p-6 text-center">
              <div className="mb-1 text-sm font-medium text-zinc-600">
                Amount Claimed
              </div>
              <div className="text-4xl font-bold text-pink-600">
                {formatSmartMnt(recentClaim.amount)}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="space-y-3 text-sm">
            {recentClaim && (
              <>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Date</span>
                  <span className="font-medium text-zinc-900">
                    {formatFullDate(recentClaim.timestamp * 1000)}
                  </span>
                </div>
                {recentClaim.transactionHash && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Transaction</span>
                    <a
                      href={`https://explorer.testnet.mantle.xyz/tx/${recentClaim.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700"
                    >
                      {formatAddress(recentClaim.transactionHash)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">Total Claims</span>
              <span className="font-medium text-zinc-900">
                {claimLink.claims?.length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Status</span>
              <Badge variant="secondary" className="bg-pink-100 text-pink-700">
                {claimLink.status === "completed" ? "Completed" : "Active"}
              </Badge>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      );
    }

    // Split bill activities - dispatch event to open split bill sheet
    if (
      (modalState.type === "split_bill_created" ||
        modalState.type === "split_bill_paid" ||
        modalState.type === "split_bill_participant") &&
      modalState.splitBillId
    ) {
      // Immediately dispatch event to open split bill details
      // and close this modal
      window.dispatchEvent(
        new CustomEvent("open-split-bill-details", {
          detail: { splitBillId: modalState.splitBillId },
        })
      );
      onClose();
      return null;
    }

    // Loading state
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="size-6 text-zinc-400" />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getModalTitle()}</DialogTitle>
          <DialogDescription className="sr-only">
            Activity details
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
