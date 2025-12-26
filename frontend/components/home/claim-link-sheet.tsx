"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAppKitAccount } from "@reown/appkit/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useWriteContract, usePublicClient, useReadContract } from "wagmi";
import {
  parseEther,
  parseUnits,
  formatEther,
  formatUnits,
  decodeEventLog,
} from "viem";
import { Id } from "@/convex/_generated/dataModel";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
  ArrowLeft,
  Copy,
  Share2,
  QrCode as QrCodeIcon,
  Eye,
  Pause,
  Play,
  Clock,
  ExternalLink,
  Edit,
  Ban,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import EmojiPicker from "emoji-picker-react";
import {
  generateClaimKeyPair,
  createClaimLinkURL,
} from "@/lib/crypto/proof-utils";
import { dateToSeconds, secondsToMillis } from "@/lib/timestamp-utils";
import {
  CLAIM_LINK_FACTORY_ADDRESS,
  ClaimLinkFactoryABI,
  ClaimLinkImplementationABI,
  AssetType,
  AccessMode as ContractAccessMode,
  SplitMode as ContractSplitMode,
} from "@/lib/contracts/claim-link-abis";
import { formatFullDate, formatExpiry, formatAddress } from "@/lib/date-utils";

type ViewMode = "create" | "list" | "details" | "success";
type AccessMode = "anyone" | "allowlist";
type SplitMode = "equal" | "custom";
type StatusFilter =
  | "all"
  | "active"
  | "paused"
  | "completed"
  | "expired"
  | "cancelled";
type SortOption = "recent" | "amount" | "claims";

// Type for claim link from Convex
interface ClaimLink {
  _id: Id<"claimLinks">;
  creatorId: Id<"users">;
  contractAddress: string;
  title: string;
  description?: string;
  imageOrEmoji: string;
  imageType: "emoji" | "image";
  assetType: "native" | "erc20";
  assetAddress?: string;
  assetSymbol?: string;
  assetDecimals?: number;
  totalAmount: string;
  accessMode: "anyone" | "allowlist";
  splitMode: "none" | "equal" | "custom";
  allowlist?: string[];
  customAmounts?: string[];
  maxClaimers?: number;
  proofAddress: string;
  privateKey?: string;
  status: "active" | "paused" | "completed" | "cancelled";
  shortId: string;
  expiresAt?: number;
  viewCount: number;
  claimCount: number;
  totalClaimed: string;
  lastClaimAt?: number;
  claims?: ClaimLinkClaim[];
}

// Type for claim from Convex
interface ClaimLinkClaim {
  _id: Id<"claimLinkClaims">;
  claimLinkId: Id<"claimLinks">;
  claimerUserId?: Id<"users">;
  claimerAddress: string;
  amount: string;
  transactionHash: string;
  status: "completed" | "failed";
  timestamp: number;
  claimer?: {
    name: string;
    username: string;
    profileImageUrl?: string;
  };
}

