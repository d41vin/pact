"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatFullDate, formatAddress } from "@/lib/date-utils";
import {
  Send,
  History,
  ArrowLeft,
  User,
  Loader2,
  Info,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import UserRecipientInput, {
  RecipientUser,
} from "@/components/home/user-recipient-input";

type ViewMode = "send" | "history";

export default function SendPaymentSheet() {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("send");
  const { address } = useAppKitAccount();

  // Form state
  const [recipient, setRecipient] = useState<RecipientUser | string | null>(
    null,
  );
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  // Transaction state
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [pendingTxData, setPendingTxData] = useState<{
    recipient: RecipientUser | string;
    amount: string;
    note: string;
  } | null>(null);

  // Payment detail modal
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Get payment history
  const paymentHistory = useQuery(
    api.payments.getSentPayments,
    address ? { userAddress: address } : "skip",
  );

  // Wagmi hooks
  const { sendTransaction } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  // Show confirming toast when waiting for transaction
  useEffect(() => {
    if (isConfirming && txHash) {
      console.log("Transaction confirming:", txHash);
    }
  }, [isConfirming, txHash]);

  // Convex mutation
  const createPayment = useMutation(api.payments.createPayment);

  // Check if recipient is an app user
  const isRecipientAppUser =
    typeof recipient === "object" && recipient !== null;

  // Handle transaction confirmation
  useEffect(() => {
    console.log("Confirmation effect:", {
      isConfirmed,
      txHash,
      address,
      hasPendingData: !!pendingTxData,
    });

    if (isConfirmed && txHash && address && pendingTxData) {
      // Create payment record in Convex
      const recipientAddress =
        typeof pendingTxData.recipient === "object" &&
          pendingTxData.recipient !== null
          ? pendingTxData.recipient.userAddress
          : (pendingTxData.recipient as string);

      console.log("Creating payment record:", {
        senderAddress: address,
        recipientAddress,
        amount: pendingTxData.amount,
        note: pendingTxData.note,
        transactionHash: txHash,
      });

      createPayment({
        senderAddress: address,
        recipientAddress: recipientAddress,
        amount: pendingTxData.amount,
        note: pendingTxData.note || undefined,
        transactionHash: txHash,
      })
        .then(() => {
          console.log("Payment record created successfully");
          toast.success("Payment sent successfully!");
          // Clear pending data
          setPendingTxData(null);
          setTxHash(undefined);
        })
        .catch((error) => {
          console.error("Failed to save payment:", error);
          toast.error("Payment sent but failed to save record");
          setPendingTxData(null);
          setTxHash(undefined);
        });
    }
  }, [isConfirmed, txHash, address, pendingTxData, createPayment]);

  const resetForm = () => {
    setRecipient(null);
    setAmount("");
    setNote("");
    setTxHash(undefined);
    setPendingTxData(null);
  };

  const handleSend = () => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    const recipientAddress =
      typeof recipient === "object" && recipient !== null
        ? recipient.userAddress
        : (recipient as string);

    if (!recipientAddress || !recipientAddress.startsWith("0x")) {
      toast.error("Please select a recipient");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      // Store transaction data before initiating
      setPendingTxData({
        recipient: recipient!,
        amount: amount,
        note: note,
      });

      const value = parseEther(amount);

      // Close sheet immediately before opening wallet modal
      setOpen(false);

      // Small delay to ensure sheet is fully closed before wallet modal opens
      setTimeout(() => {
        sendTransaction(
          {
            to: recipientAddress as `0x${string}`,
            value: value,
          },
          {
            onSuccess: (hash) => {
              setTxHash(hash);
              toast.info("Transaction submitted. Waiting for confirmation...");
              // Reset form after transaction is submitted
              setRecipient(null);
              setAmount("");
              setNote("");
            },
            onError: (error) => {
              console.error("Transaction failed:", error);
              toast.error("Transaction failed");
              setPendingTxData(null);
            },
          },
        );
      }, 100);
    } catch (error) {
      console.error("Send error:", error);
      toast.error("Failed to send transaction");
      setPendingTxData(null);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setViewMode("send");
          // Only reset if no pending transaction
          if (!pendingTxData) {
            resetForm();
          }
        }
      }}
    >
      <SheetTrigger asChild>
        <Button className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg transition-all hover:shadow-xl">
          <Send className="h-6 w-6" />
          <span className="text-sm font-medium">Send</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] p-0">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            {viewMode === "history" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("send")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {viewMode === "send" && <div className="w-10" />}

            <SheetTitle className="text-xl font-semibold">
              {viewMode === "send" ? "Send Payment" : "Payment History"}
            </SheetTitle>

            {viewMode === "send" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode("history")}
              >
                <History className="h-5 w-5" />
              </Button>
            )}
            {viewMode === "history" && <div className="w-10" />}
          </div>

          <SheetDescription className="sr-only">
            {viewMode === "send"
              ? "Send payment to friends or any wallet address"
              : "View your payment history"}
          </SheetDescription>

          {/* Content */}
          <ScrollArea className="flex-1">
            {viewMode === "send" ? (
              <div className="space-y-6 p-6">
                {/* Recipient Field */}
                <div className="space-y-2">
                  <Label>Recipient</Label>
                  <UserRecipientInput
                    value={recipient}
                    onChange={setRecipient}
                    placeholder="Search user or paste address"
                  />
                </div>

                {/* Amount Field */}
                <div className="space-y-2">
                  <Label>Amount (MNT)</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                {/* Note Field */}
                <div className="space-y-2">
                  <Label>
                    Note (Optional)
                    {!isRecipientAppUser && (
                      <span className="ml-2 text-xs text-slate-500">
                        - Only available when sending to app users
                      </span>
                    )}
                  </Label>
                  <Textarea
                    placeholder={
                      isRecipientAppUser
                        ? "Add a note..."
                        : "Recipient must be an app user to add notes"
                    }
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={!isRecipientAppUser}
                    rows={3}
                  />
                  {!isRecipientAppUser && (
                    <div className="flex items-start gap-2 text-xs text-slate-500">
                      <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
                      <span>
                        Notes are only available when sending payments to
                        existing Pact users
                      </span>
                    </div>
                  )}
                </div>

                {/* Send Button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSend}
                  disabled={
                    !recipient || !amount || parseFloat(amount) <= 0
                  }
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Payment
                </Button>
              </div>
            ) : (
              <div className="p-6">
                {!paymentHistory || paymentHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                      <History className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-900">
                      No payment history
                    </h3>
                    <p className="text-sm text-slate-500">
                      Your sent payments will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentHistory.map((payment) => (
                      <div
                        key={payment._id}
                        onClick={() => {
                          setSelectedPayment(payment);
                          setIsDetailModalOpen(true);
                        }}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-4 transition-colors hover:bg-slate-50"
                      >
                        <Avatar className="h-10 w-10">
                          {payment.recipient?.profileImageUrl ? (
                            <AvatarImage
                              src={payment.recipient.profileImageUrl}
                            />
                          ) : null}
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-slate-900">
                                {payment.recipient
                                  ? payment.recipient.name
                                  : formatAddress(payment.recipientAddress)}
                              </div>
                              {payment.recipient && (
                                <div className="text-sm text-slate-500">
                                  @{payment.recipient.username}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-slate-900">
                                {payment.amount} MNT
                              </div>
                              <Badge
                                variant="secondary"
                                className="mt-1 text-xs"
                              >
                                {payment.status}
                              </Badge>
                            </div>
                          </div>
                          {payment.note && (
                            <div className="mt-2 rounded bg-slate-50 p-2 text-sm text-slate-600">
                              {payment.note}
                            </div>
                          )}
                          <div className="mt-2 text-xs text-slate-500">
                            {formatFullDate(payment.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>

      {/* Payment Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription className="sr-only">
              Sent payment details
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-6">
              {/* Recipient Info */}
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {selectedPayment.recipient?.profileImageUrl ? (
                    <AvatarImage
                      src={selectedPayment.recipient.profileImageUrl}
                    />
                  ) : null}
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900">
                    {selectedPayment.recipient
                      ? selectedPayment.recipient.name
                      : formatAddress(selectedPayment.recipientAddress)}
                  </div>
                  {selectedPayment.recipient && (
                    <div className="text-sm text-slate-500">
                      @{selectedPayment.recipient.username}
                    </div>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className="rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 p-6 text-center">
                <div className="mb-1 text-sm font-medium text-slate-600">
                  Amount Sent
                </div>
                <div className="text-4xl font-bold text-blue-600">
                  {selectedPayment.amount} MNT
                </div>
              </div>

              {/* Note */}
              {selectedPayment.note && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-700">Note</div>
                  <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                    {selectedPayment.note}
                  </div>
                </div>
              )}

              {/* Transaction Details */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Date</span>
                  <span className="font-medium text-slate-900">
                    {formatFullDate(selectedPayment.timestamp)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Transaction</span>
                  <a
                    href={`https://explorer.testnet.mantle.xyz/tx/${selectedPayment.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700"
                  >
                    {formatAddress(selectedPayment.transactionHash)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700"
                  >
                    {selectedPayment.status}
                  </Badge>
                </div>
              </div>

              {/* Close Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}