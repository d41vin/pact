"use client";

import { useState } from "react";
import { HandCoins, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useAppKitAccount } from "@reown/appkit/react";
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
import { formatFullDate, formatExpiry } from "@/lib/date-utils";
import { formatAddress } from "@/lib/format-utils";
import { User, X, Clock, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PaymentRequestNotificationProps {
    notificationId: Id<"notifications">;
    fromUser: {
        _id: Id<"users">;
        name: string;
        username: string;
        userAddress: string;
        profileImageUrl?: string;
    };
    paymentRequestId?: Id<"paymentRequests">;
    amount: number;
    message?: string;
    timestamp: number;
    isRead: boolean;
}

export function PaymentRequestNotification({
    notificationId,
    fromUser,
    paymentRequestId,
    amount,
    message,
    timestamp,
    isRead,
}: PaymentRequestNotificationProps) {
    const { address } = useAppKitAccount();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Query request status to handle UI updates
    const request = useQuery(
        api.paymentRequests.getRequestById,
        paymentRequestId ? { requestId: paymentRequestId } : "skip"
    );

    const declineRequest = useMutation(api.paymentRequests.declineRequest);

    const handleDecline = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!address || !paymentRequestId) return;

        setIsProcessing(true);
        try {
            await declineRequest({
                userAddress: address,
                requestId: paymentRequestId,
            });
            toast.success("Request declined");
        } catch (error: any) {
            toast.error(error.message || "Failed to decline request");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSend = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!fromUser || !paymentRequestId) return;

        // Close the notification sheet before opening send payment
        window.dispatchEvent(new CustomEvent("close-notification-sheet"));

        // Trigger send payment with pre-filled data
        window.dispatchEvent(
            new CustomEvent("open-send-payment", {
                detail: {
                    recipient: {
                        _id: fromUser._id,
                        name: fromUser.name,
                        username: fromUser.username,
                        userAddress: fromUser.userAddress,
                        profileImageUrl: fromUser.profileImageUrl,
                    },
                    amount: amount.toString(),
                    requestId: paymentRequestId,
                },
            })
        );

        setIsModalOpen(false);
    };

    const handleClick = () => {
        setIsModalOpen(true);
    };

    // Determine what to show based on status
    const isPending = request?.status === "pending";

    const renderStatusBadge = () => {
        if (!request || isPending) return null;

        if (request.status === "completed") {
            return (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-0">
                    Completed
                </Badge>
            );
        }

        if (request.status === "declined") {
            return (
                <Badge variant="outline" className="bg-red-100 text-red-800 border-0">
                    Declined
                </Badge>
            );
        }

        if (request.status === "expired") {
            return (
                <Badge variant="outline" className="bg-zinc-200 text-zinc-700 border-0">
                    Expired
                </Badge>
            );
        }

        return null;
    };

    return (
        <>
            <NotificationBase
                avatar={fromUser.profileImageUrl}
                fallbackIcon={<HandCoins className="h-5 w-5" />}
                title="Payment request"
                description={`${fromUser.name} is requesting ${amount} MNT${message ? ` • ${message.substring(0, 30)}${message.length > 30 ? "..." : ""}` : ""}`}
                timestamp={timestamp}
                isRead={isRead}
                onClick={handleClick}
                actions={
                    !request && paymentRequestId ? (
                        <div className="flex gap-2 w-40">
                            <Skeleton className="h-8 flex-1 rounded-md" />
                            <Skeleton className="h-8 flex-1 rounded-md" />
                        </div>
                    ) : paymentRequestId && isPending ? (
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={handleSend}
                                disabled={isProcessing}
                                className="flex-1"
                            >
                                Send
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleDecline}
                                disabled={isProcessing}
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

            {/* Detail Modal - reusing similar structure from request sheet */}
            <PaymentRequestDetailModal
                paymentRequestId={paymentRequestId}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
            />
        </>
    );
}

interface PaymentRequestDeclinedNotificationProps {
    notificationId: Id<"notifications">;
    fromUser: {
        _id: Id<"users">;
        name: string;
        username: string;
        userAddress: string;
        profileImageUrl?: string;
    };
    paymentRequestId?: Id<"paymentRequests">;
    amount: number;
    timestamp: number;
    isRead: boolean;
}

export function PaymentRequestDeclinedNotification({
    notificationId,
    fromUser,
    paymentRequestId,
    amount,
    timestamp,
    isRead,
}: PaymentRequestDeclinedNotificationProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleClick = () => {
        setIsModalOpen(true);
    };

    return (
        <>
            <NotificationBase
                avatar={fromUser.profileImageUrl}
                fallbackIcon={<XCircle className="h-5 w-5" />}
                title="Request declined"
                description={`${fromUser.name} declined your request for ${amount} MNT`}
                timestamp={timestamp}
                isRead={isRead}
                onClick={handleClick}
            />

            <PaymentRequestDetailModal
                paymentRequestId={paymentRequestId}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
            />
        </>
    );
}

interface PaymentRequestCompletedNotificationProps {
    notificationId: Id<"notifications">;
    fromUser: {
        _id: Id<"users">;
        name: string;
        username: string;
        userAddress: string;
        profileImageUrl?: string;
    };
    paymentRequestId?: Id<"paymentRequests">;
    amount: number;
    timestamp: number;
    isRead: boolean;
}

