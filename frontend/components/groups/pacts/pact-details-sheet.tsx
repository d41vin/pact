"use client";

import { useGroupFund } from "@/hooks/useGroupFund";
import { formatEtherToMnt, formatAddress } from "@/lib/format-utils";
import { Copy, Wallet, ArrowDownCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DepositModal } from "./deposit-modal";
import { WithdrawModal } from "./withdraw-modal";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface PactDetailsSheetProps {
    pactId: Id<"groupPacts"> | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PactDetailsSheet({ pactId, open, onOpenChange }: PactDetailsSheetProps) {
    // 1. Fetch Pact Data from Convex
    const pact = useQuery(api.groupPacts.getGroupPact, pactId ? { pactId } : "skip");

    // 2. Fetch Blockchain Data (only if we have an address)
    const { stats, balance } = useGroupFund(
        (pact?.contractAddress as `0x${string}`) || "0x0000000000000000000000000000000000000000"
    );

    if (!pactId) return null;

    const copyAddress = () => {
        if (pact?.contractAddress) {
            navigator.clipboard.writeText(pact.contractAddress);
            toast.success("Address copied!");
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                className="h-[90vh] rounded-t-[50px] corner-squircle p-0 w-full sm:max-w-full sm:h-auto"
            >
                <div className="mx-auto flex h-full w-full max-w-2xl flex-col p-6">
                    <SheetHeader className="mb-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <SheetTitle className="text-xl">{pact ? pact.name : <Skeleton className="h-6 w-32" />}</SheetTitle>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    {pact ? "Group Fund" : <Skeleton className="h-4 w-24" />}
                                </div>
                            </div>
                            {pact && (
                                <Badge variant="outline" className="flex items-center gap-1 font-mono text-xs">
                                    {formatAddress(pact.contractAddress)}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4 ml-1"
                                        onClick={copyAddress}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </Badge>
                            )}
                        </div>
                    </SheetHeader>

                    {pact ? (
                        <div className="space-y-8">
                            {/* Balance Card */}
                            <div className="rounded-xl border bg-card p-6 shadow-sm">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Wallet className="h-4 w-4" />
                                    <span>Current Balance</span>
                                </div>
                                <div className="mt-2 text-3xl font-bold">
                                    {Number(balance ?? 0) > 0 ? (
                                        <span className="text-primary">{formatEtherToMnt(balance)}</span>
                                    ) : (
                                        "0.00 MNT"
                                    )}
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <div className="flex-1">
                                        <DepositModal
                                            contractAddress={pact.contractAddress as `0x${string}`}
                                            pactName={pact.name}
                                            trigger={
                                                <Button className="w-full gap-2" size="lg">
                                                    <ArrowDownCircle className="h-4 w-4" />
                                                    Deposit
                                                </Button>
                                            }
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <WithdrawModal
                                            contractAddress={pact.contractAddress as `0x${string}`}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-lg border p-4">
                                    <div className="text-sm text-muted-foreground">Total In</div>
                                    <div className="mt-1 text-lg font-semibold text-green-600">
                                        +{formatEtherToMnt(stats?.totalDeposited || "0")}
                                    </div>
                                </div>
                                <div className="rounded-lg border p-4">
                                    <div className="text-sm text-muted-foreground">Total Out</div>
                                    <div className="mt-1 text-lg font-semibold text-red-600">
                                        -{formatEtherToMnt(stats?.totalWithdrawn || "0")}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Info Section */}
                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Details
                                </h3>

                                <div className="grid gap-2 text-sm">
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Created by</span>
                                        <span className="font-medium">{pact.creatorId ? "Group Admin" : "Unknown"}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Description</span>
                                        <span className="font-medium">{pact.description || "No description provided"}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Contract</span>
                                        <span className="font-mono">{formatAddress(pact.contractAddress)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Skeleton className="h-32 w-full rounded-xl" />
                            <div className="grid grid-cols-2 gap-4">
                                <Skeleton className="h-20 rounded-lg" />
                                <Skeleton className="h-20 rounded-lg" />
                            </div>
                        </div>

                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
