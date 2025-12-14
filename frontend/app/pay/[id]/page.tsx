"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    User,
    AlertCircle,
    CheckCircle,
    Clock,
    ExternalLink,
    Link2,
    Home,
} from "lucide-react";
import { toast } from "sonner";
import { formatFullDate, formatExpiry, formatAddress } from "@/lib/date-utils";

export default function PaymentLinkPage() {
    const params = useParams();
    const router = useRouter();
    const shortId = params.id as string;
    const { open } = useAppKit();
    const { address, isConnected } = useAppKitAccount();

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
    const [isRecording, setIsRecording] = useState(false);

    // Track if we've already recorded this payment to prevent duplicates
    const [recordedTxHash, setRecordedTxHash] = useState<string | null>(null);

    // Increment view count on mount
    const incrementViewCount = useMutation(api.paymentLinks.incrementViewCount);
    useEffect(() => {
        if (shortId) {
            incrementViewCount({ shortId }).catch(() => { });
        }
    }, [shortId, incrementViewCount]);

    // Fetch payment link data
    const paymentLink = useQuery(
        api.paymentLinks.getPaymentLinkByShortId,
        shortId ? { shortId } : "skip"
    );

    const recordPayment = useMutation(api.paymentLinks.recordPaymentLinkPayment);
    const { sendTransaction } = useSendTransaction();
    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({ hash: txHash });

    // Handle transaction confirmation
    useEffect(() => {
        // Prevent duplicate recordings
        if (
            isConfirmed &&
            txHash &&
            address &&
            paymentLink &&
            !isRecording &&
            recordedTxHash !== txHash
        ) {
            setIsRecording(true);
            setRecordedTxHash(txHash);

            recordPayment({
                payerAddress: address,
                paymentLinkId: paymentLink._id,
                transactionHash: txHash,
                amount: paymentLink.amount,
            })
                .then(() => {
                    setShowSuccessModal(true);
                    toast.success("Payment recorded successfully!");
                })
                .catch((error) => {
                    console.error("Failed to record payment:", error);
                    toast.error("Payment sent but failed to record. Please contact support with your transaction hash.");
                })
                .finally(() => {
                    setIsRecording(false);
                });
        }
    }, [isConfirmed, txHash, address, paymentLink, recordPayment, isRecording, recordedTxHash]);

    const handlePayClick = async () => {
        if (!isConnected) {
            // Open wallet connection modal
            try {
                await open();
            } catch (error) {
                console.error("Failed to open wallet modal:", error);
            }
            return;
        }
        setShowConfirmModal(true);
    };

    const handleConfirmPayment = () => {
        if (!address || !paymentLink) return;

        setShowConfirmModal(false);

        try {
            const value = parseEther(paymentLink.amount);

            sendTransaction(
                {
                    to: paymentLink.creator!.userAddress as `0x${string}`,
                    value: value,
                },
                {
                    onSuccess: (hash) => {
                        setTxHash(hash);
                        toast.info("Transaction submitted. Waiting for confirmation...");
                    },
                    onError: (error) => {
                        console.error("Transaction failed:", error);
                        toast.error("Transaction failed. Please try again.");
                    },
                }
            );
        } catch (error) {
            console.error("Payment error:", error);
            toast.error("Failed to send transaction");
        }
    };

    // Loading state with skeleton
    if (paymentLink === undefined) {
        return (
            <div className="min-h-screen bg-zinc-50 p-4 pt-20 pb-20">
                <div className="mx-auto max-w-md">
                    <div className="rounded-[40px] corner-squircle border border-zinc-200 bg-white p-8 shadow-lg">
                        {/* Visual Skeleton */}
                        <div className="mb-6 flex justify-center">
                            <Skeleton className="h-32 w-32 rounded-lg" />
                        </div>

                        {/* Title Skeleton */}
                        <Skeleton className="mx-auto mb-2 h-8 w-3/4" />

                        {/* Creator Skeleton */}
                        <div className="mb-6 flex items-center justify-center gap-2">
                            <Skeleton className="h-6 w-6 rounded-full" />
                            <Skeleton className="h-4 w-32" />
                        </div>

                        {/* Amount Skeleton */}
                        <div className="mb-6 rounded-[25px] corner-squircle border-2 border-zinc-200 p-6">
                            <Skeleton className="mx-auto mb-2 h-4 w-16" />
                            <Skeleton className="mx-auto h-10 w-32" />
                        </div>

                        {/* Button Skeleton */}
                        <Skeleton className="h-12 w-full rounded-[15px]" />
                    </div>
                </div>
            </div>
        );
    }

    // Not found state
    if (paymentLink === null) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4">
                <div className="max-w-md text-center">
                    <div className="mb-6 flex justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                            <AlertCircle className="h-10 w-10 text-red-600" />
                        </div>
                    </div>
                    <h1 className="mb-2 text-3xl font-bold text-zinc-900">
                        Payment Link Not Found
                    </h1>
                    <p className="mb-6 text-zinc-600">
                        This payment link doesn't exist or has been removed.
                    </p>
                    <Button
                        onClick={() => router.push("/")}
                        variant="outline"
                        className="rounded-[15px] corner-squircle"
                    >
                        <Home className="mr-2 h-4 w-4" />
                        Go to Pact
                    </Button>
                </div>
            </div>
        );
    }

    const isActive = paymentLink.status === "active";
    const isExpired = paymentLink.status === "expired";
    const isCompleted = paymentLink.status === "completed";
    const isPaused = paymentLink.status === "paused";
    const isInactive = paymentLink.status === "inactive";

    // Status-specific messages
    const getStatusMessage = () => {
        if (isExpired) return "This payment link has expired";
        if (isCompleted) return "This payment link has been paid";
        if (isPaused) return "This payment link is temporarily paused";
        if (isInactive) return "This payment link is no longer available";
        return null;
    };

    const statusMessage = getStatusMessage();

    return (
        <>
            <div className="min-h-screen bg-zinc-50 p-4 pt-8 pb-8">
                <div className="mx-auto max-w-md">
                    {/* Pact Logo/Header */}
                    <div className="mb-8 text-center">
                        <div className="mb-2 flex items-center justify-center gap-2">
                            <Link2 className="h-5 w-5 text-purple-600" />
                            <h2 className="text-xl font-bold text-zinc-900">Pact</h2>
                        </div>
                        <p className="text-sm text-zinc-600">Payment Link</p>
                    </div>

                    <div className="rounded-[40px] corner-squircle border border-zinc-200 bg-white p-8 shadow-lg">
                        {/* Visual */}
                        <div className="mb-6 flex justify-center">
                            {paymentLink.imageType === "emoji" ? (
                                <div className="text-8xl">{paymentLink.imageUrl}</div>
                            ) : (
                                <img
                                    src={paymentLink.imageUrl}
                                    alt={paymentLink.title}
                                    className="h-32 w-32 rounded-lg object-cover"
                                />
                            )}
                        </div>

                        {/* Title */}
                        <h1 className="mb-2 text-center text-3xl font-bold text-zinc-900">
                            {paymentLink.title}
                        </h1>

                        {/* Creator Info */}
                        {paymentLink.creator && (
                            <div className="mb-6 flex flex-wrap items-center justify-center gap-1 text-sm">
                                <span className="text-zinc-600">By</span>
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={paymentLink.creator.profileImageUrl} />
                                    <AvatarFallback>
                                        <User className="h-3 w-3" />
                                    </AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-zinc-900">
                                    {paymentLink.creator.name}
                                </span>
                                <span className="text-zinc-600">
                                    @{paymentLink.creator.username}
                                </span>
                                <span className="text-lg">🛡️</span>
                            </div>
                        )}

                        {/* Description */}
                        {paymentLink.description && (
                            <p className="mb-6 text-center text-zinc-600">
                                {paymentLink.description}
                            </p>
                        )}

                        {/* Amount */}
                        <div className="mb-6 rounded-[25px] corner-squircle border-2 border-purple-200 bg-purple-50 p-6 text-center">
                            <div className="mb-1 text-sm font-medium text-purple-700">
                                Amount
                            </div>
                            <div className="text-4xl font-bold text-purple-600">
                                {paymentLink.amount} MNT
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="mb-6 flex justify-center">
                            {paymentLink.linkType === "single-use" ? (
                                <Badge variant="outline" className="text-sm">
                                    One-time payment
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-sm">
                                    Reusable link • {paymentLink.paymentCount} payments received
                                </Badge>
                            )}
                        </div>

                        {/* Status Message or Pay Button */}
                        {statusMessage ? (
                            <div className="rounded-lg bg-zinc-100 p-4 text-center">
                                <p className="font-medium text-zinc-900">{statusMessage}</p>
                                {isExpired && paymentLink.expiresAt && (
                                    <p className="mt-1 text-sm text-zinc-600">
                                        Expired: {formatExpiry(paymentLink.expiresAt)}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <Button
                                size="lg"
                                onClick={handlePayClick}
                                disabled={isConfirming || showSuccessModal || isRecording}
                                className="w-full rounded-[15px] corner-squircle bg-purple-600 hover:bg-purple-700"
                            >
                                {isConfirming || isRecording ? (
                                    <>
                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        {isRecording ? "Recording..." : "Confirming..."}
                                    </>
                                ) : isConnected ? (
                                    `Pay ${paymentLink.amount} MNT`
                                ) : (
                                    `Connect Wallet & Pay ${paymentLink.amount} MNT`
                                )}
                            </Button>
                        )}

                        {/* Additional Info */}
                        {paymentLink.expiresAt && isActive && (
                            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-zinc-500">
                                <Clock className="h-4 w-4" />
                                <span>Expires: {formatExpiry(paymentLink.expiresAt)}</span>
                            </div>
                        )}
                    </div>

                    {/* Powered by */}
                    <p className="mt-6 text-center text-xs text-zinc-400">
                        Powered by{" "}
                        <button
                            onClick={() => router.push("/")}
                            className="font-medium text-purple-600 hover:text-purple-700"
                        >
                            Pact
                        </button>
                    </p>
                </div>
            </div>

            {/* Confirmation Modal */}
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent className="rounded-[40px] corner-squircle sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center">Confirm Payment</DialogTitle>
                        <DialogDescription className="sr-only">
                            Confirm your payment
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="rounded-lg bg-zinc-50 p-4">
                            <div className="mb-2 text-sm text-zinc-600">You're paying</div>
                            <div className="text-2xl font-bold text-zinc-900">
                                {paymentLink.amount} MNT
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-zinc-600">To</span>
                                <span className="font-medium text-zinc-900">
                                    {paymentLink.creator?.name}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-600">For</span>
                                <span className="font-medium text-zinc-900">
                                    {paymentLink.title}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 rounded-[15px] corner-squircle"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirmPayment}
                                className="flex-1 rounded-[15px] corner-squircle"
                            >
                                Pay Now
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Success Modal */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="rounded-[40px] corner-squircle sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center">
                            Payment Successful!
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Payment completed successfully
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                                <CheckCircle className="h-10 w-10 text-green-600" />
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="mb-1 text-sm text-zinc-600">You paid</div>
                            <div className="text-3xl font-bold text-zinc-900">
                                {paymentLink.amount} MNT
                            </div>
                            <div className="mt-1 text-sm text-zinc-600">
                                to {paymentLink.creator?.name}
                            </div>
                        </div>

                        <div className="space-y-2 rounded-lg bg-zinc-50 p-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-zinc-600">Transaction</span>
                                {txHash && (
                                    <a
                                        href={`https://explorer.testnet.mantle.xyz/tx/${txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700"
                                    >
                                        {formatAddress(txHash)}
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-600">Time</span>
                                <span className="font-medium text-zinc-900">
                                    {formatFullDate(Date.now())}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => router.push("/")}
                                className="flex-1 rounded-[15px] corner-squircle"
                            >
                                Visit Pact
                            </Button>
                            <Button
                                onClick={() => setShowSuccessModal(false)}
                                className="flex-1 rounded-[15px] corner-squircle"
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