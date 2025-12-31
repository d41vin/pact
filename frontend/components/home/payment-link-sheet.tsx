"use client";

import { useState, useEffect } from "react";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
    Link2,
    X,
    Image as ImageIcon,
    Calendar as CalendarIcon,
    Info,
    Check,
    Copy,
    Share2,
    QrCode as QrCodeIcon,
    ArrowLeft,
    Plus,
    Link as LinkIcon,
    TrendingUp,
    Eye,
    User,
    ExternalLink,
    Edit,
    Pause,
    Play,
    Trash2,
    Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import EmojiPicker from "emoji-picker-react";
import { PaymentLinkCard } from "@/components/home/payment-link-card";
import { PaymentLinkQRModal } from "@/components/home/payment-link-qr-modal";
import { formatFullDate, formatExpiry } from "@/lib/date-utils";
import { formatAddress } from "@/lib/format-utils";

type ViewMode = "create" | "list" | "details" | "edit" | "success";
type StatusFilter = "all" | "active" | "completed" | "expired";
type SortOption = "recent" | "collected" | "payments";

export default function PaymentLinkSheet() {
    const [open, setOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const { address } = useAppKitAccount();

    // Form state
    const [visualTab, setVisualTab] = useState<"emoji" | "image">("emoji");
    const [selectedEmoji, setSelectedEmoji] = useState("💰");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [linkType, setLinkType] = useState<"single-use" | "reusable">(
        "single-use"
    );
    const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);

    // List state
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [sortOption, setSortOption] = useState<SortOption>("recent");
    const [selectedLinkId, setSelectedLinkId] = useState<Id<"paymentLinks"> | null>(
        null
    );

    // Success state
    const [createdLinkUrl, setCreatedLinkUrl] = useState("");
    const [createdShortId, setCreatedShortId] = useState("");

    // QR modal state
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrLinkUrl, setQrLinkUrl] = useState("");
    const [qrLinkTitle, setQrLinkTitle] = useState("");

    // Edit state
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editExpiryDate, setEditExpiryDate] = useState<Date | undefined>(undefined);

    // Get current user
    const currentUser = useQuery(
        api.users.getUser,
        address ? { userAddress: address } : "skip"
    );

    // Get payment links
    const paymentLinks = useQuery(
        api.paymentLinks.listPaymentLinks,
        currentUser
            ? {
                userId: currentUser._id,
                status: statusFilter === "all" ? undefined : statusFilter,
            }
            : "skip"
    );

    // Get selected link details
    const selectedLink = useQuery(
        api.paymentLinks.getPaymentLinkDetails,
        selectedLinkId ? { paymentLinkId: selectedLinkId } : "skip"
    );

    // Get payment history for selected link
    const paymentHistory = useQuery(
        api.paymentLinks.getPaymentLinkHistory,
        selectedLinkId ? { paymentLinkId: selectedLinkId } : "skip"
    );

    // Mutations
    const createPaymentLink = useMutation(api.paymentLinks.createPaymentLink);
    const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
    const updateSettings = useMutation(api.paymentLinks.updatePaymentLinkSettings);
    const toggleStatus = useMutation(api.paymentLinks.togglePaymentLinkStatus);

    // Smart default: show list if user has links, otherwise show create
    useEffect(() => {
        if (open && paymentLinks !== undefined) {
            // Only redirect to create if we're on the "all" tab and there are no links at all
            if (paymentLinks.length === 0 && statusFilter === "all") {
                setViewMode("create");
            } else if (paymentLinks.length > 0 && viewMode === "create" && statusFilter === "all") {
                // If we have links and are on "all", show list (unless user manually clicked create, 
                // but this runs on open/data change, so primarily for initial load)
                setViewMode("list");
            }
        }
    }, [open, paymentLinks]);

    const resetForm = () => {
        setVisualTab("emoji");
        setSelectedEmoji("💰");
        setImageFile(null);
        setImagePreview("");
        setTitle("");
        setDescription("");
        setAmount("");
        setLinkType("single-use");
        setExpiryDate(undefined);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be under 5MB");
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleCreateLink = async () => {
        if (!address) {
            toast.error("Please connect your wallet");
            return;
        }

        if (!title.trim()) {
            toast.error("Please enter a title");
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        try {
            let imageOrEmoji = selectedEmoji;
            let imageType: "emoji" | "image" = "emoji";

            if (visualTab === "image" && imageFile) {
                const uploadUrl = await generateUploadUrl();
                const result = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": imageFile.type },
                    body: imageFile,
                });
                const { storageId } = await result.json();
                imageOrEmoji = storageId;
                imageType = "image";
            }

            const result = await createPaymentLink({
                userAddress: address,
                title: title.trim(),
                description: description.trim() || undefined,
                imageOrEmoji,
                imageType,
                amount,
                linkType,
                expiresAt: expiryDate ? expiryDate.getTime() : undefined,
            });

            const linkUrl = `${window.location.origin}/pay/${result.shortId}`;
            setCreatedLinkUrl(linkUrl);
            setCreatedShortId(result.shortId);
            setViewMode("success");
            toast.success("Payment link created!");
        } catch (error: any) {
            toast.error(error.message || "Failed to create payment link");
        }
    };

    const handleCopyCreatedLink = () => {
        navigator.clipboard.writeText(createdLinkUrl);
        toast.success("Link copied to clipboard!");
    };

    const handleShareCreatedLink = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Payment Link",
                    text: `Pay me via this link: ${createdLinkUrl}`,
                    url: createdLinkUrl,
                });
            } catch (err) {
                // User cancelled
            }
        } else {
            handleCopyCreatedLink();
        }
    };

    const handleViewDetails = (linkId: Id<"paymentLinks">) => {
        setSelectedLinkId(linkId);
        setViewMode("details");
    };

    const handleBackToList = () => {
        setViewMode("list");
        setSelectedLinkId(null);
    };

    const handleBackToDetails = () => {
        setViewMode("details");
    };

    const handleOpenEdit = () => {
        if (!selectedLink) return;
        setEditTitle(selectedLink.title);
        setEditDescription(selectedLink.description || "");
        setEditExpiryDate(selectedLink.expiresAt ? new Date(selectedLink.expiresAt) : undefined);
        setViewMode("edit");
    };

    const handleSaveEdit = async () => {
        if (!address || !selectedLinkId) return;

        if (!editTitle.trim()) {
            toast.error("Title cannot be empty");
            return;
        }

        try {
            await updateSettings({
                userAddress: address,
                paymentLinkId: selectedLinkId,
                title: editTitle.trim(),
                description: editDescription.trim() || undefined,
                expiresAt: editExpiryDate ? editExpiryDate.getTime() : undefined,
            });
            toast.success("Settings updated!");
            setViewMode("details");
        } catch (error: any) {
            toast.error(error.message || "Failed to update settings");
        }
    };

    const handleShowQR = (url: string, title: string) => {
        setQrLinkUrl(url);
        setQrLinkTitle(title);
        setShowQRModal(true);
    };

    const handleToggleStatus = async (action: "pause" | "resume" | "deactivate") => {
        if (!address || !selectedLinkId) return;

        try {
            await toggleStatus({
                userAddress: address,
                paymentLinkId: selectedLinkId,
                action,
            });
            toast.success(
                action === "pause"
                    ? "Link paused"
                    : action === "resume"
                        ? "Link resumed"
                        : "Link deactivated"
            );
        } catch (error: any) {
            toast.error(error.message || "Failed to update link");
        }
    };

    const sortLinks = (links: any[]) => {
        switch (sortOption) {
            case "collected":
                return [...links].sort(
                    (a, b) => parseFloat(b.totalCollected) - parseFloat(a.totalCollected)
                );
            case "payments":
                return [...links].sort((a, b) => b.paymentCount - a.paymentCount);
            case "recent":
            default:
                return links; // Already sorted by creation time desc
        }
    };

    const isValid = title.trim() && amount && parseFloat(amount) > 0;

    return (
        <Sheet
            open={open}
            onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if (!isOpen) {
                    setTimeout(() => {
                        resetForm();
                        setViewMode("list");
                        setSelectedLinkId(null);
                    }, 300);
                }
            }}
        >
            <SheetTrigger asChild>
                <button className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-[40px] corner-squircle bg-linear-to-br from-purple-500 to-purple-600 text-white shadow-lg transition-all hover:shadow-xl">
                    <Link2 className="h-6 w-6" />
                    <span className="text-sm font-medium">Payment Link</span>
                </button>
            </SheetTrigger>

            <SheetContent
                side="bottom"
                className="h-[90vh] rounded-t-[50px] corner-squircle p-0"
                showCloseButton={false}
            >
                <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
                    {/* Header */}
                    <div className="relative flex items-center justify-between px-6 py-4">
                        {/* Left side - Back button or empty */}
                        <div className="flex items-center">
                            {viewMode === "edit" && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleBackToDetails}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            )}
                            {viewMode === "details" && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleBackToList}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            )}
                            {viewMode === "create" && paymentLinks && paymentLinks.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setViewMode("list")}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            )}
                        </div>

                        {/* Centered title */}
                        <SheetTitle className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold">
                            {viewMode === "create"
                                ? "Create Payment Link"
                                : viewMode === "success"
                                    ? "Link Created!"
                                    : viewMode === "details"
                                        ? "Link Details"
                                        : viewMode === "edit"
                                            ? "Edit Link"
                                            : "Payment Links"}
                        </SheetTitle>

                        {/* Right side - Action buttons */}
                        <div className="flex items-center gap-2">
                            {/* viewMode === "list" button removed */}
                            <SheetClose asChild>
                                <Button variant="ghost" size="icon">
                                    <X className="h-5 w-5" />
                                    <span className="sr-only">Close</span>
                                </Button>
                            </SheetClose>
                        </div>
                    </div>

                    <SheetDescription className="sr-only">
                        Manage your payment links
                    </SheetDescription>

                    <ScrollArea className="flex-1 overflow-auto">
                        {/* CREATE VIEW */}
                        {viewMode === "create" && (
                            <div className="space-y-6 p-6 pb-10">
                                {/* Visual Selection */}
                                <div className="space-y-2">
                                    <Label>Visual (Image or Emoji)</Label>
                                    <Tabs value={visualTab} onValueChange={(v) => setVisualTab(v as any)}>
                                        <TabsList className="grid w-fit grid-cols-2">
                                            <TabsTrigger value="image">Image</TabsTrigger>

                                            <TabsTrigger value="emoji">Emoji</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="image" className="mt-4">
                                            <div className="flex flex-col items-center gap-4">
                                                {imagePreview ? (
                                                    <div className="relative">
                                                        <img
                                                            src={imagePreview}
                                                            alt="Preview"
                                                            className="h-32 w-32 rounded-lg object-cover"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                setImageFile(null);
                                                                setImagePreview("");
                                                            }}
                                                            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 hover:border-zinc-400">
                                                        <ImageIcon className="h-8 w-8 text-zinc-400" />
                                                        <span className="mt-2 text-sm text-zinc-500">
                                                            Upload Image
                                                        </span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleImageChange}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                )}
                                                <p className="text-xs text-zinc-500">Max 5MB</p>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="emoji" className="mt-4">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="text-6xl">{selectedEmoji}</div>
                                                <EmojiPicker
                                                    onEmojiClick={(emoji) => setSelectedEmoji(emoji.emoji)}
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
                                        placeholder="e.g., Coffee Tips, Freelance Invoice"
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
                                        placeholder="What is this payment for?"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        maxLength={500}
                                        rows={3}
                                    />
                                    <p className="text-xs text-zinc-500">
                                        {description.length}/500 characters
                                    </p>
                                </div>

                                {/* Amount */}
                                <div className="space-y-2">
                                    <Label>Amount (MNT) *</Label>
                                    <Input
                                        type="number"
                                        step="0.000001"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>

                                {/* Payment Type */}
                                <div className="space-y-2">
                                    <Label>Payment Type</Label>
                                    <RadioGroup
                                        value={linkType}
                                        onValueChange={(v) => setLinkType(v as any)}
                                    >
                                        <div className="flex items-start space-x-2 rounded-lg border p-4">
                                            <RadioGroupItem value="single-use" id="single" />
                                            <div className="flex-1">
                                                <Label htmlFor="single" className="font-medium">
                                                    One-time payment
                                                </Label>
                                                <p className="text-sm text-zinc-500">
                                                    Link deactivates after first payment
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start space-x-2 rounded-lg border p-4">
                                            <RadioGroupItem value="reusable" id="reusable" />
                                            <div className="flex-1">
                                                <Label htmlFor="reusable" className="font-medium">
                                                    Reusable link
                                                </Label>
                                                <p className="text-sm text-zinc-500">
                                                    Accept multiple payments until deactivated
                                                </p>
                                            </div>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {/* Expiry Date */}
                                <div className="space-y-2">
                                    <Label>Expiry Date (Optional)</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !expiryDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {expiryDate ? (
                                                    format(expiryDate, "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={expiryDate}
                                                onSelect={setExpiryDate}
                                                disabled={(date) => date < new Date()}
                                                initialFocus
                                            />
                                            {expiryDate && (
                                                <div className="border-t p-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-full"
                                                        onClick={() => setExpiryDate(undefined)}
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
                                            Link expires at midnight on the selected date
                                        </span>
                                    </div>
                                </div>

                                {/* Create Button */}
                                <div className="flex justify-center pt-4">
                                    <Button
                                        size="lg"
                                        onClick={handleCreateLink}
                                        disabled={!isValid}
                                        className="w-fit rounded-[15px] corner-squircle"
                                    >
                                        <Link2 className="mr-2 h-4 w-4" />
                                        Create Link
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* SUCCESS VIEW */}
                        {viewMode === "success" && (
                            <div className="space-y-6 p-6 pb-10">
                                <div className="flex justify-center">
                                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                                        <Check className="h-10 w-10 text-green-600" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Your Payment Link</Label>
                                    <div className="rounded-lg bg-zinc-100 p-4">
                                        <p className="break-all text-sm font-mono text-zinc-900">
                                            {createdLinkUrl}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        onClick={handleCopyCreatedLink}
                                        variant="outline"
                                        className="rounded-[15px] corner-squircle"
                                    >
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy Link
                                    </Button>
                                    <Button
                                        onClick={handleShareCreatedLink}
                                        variant="outline"
                                        className="rounded-[15px] corner-squircle"
                                    >
                                        <Share2 className="mr-2 h-4 w-4" />
                                        Share
                                    </Button>
                                    <Button
                                        onClick={() =>
                                            window.open(`/pay/${createdShortId}`, "_blank")
                                        }
                                        variant="outline"
                                        className="rounded-[15px] corner-squircle"
                                    >
                                        View Link
                                    </Button>
                                    <Button
                                        onClick={() => handleShowQR(createdLinkUrl, title)}
                                        variant="outline"
                                        className="rounded-[15px] corner-squircle"
                                    >
                                        <QrCodeIcon className="mr-2 h-4 w-4" />
                                        QR Code
                                    </Button>
                                </div>

                                <div className="flex justify-center pt-4">
                                    <Button
                                        onClick={() => {
                                            resetForm();
                                            setViewMode("list");
                                        }}
                                        className="w-fit rounded-[15px] corner-squircle"
                                    >
                                        Done
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* LIST VIEW */}
                        {viewMode === "list" && (
                            <div className="space-y-4 px-6 pb-10 pt-0">
                                {/* Filters and Sort */}
                                <div className="space-y-4">
                                    <div className="flex justify-center">
                                        <Button
                                            className="w-fit justify-start rounded-[15px] corner-squircle bg-linear-to-r from-purple-500 to-purple-600 text-white shadow-md hover:shadow-lg"
                                            size="lg"
                                            onClick={() => setViewMode("create")}
                                        >
                                            <Plus className="mr-2 h-5 w-5" />
                                            Create
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Tabs
                                            value={statusFilter}
                                            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                                            className="flex-1"
                                        >
                                            <TabsList className="grid w-fit grid-cols-4">
                                                <TabsTrigger value="all" className="">
                                                    All
                                                </TabsTrigger>
                                                <TabsTrigger value="active" className="">
                                                    Active
                                                </TabsTrigger>
                                                <TabsTrigger value="completed" className="">
                                                    Completed
                                                </TabsTrigger>
                                                <TabsTrigger value="expired" className="">
                                                    Expired
                                                </TabsTrigger>
                                            </TabsList>
                                        </Tabs>

                                        <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                                            <SelectTrigger className="w-fit">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="recent">Recent</SelectItem>
                                                <SelectItem value="collected">Most Collected</SelectItem>
                                                <SelectItem value="payments">Most Payments</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Payment Links List */}
                                {paymentLinks === undefined ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3].map((i) => (
                                            <Skeleton key={i} className="h-40 rounded-[25px]" />
                                        ))}
                                    </div>
                                ) : paymentLinks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                                            <Link2 className="h-8 w-8 text-purple-600" />
                                        </div>
                                        <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                                            {statusFilter === "all"
                                                ? "No payment links yet"
                                                : statusFilter === "expired"
                                                    ? "No expired payment links yet"
                                                    : `No ${statusFilter} payment links`}
                                        </h3>
                                        <p className="mb-4 text-sm text-zinc-500">
                                            {statusFilter === "all"
                                                ? "Create shareable payment links to collect MNT from anyone"
                                                : "Create a new payment link to get started"}
                                        </p>
                                        <Button
                                            onClick={() => setViewMode("create")}
                                            className="rounded-[15px] corner-squircle"
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            {statusFilter === "all"
                                                ? "Create Your First Link"
                                                : "Create a payment link"}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sortLinks(paymentLinks).map((link) => (
                                            <PaymentLinkCard
                                                key={link._id}
                                                link={link}
                                                onClick={() => handleViewDetails(link._id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* DETAILS VIEW */}
                        {viewMode === "details" && selectedLink && (
                            <div className="space-y-6 px-6 pb-10 pt-0">
                                {/* Link Overview */}
                                <div className="text-center">
                                    {/* Edit Button */}
                                    <div className="flex justify-end">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleOpenEdit}
                                            className="rounded-[15px] corner-squircle"
                                        >
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </Button>
                                    </div>
                                    <div className="mb-4 flex justify-center">
                                        {selectedLink.imageType === "emoji" ? (
                                            <span className="text-6xl">{selectedLink.imageUrl}</span>
                                        ) : (
                                            <img
                                                src={selectedLink.imageUrl}
                                                alt={selectedLink.title}
                                                className="h-24 w-24 rounded-lg object-cover"
                                            />
                                        )}
                                    </div>

                                    <h2 className="mb-2 text-2xl font-bold text-zinc-900">
                                        {selectedLink.title}
                                    </h2>

                                    {selectedLink.description && (
                                        <p className="mb-4 text-zinc-600">
                                            {selectedLink.description}
                                        </p>
                                    )}

                                    <div className="mb-4 flex items-center justify-center gap-2">
                                        <Badge variant="outline" className="text-sm">
                                            {selectedLink.amount} MNT
                                        </Badge>
                                        <Badge variant="outline" className="text-sm">
                                            {selectedLink.linkType === "single-use" ? "One-time" : "Reusable"}
                                        </Badge>
                                        {selectedLink.status === "active" && (
                                            <Badge variant="outline" className="bg-green-100 text-green-800 border-0 text-sm">
                                                Active
                                            </Badge>
                                        )}
                                        {selectedLink.status === "paused" && (
                                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-0 text-sm">
                                                Paused
                                            </Badge>
                                        )}
                                        {selectedLink.status === "completed" && (
                                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-0 text-sm">
                                                Completed
                                            </Badge>
                                        )}
                                        {selectedLink.status === "expired" && (
                                            <Badge variant="outline" className="bg-zinc-200 text-zinc-700 border-0 text-sm">
                                                Expired
                                            </Badge>
                                        )}
                                    </div>

                                    {selectedLink.expiresAt && selectedLink.status === "active" && (
                                        <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 mb-4">
                                            <Clock className="h-4 w-4" />
                                            <span>Expires: {formatExpiry(selectedLink.expiresAt)}</span>
                                        </div>
                                    )}


                                </div>

                                {/* Link URL */}
                                <div className="space-y-2">
                                    <Label>Payment Link</Label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 rounded-lg bg-zinc-100 p-3">
                                            <p className="break-all text-xs font-mono text-zinc-900">
                                                {window.location.origin}/pay/{selectedLink.shortId}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => {
                                                navigator.clipboard.writeText(
                                                    `${window.location.origin}/pay/${selectedLink.shortId}`
                                                );
                                                toast.success("Link copied!");
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            const url = `${window.location.origin}/pay/${selectedLink.shortId}`;
                                            if (navigator.share) {
                                                navigator.share({ url }).catch(() => { });
                                            } else {
                                                navigator.clipboard.writeText(url);
                                                toast.success("Link copied!");
                                            }
                                        }}
                                        className="flex-1 rounded-[15px] corner-squircle"
                                    >
                                        <Share2 className="mr-2 h-4 w-4" />
                                        Share
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => window.open(`/pay/${selectedLink.shortId}`, "_blank")}
                                        className="flex-1 rounded-[15px] corner-squircle"
                                    >
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Page
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleShowQR(
                                            `${window.location.origin}/pay/${selectedLink.shortId}`,
                                            selectedLink.title
                                        )}
                                        className="flex-1 rounded-[15px] corner-squircle"
                                    >
                                        <QrCodeIcon className="mr-2 h-4 w-4" />
                                        QR
                                    </Button>
                                </div>

                                {/* Stats (for reusable links) */}
                                {selectedLink.linkType === "reusable" && (
                                    <div className="rounded-lg border border-zinc-200 p-4">
                                        <h3 className="mb-3 font-semibold text-zinc-900">
                                            Statistics
                                        </h3>
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div>
                                                <div className="text-2xl font-bold text-zinc-900">
                                                    {selectedLink.totalCollected}
                                                </div>
                                                <div className="text-xs text-zinc-500">
                                                    MNT Collected
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-zinc-900">
                                                    {selectedLink.paymentCount}
                                                </div>
                                                <div className="text-xs text-zinc-500">Payments</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-zinc-900">
                                                    {selectedLink.viewCount}
                                                </div>
                                                <div className="text-xs text-zinc-500">Views</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                {selectedLink.status === "active" && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => handleToggleStatus("pause")}
                                            className="flex-1 rounded-[15px] corner-squircle"
                                        >
                                            <Pause className="mr-2 h-4 w-4" />
                                            Pause
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                if (
                                                    confirm(
                                                        "Are you sure you want to deactivate this link? This cannot be undone."
                                                    )
                                                ) {
                                                    handleToggleStatus("deactivate");
                                                }
                                            }}
                                            className="flex-1 rounded-[15px] corner-squircle text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Deactivate
                                        </Button>
                                    </div>
                                )}

                                {selectedLink.status === "paused" && (
                                    <Button
                                        variant="outline"
                                        onClick={() => handleToggleStatus("resume")}
                                        className="w-full rounded-[15px] corner-squircle"
                                    >
                                        <Play className="mr-2 h-4 w-4" />
                                        Resume Link
                                    </Button>
                                )}

                                {/* Payment History */}
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-zinc-900">
                                        Payment History
                                    </h3>
                                    {paymentHistory === undefined ? (
                                        <div className="space-y-2">
                                            {[1, 2, 3].map((i) => (
                                                <Skeleton key={i} className="h-16 rounded-lg" />
                                            ))}
                                        </div>
                                    ) : paymentHistory.length === 0 ? (
                                        <div className="rounded-lg border border-zinc-200 p-6 text-center text-sm text-zinc-500">
                                            No payments yet
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {paymentHistory.map((payment) => (
                                                <div
                                                    key={payment._id}
                                                    className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3"
                                                >
                                                    {payment.payer ? (
                                                        <>
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={payment.payer.profileImageUrl} />
                                                                <AvatarFallback>
                                                                    <User className="h-4 w-4" />
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-sm font-medium text-zinc-900">
                                                                    {payment.payer.name}
                                                                </div>
                                                                <div className="text-xs text-zinc-500">
                                                                    @{payment.payer.username}
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="flex-1">
                                                            <div className="text-sm font-medium text-zinc-900">
                                                                {formatAddress(payment.transactionHash)}
                                                            </div>
                                                            <div className="text-xs text-zinc-500">
                                                                External wallet
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="text-right">
                                                        <div className="text-sm font-semibold text-zinc-900">
                                                            {payment.amount} MNT
                                                        </div>
                                                        <div className="text-xs text-zinc-500">
                                                            {formatFullDate(payment.timestamp)}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            window.open(
                                                                `https://explorer.testnet.mantle.xyz/tx/${payment.transactionHash}`,
                                                                "_blank"
                                                            )
                                                        }
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>


                            </div>
                        )}

                        {/* EDIT VIEW */}
                        {viewMode === "edit" && selectedLink && (
                            <div className="space-y-6 p-6 pb-10">
                                {/* Visual Preview (Read-only) */}
                                <div className="text-center">
                                    <div className="mb-2 text-sm font-medium text-zinc-700">
                                        Visual
                                    </div>
                                    <div className="flex justify-center">
                                        {selectedLink.imageType === "emoji" ? (
                                            <span className="text-6xl">{selectedLink.imageUrl}</span>
                                        ) : (
                                            <img
                                                src={selectedLink.imageUrl}
                                                alt={selectedLink.title}
                                                className="h-24 w-24 rounded-lg object-cover"
                                            />
                                        )}
                                    </div>
                                    <p className="mt-2 text-xs text-zinc-500">
                                        Visual cannot be changed after creation
                                    </p>
                                </div>

                                {/* Title */}
                                <div className="space-y-2">
                                    <Label>Title *</Label>
                                    <Input
                                        placeholder="e.g., Coffee Tips, Freelance Invoice"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        maxLength={100}
                                    />
                                    <p className="text-xs text-zinc-500">
                                        {editTitle.length}/100 characters
                                    </p>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label>Description (Optional)</Label>
                                    <Textarea
                                        placeholder="What is this payment for?"
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        maxLength={500}
                                        rows={3}
                                    />
                                    <p className="text-xs text-zinc-500">
                                        {editDescription.length}/500 characters
                                    </p>
                                </div>

                                {/* Amount (Read-only) */}
                                <div className="space-y-2">
                                    <Label>Amount (MNT)</Label>
                                    <div className="rounded-lg bg-zinc-100 p-3">
                                        <p className="text-sm font-medium text-zinc-900">
                                            {selectedLink.amount} MNT
                                        </p>
                                    </div>
                                    <p className="text-xs text-zinc-500">
                                        Amount cannot be changed after creation
                                    </p>
                                </div>

                                {/* Link Type (Read-only) */}
                                <div className="space-y-2">
                                    <Label>Payment Type</Label>
                                    <div className="rounded-lg bg-zinc-100 p-3">
                                        <p className="text-sm font-medium text-zinc-900">
                                            {selectedLink.linkType === "single-use"
                                                ? "One-time payment"
                                                : "Reusable link"}
                                        </p>
                                    </div>
                                    <p className="text-xs text-zinc-500">
                                        Type cannot be changed after creation
                                    </p>
                                </div>

                                {/* Expiry Date */}
                                <div className="space-y-2">
                                    <Label>Expiry Date (Optional)</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !editExpiryDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {editExpiryDate ? (
                                                    format(editExpiryDate, "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={editExpiryDate}
                                                onSelect={setEditExpiryDate}
                                                disabled={(date) => date < new Date()}
                                                initialFocus
                                            />
                                            {editExpiryDate && (
                                                <div className="border-t p-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-full"
                                                        onClick={() => setEditExpiryDate(undefined)}
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
                                            Link expires at midnight on the selected date
                                        </span>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="flex justify-center gap-3 pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={handleBackToDetails}
                                        className="w-fit rounded-[15px] corner-squircle"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={handleSaveEdit}
                                        disabled={!editTitle.trim()}
                                        className="w-fit rounded-[15px] corner-squircle"
                                    >
                                        <Check className="mr-2 h-4 w-4" />
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </SheetContent>

            {/* QR Code Modal */}
            <PaymentLinkQRModal
                open={showQRModal}
                onOpenChange={setShowQRModal}
                linkUrl={qrLinkUrl}
                linkTitle={qrLinkTitle}
            />
        </Sheet>
    );
}