export function PaymentRequestCompletedNotification({
    notificationId,
    fromUser,
    paymentRequestId,
    amount,
    timestamp,
    isRead,
}: PaymentRequestCompletedNotificationProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleClick = () => {
        setIsModalOpen(true);
    };

    return (
        <>
            <NotificationBase
                avatar={fromUser.profileImageUrl}
                fallbackIcon={<CheckCircle className="h-5 w-5" />}
                title="Request completed"
                description={`${fromUser.name} sent you ${amount} MNT for your request`}
                timestamp={timestamp}
                isRead={isRead}
                onClick={handleClick}
            />

            <PaymentRequestDetailModal
                paymentRequestId={paymentRequestId}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
            />
        </>
    );
}

// Shared detail modal
function PaymentRequestDetailModal({
    paymentRequestId,
    open,
    onOpenChange,
}: {
    paymentRequestId?: Id<"paymentRequests">;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { address } = useAppKitAccount();
    const [isProcessing, setIsProcessing] = useState(false);

    const request = useQuery(
        api.paymentRequests.getRequestById,
        // Prefetch data when component mounts, not when modal opens (reduces delay)
        paymentRequestId ? { requestId: paymentRequestId } : "skip"
    );

    // Fetch the payment details if request is completed (for transaction hash)
    const payment = useQuery(
        api.payments.getPaymentById,
        request?.completedPaymentId ? { paymentId: request.completedPaymentId } : "skip"
    );

    const currentUser = useQuery(
        api.users.getUser,
        address ? { userAddress: address } : "skip"
    );

    const declineRequest = useMutation(api.paymentRequests.declineRequest);

    if (!request) return null;

    const isSender = currentUser?._id === request.recipientId;
    const isPending = request.status === "pending";

    const handleDecline = async () => {
        if (!address || !paymentRequestId) return;
        setIsProcessing(true);
        try {
            await declineRequest({
                userAddress: address,
                requestId: paymentRequestId,
            });
            toast.success("Request declined");
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to decline request");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSend = () => {
        if (!request || !request.requester) return;

        // Close the notification sheet before opening send payment
        window.dispatchEvent(new CustomEvent("close-notification-sheet"));

        // Trigger send payment with pre-filled data
        window.dispatchEvent(
            new CustomEvent("open-send-payment", {
                detail: {
                    recipient: {
                        _id: request.requester._id,
                        name: request.requester.name,
                        username: request.requester.username,
                        userAddress: request.requester.userAddress,
                        profileImageUrl: request.requester.profileImageUrl,
                    },
                    amount: request.amount,
                    requestId: paymentRequestId,
                },
            })
        );

        onOpenChange(false);
    };

    const otherUser = isSender ? request.requester : request.recipient;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="rounded-[100px] corner-squircle sm:max-w-md"
                showCloseButton={false}
            >
                <DialogHeader className="relative">
                    <DialogTitle className="text-center">Request Details</DialogTitle>
                    <DialogDescription className="sr-only">
                        Payment request details
                    </DialogDescription>
                    <DialogClose asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            autoFocus={false}
                            className="absolute -right-2 -top-2 focus:outline-none focus-visible:outline-none"
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </DialogClose>
                </DialogHeader>

                <div className="space-y-6">
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                            {otherUser?.profileImageUrl ? (
                                <AvatarImage src={otherUser.profileImageUrl} />
                            ) : null}
                            <AvatarFallback>
                                <User className="h-6 w-6" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <div className="font-semibold text-zinc-900">
                                {otherUser?.name || "Unknown User"}
                            </div>
                            {otherUser && (
                                <div className="text-sm text-zinc-500">
                                    @{otherUser.username}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="rounded-[100px] corner-squircle bg-linear-to-br from-amber-50 to-yellow-50 p-6 text-center">
                        <div className="mb-1 text-sm font-medium text-zinc-600">
                            {isSender ? "Requested Amount" : "You Requested"}
                        </div>
                        <div className="text-4xl font-bold text-amber-600">
                            {request.amount} MNT
                        </div>
                    </div>

                    {/* Note */}
                    {request.note && (
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-zinc-700">Note</div>
                            <div className="rounded-[50px] corner-squircle bg-zinc-50 p-4 text-sm text-zinc-600">
                                {request.note}
                            </div>
                        </div>
                    )}

                    {/* Details */}
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Date</span>
                            <span className="font-medium text-zinc-900">
                                {formatFullDate(request._creationTime)}
                            </span>
                        </div>
                        {request.expiresAt && (
                            <div className="flex justify-between">
                                <span className="text-zinc-500">Expires</span>
                                <span className="font-medium text-zinc-900">
                                    {formatExpiry(request.expiresAt)}
                                </span>
                            </div>
                        )}
                        {/* Transaction hash for completed requests */}
                        {payment?.transactionHash && (
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
                            {(() => {
                                const status = request.status;
                                let className = "bg-zinc-100 text-zinc-800 border-0";
                                if (status === "pending") className = "bg-amber-100 text-amber-800 border-0";
                                else if (status === "completed") className = "bg-green-100 text-green-800 border-0";
                                else if (status === "declined") className = "bg-red-100 text-red-800 border-0";
                                else if (status === "expired") className = "bg-zinc-200 text-zinc-700 border-0";

                                return (
                                    <Badge variant="outline" className={className}>
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </Badge>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        {isPending && isSender ? (
                            <>
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-[50px] corner-squircle"
                                    onClick={handleDecline}
                                    disabled={isProcessing}
                                >
                                    Decline
                                </Button>
                                <Button
                                    className="flex-1 rounded-[50px] corner-squircle"
                                    onClick={handleSend}
                                    disabled={isProcessing}
                                >
                                    Send Payment
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="outline"
                                className="w-full rounded-[50px] corner-squircle"
                                onClick={() => onOpenChange(false)}
                            >
                                Close
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

