"use client";

import { useState, useEffect } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import {
  Split,
  X,
  Calendar as CalendarIcon,
  Info,
  Check,
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  User,
  Clock,
  Send,
  XCircle,
  Pause,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import EmojiPicker from "emoji-picker-react";
import UserRecipientInput, {
  RecipientUser,
} from "@/components/home/user-recipient-input";
import { formatFullDate, formatExpiry } from "@/lib/date-utils";
import { formatEtherToMnt, formatMntValue, formatWeiToMnt } from "@/lib/format-utils";

type ViewMode = "create" | "list" | "details";
type SplitMode = "equal" | "custom";
type StatusFilter = "all" | "active" | "completed" | "closed" | "expired";
type SortOption = "recent" | "amount" | "pending";
type ListTab = "created" | "participating";

export default function SplitBillSheet({
  hideTrigger = false,
}: {
  hideTrigger?: boolean;
} = {}) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isCreating, setIsCreating] = useState(false);
  const { address } = useAppKitAccount();

  const user = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip",
  );

  // Wagmi hooks for payment
  const { sendTransaction } = useSendTransaction();
  const [paymentTxHash, setPaymentTxHash] = useState<
    `0x${string}` | undefined
  >();
  const { isSuccess: isPaymentConfirmed } = useWaitForTransactionReceipt({
    hash: paymentTxHash,
  });

  // Form state
  const [visualTab, setVisualTab] = useState<"emoji" | "none">("none");
  const [selectedEmoji, setSelectedEmoji] = useState("💰");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(
    undefined,
  );
  const [participants, setParticipants] = useState<RecipientUser[]>([]);
  const [customAmounts, setCustomAmounts] = useState<{ [key: string]: string }>(
    {},
  );

  // List/Details state
  const [listTab, setListTab] = useState<ListTab>("created");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("recent");
  const [selectedSplitId, setSelectedSplitId] =
    useState<Id<"splitBills"> | null>(null);

  // Modal states
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [markPaidNote, setMarkPaidNote] = useState("");

  interface Participant {
    userId?: Id<"users">;
    user?: {
      _id: Id<"users">;
      name: string;
      username: string;
    } | null;
    amount: string;
    [key: string]: unknown;
  }

  const [selectedParticipantForMark, setSelectedParticipantForMark] = useState<Participant | null>(null);
  const [newExpirationDate, setNewExpirationDate] = useState<
    Date | undefined
  >();

  // Convex mutations
  const createSplitBill = useMutation(api.splitBills.createSplitBill);
  const payShare = useMutation(api.splitBills.payShare);
  const declineShare = useMutation(api.splitBills.declineShare);
  const markAsPaidOutsideApp = useMutation(api.splitBills.markAsPaidOutsideApp);
  const sendReminder = useMutation(api.splitBills.sendReminder);
  const closeSplit = useMutation(api.splitBills.closeSplit);
  const cancelSplit = useMutation(api.splitBills.cancelSplit);
  const extendExpiration = useMutation(api.splitBills.extendExpiration);

  // Get split bills
  const mySplits = useQuery(
    api.splitBills.listMySplits,
    user
      ? {
        userId: user._id,
        status: statusFilter === "all" ? undefined : statusFilter,
      }
      : "skip",
  );

  const splitsImIn = useQuery(
    api.splitBills.listSplitsImIn,
    user
      ? {
        userId: user._id,
      }
      : "skip",
  );

  const selectedSplit = useQuery(
    api.splitBills.getSplitDetails,
    selectedSplitId ? { splitBillId: selectedSplitId } : "skip",
  );

  const myParticipation = useQuery(
    api.splitBills.getMyParticipation,
    user && selectedSplitId
      ? { userId: user._id, splitBillId: selectedSplitId }
      : "skip",
  );

  // Handle payment confirmation
  useEffect(() => {
    if (isPaymentConfirmed && paymentTxHash) {
      toast.success("Payment confirmed!");
      setPaymentTxHash(undefined);
    }
  }, [isPaymentConfirmed, paymentTxHash]);

  // Handle open-split-bill-details event
  useEffect(() => {
    if (!hideTrigger) return; // Only global instance listens for events

    const handleOpenDetails = (event: Event) => {
      const customEvent = event as CustomEvent<{ splitBillId: string }>;
      const { splitBillId } = customEvent.detail;
      if (splitBillId) {
        setSelectedSplitId(splitBillId as Id<"splitBills">);
        setViewMode("details");
        setOpen(true);
      }
    };

    window.addEventListener("open-split-bill-details", handleOpenDetails);
    return () => {
      window.removeEventListener("open-split-bill-details", handleOpenDetails);
    };
  }, [hideTrigger]);

  // Smart default: show list if user has splits, otherwise show create
  useEffect(() => {
    if (open && mySplits !== undefined && splitsImIn !== undefined) {
      const hasCreated = mySplits.length > 0;
      const hasParticipating = splitsImIn.length > 0;
      const hasAny = hasCreated || hasParticipating;

      if (!hasAny && statusFilter === "all" && viewMode === "list") {
        setViewMode("create");
      } else if (hasAny && viewMode === "create") {
        setViewMode("list");
      }

      // If they have no created splits but have participating ones, 
      // and are currently on the "created" tab, switch to "participating"
      if (!hasCreated && hasParticipating && listTab === "created") {
        setListTab("participating");
      }
    }
  }, [open, mySplits, splitsImIn, statusFilter, viewMode, listTab]);

  const resetForm = () => {
    setVisualTab("none");
    setSelectedEmoji("💰");
    setTitle("");
    setDescription("");
    setAmount("");
    setSplitMode("equal");
    setExpirationDate(undefined);
    setParticipants([]);
    setCustomAmounts({});
  };

  const handleAddParticipant = (participant: RecipientUser | string | null) => {
    if (!participant || typeof participant === "string") return;

    if (participants.some((p) => p._id === participant._id)) {
      toast.error("Participant already added");
      return;
    }

    if (participants.length >= 50) {
      toast.error("Maximum 50 participants allowed");
      return;
    }

    setParticipants([...participants, participant]);
  };

  const handleRemoveParticipant = (userId: string) => {
    setParticipants(participants.filter((p) => p._id !== userId));

    if (splitMode === "custom") {
      setSplitMode("equal");
      setCustomAmounts({});
      toast.info("Switched to equal split after removing participant");
    }
  };

  const handleCustomAmountChange = (userId: string, value: string) => {
    setCustomAmounts({
      ...customAmounts,
      [userId]: value,
    });
  };

  const calculateEqualAmount = () => {
    if (!amount || participants.length === 0) return "0";
    const amountNum = parseFloat(amount);
    return formatMntValue((amountNum / participants.length).toString());
  };

  const calculateCustomSum = () => {
    return Object.values(customAmounts).reduce(
      (sum, amt) => sum + (parseFloat(amt) || 0),
      0,
    );
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return false;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return false;
    }

    if (participants.length < 2) {
      toast.error("At least 2 participants required");
      return false;
    }

    if (participants.length > 50) {
      toast.error("Maximum 50 participants allowed");
      return false;
    }

    if (splitMode === "custom") {
      const sum = calculateCustomSum();
      const totalAmt = parseFloat(amount);
      if (Math.abs(sum - totalAmt) > 0.000001) {
        toast.error(
          `Custom amounts (${formatEtherToMnt(sum.toString())}) must equal total amount (${formatEtherToMnt(totalAmt.toString())})`,
        );
        return false;
      }
    }

    return true;
  };

  const handleCreateSplit = async () => {
    if (!address || !user) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!validateForm()) return;

    setIsCreating(true);

    try {
      const amountAtomic = BigInt(
        Math.floor(parseFloat(amount) * 1e18),
      ).toString();

      let participantsData;
      if (splitMode === "equal") {
        participantsData = participants.map((p) => ({
          userId: p._id as Id<"users">,
        }));
      } else {
        participantsData = participants.map((p) => ({
          userId: p._id as Id<"users">,
          amount: BigInt(
            Math.floor(parseFloat(customAmounts[p._id] || "0") * 1e18),
          ).toString(),
        }));
      }

      const splitBillId = await createSplitBill({
        userAddress: address,
        title: title.trim(),
        description: description.trim() || undefined,
        imageOrEmoji: visualTab === "emoji" ? selectedEmoji : undefined,
        imageType: visualTab === "emoji" ? "emoji" : undefined,
        totalAmount: amountAtomic,
        splitMode,
        participants: participantsData,
        expiresAt: expirationDate ? expirationDate.getTime() : undefined,
      });

      toast.success("Split bill created!");
      resetForm();
      setViewMode("details");
      setSelectedSplitId(splitBillId);
    } catch (error: unknown) {
      console.error("Create split error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to create split bill";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handlePayShare = async () => {
    if (!address || !user || !selectedSplit || !myParticipation) return;

    try {
      const creator = selectedSplit.creator;
      if (!creator) {
        toast.error("Creator not found");
        return;
      }

      const value = parseEther(
        (parseFloat(myParticipation.amount) / 1e18).toString(),
      );

      toast.info("Opening wallet to confirm payment...");

      sendTransaction(
        {
          to: creator.userAddress as `0x${string}`,
          value: value,
        },
        {
          onSuccess: async (hash) => {
            setPaymentTxHash(hash);
            toast.loading("Confirming payment...", { id: "pay-share" });

            // Wait a moment for tx to be mined, then call payShare
            setTimeout(async () => {
              try {
                await payShare({
                  userAddress: address,
                  splitBillId: selectedSplit._id,
                });
                toast.success("Payment recorded!", { id: "pay-share" });
              } catch (error: unknown) {
                const message =
                  error instanceof Error
                    ? error.message
                    : "Failed to record payment";
                toast.error(message, {
                  id: "pay-share",
                });
              }
            }, 3000);
          },
          onError: (error) => {
            console.error("Payment failed:", error);
            toast.error("Payment failed");
          },
        },
      );
    } catch (error: unknown) {
      console.error("Pay share error:", error);
      const message =
        error instanceof Error ? error.message : "Failed to pay share";
      toast.error(message);
    }
  };

  const handleDeclineShare = async () => {
    if (!address || !selectedSplitId) return;

    try {
      await declineShare({
        userAddress: address,
        splitBillId: selectedSplitId,
      });
      toast.success("Share declined");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to decline share";
      toast.error(message);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!address || !selectedSplitId || !selectedParticipantForMark) return;

    const participantUserId = selectedParticipantForMark.userId ?? selectedParticipantForMark.user?._id;
    if (!participantUserId) {
      toast.error("Cannot identify participant user");
      return;
    }

    try {
      await markAsPaidOutsideApp({
        userAddress: address,
        splitBillId: selectedSplitId,
        participantUserId: participantUserId,
        note: markPaidNote || undefined,
      });
      toast.success("Marked as paid");
      setShowMarkPaidModal(false);
      setMarkPaidNote("");
      setSelectedParticipantForMark(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to mark as paid";
      toast.error(message);
    }
  };

  const handleSendReminder = async (participantIds?: string[]) => {
    if (!address || !selectedSplitId) return;

    try {
      const result = await sendReminder({
        userAddress: address,
        splitBillId: selectedSplitId,
        participantUserIds: participantIds as Id<"users">[] | undefined,
      });

      if (result.failedReminders.length > 0) {
        toast.warning(
          `Sent ${result.successCount} reminder(s). Failed: ${result.failedReminders.join(", ")}`,
        );
      } else {
        toast.success(`Sent ${result.successCount} reminder(s)`);
      }

      setShowReminderModal(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to send reminders";
      toast.error(message);
    }
  };

  const handleCloseSplit = async () => {
    if (!address || !selectedSplitId) return;

    if (!confirm("Close this split? Pending participants will be notified.")) {
      return;
    }

    try {
      await closeSplit({
        userAddress: address,
        splitBillId: selectedSplitId,
      });
      toast.success("Split closed");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to close split";
      toast.error(message);
    }
  };

  const handleCancelSplit = async () => {
    if (!address || !selectedSplitId) return;

    if (
      !confirm(
        "Cancel this split? All participants will be notified. This cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await cancelSplit({
        userAddress: address,
        splitBillId: selectedSplitId,
      });
      toast.success("Split cancelled");
      setViewMode("list");
      setSelectedSplitId(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel split";
      toast.error(message);
    }
  };

  const handleExtendExpiration = async () => {
    if (!address || !selectedSplitId || !newExpirationDate) return;

    try {
      await extendExpiration({
        userAddress: address,
        splitBillId: selectedSplitId,
        newExpiresAt: newExpirationDate.getTime(),
      });
      toast.success("Expiration extended");
      setShowExtendModal(false);
      setNewExpirationDate(undefined);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to extend expiration";
      toast.error(message);
    }
  };

  // Sort splits based on selected option
  interface SplitWithParticipants extends Doc<"splitBills"> {
    activeParticipantCount: number;
    paidCount: number;
    // Explicitly extended to include all Doc properties
  }

  const sortSplits = (splits: SplitWithParticipants[]) => {
    switch (sortOption) {
      case "amount":
        return [...splits].sort(
          (a, b) => parseFloat(b.totalAmount) - parseFloat(a.totalAmount),
        );
      case "pending":
        return [...splits].sort(
          (a, b) =>
            b.activeParticipantCount -
            b.paidCount -
            (a.activeParticipantCount - a.paidCount),
        );
      case "recent":
      default:
        return splits;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge
            variant="outline"
            className="border-0 bg-green-100 text-green-800"
          >
            Active
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="border-0 bg-blue-100 text-blue-800"
          >
            Completed
          </Badge>
        );
      case "closed":
        return (
          <Badge
            variant="outline"
            className="border-0 bg-amber-100 text-amber-800"
          >
            Closed
          </Badge>
        );
      case "expired":
        return (
          <Badge
            variant="outline"
            className="border-0 bg-zinc-200 text-zinc-700"
          >
            Expired
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="border-0 bg-red-100 text-red-800">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getParticipantStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge
            variant="outline"
            className="border-0 bg-green-100 text-green-800"
          >
            Paid
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="outline"
            className="border-0 bg-amber-100 text-amber-800"
          >
            Pending
          </Badge>
        );
      case "declined":
        return (
          <Badge variant="outline" className="border-0 bg-red-100 text-red-800">
            Declined
          </Badge>
        );
      case "marked_paid":
        return (
          <Badge
            variant="outline"
            className="border-0 bg-blue-100 text-blue-800"
          >
            Marked Paid
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isValid =
    title.trim() &&
    amount &&
    parseFloat(amount) > 0 &&
    participants.length >= 2;

  const isCreator =
    user && selectedSplit && selectedSplit.creatorId === user._id;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            setTimeout(() => {
              resetForm();
              setViewMode("list");
              setSelectedSplitId(null);
            }, 300);
          }
        }}
      >
        {!hideTrigger && (
          <SheetTrigger asChild>
            <button className="corner-squircle flex h-24 w-full flex-col items-center justify-center gap-2 rounded-[40px] bg-linear-to-br from-teal-500 to-teal-600 text-white shadow-lg transition-all hover:shadow-xl">
              <Split className="h-6 w-6" />
              <span className="text-sm font-medium">Split Bill</span>
            </button>
          </SheetTrigger>
        )}

        <SheetContent
          side="bottom"
          className="corner-squircle h-[90vh] rounded-t-[50px] p-0"
          showCloseButton={false}
        >
          <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
            {/* Header */}
            <div className="relative flex items-center justify-between px-6 py-4">
              <div className="flex items-center">
                {viewMode === "details" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode("list")}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                {viewMode === "create" && mySplits && mySplits.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode("list")}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
              </div>

              <SheetTitle className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold">
                {viewMode === "create"
                  ? "Create Split Bill"
                  : viewMode === "details"
                    ? "Split Details"
                    : "Split Bills"}
              </SheetTitle>

              <div className="flex items-center gap-2">
                <SheetClose asChild>
                  <Button variant="ghost" size="icon">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                  </Button>
                </SheetClose>
              </div>
            </div>

            <SheetDescription className="sr-only">
              Manage your split bills
            </SheetDescription>

            <ScrollArea className="flex-1 overflow-auto">
              {/* CREATE VIEW */}
              {viewMode === "create" && (
                <div className="space-y-6 p-6 pb-10">
                  {/* Visual Selection */}
                  <div className="space-y-2">
                    <Label>Visual (Optional)</Label>
                    <Tabs
                      value={visualTab}
                      onValueChange={(v) => setVisualTab(v as "emoji" | "none")}
                    >
                      <TabsList className="grid w-fit grid-cols-2">
                        <TabsTrigger value="none">None</TabsTrigger>
                        <TabsTrigger value="emoji">Emoji</TabsTrigger>
                      </TabsList>

                      <TabsContent value="emoji" className="mt-4">
                        <div className="flex flex-col items-center gap-4">
                          <div className="text-6xl">{selectedEmoji}</div>
                          <EmojiPicker
                            onEmojiClick={(emoji) =>
                              setSelectedEmoji(emoji.emoji)
                            }
                            width="fit"
                            height="300px"
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      placeholder="e.g., Team Dinner, Trip Expenses"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={100}
                    />
                    <p className="text-xs text-zinc-500">
                      {title.length}/100 characters
                    </p>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Textarea
                      placeholder="What is this split for?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={500}
                      rows={3}
                    />
                    <p className="text-xs text-zinc-500">
                      {description.length}/500 characters
                    </p>
                  </div>

                  {/* Total Amount */}
                  <div className="space-y-2">
                    <Label>Total Amount (MNT) *</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>

                  {/* Participants */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Participants ({participants.length}/50) *</Label>
                    </div>
                    <UserRecipientInput
                      value={null}
                      onChange={handleAddParticipant}
                      placeholder="Search and add participants"
                      mode="request"
                    />
                    {participants.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {participants.map((participant) => (
                          <div
                            key={participant._id}
                            className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={participant.profileImageUrl} />
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-zinc-900">
                                {participant.name}
                              </div>
                              <div className="text-sm text-zinc-500">
                                @{participant.username}
                              </div>
                            </div>
                            {splitMode === "custom" && (
                              <Input
                                type="number"
                                step="0.000001"
                                placeholder="Amount"
                                value={customAmounts[participant._id] || ""}
                                onChange={(e) =>
                                  handleCustomAmountChange(
                                    participant._id,
                                    e.target.value,
                                  )
                                }
                                className="w-32"
                              />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleRemoveParticipant(participant._id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-zinc-500">
                      Splitting among {participants.length} people (not
                      including you)
                    </p>
                  </div>

                  {/* Split Mode */}
                  <div className="space-y-2">
                    <Label>How to Split?</Label>
                    <RadioGroup
                      value={splitMode}
                      onValueChange={(v) => setSplitMode(v as SplitMode)}
                    >
                      <div className="flex items-start space-x-2 rounded-lg border p-4">
                        <RadioGroupItem value="equal" id="equal" />
                        <div className="flex-1">
                          <Label htmlFor="equal" className="font-medium">
                            Equal splits
                          </Label>
                          <p className="text-sm text-zinc-500">
                            Each person pays {calculateEqualAmount()} MNT
                          </p>
                          {participants.length > 0 && amount && (
                            <div className="mt-2 flex items-start gap-2 text-xs text-zinc-500">
                              <Info className="mt-0.5 h-3 w-3 shrink-0" />
                              <span>
                                Amounts are distributed deterministically. If
                                there&apos;s a remainder, participants with
                                alphabetically earlier names pay 1 wei more.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start space-x-2 rounded-lg border p-4">
                        <RadioGroupItem value="custom" id="custom" />
                        <div className="flex-1">
                          <Label htmlFor="custom" className="font-medium">
                            Custom amounts
                          </Label>
                          <p className="text-sm text-zinc-500">
                            Specify different amounts for each person
                          </p>
                          {splitMode === "custom" && (
                            <div className="mt-2 text-sm text-zinc-600">
                              Total: {formatMntValue(calculateCustomSum().toString())} /{" "}
                              {amount || "0"} MNT
                            </div>
                          )}
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Expiration Date */}
                  <div className="space-y-2">
                    <Label>Expiration (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !expirationDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {expirationDate ? (
                            format(expirationDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={expirationDate}
                          onSelect={setExpirationDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                        {expirationDate && (
                          <div className="border-t p-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full"
                              onClick={() => setExpirationDate(undefined)}
                            >
                              Clear expiration
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                    <div className="flex items-start gap-2 text-xs text-zinc-500">
                      <Info className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>
                        A 5-minute grace period is automatically applied after
                        expiration
                      </span>
                    </div>
                  </div>

                  {/* Create Button */}
                  <div className="flex justify-center pt-4">
                    <Button
                      size="lg"
                      onClick={handleCreateSplit}
                      disabled={!isValid || isCreating}
                      className="corner-squircle w-fit rounded-[15px]"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Split className="mr-2 h-4 w-4" />
                          Create Split Bill
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* LIST VIEW */}
              {viewMode === "list" && (
                <div className="space-y-4 px-6 pt-0 pb-10">
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <Button
                        className="corner-squircle w-fit rounded-[15px] bg-linear-to-r from-teal-500 to-teal-600 text-white shadow-md hover:shadow-lg"
                        size="lg"
                        onClick={() => setViewMode("create")}
                      >
                        <Plus className="mr-2 h-5 w-5" />
                        Create Split
                      </Button>
                    </div>

                    <Tabs
                      value={listTab}
                      onValueChange={(v) => setListTab(v as ListTab)}
                      className="w-full"
                    >
                      <div className="flex justify-center">
                        <TabsList className="grid w-fit grid-cols-2">
                          <TabsTrigger value="created">My Splits</TabsTrigger>
                          <TabsTrigger value="participating">
                            Splits I&apos;m In
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="created" className="mt-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <Tabs
                            value={statusFilter}
                            onValueChange={(v) =>
                              setStatusFilter(v as StatusFilter)
                            }
                            className="flex-1"
                          >
                            <TabsList className="grid w-fit grid-cols-3">
                              <TabsTrigger value="all">All</TabsTrigger>
                              <TabsTrigger value="active">Active</TabsTrigger>
                              <TabsTrigger value="completed">
                                Completed
                              </TabsTrigger>
                            </TabsList>
                          </Tabs>

                          <Select
                            value={sortOption}
                            onValueChange={(v) =>
                              setSortOption(v as SortOption)
                            }
                          >
                            <SelectTrigger className="w-fit">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="recent">Recent</SelectItem>
                              <SelectItem value="amount">
                                Highest Amount
                              </SelectItem>
                              <SelectItem value="pending">
                                Most Pending
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {mySplits === undefined ? (
                          <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="h-32 animate-pulse rounded-[25px] bg-zinc-100"
                              />
                            ))}
                          </div>
                        ) : mySplits.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
                              <Split className="h-8 w-8 text-teal-600" />
                            </div>
                            <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                              {statusFilter === "all"
                                ? "No split bills yet"
                                : `No ${statusFilter} split bills`}
                            </h3>
                            <p className="mb-4 text-sm text-zinc-500">
                              Create a split bill to collect payments from
                              friends
                            </p>
                            <Button
                              onClick={() => setViewMode("create")}
                              className="corner-squircle rounded-[15px]"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Create Split Bill
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {sortSplits(mySplits).map((split) => (
                              <div
                                key={split._id}
                                onClick={() => {
                                  setSelectedSplitId(split._id);
                                  setViewMode("details");
                                }}
                                className="corner-squircle cursor-pointer rounded-[25px] border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50"
                              >
                                <div className="flex items-start gap-3">
                                  {split.imageOrEmoji && (
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center text-3xl">
                                      {split.imageOrEmoji}
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex items-start justify-between gap-2">
                                      <h3 className="line-clamp-1 font-semibold text-zinc-900">
                                        {split.title}
                                      </h3>
                                      {getStatusBadge(split.status)}
                                    </div>
                                    <div className="mb-2 text-sm text-zinc-600">
                                      {formatWeiToMnt(split.totalAmount)} total
                                    </div>
                                    <div className="mb-3 text-sm text-zinc-500">
                                      {split.paidCount}/
                                      {split.activeParticipantCount} paid
                                      {split.activeParticipantCount !==
                                        split.totalParticipants &&
                                        ` • ${split.totalParticipants - split.activeParticipantCount} declined`}
                                    </div>
                                    <div className="text-xs text-zinc-400">
                                      Created {formatFullDate(split.createdAt)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent
                        value="participating"
                        className="mt-6 space-y-4"
                      >
                        {splitsImIn === undefined ? (
                          <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="h-32 animate-pulse rounded-[25px] bg-zinc-100"
                              />
                            ))}
                          </div>
                        ) : splitsImIn.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
                              <Split className="h-8 w-8 text-teal-600" />
                            </div>
                            <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                              No split bills
                            </h3>
                            <p className="text-sm text-zinc-500">
                              Split bills you&apos;re invited to will appear
                              here
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {splitsImIn.map((item) => {
                              if (!item.split) return null;
                              const split = item.split;
                              const participation = item.myParticipation;

                              return (
                                <div
                                  key={split._id}
                                  onClick={() => {
                                    setSelectedSplitId(split._id);
                                    setViewMode("details");
                                  }}
                                  className="corner-squircle cursor-pointer rounded-[25px] border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50"
                                >
                                  <div className="flex items-start gap-3">
                                    {split.imageOrEmoji && (
                                      <div className="flex h-12 w-12 shrink-0 items-center justify-center text-3xl">
                                        {split.imageOrEmoji}
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="mb-1 flex items-start justify-between gap-2">
                                        <h3 className="line-clamp-1 font-semibold text-zinc-900">
                                          {split.title}
                                        </h3>
                                        {getParticipantStatusBadge(
                                          participation.status,
                                        )}
                                      </div>
                                      <div className="mb-2 text-sm text-zinc-600">
                                        From {split.creator?.name || "Unknown"}
                                      </div>
                                      <div className="mb-3 text-sm text-zinc-500">
                                        Your share: {formatWeiToMnt(participation.amount)}
                                      </div>
                                      <div className="text-xs text-zinc-400">
                                        Created{" "}
                                        {formatFullDate(split.createdAt)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              )}

              {/* DETAILS VIEW */}
              {viewMode === "details" && selectedSplit && (
                <div className="space-y-6 px-6 pt-0 pb-10">
                  <div className="text-center">
                    {selectedSplit.imageOrEmoji && (
                      <div className="mb-4 flex justify-center text-6xl">
                        {selectedSplit.imageOrEmoji}
                      </div>
                    )}

                    <h2 className="mb-2 text-2xl font-bold text-zinc-900">
                      {selectedSplit.title}
                    </h2>

                    {selectedSplit.description && (
                      <p className="mb-4 text-zinc-600">
                        {selectedSplit.description}
                      </p>
                    )}

                    <div className="mb-4 flex items-center justify-center gap-2">
                      {getStatusBadge(selectedSplit.status)}
                    </div>

                    {selectedSplit.creator && (
                      <div className="mb-4 flex items-center justify-center gap-2 text-sm text-zinc-600">
                        <span>Created by {selectedSplit.creator.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Amount Display */}
                  <div className="corner-squircle rounded-[25px] border-2 border-teal-200 bg-teal-50 p-6 text-center">
                    <div className="mb-1 text-sm font-medium text-teal-700">
                      Collected
                    </div>
                    <div className="text-4xl font-bold text-teal-600">
                      {formatWeiToMnt(selectedSplit.totalCollected)} /{" "}
                      {formatWeiToMnt(selectedSplit.totalAmount)}
                    </div>
                    <div className="mt-2 text-sm text-teal-600">
                      {selectedSplit.paidCount}/
                      {selectedSplit.activeParticipantCount} participants paid
                    </div>
                  </div>

                  {/* Expiration */}
                  {selectedSplit.expiresAt && (
                    <div className="flex items-center justify-center gap-2 text-sm text-zinc-600">
                      <Clock className="h-4 w-4" />
                      <span>
                        Expires: {formatExpiry(selectedSplit.expiresAt)}
                      </span>
                    </div>
                  )}

                  {/* Participant Actions (if I'm a participant) */}
                  {myParticipation && !isCreator && (
                    <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                      <h3 className="font-semibold text-zinc-900">
                        Your Share
                      </h3>
                      <div className="text-2xl font-bold text-zinc-900">
                        {formatWeiToMnt(myParticipation.amount)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-600">Status:</span>
                        {getParticipantStatusBadge(myParticipation.status)}
                      </div>
                      {myParticipation.status === "pending" &&
                        selectedSplit.status === "active" && (
                          <div className="flex gap-2">
                            <Button
                              onClick={handlePayShare}
                              className="corner-squircle flex-1 rounded-[15px]"
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Pay Now
                            </Button>
                            <Button
                              onClick={handleDeclineShare}
                              variant="outline"
                              className="corner-squircle flex-1 rounded-[15px]"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Decline
                            </Button>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Participants */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-zinc-900">
                      Participants
                    </h3>
                    {selectedSplit.participants.map((p) => (
                      <div
                        key={p._id}
                        className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={p.user?.profileImageUrl} />
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-zinc-900">
                              {p.user?.name || "Unknown"}
                            </div>
                            {p.status === "paid" && (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <div className="text-sm text-zinc-500">
                            @{p.user?.username || "unknown"}
                          </div>
                          {p.paidAt && (
                            <div className="text-xs text-zinc-400">
                              Paid {formatFullDate(p.paidAt)}
                            </div>
                          )}
                          {p.status === "marked_paid" && p.markedPaidNote && (
                            <div className="mt-1 text-xs text-zinc-500">
                              Note: {p.markedPaidNote}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-zinc-900">
                            {formatWeiToMnt(p.amount)}
                          </div>
                          {getParticipantStatusBadge(p.status)}
                          {isCreator &&
                            p.status === "pending" &&
                            selectedSplit.status === "active" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedParticipantForMark(p);
                                  setShowMarkPaidModal(true);
                                }}
                                className="mt-1 text-xs"
                              >
                                Mark Paid
                              </Button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Creator Actions */}
                  {isCreator && selectedSplit.status === "active" && (
                    <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                      <h3 className="font-semibold text-zinc-900">
                        Creator Actions
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => setShowReminderModal(true)}
                          variant="outline"
                          size="sm"
                          className="corner-squircle rounded-[15px]"
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Send Reminders
                        </Button>
                        <Button
                          onClick={handleCloseSplit}
                          variant="outline"
                          size="sm"
                          className="corner-squircle rounded-[15px]"
                          disabled={selectedSplit.paidCount === 0}
                        >
                          <Pause className="mr-2 h-4 w-4" />
                          Close Split
                        </Button>
                        {selectedSplit.expiresAt && (
                          <Button
                            onClick={() => setShowExtendModal(true)}
                            variant="outline"
                            size="sm"
                            className="corner-squircle rounded-[15px]"
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Extend Expiry
                          </Button>
                        )}
                        <Button
                          onClick={handleCancelSplit}
                          variant="outline"
                          size="sm"
                          className="corner-squircle rounded-[15px] text-red-600"
                          disabled={selectedSplit.paidCount > 0}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent >
      </Sheet >

      {/* Mark Paid Modal */}
      < Dialog open={showMarkPaidModal} onOpenChange={setShowMarkPaidModal} >
        <DialogContent className="corner-squircle rounded-[40px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Paid Outside App</DialogTitle>
            <DialogDescription>
              Mark this participant as having paid outside the app
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedParticipantForMark && (
              <div className="rounded-lg bg-zinc-50 p-4">
                <div className="font-medium text-zinc-900">
                  {selectedParticipantForMark.user?.name}
                </div>
                <div className="text-sm text-zinc-600">
                  Amount: {formatWeiToMnt(selectedParticipantForMark.amount)}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Note (Optional)</Label>
              <Textarea
                placeholder="E.g., Paid via cash, bank transfer, etc."
                value={markPaidNote}
                onChange={(e) => setMarkPaidNote(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMarkPaidModal(false);
                  setMarkPaidNote("");
                  setSelectedParticipantForMark(null);
                }}
                className="corner-squircle flex-1 rounded-[15px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMarkAsPaid}
                className="corner-squircle flex-1 rounded-[15px]"
              >
                Mark as Paid
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog >

      {/* Send Reminder Modal */}
      < Dialog open={showReminderModal} onOpenChange={setShowReminderModal} >
        <DialogContent className="corner-squircle rounded-[40px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Reminders</DialogTitle>
            <DialogDescription>
              Send reminders to pending participants
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-2">
                <Info className="h-5 w-5 shrink-0 text-amber-600" />
                <div className="text-sm text-amber-800">
                  <p className="mb-1 font-medium">Rate Limits</p>
                  <p>
                    Maximum 1 reminder per participant per 24 hours, and 5 total
                    reminders per participant.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowReminderModal(false)}
                className="corner-squircle flex-1 rounded-[15px]"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSendReminder()}
                className="corner-squircle flex-1 rounded-[15px]"
              >
                Send to All Pending
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog >

      {/* Extend Expiration Modal */}
      < Dialog open={showExtendModal} onOpenChange={setShowExtendModal} >
        <DialogContent className="corner-squircle rounded-[40px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Extend Expiration</DialogTitle>
            <DialogDescription>
              Choose a new expiration date for this split
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSplit?.expiresAt && (
              <div className="rounded-lg bg-zinc-50 p-4 text-sm">
                <div className="text-zinc-600">Current expiration:</div>
                <div className="font-medium text-zinc-900">
                  {formatExpiry(selectedSplit.expiresAt)}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>New Expiration Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newExpirationDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newExpirationDate ? (
                      format(newExpirationDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newExpirationDate}
                    onSelect={setNewExpirationDate}
                    disabled={(date) =>
                      date < new Date() ||
                      (selectedSplit?.expiresAt
                        ? date.getTime() <= selectedSplit.expiresAt
                        : false)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowExtendModal(false);
                  setNewExpirationDate(undefined);
                }}
                className="corner-squircle flex-1 rounded-[15px]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExtendExpiration}
                disabled={!newExpirationDate}
                className="corner-squircle flex-1 rounded-[15px]"
              >
                Extend
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog >
    </>
  );
}
