"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useXmtpClient } from "@/hooks/use-xmtp-client";
import { useFriendshipConsentSync } from "@/hooks/use-friendship-consent-sync";
import ConversationList from "./conversation-list";
import ConversationView from "./conversation-view";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";


export default function MessagesLayout() {
    const isMobile = useIsMobile();
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedConversation = searchParams.get("conversation");
    const startAddress = searchParams.get("start");
    const { client, isInitializing, error, initializeClient } = useXmtpClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [autoStartUser, setAutoStartUser] = useState<any>(null);
    const [isAutoStarting, setIsAutoStarting] = useState(false);


    // Fetch user if startAddress is provided
    const startUser = useQuery(
        api.users.getUser,
        startAddress ? { userAddress: startAddress } : "skip"
    );

    // Sync XMTP consent for all friends
    useFriendshipConsentSync();

    // Initialize XMTP client on mount
    useEffect(() => {
        initializeClient();
    }, [initializeClient]);

    // Handle auto-start from query param
    useEffect(() => {
        if (startUser && !autoStartUser && startAddress) {
            // Set user data needed for the loading state
            const userData = {
                userId: startUser._id,
                userAddress: startUser.userAddress,
                name: startUser.name,
                username: startUser.username,
                profileImageUrl: startUser.profileImageUrl,
            };

            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAutoStartUser(userData);
            setIsAutoStarting(true);

            // Clean up the URL
            const params = new URLSearchParams(searchParams.toString());
            params.delete("start");
            router.replace(`/messages?${params.toString()}`);
        }
    }, [startUser, autoStartUser, router, searchParams, startAddress]);

    // Clear auto-starting state once conversation is selected
    useEffect(() => {
        if (selectedConversation && isAutoStarting) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsAutoStarting(false);
        }
    }, [selectedConversation, isAutoStarting]);



    const handleBack = () => {
        router.push("/messages");
    };


    // Show loading state during initialization
    if (isInitializing) {
        return (
            <div className="flex h-[calc(100vh-12rem)] items-center justify-center rounded-xl border border-zinc-200 bg-white">
                <div className="flex flex-col items-center gap-4 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <div>
                        <h3 className="mb-1 font-semibold text-zinc-900">
                            Initializing Messages
                        </h3>
                        <p className="text-sm text-zinc-500">
                            Setting up secure messaging...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="flex h-[calc(100vh-12rem)] items-center justify-center rounded-xl border border-zinc-200 bg-white">
                <div className="flex flex-col items-center gap-4 text-center px-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                        <MessageCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <div>
                        <h3 className="mb-1 font-semibold text-zinc-900">
                            Failed to Initialize
                        </h3>
                        <p className="mb-4 text-sm text-zinc-500">{error}</p>
                        <Button onClick={initializeClient} variant="outline">
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Mobile: show list or conversation, not both
    if (isMobile) {
        if (selectedConversation) {
            return (
                <div className="h-[calc(100vh-10rem)]">
                    <ConversationView
                        inboxId={selectedConversation}
                        xmtpClient={client}
                        onBack={handleBack}
                    />
                </div>
            );
        }

        return (
            <div className="h-[calc(100vh-10rem)]">
                <ConversationList
                    xmtpClient={client}
                    autoStartUser={autoStartUser}
                    onAutoStartComplete={() => setAutoStartUser(null)}
                />
            </div>
        );
    }

    // Desktop: sidebar + panel layout
    return (
        <div className="flex h-[calc(100vh-12rem)] gap-4">
            <div className="w-80 shrink-0">
                <ConversationList
                    xmtpClient={client}
                    autoStartUser={autoStartUser}
                    onAutoStartComplete={() => setAutoStartUser(null)}
                />
            </div>
            <div className="flex-1">
                {selectedConversation ? (
                    <ConversationView
                        inboxId={selectedConversation}
                        xmtpClient={client}
                    />
                ) : (startAddress || autoStartUser || isAutoStarting) ? (

                    <div className="flex h-full items-center justify-center rounded-xl border border-zinc-200 bg-white">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            <div>
                                <h3 className="mb-1 font-semibold text-zinc-900">
                                    Starting Conversation
                                </h3>
                                <p className="text-sm text-zinc-500">
                                    Finding your chat with {autoStartUser?.name || "them"}...
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500">
                        <div className="text-center">
                            <MessageCircle className="mx-auto mb-4 h-12 w-12 text-zinc-300" />
                            <p>Select a conversation to start messaging</p>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}