"use client";

import { useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { parseEther, decodeEventLog } from "viem";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import {
    Link2,
    X,
    Image as ImageIcon,
    Calendar as CalendarIcon,
    Info,
    Check,
    Plus,
    Trash2,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import EmojiPicker from "emoji-picker-react";
import { generateClaimKeyPair, createClaimLinkURL } from "@/lib/crypto/proof-utils";
import { dateToSeconds } from "@/lib/timestamp-utils";
import {
    CLAIM_LINK_FACTORY_ADDRESS,
    ClaimLinkFactoryABI,
    AssetType,
    AccessMode as ContractAccessMode,
    SplitMode as ContractSplitMode,
} from "@/lib/contracts/claim-link-abis";

type ViewMode = "create" | "success";
type AccessMode = "anyone" | "allowlist";
type SplitMode = "equal" | "custom";

export default function ClaimLinkSheet() {
    const [open, setOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("create");
    const [isCreating, setIsCreating] = useState(false);
    const { address } = useAppKitAccount();

    const user = useQuery(api.users.getUser, address ? { userAddress: address } : "skip");

    // Wagmi hooks
    const publicClient = usePublicClient();
    const { writeContractAsync } = useWriteContract();

    // Convex mutation
    const createClaimLink = useMutation(api.claimLinks.createClaimLink);

    // Form state
    const [visualTab, setVisualTab] = useState<"emoji" | "image">("emoji");
    const [selectedEmoji, setSelectedEmoji] = useState("💰");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [accessMode, setAccessMode] = useState<AccessMode>("anyone");
    const [splitMode, setSplitMode] = useState<SplitMode>("equal");
    const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);

    // Anyone mode - equal splits
    const [maxClaimers, setMaxClaimers] = useState("5");

    // Allowlist mode
    const [allowlist, setAllowlist] = useState<string[]>([""]);
    const [customAmounts, setCustomAmounts] = useState<string[]>([""]);

    // Success state
    const [createdLinkUrl, setCreatedLinkUrl] = useState("");
    const [privateKey, setPrivateKey] = useState<`0x${string}` | null>(null);
    const [publicKey, setPublicKey] = useState<`0x${string}` | null>(null);

    const resetForm = () => {
        setVisualTab("emoji");
        setSelectedEmoji("💰");
        setImageFile(null);
        setImagePreview("");
        setTitle("");
        setDescription("");
        setAmount("");
        setAccessMode("anyone");
        setSplitMode("equal");
        setExpirationDate(undefined);
        setMaxClaimers("5");
        setAllowlist([""]);
        setCustomAmounts([""]);
        setPrivateKey(null);
        setPublicKey(null);
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

    const handleAddAllowlistAddress = () => {
        if (allowlist.length >= 50) {
            toast.error("Maximum 50 addresses allowed");
            return;
        }
        setAllowlist([...allowlist, ""]);
        if (splitMode === "custom") {
            setCustomAmounts([...customAmounts, ""]);
        }
    };

    const handleRemoveAllowlistAddress = (index: number) => {
        if (allowlist.length <= 1) {
            toast.error("At least one address required");
            return;
        }
        setAllowlist(allowlist.filter((_, i) => i !== index));
        if (splitMode === "custom") {
            setCustomAmounts(customAmounts.filter((_, i) => i !== index));
        }
    };

    const handleAllowlistChange = (index: number, value: string) => {
        const updated = [...allowlist];
        updated[index] = value;
        setAllowlist(updated);
    };

    const handleCustomAmountChange = (index: number, value: string) => {
        const updated = [...customAmounts];
        updated[index] = value;
        setCustomAmounts(updated);
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

        if (accessMode === "anyone" && splitMode === "equal") {
            const maxClaimersNum = parseInt(maxClaimers);
            if (isNaN(maxClaimersNum) || maxClaimersNum < 1 || maxClaimersNum > 50) {
                toast.error("Max claimers must be between 1 and 50");
                return false;
            }
        }

        if (accessMode === "allowlist") {
            // Validate all addresses are filled
            for (let i = 0; i < allowlist.length; i++) {
                const addr = allowlist[i].trim();
                if (!addr) {
                    toast.error(`Please enter address #${i + 1}`);
                    return false;
                }
                if (!addr.match(/^0x[a-fA-F0-9]{40}$/)) {
                    toast.error(`Invalid address format #${i + 1}`);
                    return false;
                }
            }

            // Validate custom amounts if custom split
            if (splitMode === "custom") {
                let sum = 0;
                for (let i = 0; i < customAmounts.length; i++) {
                    const amt = parseFloat(customAmounts[i]);
                    if (isNaN(amt) || amt <= 0) {
                        toast.error(`Invalid amount for address #${i + 1}`);
                        return false;
                    }
                    sum += amt;
                }

                const totalAmt = parseFloat(amount);
                if (Math.abs(sum - totalAmt) > 0.000001) {
                    toast.error(`Custom amounts (${sum}) must equal total amount (${totalAmt})`);
                    return false;
                }
            }
        }

        return true;
    };

    const handleCreateLink = async () => {
        if (!address) {
            toast.error("Please connect your wallet");
            return;
        }

        if (!publicClient) {
            toast.error("Wallet not connected properly");
            return;
        }

        if (user === undefined) return;

        if (user === null) {
            toast.error("Please create a profile first");
            return;
        }

        if (!validateForm()) return;

        setIsCreating(true);

        try {
            // Generate keypair for "anyone" mode
            let keypair: { privateKey: `0x${string}`; address: `0x${string}` } | undefined;
            if (accessMode === "anyone") {
                keypair = generateClaimKeyPair();
                setPrivateKey(keypair.privateKey);
                setPublicKey(keypair.address);
            }

            // Calculate contract parameters
            const assetTypeEnum = AssetType.NATIVE; // Native MNT for now
            const accessModeEnum = accessMode === "anyone"
                ? ContractAccessMode.ANYONE
                : ContractAccessMode.ALLOWLIST;
            const splitModeEnum = splitMode === "equal"
                ? ContractSplitMode.EQUAL
                : ContractSplitMode.CUSTOM;

            // Expiration time in seconds (default to 1 year if not set)
            const expirationTimeSeconds = expirationDate
                ? dateToSeconds(expirationDate)
                : dateToSeconds(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));

            // Prepare contract arguments
            const contractMaxClaimers = accessMode === "anyone" && splitMode === "equal"
                ? BigInt(parseInt(maxClaimers))
                : BigInt(0);

            const contractAllowlist = accessMode === "allowlist"
                ? allowlist.map(a => a.trim() as `0x${string}`)
                : [];

            const contractCustomAmounts = accessMode === "allowlist" && splitMode === "custom"
                ? customAmounts.map(a => parseEther(a))
                : [];

            const proofAddress = keypair?.address || "0x0000000000000000000000000000000000000000";

            toast.loading("Deploying claim link contract...", { id: "deploy" });

            // Deploy contract via Factory
            const hash = await writeContractAsync({
                address: CLAIM_LINK_FACTORY_ADDRESS as `0x${string}`,
                abi: ClaimLinkFactoryABI,
                functionName: 'createClaimLink',
                args: [
                    assetTypeEnum,
                    "0x0000000000000000000000000000000000000000" as `0x${string}`, // assetAddress (0x0 for native)
                    parseEther(amount),
                    accessModeEnum,
                    splitModeEnum,
                    BigInt(expirationTimeSeconds),
                    contractMaxClaimers,
                    contractAllowlist,
                    contractCustomAmounts,
                    proofAddress as `0x${string}`,
                ],
                value: parseEther(amount), // Fund with native MNT
            });

            toast.loading("Waiting for confirmation...", { id: "deploy" });

            // Wait for transaction receipt
            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            // Extract deployed contract address from ClaimLinkDeployed event
            let deployedContractAddress: string | null = null;
            for (const log of receipt.logs) {
                try {
                    const decoded = decodeEventLog({
                        abi: ClaimLinkFactoryABI,
                        data: log.data,
                        topics: log.topics,
                    });
                    if (decoded.eventName === "ClaimLinkDeployed") {
                        deployedContractAddress = (decoded.args as any).claimLink;
                        break;
                    }
                } catch {
                    // Not our event, skip
                }
            }

            if (!deployedContractAddress) {
                throw new Error("Failed to get deployed contract address");
            }

            toast.loading("Saving claim link...", { id: "deploy" });

            // Save to Convex (WITHOUT private key!)
            const { shortId } = await createClaimLink({
                userAddress: address,
                contractAddress: deployedContractAddress,
                title: title.trim(),
                description: description.trim() || undefined,
                imageOrEmoji: visualTab === "emoji" ? selectedEmoji : imagePreview,
                imageType: visualTab,
                assetType: "native",
                totalAmount: amount,
                accessMode,
                splitMode: splitMode === "equal" ? "equal" : "custom",
                maxClaimers: accessMode === "anyone" && splitMode === "equal"
                    ? parseInt(maxClaimers)
                    : undefined,
                allowlist: accessMode === "allowlist"
                    ? allowlist.map(a => a.trim())
                    : undefined,
                customAmounts: accessMode === "allowlist" && splitMode === "custom"
                    ? customAmounts
                    : undefined,
                proofAddress: keypair?.address, // PUBLIC KEY only!
                expiresAt: expirationDate ? dateToSeconds(expirationDate) : undefined,
            });

            // Create shareable URL
            const linkUrl = keypair
                ? createClaimLinkURL(shortId, keypair.privateKey)
                : `${window.location.origin}/claim/${shortId}`;

            setCreatedLinkUrl(linkUrl);
            setViewMode("success");
            toast.success("Claim link created!", { id: "deploy" });

        } catch (error: any) {
            console.error("Create claim link error:", error);
            toast.error(error.message || "Failed to create claim link", { id: "deploy" });
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopyCreatedLink = () => {
        navigator.clipboard.writeText(createdLinkUrl);
        toast.success("Link copied to clipboard!");
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
                        setViewMode("create");
                    }, 300);
                }
            }}
        >
            <SheetTrigger asChild>
                <button className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-[40px] corner-squircle bg-linear-to-br from-pink-500 to-pink-600 text-white shadow-lg transition-all hover:shadow-xl">
                    <Link2 className="h-6 w-6" />
                    <span className="text-sm font-medium">Claim Link</span>
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
                        <div className="flex items-center"></div>

                        <SheetTitle className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold">
                            {viewMode === "create" ? "Create Claim Link" : "Link Created!"}
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
                        Create a claim link to distribute assets
                    </SheetDescription>

                    <ScrollArea className="flex-1 overflow-auto">
                        {viewMode === "create" ? (
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
                                        placeholder="e.g., Team Bonus, Event Reward"
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
                                        placeholder="What is this claim link for?"
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

                                {/* Access Mode */}
                                <div className="space-y-2">
                                    <Label>Who Can Claim?</Label>
                                    <RadioGroup
                                        value={accessMode}
                                        onValueChange={(v) => setAccessMode(v as AccessMode)}
                                    >
                                        <div className="flex items-start space-x-2 rounded-lg border p-4">
                                            <RadioGroupItem value="anyone" id="anyone" />
                                            <div className="flex-1">
                                                <Label htmlFor="anyone" className="font-medium">
                                                    Anyone with the link
                                                </Label>
                                                <p className="text-sm text-zinc-500">
                                                    Share the link privately - only those with it can claim
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start space-x-2 rounded-lg border p-4">
                                            <RadioGroupItem value="allowlist" id="allowlist" />
                                            <div className="flex-1">
                                                <Label htmlFor="allowlist" className="font-medium">
                                                    Specific addresses only
                                                </Label>
                                                <p className="text-sm text-zinc-500">
                                                    Only whitelisted addresses can claim
                                                </p>
                                            </div>
                                        </div>
                                    </RadioGroup>
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
                                                    {accessMode === "anyone"
                                                        ? "First N claimers get equal amounts"
                                                        : "All addresses get equal amounts"}
                                                </p>
                                            </div>
                                        </div>
                                        {accessMode === "allowlist" && (
                                            <div className="flex items-start space-x-2 rounded-lg border p-4">
                                                <RadioGroupItem value="custom" id="custom" />
                                                <div className="flex-1">
                                                    <Label htmlFor="custom" className="font-medium">
                                                        Custom amounts
                                                    </Label>
                                                    <p className="text-sm text-zinc-500">
                                                        Specify different amounts for each address
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </RadioGroup>
                                </div>

                                {/* Max Claimers (anyone + equal) */}
                                {accessMode === "anyone" && splitMode === "equal" && (
                                    <div className="space-y-2">
                                        <Label>Max Claimers</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={maxClaimers}
                                            onChange={(e) => setMaxClaimers(e.target.value)}
                                        />
                                        <div className="flex items-start gap-2 text-xs text-zinc-500">
                                            <Info className="mt-0.5 h-3 w-3 shrink-0" />
                                            <span>
                                                First {maxClaimers} people to claim will each get{" "}
                                                {amount && maxClaimers
                                                    ? (parseFloat(amount) / parseInt(maxClaimers)).toFixed(6)
                                                    : "0"}{" "}
                                                MNT
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Allowlist Addresses */}
                                {accessMode === "allowlist" && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>Addresses ({allowlist.length}/50)</Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleAddAllowlistAddress}
                                                disabled={allowlist.length >= 50}
                                            >
                                                <Plus className="mr-1 h-3 w-3" />
                                                Add
                                            </Button>
                                        </div>
                                        <div className="space-y-3">
                                            {allowlist.map((addr, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <Input
                                                        placeholder="0x..."
                                                        value={addr}
                                                        onChange={(e) => handleAllowlistChange(index, e.target.value)}
                                                        className="flex-1"
                                                    />
                                                    {splitMode === "custom" && (
                                                        <Input
                                                            type="number"
                                                            step="0.000001"
                                                            placeholder="Amount"
                                                            value={customAmounts[index]}
                                                            onChange={(e) => handleCustomAmountChange(index, e.target.value)}
                                                            className="w-32"
                                                        />
                                                    )}
                                                    {allowlist.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveAllowlistAddress(index)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {splitMode === "equal" && (
                                            <div className="flex items-start gap-2 text-xs text-zinc-500">
                                                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                                                <span>
                                                    Each address will receive{" "}
                                                    {amount && allowlist.length
                                                        ? (parseFloat(amount) / allowlist.length).toFixed(6)
                                                        : "0"}{" "}
                                                    MNT
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

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
                                            After expiration, unclaimed funds can be reclaimed
                                        </span>
                                    </div>
                                </div>

                                {/* Create Button */}
                                <div className="flex justify-center pt-4">
                                    <Button
                                        size="lg"
                                        onClick={handleCreateLink}
                                        disabled={!isValid || isCreating}
                                        className="w-fit rounded-[15px] corner-squircle"
                                    >
                                        {isCreating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Link2 className="mr-2 h-4 w-4" />
                                                Create Claim Link
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            /* SUCCESS VIEW */
                            <div className="space-y-6 p-6 pb-10">
                                <div className="flex justify-center">
                                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                                        <Check className="h-10 w-10 text-green-600" />
                                    </div>
                                </div>

                                {accessMode === "anyone" && (
                                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                                        <div className="flex gap-2">
                                            <Info className="h-5 w-5 shrink-0 text-amber-600" />
                                            <div className="text-sm text-amber-800">
                                                <p className="font-medium mb-1">Important: Secret Link</p>
                                                <p>
                                                    This link contains a secret key. Anyone with this link can claim funds.
                                                    Share it carefully and only with intended recipients.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label>Your Claim Link</Label>
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
                                        Copy Link
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            if (navigator.share) {
                                                navigator.share({ url: createdLinkUrl }).catch(() => { });
                                            } else {
                                                handleCopyCreatedLink();
                                            }
                                        }}
                                        variant="outline"
                                        className="rounded-[15px] corner-squircle"
                                    >
                                        Share
                                    </Button>
                                </div>

                                <div className="flex justify-center pt-4">
                                    <Button
                                        onClick={() => {
                                            resetForm();
                                            setOpen(false);
                                        }}
                                        className="w-fit rounded-[15px] corner-squircle"
                                    >
                                        Done
                                    </Button>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </SheetContent>
        </Sheet>
    );
}