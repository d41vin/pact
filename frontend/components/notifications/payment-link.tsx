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
import { formatFullDate, formatAddress } from "@/lib/date-utils";

interface PaymentLinkReceivedNotificationProps {
    notificationId: Id<"notifications">;
    fromUser?: {
        _id: Id<"users">;
        name: string;
        username: string;
        profileImageUrl?: string;
    };
    paymentId: Id<"payments">;
    paymentLinkId?: Id<"paymentLinks">;
    amount: number;
    message?: string;
    timestamp: number;
    isRead: boolean;
}

export function PaymentLinkReceivedNotification({
    notificationId,
    fromUser,
    paymentId,
    paymentLinkId,
    amount,
    message,
    timestamp,
    isRead,
}: PaymentLinkReceivedNotificationProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Get full payment details
    const payment = useQuery(
        api.payments.getPaymentById,
        isModalOpen ? { paymentId } : "skip"
    );

    const handleClick = () => {
        setIsModalOpen(true);
    };

    const payerName = fromUser ? fromUser.name : "Someone";

    return (
        <>
            <NotificationBase
                avatar={fromUser?.profileImageUrl}
                fallbackIcon={<Link2 className="h-5 w-5" />}
                title="Payment received via link"
                description={`${payerName} paid ${amount} MNT${message ? ` for: ${message}` : ""}`}
                timestamp={timestamp}
                isRead={isRead}
                onClick={handleClick}
            />

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent
                    className="rounded-[40px] corner-squircle sm:max-w-md"
                    showCloseButton={false}
                >
                    <DialogHeader className="relative">
                        <DialogTitle className="text-center">
                            Payment Link Payment
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Payment received via payment link
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
                        {/* Payer Info (if available) */}
                        {fromUser && (
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
                        )}

                        {/* Amount */}
                        <div className="rounded-[40px] corner-squircle bg-linear-to-br from-purple-50 to-pink-50 p-6 text-center">
                            <div className="mb-1 text-sm font-medium text-zinc-600">
                                Amount Received
                            </div>
                            <div className="text-4xl font-bold text-purple-600">
                                {payment?.amount || amount} MNT
                            </div>
                        </div>

                        {/* Payment Link Info */}
                        {message && (
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-zinc-700">
                                    Payment For
                                </div>
                                <div className="rounded-[15px] corner-squircle bg-zinc-50 p-4 text-sm text-zinc-600">
                                    {message}
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
                                <Badge
                                    variant="secondary"
                                    className="bg-green-100 text-green-700"
                                >
                                    Completed
                                </Badge>
                            </div>
                        </div>

                        {/* Close Button */}
                        <div className="flex justify-center">
                            <Button
                                variant="outline"
                                className="w-fit rounded-[15px] corner-squircle"
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