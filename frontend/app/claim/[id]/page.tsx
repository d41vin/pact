"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWriteContract, usePublicClient } from "wagmi";
import { formatEther } from "viem";
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
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPrivateKeyFromURL,
  generateClaimProof,
} from "@/lib/crypto/proof-utils";
import { formatExpiry } from "@/lib/date-utils";
import { formatAddress, formatEtherToMnt } from "@/lib/format-utils";
import { ClaimLinkImplementationABI } from "@/lib/contracts/claim-link-abis";

// Type for claim link data
type ClaimLinkData = {
  totalAmount: string;
  totalClaimed: string;
  splitMode?: string;
  maxClaimers?: number;
  [key: string]: unknown;
};

function getClaimableAmount(claimLink: ClaimLinkData): string {
  const remaining = Math.max(
    0,
    parseFloat(claimLink.totalAmount) - parseFloat(claimLink.totalClaimed),
  );
  return formatEtherToMnt(remaining.toString());
}

// Helper function to get block explorer URL
function getExplorerUrl(txHash: string): string {
  return `https://sepolia.mantlescan.xyz/tx/${txHash}`;
}

export default function ClaimPage() {
  const params = useParams();
  const router = useRouter();
  const shortId = params.id as string;
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  // Wagmi hooks
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // Convex
  const claimLinkData = useQuery(
    api.claimLinks.getClaimLinkByShortId,
    shortId ? { shortId } : "skip",
  );
  const recordClaim = useMutation(api.claimLinks.recordClaim);
  const incrementViewCount = useMutation(api.claimLinks.incrementViewCount);

  // Local state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [privateKey, setPrivateKey] = useState<`0x${string}` | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [imageLoading, setImageLoading] = useState(true);

  // Increment view count on mount
  useEffect(() => {
    if (shortId) {
      incrementViewCount({ shortId }).catch(console.error);
    }
  }, [shortId, incrementViewCount]);

  // Extract private key from URL on mount
  useEffect(() => {
    const key = getPrivateKeyFromURL();
    if (key) {
      setPrivateKey(key);
      // Clear the hash from URL for security
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Determine loading state
  const isLoading = claimLinkData === undefined;
  const claimLink = claimLinkData;

  const handleClaimClick = async () => {
    if (!isConnected) {
      try {
        await open();
      } catch (error) {
        console.error("Failed to open wallet modal:", error);
      }
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmClaim = async () => {
    if (!address || !claimLink || !publicClient) return;

    setShowConfirmModal(false);
    setIsClaiming(true);

    try {
      // Get actual claimable amount from contract
      const claimableAmountWei = await publicClient.readContract({
        address: claimLink.contractAddress as `0x${string}`,
        abi: ClaimLinkImplementationABI,
        functionName: "getClaimableAmount",
        args: [address as `0x${string}`],
      });

      // Generate proof if in "anyone" mode
      let proof: `0x${string}` | undefined;
      if (claimLink.accessMode === "anyone") {
        if (!privateKey) {
          toast.error("Invalid claim link - missing authorization");
          setIsClaiming(false);
          return;
        }
        proof = await generateClaimProof(privateKey, address as `0x${string}`);
      }

      toast.loading("Submitting claim transaction...", { id: "claim" });

      // Call appropriate contract function
      let hash: `0x${string}`;

      if (claimLink.accessMode === "anyone") {
        // claimWithProof for anyone mode
        hash = await writeContractAsync({
          address: claimLink.contractAddress as `0x${string}`,
          abi: ClaimLinkImplementationABI,
          functionName: "claimWithProof",
          args: [proof!],
        });
      } else {
        // claim() for allowlist mode
        hash = await writeContractAsync({
          address: claimLink.contractAddress as `0x${string}`,
          abi: ClaimLinkImplementationABI,
          functionName: "claim",
          args: [],
        });
      }

      toast.loading("Waiting for confirmation...", { id: "claim" });

      // Wait for transaction receipt
      await publicClient.waitForTransactionReceipt({ hash });

      // Calculate claimed amount from contract read
      const amountWei = claimableAmountWei.toString();
      const amountClaimed = formatEther(claimableAmountWei);

      toast.loading("Recording claim...", { id: "claim" });

      // Record claim in Convex
      await recordClaim({
        claimerAddress: address,
        claimLinkId: claimLink._id,
        transactionHash: hash,
        amount: amountClaimed, // Store as Ether string for consistency
      });

      setClaimedAmount(amountClaimed);
      setTxHash(hash);
      setShowSuccessModal(true);
      toast.success("Claim successful!", { id: "claim" });
    } catch (error) {
      console.error("Claim error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to claim";
      toast.error(errorMessage, { id: "claim" });
    } finally {
      setIsClaiming(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 p-4 pt-20 pb-20">
        <div className="mx-auto max-w-md">
          <div className="corner-squircle rounded-[40px] border border-zinc-200 bg-white p-8 shadow-lg">
            <div className="mb-6 flex justify-center">
              <Skeleton className="h-32 w-32 rounded-lg" />
            </div>
            <Skeleton className="mx-auto mb-2 h-8 w-3/4" />
            <div className="mb-6 flex items-center justify-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="corner-squircle mb-6 rounded-[25px] border-2 border-zinc-200 p-6">
              <Skeleton className="mx-auto mb-2 h-4 w-16" />
              <Skeleton className="mx-auto h-10 w-32" />
            </div>
            <Skeleton className="h-12 w-full rounded-[15px]" />
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!claimLink) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4">
        <div className="max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-zinc-900">
            Claim Link Not Found
          </h1>
          <p className="mb-6 text-zinc-600">
            This claim link doesn&apos;t exist or has been removed.
          </p>
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="corner-squircle rounded-[15px]"
            aria-label="Return to Pact homepage"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to Pact
          </Button>
        </div>
      </div>
    );
  }

  const isActive = claimLink.status === "active";
  const isExpired = claimLink.status === "expired";
  const isCompleted = claimLink.status === "completed";
  const isPaused = claimLink.status === "paused";
  const isCancelled = claimLink.status === "cancelled";

  const getStatusMessage = () => {
    if (isExpired) return "This claim link has expired";
    if (isCompleted) return "All funds have been claimed";
    if (isPaused) return "This claim link is temporarily paused";
    if (isCancelled) return "This claim link has been cancelled";
    return null;
  };

  const statusMessage = getStatusMessage();

  // Check if "anyone" mode requires private key
  const needsPrivateKey = claimLink.accessMode === "anyone" && !privateKey;

  return (
    <>
      <div className="min-h-screen bg-zinc-50 p-4 pt-8 pb-8">
        <div className="mx-auto max-w-md">
          {/* Pact Logo/Header */}
          <div className="mb-8 text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <Link2 className="h-5 w-5 text-pink-600" />
              <h2 className="text-xl font-bold text-zinc-900">Pact</h2>
            </div>
            <p className="text-sm text-zinc-600">Claim Link</p>
          </div>

          <div className="corner-squircle animate-in fade-in slide-in-from-bottom-4 rounded-[40px] border border-zinc-200 bg-white p-8 shadow-lg duration-500">
            {/* Visual */}
            <div className="mb-6 flex justify-center">
              {claimLink.imageType === "emoji" ? (
                <div
                  className="text-8xl"
                  role="img"
                  aria-label={claimLink.title}
                >
                  {claimLink.imageOrEmoji}
                </div>
              ) : (
                <div className="relative h-32 w-32">
                  {imageLoading && (
                    <Skeleton className="absolute inset-0 h-32 w-32 rounded-lg" />
                  )}
                  <Image
                    src={claimLink.imageOrEmoji}
                    alt={claimLink.title}
                    fill
                    className="rounded-lg object-cover"
                    priority
                    onLoad={() => setImageLoading(false)}
                  />
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className="mb-2 text-center text-3xl font-bold text-zinc-900">
              {claimLink.title}
            </h1>

            {/* Creator Info */}
            {claimLink.creator && (
              <div className="mb-6 flex flex-wrap items-center justify-center gap-1 text-sm">
                <span className="text-zinc-600">From</span>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={claimLink.creator.profileImageUrl} />
                  <AvatarFallback>
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-zinc-900">
                  {claimLink.creator.name}
                </span>
                <span className="text-zinc-600">
                  @{claimLink.creator.username}
                </span>
              </div>
            )}

            {/* Description */}
            {claimLink.description && (
              <p className="mb-6 text-center text-zinc-600">
                {claimLink.description}
              </p>
            )}

            {/* Amount */}
            <div className="corner-squircle mb-6 rounded-[25px] border-2 border-pink-200 bg-pink-50 p-6 text-center">
              <div className="mb-1 text-sm font-medium text-pink-700">
                Available to Claim
              </div>
              <div className="text-4xl font-bold text-pink-600">
                {getClaimableAmount(claimLink)} MNT
              </div>
              {claimLink.splitMode === "equal" && (
                <div className="mt-2 text-sm text-pink-600">
                  {claimLink.claimCount}/{claimLink.maxClaimers || "∞"} claimed
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className="mb-6 flex justify-center">
              {claimLink.accessMode === "anyone" ? (
                <Badge variant="outline" className="text-sm">
                  Open to anyone with link
                </Badge>
              ) : (
                <Badge variant="outline" className="text-sm">
                  Allowlist only
                </Badge>
              )}
            </div>

            {/* Warning if private key missing */}
            {needsPrivateKey && (
              <div className="animate-in fade-in slide-in-from-top-2 mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 duration-300">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div className="text-sm text-amber-800">
                    <p className="mb-1 font-semibold">Invalid Link</p>
                    <p className="leading-relaxed">
                      This link is missing authorization. Please use the
                      complete link provided by the sender.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Message or Claim Button */}
            {statusMessage ? (
              <div className="rounded-lg bg-zinc-100 p-4 text-center">
                <p className="font-medium text-zinc-900">{statusMessage}</p>
                {isExpired && claimLink.expiresAt && (
                  <p className="mt-1 text-sm text-zinc-600">
                    Expired: {formatExpiry(claimLink.expiresAt)}
                  </p>
                )}
              </div>
            ) : (
              <Button
                size="lg"
                onClick={handleClaimClick}
                disabled={needsPrivateKey || isClaiming}
                className="corner-squircle w-full rounded-[15px] bg-pink-600 transition-all hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={
                  isClaiming
                    ? "Claiming in progress"
                    : isConnected
                      ? "Claim funds now"
                      : "Connect wallet to claim"
                }
              >
                {isClaiming ? (
                  <>
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Claiming...
                  </>
                ) : isConnected ? (
                  "Claim Now"
                ) : (
                  "Connect Wallet & Claim"
                )}
              </Button>
            )}

            {/* Additional Info */}
            {claimLink.expiresAt && isActive && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-zinc-500">
                <Clock className="h-4 w-4" />
                <span>Expires: {formatExpiry(claimLink.expiresAt)}</span>
              </div>
            )}
          </div>

          {/* Powered by */}
          <p className="animate-in fade-in mt-6 text-center text-xs text-zinc-400 delay-200 duration-700">
            Powered by{" "}
            <button
              onClick={() => router.push("/")}
              className="font-medium text-pink-600 underline-offset-2 transition-colors hover:text-pink-700 hover:underline"
              aria-label="Visit Pact homepage"
            >
              Pact
            </button>
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="corner-squircle rounded-[40px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Confirm Claim</DialogTitle>
            <DialogDescription className="sr-only">
              Confirm your claim
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-zinc-50 p-4">
              <div className="mb-2 text-sm text-zinc-600">
                You&apos;re claiming
              </div>
              <div className="text-2xl font-bold text-zinc-900">
                {claimLink.splitMode === "equal"
                  ? formatEtherToMnt((
                    parseFloat(claimLink.totalAmount) /
                    (claimLink.maxClaimers || 1)
                  ).toString())
                  : formatEtherToMnt(claimLink.totalAmount)}
                MNT
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">From</span>
                <span className="font-medium text-zinc-900">
                  {claimLink.creator?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">For</span>
                <span className="font-medium text-zinc-900">
                  {claimLink.title}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                className="corner-squircle flex-1 rounded-[15px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmClaim}
                className="corner-squircle flex-1 rounded-[15px]"
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="corner-squircle rounded-[40px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Claim Successful!</DialogTitle>
            <DialogDescription className="sr-only">
              Claim completed successfully
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>

            <div className="text-center">
              <div className="mb-1 text-sm text-zinc-600">You claimed</div>
              <div className="text-3xl font-bold text-zinc-900">
                {claimedAmount
                  ? formatEtherToMnt(claimedAmount)
                  : (claimLink?.splitMode === "equal"
                    ? formatEtherToMnt((
                      parseFloat(claimLink?.totalAmount || "0") /
                      (claimLink?.maxClaimers || 1)
                    ).toString())
                    : formatEtherToMnt(claimLink?.totalAmount || "0"))}
                MNT
              </div>
              <div className="mt-1 text-sm text-zinc-600">
                from {claimLink?.creator?.name}
              </div>
            </div>

            {/* Transaction Link */}
            {txHash && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <div className="mb-2 text-center text-xs font-medium text-zinc-700">
                  Transaction Hash
                </div>
                <a
                  href={getExplorerUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 font-mono text-sm text-pink-600 transition-colors hover:text-pink-700"
                  aria-label="View transaction on Mantle Sepolia explorer"
                >
                  <span className="truncate">{formatAddress(txHash)}</span>
                  <ExternalLink className="h-4 w-4 shrink-0" />
                </a>
              </div>
            )}

            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="corner-squircle w-fit rounded-[15px]"
              >
                Visit Pact
              </Button>
              <Button
                onClick={() => setShowSuccessModal(false)}
                className="corner-squircle w-fit rounded-[15px]"
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
