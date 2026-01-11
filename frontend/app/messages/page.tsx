"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import MessagesLayout from "@/components/messages/messages-layout";
import { Spinner } from "@/components/ui/spinner";

export default function MessagesPage() {
    const router = useRouter();
    const { address, isConnected, status } = useAppKitAccount();

    const user = useQuery(
        api.users.getUser,
        address ? { userAddress: address } : "skip"
    );

    useEffect(() => {
        if (status === "disconnected") {
            router.replace("/");
        }
        if (isConnected && user === null) {
            router.replace("/onboarding");
        }
    }, [status, isConnected, user, router]);

    if (status === "connecting" || user === undefined) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Spinner className="size-6 text-zinc-500" />
            </div>
        );
    }

    if (user) {
        return (
            <main className="min-h-screen px-4 pb-32 pt-8">
                <div className="mx-auto max-w-4xl">
                    <MessagesLayout />
                </div>
            </main>
        );
    }

    return null;
}