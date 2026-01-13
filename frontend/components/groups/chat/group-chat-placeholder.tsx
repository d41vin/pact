"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Wallet, ShieldCheck, Lock, Loader2 } from "lucide-react";

interface GroupChatPlaceholderProps {
    state: "gated" | "unsupported";
    isInitializing?: boolean;
    onEnable?: () => void;
}

export function GroupChatPlaceholder({
    state,
    isInitializing = false,
    onEnable,
}: GroupChatPlaceholderProps) {
    const isGated = state === "gated";

    return (
        <div className="flex flex-col items-center justify-center py-12">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                        {isGated ? (
                            <ShieldCheck className="h-8 w-8 text-blue-500" />
                        ) : (
                            <Wallet className="h-8 w-8 text-blue-500" />
                        )}
                    </div>
                    <CardTitle>
                        {isGated ? "Enable Messaging" : "Messaging Requires a Wallet"}
                    </CardTitle>
                    <CardDescription className="pt-2">
                        {isGated
                            ? "Enable secure messaging to join this group chat. This requires a one-time signature."
                            : "Group chat currently requires a standard crypto wallet. Coming soon for social accounts."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isGated && (
                        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-600">
                            <div className="flex items-start gap-3">
                                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                                <p>End-to-end encrypted. No gas fees.</p>
                            </div>
                        </div>
                    )}
                </CardContent>
                {isGated && (
                    <CardFooter className="flex-col gap-3">
                        <Button
                            onClick={onEnable}
                            className="w-full"
                            disabled={isInitializing}
                        >
                            {isInitializing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Setting up...
                                </>
                            ) : (
                                "Enable Messaging"
                            )}
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
