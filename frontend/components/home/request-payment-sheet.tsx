"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAppKitAccount } from "@reown/appkit/react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { formatFullDate, formatExpiry } from "@/lib/date-utils";
import { format } from "date-fns";
import {
    HandCoins,
    History,
    ArrowLeft,
    User,
    X,
    Calendar as CalendarIcon,
    Info,
    Clock,
} from "lucide-react";
import { toast } from "sonner";
import UserRecipientInput, {
    RecipientUser,
} from "@/components/home/user-recipient-input";
import { cn } from "@/lib/utils";

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

type ViewMode = "request" | "history";
type HistoryTab = "sent" | "received";

const getStatusConfig = (status: string) => {
    const normalizedStatus = status?.toLowerCase().trim();
    switch (normalizedStatus) {
        case "pending": return { label: "Pending", className: "bg-amber-100 text-amber-800 hover:bg-amber-100 border-0" };
        case "completed": return { label: "Completed", className: "bg-green-100 text-green-800 hover:bg-green-100 border-0" };
        case "declined": return { label: "Declined", className: "bg-red-100 text-red-800 hover:bg-red-100 border-0" };
        case "expired": return { label: "Expired", className: "bg-zinc-200 text-zinc-700 hover:bg-zinc-200 border-0" };
        default:
            return { label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown", className: "bg-zinc-100 text-zinc-800 hover:bg-zinc-100 border-0" };
    }
};

export default function RequestPaymentSheet() {
    const [open, setOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("request");
    const [activeTab, setActiveTab] = useState<HistoryTab>("sent");
    const { address } = useAppKitAccount();

    // Form state
    const [recipient, setRecipient] = useState<RecipientUser | null>(null);
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [expirationDate, setExpirationDate] = useState<Date | undefined>(
        undefined
    );

    // Request detail modal
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Get current user
    const currentUser = useQuery(
        api.users.getUser,
        address ? { userAddress: address } : "skip"
    );

    // Get request histories
    // Optimization: fetch immediately to avoid delay when opening history
    const sentRequests = useQuery(
        api.paymentRequests.getSentRequests,
        currentUser
            ? { userId: currentUser._id }
            : "skip"
    );

    const receivedRequests = useQuery(
        api.paymentRequests.getReceivedRequests,
        currentUser
            ? { userId: currentUser._id }
            : "skip"
    );

    // Mutations
    const createRequest = useMutation(api.paymentRequests.createRequest);

    const resetForm = () => {
        setRecipient(null);
        setAmount("");
        setNote("");
        setExpirationDate(undefined);
    };

    const handleCreateRequest = async () => {
        if (!address || !currentUser) {
            toast.error("Please connect your wallet");
            return;
        }

        if (!recipient) {
            toast.error("Please select a recipient");
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        try {
            await createRequest({
                userAddress: address,
                recipientId: recipient._id as Id<"users">,
                amount: amount,
                note: note || undefined,
                expiresAt: expirationDate ? expirationDate.getTime() : undefined,
            });

            toast.success("Payment request sent!");
            resetForm();
            setViewMode("history");
            setActiveTab("sent");
        } catch (error: any) {
            toast.error(error.message || "Failed to send request");
        }
    };

    const getStatusBadge = (status: string) => {
        const config = getStatusConfig(status);
        return (
            <Badge variant="outline" className={cn("text-xs", config.className)}>
                {config.label}
            </Badge>
        );
    };

    // Render a request item from the list
    const renderRequestItem = (request: any, isSent: boolean) => {
        const otherUser = isSent ? request.recipient : request.requester;

        return (
            <div
                key={request._id}
                onClick={() => {
                    setSelectedRequest(request);
                    setIsDetailModalOpen(true);
                }}
                className="flex cursor-pointer items-start gap-3 rounded-[40px] corner-squircle border bg-white p-4 transition-colors hover:bg-zinc-50"
            >
                <Avatar className="h-10 w-10">
                    {otherUser?.profileImageUrl ? (
                        <AvatarImage src={otherUser.profileImageUrl} />
                    ) : null}
                    <AvatarFallback>
                        <User className="h-5 w-5" />
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <div className="font-medium text-zinc-900">
                                {otherUser?.name || "Unknown User"}
                            </div>
                            {otherUser && (
                                <div className="text-sm text-zinc-500">
                                    @{otherUser.username}
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <div className="font-semibold text-zinc-900">
                                {request.amount} MNT
                            </div>
                            {getStatusBadge(request.status)}
                        </div>
                    </div>
                    {request.note && (
                        <div className="mt-2 rounded bg-zinc-50 p-2 text-sm text-zinc-600">
                            {request.note}
                        </div>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                        <span>{formatFullDate(request._creationTime)}</span>
                        {request.expiresAt && (
                            <>
                                <span>•</span>
                                <Clock className="h-3 w-3" />
                                <span>Expires: {formatExpiry(request.expiresAt)}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <Sheet
                open={open}
                onOpenChange={(isOpen) => {
                    setOpen(isOpen);
                    if (!isOpen) {
                        setViewMode("request");
                        resetForm();
                    }
                }}
            >
                <SheetTrigger asChild>
                    <Button className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-[40px] corner-squircle bg-linear-to-br from-amber-500 to-amber-600 text-white shadow-lg transition-all hover:shadow-xl">
                        <HandCoins className="h-6 w-6" />
                        <span className="text-sm font-medium">Request</span>
                    </Button>
                </SheetTrigger>
                <SheetContent
                    side="bottom"
                    className="h-[90vh] rounded-t-[50px] corner-squircle p-0"
                    showCloseButton={false}
                >
                    <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
                        {/* Header */}
                        <div className="relative flex items-center justify-between px-6 py-4">
                            {/* Left side */}
                            <div className="flex items-center">
                                {viewMode === "history" && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setViewMode("request")}
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                )}
                            </div>

                            {/* Centered title */}
                            <SheetTitle className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold">
                                {viewMode === "request" ? "Request Payment" : "Request History"}
                            </SheetTitle>

                            {/* Right side */}
                            <div className="flex items-center gap-2">
                                {viewMode === "request" && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setViewMode("history")}
                                    >
                                        <History className="h-5 w-5" />
                                    </Button>
                                )}
                                <SheetClose asChild>
                                    <Button variant="ghost" size="icon">
                                        <X className="h-5 w-5" />
                                        <span className="sr-only">Close</span>
                                    </Button>
                                </SheetClose>
                            </div>
                        </div>

                        <SheetDescription className="sr-only">
                            {viewMode === "request"
                                ? "Request payment from a friend"
                                : "View your request history"}
                        </SheetDescription>

                        {/* Content */}
                        <ScrollArea className="flex-1 overflow-auto">
                            {viewMode === "request" ? (
                                <div className="space-y-6 p-6 pb-10">
                                    {/* Recipient Field */}
                                    <div className="space-y-2">
                                        <Label>Recipient</Label>
                                        <UserRecipientInput
                                            value={recipient}
                                            onChange={(val) =>
                                                setRecipient(
                                                    val && typeof val === "object" ? val : null
                                                )
                                            }
                                            placeholder="Search user"
                                            mode="request"
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
                                        <Label>Note (Optional)</Label>
                                        <Textarea
                                            placeholder="Add a note..."
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            rows={3}
                                        />
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
                                                        !expirationDate && "text-muted-foreground"
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
                                                If no expiration is set, the request will remain active
                                                until completed or declined
                                            </span>
                                        </div>
                                    </div>

                                    {/* Request Button */}
                                    <div className="flex justify-center">
                                        <Button
                                            className="w-fit rounded-[15px] corner-squircle"
                                            size="lg"
                                            onClick={handleCreateRequest}
                                            disabled={!recipient || !amount || parseFloat(amount) <= 0}
                                        >
                                            <HandCoins className="mr-2 h-4 w-4" />
                                            Send Request
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 pb-10">
                                    <Tabs
                                        defaultValue="sent"
                                        value={activeTab}
                                        onValueChange={(val) => setActiveTab(val as HistoryTab)}
                                        className="mb-6 w-full flex flex-col items-center"
                                    >
                                        <TabsList className="grid w-fit grid-cols-2 rounded-[15px] corner-squircle">
                                            <TabsTrigger value="sent" className="rounded-[15px] corner-squircle">Sent</TabsTrigger>
                                            <TabsTrigger value="received" className="rounded-[15px] corner-squircle">Received</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="sent" className="mt-6 space-y-4 w-full">
                                            {!sentRequests || sentRequests.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
                                                        <HandCoins className="h-8 w-8 text-zinc-400" />
                                                    </div>
                                                    <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                                                        No sent requests
                                                    </h3>
                                                    <p className="text-sm text-zinc-500">
                                                        Your sent payment requests will appear here
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {sentRequests.map(request => renderRequestItem(request, true))}
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="received" className="mt-6 space-y-4 w-full">
                                            {!receivedRequests || receivedRequests.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
                                                        <HandCoins className="h-8 w-8 text-zinc-400" />
                                                    </div>
                                                    <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                                                        No received requests
                                                    </h3>
                                                    <p className="text-sm text-zinc-500">
                                                        Payment requests from others will appear here
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {receivedRequests.map(request => renderRequestItem(request, false))}
                                                </div>
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Request Detail Modal - Will be created separately */}
            <RequestDetailModal
                request={selectedRequest}
                open={isDetailModalOpen}
                onOpenChange={setIsDetailModalOpen}
                currentUserId={currentUser?._id}
                onRequestUpdated={() => {
                    // Refresh will happen automatically via Convex reactivity
                }}
            />
        </>
    );
}

// Request Detail Modal Component
function RequestDetailModal({
    request,
    open,
    onOpenChange,
    currentUserId,
    onRequestUpdated,
}: {
    request: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUserId?: string;
    onRequestUpdated: () => void;
}) {
    const { address } = useAppKitAccount();
    const declineRequest = useMutation(api.paymentRequests.declineRequest);

    const [isProcessing, setIsProcessing] = useState(false);

    if (!request) return null;

    const isSender = currentUserId === request.recipientId;
    const isPending = request.status === "pending";

    const handleDecline = async () => {
        if (!address) return;
        setIsProcessing(true);
        try {
            await declineRequest({
                userAddress: address,
                requestId: request._id,
            });
            toast.success("Request declined");
            onOpenChange(false);
            onRequestUpdated();
        } catch (error: any) {
            toast.error(error.message || "Failed to decline request");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSend = () => {
        if (!request || !request.requester) return;

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
                    requestId: request._id,
                },
            })
        );

        onOpenChange(false);
    };

    const otherUser = isSender ? request.requester : request.recipient;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="rounded-[40px] corner-squircle sm:max-w-md"
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
                    <div className="rounded-[40px] corner-squircle bg-linear-to-br from-amber-50 to-yellow-50 p-6 text-center">
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
                            <div className="rounded-[15px] corner-squircle bg-zinc-50 p-4 text-sm text-zinc-600">
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
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Status</span>
                            <Badge
                                variant="outline"
                                className={getStatusConfig(request.status).className}
                            >
                                {getStatusConfig(request.status).label}
                            </Badge>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-center">
                        {isPending && isSender ? (
                            <>
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-[15px] corner-squircle"
                                    onClick={handleDecline}
                                    disabled={isProcessing}
                                >
                                    Decline
                                </Button>
                                <Button
                                    className="flex-1 rounded-[15px] corner-squircle"
                                    onClick={handleSend}
                                    disabled={isProcessing}
                                >
                                    Send Payment
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="outline"
                                className="w-fit rounded-[15px] corner-squircle"
                                onClick={() => onOpenChange(false)}
                            >
                                Close
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    );
}