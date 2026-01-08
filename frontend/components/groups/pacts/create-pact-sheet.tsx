"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, ArrowLeft, Wallet, ChevronRight } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { useGroupFundFactory } from "@/hooks/useGroupFund";
import { decodeEventLog } from "viem";
import { GROUP_FUND_FACTORY_ABI } from "@/lib/contracts/group-fund-abi";
import { usePublicClient } from "wagmi";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    description: z.string().optional(),
});

interface CreatePactSheetProps {
    groupId: Id<"groups">;
}

type ViewState = "templates" | "create_fund";

export function CreatePactSheet({ groupId }: CreatePactSheetProps) {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<ViewState>("templates");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { address, isConnected } = useAppKitAccount();
    const publicClient = usePublicClient();

    // Custom hook for blockchain interaction
    const { createGroupFund } = useGroupFundFactory();

    // Convex mutations
    const createGroupPact = useMutation(api.groupPacts.createGroupPact);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
        },
    });

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            // Reset state when closing
            setTimeout(() => {
                setView("templates");
                form.reset();
            }, 300);
        }
        setOpen(newOpen);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!isConnected || !address || !publicClient) {
            toast.error("Please connect your wallet first");
            return;
        }

        setIsSubmitting(true);

        try {
            // Placeholder group address (since groups aren't on-chain yet)
            const fakeGroupAddress = "0x0000000000000000000000000000000000000001";

            // 1. Deploy Contract
            toast.loading("Please confirm transaction...", { id: "create-fund" });
            const hash = await createGroupFund(address, fakeGroupAddress, []);

            toast.loading("Waiting for confirmation...", { id: "create-fund" });

            // 2. Wait for Receipt
            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            // 3. Parse Logs
            let deployedAddress: string | null = null;
            for (const log of receipt.logs) {
                try {
                    const decoded = decodeEventLog({
                        abi: GROUP_FUND_FACTORY_ABI,
                        data: log.data,
                        topics: log.topics,
                    });
                    if (decoded.eventName === "GroupFundDeployed") {
                        deployedAddress = decoded.args.groupFund;
                        break;
                    }
                } catch {
                    // Ignore logs that don't match our ABI
                }
            }

            if (!deployedAddress) {
                throw new Error("Could not find deployed contract address in logs");
            }

            // 4. Register in Backend
            toast.loading("Finalizing setup...", { id: "create-fund" });
            await createGroupPact({
                groupId: groupId,
                userAddress: address,
                contractAddress: deployedAddress,
                name: values.name,
                description: values.description,
                chainId: 5003, // Mantle Sepolia
            });

            toast.success("Group Fund created successfully!", { id: "create-fund" });
            setOpen(false);
            form.reset();
            setView("templates");
        } catch (error: unknown) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

            if (errorMessage.includes("User rejected")) {
                toast.error("Transaction rejected", { id: "create-fund" });
            } else {
                toast.error("Failed to create fund: " + errorMessage, { id: "create-fund" });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const PACT_TYPES = [
        {
            id: "group_fund",
            title: "Group Fund",
            description: "A shared treasury for pooling funds. Members can deposit, and admins can withdraw.",
            icon: Wallet,
            action: () => setView("create_fund"),
        },
        // We can add more pact types here later (e.g., Voting, Loans)
        // {
        //     id: "voting",
        //     title: "Group Voting",
        //     description: "Propose and vote on group decisions on-chain.",
        //     icon: ShieldCheck,
        //     action: () => toast.info("Coming soon!"),
        // }
    ];

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create a Pact
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="w-full sm:max-w-full h-[90vh] sm:h-auto rounded-t-xl">
                <div className="mx-auto flex h-full w-full max-w-2xl flex-col p-6">
                    <SheetHeader className="mb-6">
                        <div className="flex items-center gap-2">
                            {view !== "templates" && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="-ml-2 h-8 w-8"
                                    onClick={() => setView("templates")}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <SheetTitle>
                                {view === "templates" ? "Select a Pact Template" : "Create Group Fund"}
                            </SheetTitle>
                        </div>
                        <SheetDescription>
                            {view === "templates"
                                ? "Choose the smart contract template you want to deploy for your group."
                                : "Configure your new shared treasury."}
                        </SheetDescription>
                    </SheetHeader>

                    <ScrollArea className="h-[80vh] pr-4">
                        {view === "templates" ? (
                            <div className="grid gap-4">
                                {PACT_TYPES.map((pact) => (
                                    <Card
                                        key={pact.id}
                                        className="cursor-pointer transition-all hover:bg-accent/50 hover:border-primary/50"
                                        onClick={pact.action}
                                    >
                                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <pact.icon className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1">
                                                <CardTitle className="text-base">{pact.title}</CardTitle>
                                                <CardDescription className="mt-1">
                                                    {pact.description}
                                                </CardDescription>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                        </CardHeader>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Pact Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Holiday Fund" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Description</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="What is this fund for?"
                                                        className="min-h-[100px]"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full"
                                        size="lg"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            "Create Fund"
                                        )}
                                    </Button>
                                </form>
                            </Form>
                        )}
                    </ScrollArea>
                </div>
            </SheetContent>
        </Sheet >
    );
}