export default function ClaimLinkSheet() {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isCreating, setIsCreating] = useState(false);
  const { address } = useAppKitAccount();

  const user = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip",
  );

  // Wagmi hooks
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // Convex mutations
  const createClaimLinkRecord = useMutation(api.claimLinks.createClaimLink);
  const updateClaimLinkStatus = useMutation(
    api.claimLinks.updateClaimLinkStatus,
  );
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

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
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(
    undefined,
  );
  const [maxClaimers, setMaxClaimers] = useState("5");
  const [allowlist, setAllowlist] = useState<string[]>([""]);
  const [customAmounts, setCustomAmounts] = useState<string[]>([""]);

  // Success state
  const [createdLinkUrl, setCreatedLinkUrl] = useState("");
  const [privateKey, setPrivateKey] = useState<`0x${string}` | null>(null);
  const [publicKey, setPublicKey] = useState<`0x${string}` | null>(null);

  // List/Details state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("recent");
  const [selectedLinkId, setSelectedLinkId] = useState<Id<"claimLinks"> | null>(
    null,
  );

  // Get claim links
  const claimLinks = useQuery(
    api.claimLinks.listClaimLinks,
    user
      ? {
          userId: user._id,
          status: statusFilter === "all" ? undefined : statusFilter,
        }
      : "skip",
  );

  // Get selected claim link details
  const selectedLink = useQuery(
    api.claimLinks.getClaimLinkDetails,
    selectedLinkId ? { claimLinkId: selectedLinkId } : "skip",
  );

  // Smart default: show list if user has links, otherwise show create
  useEffect(() => {
    if (open && claimLinks !== undefined) {
      if (claimLinks.length === 0 && statusFilter === "all") {
        setViewMode("create");
      } else if (
        claimLinks.length > 0 &&
        viewMode === "create" &&
        statusFilter === "all"
      ) {
        setViewMode("list");
      }
    }
  }, [open, claimLinks]);

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
          toast.error(
            `Custom amounts (${sum}) must equal total amount (${totalAmt})`,
          );
          return false;
        }
      }
    }

    return true;
  };

  const handleCreateLink = async () => {
    if (!address || !publicClient || user === undefined) {
      toast.error("Please connect your wallet");
      return;
    }

    if (user === null) {
      toast.error("Please create a profile first");
      return;
    }

    if (!validateForm()) return;

    setIsCreating(true);

    try {
      // 1. Handle image upload
      let imageOrEmoji = selectedEmoji;
      let imageType: "emoji" | "image" = "emoji";

      if (visualTab === "image" && imageFile) {
        toast.loading("Uploading image...", { id: "upload" });

        const uploadUrl = await generateUploadUrl();
        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": imageFile.type },
          body: imageFile,
        });

        if (!uploadResult.ok) {
          toast.error("Failed to upload image", { id: "upload" });
          throw new Error("Image upload failed");
        }

        const { storageId } = await uploadResult.json();
        imageOrEmoji = storageId;
        imageType = "image";
        toast.success("Image uploaded!", { id: "upload" });
      }

      // 2. Generate keypair for "anyone" mode
      let keypair:
        | { privateKey: `0x${string}`; address: `0x${string}` }
        | undefined;
      if (accessMode === "anyone") {
        keypair = generateClaimKeyPair();
        setPrivateKey(keypair.privateKey);
        setPublicKey(keypair.address);
      }

      // 3. Calculate contract parameters
      const assetType = "native";
      const assetTypeEnum = AssetType.NATIVE;
      const accessModeEnum =
        accessMode === "anyone"
          ? ContractAccessMode.ANYONE
          : ContractAccessMode.ALLOWLIST;
      const splitModeEnum =
        splitMode === "equal"
          ? ContractSplitMode.EQUAL
          : ContractSplitMode.CUSTOM;

      const expirationTimeInSeconds = expirationDate
        ? BigInt(dateToSeconds(expirationDate))
        : BigInt(0);

      const contractMaxClaimers =
        accessMode === "anyone" && splitMode === "equal"
          ? BigInt(parseInt(maxClaimers))
          : BigInt(0);

      const contractAllowlist =
        accessMode === "allowlist"
          ? allowlist.map((a) => a.trim() as `0x${string}`)
          : [];

      const contractCustomAmounts =
        accessMode === "allowlist" && splitMode === "custom"
          ? customAmounts.map((a) => parseEther(a))
          : [];

      const proofAddress =
        keypair?.address || "0x0000000000000000000000000000000000000000";

      toast.loading("Deploying claim link contract...", { id: "deploy" });

      // 4. Deploy contract via Factory
      const hash = await writeContractAsync({
        address: CLAIM_LINK_FACTORY_ADDRESS as `0x${string}`,
        abi: ClaimLinkFactoryABI,
        functionName: "createClaimLink",
        args: [
          assetTypeEnum,
          "0x0000000000000000000000000000000000000000" as `0x${string}`,
          parseEther(amount),
          accessModeEnum,
          splitModeEnum,
          expirationTimeInSeconds,
          contractMaxClaimers,
          contractAllowlist,
          contractCustomAmounts,
          proofAddress as `0x${string}`,
        ],
        value: parseEther(amount),
      });

      toast.loading("Waiting for confirmation...", { id: "deploy" });

      // 5. Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // 6. Extract deployed contract address from ClaimLinkDeployed event
      let deployedContractAddress: string | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: ClaimLinkFactoryABI,
            data: log.data,
            topics: log.topics,
          });
          if (
            decoded.eventName === "ClaimLinkDeployed" &&
            decoded.args &&
            typeof decoded.args === "object" &&
            "claimLink" in decoded.args
          ) {
            deployedContractAddress = decoded.args.claimLink as `0x${string}`;
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

      // 7. Save to Convex (with private key for creator to retrieve later)
      const { shortId } = await createClaimLinkRecord({
        userAddress: address,
        contractAddress: deployedContractAddress,
        title: title.trim(),
        description: description.trim() || undefined,
        imageOrEmoji,
        imageType,
        assetType,
        totalAmount: amount,
        accessMode,
        splitMode: splitMode === "equal" ? "equal" : "custom",
        maxClaimers:
          accessMode === "anyone" && splitMode === "equal"
            ? parseInt(maxClaimers)
            : undefined,
        allowlist:
          accessMode === "allowlist"
            ? allowlist.map((a) => a.trim())
            : undefined,
        customAmounts:
          accessMode === "allowlist" && splitMode === "custom"
            ? customAmounts
            : undefined,
        proofAddress: keypair?.address,
        privateKey: keypair?.privateKey, // Store private key for later retrieval
        expiresAt: expirationDate ? dateToSeconds(expirationDate) : undefined,
      });

      // 8. Create shareable URL
      const linkUrl = keypair
        ? createClaimLinkURL(shortId, keypair.privateKey)
        : `${window.location.origin}/claim/${shortId}`;

      setCreatedLinkUrl(linkUrl);
      setViewMode("success");
      toast.success("Claim link created!", { id: "deploy" });
    } catch (error: unknown) {
      console.error("Create claim link error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create claim link";
      toast.error(errorMessage, {
        id: "deploy",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyCreatedLink = () => {
    navigator.clipboard.writeText(createdLinkUrl);
    toast.success("Link copied to clipboard!");
  };

  const handleToggleStatus = async (action: "pause" | "resume" | "cancel") => {
    if (!address || !selectedLinkId) return;

    try {
      await updateClaimLinkStatus({
        userAddress: address,
        claimLinkId: selectedLinkId,
        action,
      });
      toast.success(
        action === "pause"
          ? "Link paused"
          : action === "resume"
            ? "Link resumed"
            : "Link cancelled",
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update link";
      toast.error(errorMessage);
    }
  };

  const sortLinks = (links: ClaimLink[]) => {
    switch (sortOption) {
      case "amount":
        return [...links].sort(
          (a, b) => parseFloat(b.totalAmount) - parseFloat(a.totalAmount),
        );
      case "claims":
        return [...links].sort((a, b) => b.claimCount - a.claimCount);
      case "recent":
      default:
        return links;
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
        <button className="corner-squircle flex h-24 w-full flex-col items-center justify-center gap-2 rounded-[40px] bg-linear-to-br from-pink-500 to-pink-600 text-white shadow-lg transition-all hover:shadow-xl">
          <Link2 className="h-6 w-6" />
          <span className="text-sm font-medium">Claim Link</span>
        </button>
      </SheetTrigger>

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
              {viewMode === "create" && claimLinks && claimLinks.length > 0 && (
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
                ? "Create Claim Link"
                : viewMode === "success"
                  ? "Link Created!"
                  : viewMode === "details"
                    ? "Link Details"
                    : "Claim Links"}
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
            Manage your claim links
          </SheetDescription>

          <ScrollArea className="flex-1 overflow-auto">
            {/* CREATE VIEW */}
            {viewMode === "create" && (
              <div className="space-y-6 p-6 pb-10">
                {/* Visual Selection */}
                <div className="space-y-2">
                  <Label>Visual (Image or Emoji)</Label>
                  <Tabs
                    value={visualTab}
                    onValueChange={(v) => setVisualTab(v as "emoji" | "image")}
                  >
                    <TabsList className="grid w-fit grid-cols-2">
                      <TabsTrigger value="image">Image</TabsTrigger>
                      <TabsTrigger value="emoji">Emoji</TabsTrigger>
                    </TabsList>

                    <TabsContent value="image" className="mt-4">
                      <div className="flex flex-col items-center gap-4">
                        {imagePreview ? (
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
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
                              className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white"
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
                          Share the link privately - only those with it can
                          claim
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
                          ? (
                              parseFloat(amount) / parseInt(maxClaimers)
                            ).toFixed(6)
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
                            onChange={(e) =>
                              handleAllowlistChange(index, e.target.value)
                            }
                            className="flex-1"
                          />
                          {splitMode === "custom" && (
                            <Input
                              type="number"
                              step="0.000001"
                              placeholder="Amount"
                              value={customAmounts[index]}
                              onChange={(e) =>
                                handleCustomAmountChange(index, e.target.value)
                              }
                              className="w-32"
                            />
                          )}
                          {allowlist.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleRemoveAllowlistAddress(index)
                              }
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
                    className="corner-squircle w-fit rounded-[15px]"
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
            )}

            {/* SUCCESS VIEW */}
            {viewMode === "success" && (
              <div className="space-y-6 p-6 pb-10">
                <div className="flex justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                    <Check className="h-10 w-10 text-green-600" />
                  </div>
                </div>

                {accessMode === "anyone" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex gap-2">
                      <Info className="h-5 w-5 shrink-0 text-amber-600" />
                      <div className="text-sm text-amber-800">
                        <p className="mb-1 font-medium">
                          Important: Secret Link
                        </p>
                        <p>
                          This link contains a secret key. Anyone with this link
                          can claim funds. Share it carefully and only with
                          intended recipients.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Your Claim Link</Label>
                  <div className="rounded-lg bg-zinc-100 p-4">
                    <p className="font-mono text-sm break-all text-zinc-900">
                      {createdLinkUrl}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleCopyCreatedLink}
                    variant="outline"
                    className="corner-squircle rounded-[15px]"
                  >
                    Copy Link
                  </Button>
                  <Button
                    onClick={() => {
                      if (navigator.share) {
                        navigator
                          .share({ url: createdLinkUrl })
                          .catch(() => {});
                      } else {
                        handleCopyCreatedLink();
                      }
                    }}
                    variant="outline"
                    className="corner-squircle rounded-[15px]"
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
                    className="corner-squircle w-fit rounded-[15px]"
                  >
                    Done
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
                      className="corner-squircle w-fit rounded-[15px] bg-linear-to-r from-pink-500 to-pink-600 text-white shadow-md hover:shadow-lg"
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
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="completed">Completed</TabsTrigger>
                        <TabsTrigger value="expired">Expired</TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <Select
                      value={sortOption}
                      onValueChange={(v) => setSortOption(v as SortOption)}
                    >
                      <SelectTrigger className="w-fit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Recent</SelectItem>
                        <SelectItem value="amount">Highest Amount</SelectItem>
                        <SelectItem value="claims">Most Claims</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {claimLinks === undefined ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-40 rounded-[25px]" />
                    ))}
                  </div>
                ) : claimLinks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-100">
                      <Link2 className="h-8 w-8 text-pink-600" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                      {statusFilter === "all"
                        ? "No claim links yet"
                        : `No ${statusFilter} claim links`}
                    </h3>
                    <p className="mb-4 text-sm text-zinc-500">
                      Create shareable links to distribute MNT to others
                    </p>
                    <Button
                      onClick={() => setViewMode("create")}
                      className="corner-squircle rounded-[15px]"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Link
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortLinks(claimLinks).map((link) => (
                      <ClaimLinkCard
                        key={link._id}
                        link={link}
                        onClick={() => {
                          setSelectedLinkId(link._id);
                          setViewMode("details");
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* DETAILS VIEW */}
            {viewMode === "details" && selectedLink && (
              <div className="space-y-6 px-6 pt-0 pb-10">
                <div className="text-center">
                  <div className="mb-4 flex justify-center">
                    {selectedLink.imageType === "emoji" ? (
                      <span className="text-6xl">
                        {selectedLink.imageOrEmoji}
                      </span>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={selectedLink.imageOrEmoji}
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
                    <Badge variant="outline">
                      {selectedLink.accessMode === "anyone"
                        ? "Anyone"
                        : "Allowlist"}
                    </Badge>
                    <Badge variant="outline">
                      {selectedLink.splitMode === "equal" ? "Equal" : "Custom"}{" "}
                      Split
                    </Badge>
                    {getStatusBadge(selectedLink.status)}
                  </div>
                </div>

                {/* Amount Display */}
                <div className="corner-squircle rounded-[25px] border-2 border-pink-200 bg-pink-50 p-6 text-center">
                  <div className="mb-1 text-sm font-medium text-pink-700">
                    Remaining
                  </div>
                  <div className="text-4xl font-bold text-pink-600">
                    {Math.max(
                      0,
                      parseFloat(selectedLink.totalAmount) -
                        parseFloat(selectedLink.totalClaimed),
                    ).toFixed(6)}{" "}
                    MNT
                  </div>
                  <div className="mt-2 text-sm text-pink-600">
                    {selectedLink.claimCount}/{selectedLink.maxClaimers || "∞"}{" "}
                    claimed
                  </div>
                </div>

                {/* Security Warning for "anyone" mode */}
                {selectedLink.accessMode === "anyone" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex gap-2">
                      <Info className="h-5 w-5 shrink-0 text-amber-600" />
                      <div className="text-sm text-amber-800">
                        <p className="mb-1 font-medium">Secret Link</p>
                        <p>
                          This link contains a secret key. Anyone with the
                          complete link can claim funds. Share carefully!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Create full shareable URL with private key if in "anyone" mode
                      const url =
                        selectedLink.accessMode === "anyone" &&
                        selectedLink.privateKey
                          ? createClaimLinkURL(
                              selectedLink.shortId,
                              selectedLink.privateKey as `0x${string}`,
                            )
                          : `${window.location.origin}/claim/${selectedLink.shortId}`;
                      navigator.clipboard.writeText(url);
                      toast.success("Link copied!");
                    }}
                    className="corner-squircle flex-1 rounded-[15px]"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open(`/claim/${selectedLink.shortId}`, "_blank")
                    }
                    className="corner-squircle flex-1 rounded-[15px]"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                </div>

                {/* Management Actions */}
                {selectedLink.status === "active" && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleToggleStatus("pause")}
                      className="corner-squircle flex-1 rounded-[15px]"
                    >
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (
                          confirm("Cancel this link? This cannot be undone.")
                        ) {
                          handleToggleStatus("cancel");
                        }
                      }}
                      className="corner-squircle flex-1 rounded-[15px] text-red-600"
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                )}

                {selectedLink.status === "paused" && (
                  <Button
                    variant="outline"
                    onClick={() => handleToggleStatus("resume")}
                    className="corner-squircle w-full rounded-[15px]"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Resume Link
                  </Button>
                )}

                {/* Claim History */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-zinc-900">Claim History</h3>
                  {selectedLink.claims && selectedLink.claims.length > 0 ? (
                    <div className="space-y-2">
                      {selectedLink.claims.map((claim: ClaimLinkClaim) => (
                        <div
                          key={claim._id}
                          className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={claim.claimer?.profileImageUrl} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-zinc-900">
                              {claim.claimer
                                ? claim.claimer.name
                                : formatAddress(claim.claimerAddress)}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {formatAddress(claim.claimerAddress)}
                            </div>
                            <div className="text-xs text-zinc-400">
                              {formatFullDate(secondsToMillis(claim.timestamp))}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-zinc-900">
                              {formatEther(BigInt(claim.amount))} MNT
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-zinc-200 p-6 text-center text-sm text-zinc-500">
                      No claims yet
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Helper to get status badge
function getStatusBadge(status: string) {
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
    case "paused":
      return (
        <Badge
          variant="outline"
          className="border-0 bg-amber-100 text-amber-800"
        >
          Paused
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className="border-0 bg-blue-100 text-blue-800">
          Completed
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="outline" className="border-0 bg-zinc-200 text-zinc-700">
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
}

// Helper component for claim link cards
function ClaimLinkCard({
  link,
  onClick,
}: {
  link: ClaimLink;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="corner-squircle cursor-pointer rounded-[25px] border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50"
    >
      <div className="flex items-start gap-3">
        {/* Visual */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center">
          {link.imageType === "emoji" ? (
            <span className="text-3xl">{link.imageOrEmoji}</span>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={link.imageOrEmoji}
              alt={link.title}
              className="h-12 w-12 rounded-lg object-cover"
            />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-semibold text-zinc-900">
              {link.title}
            </h3>
            {getStatusBadge(link.status)}
          </div>

          <div className="mb-2 text-sm text-zinc-600">
            {link.totalAmount} MNT •{" "}
            {link.accessMode === "anyone" ? "Anyone" : "Allowlist"}
          </div>

          <div className="mb-3 text-sm text-zinc-500">
            {link.claimCount} claim{link.claimCount !== 1 ? "s" : ""} •{" "}
            {Math.max(
              0,
              parseFloat(link.totalAmount) - parseFloat(link.totalClaimed),
            ).toFixed(6)}{" "}
            MNT remaining
          </div>

          <div className="text-xs text-zinc-400">
            Created {formatFullDate(link._creationTime)}
          </div>
        </div>
      </div>
    </div>
  );
}
