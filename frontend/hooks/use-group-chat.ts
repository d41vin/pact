"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useXmtp } from "@/providers/xmtp-provider";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAppKitAccount } from "@reown/appkit/react";
import { toast } from "sonner";
import { Conversation } from "@xmtp/browser-sdk";

interface GroupMember {
    userAddress?: string;
    role: "admin" | "member";
    name?: string;
}

interface UseGroupChatProps {
    groupId: Id<"groups">;
    groupName: string;
    xmtpTopic?: string;
    members: GroupMember[];
    currentUserAddress?: string;
    isCreatorOrAdmin: boolean;
}

export function useGroupChat({
    groupId,
    groupName,
    xmtpTopic,
    members,
    currentUserAddress,
    isCreatorOrAdmin,
}: UseGroupChatProps) {
    const { client, isInitializing } = useXmtp();
    const { embeddedWalletInfo } = useAppKitAccount();
    const updateGroup = useMutation(api.groups.updateGroup);

    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [syncStatus, setSyncStatus] = useState<string | null>(null);

    // States
    const isSocialLogin = !!embeddedWalletInfo;
    const isReady = !!client && !isSocialLogin;
    const isGated = !client && !isSocialLogin;
    const isUnsupported = isSocialLogin;

    const creationInProgress = useRef(false);

    // Initialize or Fetch Group
    const initializeOrFetchGroup = useCallback(async () => {
        if (!client || !currentUserAddress || creationInProgress.current) return;

        try {
            setIsLoading(true);

            // 1. If topic exists, try to load it
            if (xmtpTopic) {
                // Find existing conversation
                // NOTE: In v5 SDK, we might need to sync first
                const found = await client.conversations.list();
                const match = found.find((c) => c.topic === xmtpTopic);

                if (match) {
                    setConversation(match);
                } else {
                    // We have a topic ID but can't find it locally. 
                    // This usually means we need to sync or we haven't been added yet?
                    // For now, let's assume if we have the topic we should be able to see it 
                    // if we were added. If we weren't added, we can't see it.
                    console.warn("Topic found in Convex but not in XMTP list (yet).");
                }
            }
            // 2. If no topic and user is Admin, CREATE it
            else if (isCreatorOrAdmin && !xmtpTopic) {
                creationInProgress.current = true;
                setSyncStatus("Creating secure group...");

                // Filter valid members (excluding self, as creator is auto-added)
                const validMembers = members
                    .filter(m => m.userAddress && m.userAddress.toLowerCase() !== currentUserAddress.toLowerCase())
                    .map(m => m.userAddress!);

                // Create new Group Chat
                const newGroup = await client.conversations.newGroup(validMembers, {
                    groupName: groupName,
                    permissions: "everyone_is_admin" // Simplified permissions for now
                });

                // Save topic to Convex
                await updateGroup({
                    groupId,
                    userAddress: currentUserAddress,
                    xmtpTopic: newGroup.topic
                });

                setConversation(newGroup);
                toast.success("Secure group chat initialized!");
            }

        } catch (error) {
            console.error("Failed to init group chat:", error);
            toast.error("Failed to load group chat.");
        } finally {
            setIsLoading(false);
            setSyncStatus(null);
            creationInProgress.current = false;
        }
    }, [client, currentUserAddress, xmtpTopic, isCreatorOrAdmin, members, groupId, groupName, updateGroup]);

    // Sync Members (Admin Only)
    const syncMembers = useCallback(async () => {
        if (!conversation || !isCreatorOrAdmin || !client) return;

        try {
            setSyncStatus("Syncing members...");

            // 1. Get current XMTP members
            // @ts-expect-error - v5 SDK typing mismatch potential
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const currentXmtpAddresses = (await conversation.members()).map(m => m.inboxId);
            // Note: inboxId vs address. We need to check how to map this.
            // Actually, let's just try to add everyone who is missing. 
            // XMTP `addMembers` is usually idempotent or throws if already exists.

            // Simplified strategy: Just try to add all Convex members.
            const convexAddresses = members
                .map(m => m.userAddress)
                .filter((addr): addr is string => !!addr);

            await conversation.addMembers(convexAddresses);

        } catch (error) {
            console.error("Member sync failed (non-fatal):", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            toast.error(`Member sync failed: ${errorMessage}`);
        } finally {
            setSyncStatus(null);
        }
    }, [conversation, isCreatorOrAdmin, members, client]);

    // Initial Effect
    useEffect(() => {
        if (isReady && !conversation && !isLoading) {
            initializeOrFetchGroup();
        }
    }, [isReady, conversation, isLoading, initializeOrFetchGroup]);

    // Sync Effect (Run once when conversation loads)
    useEffect(() => {
        if (conversation && isCreatorOrAdmin) {
            // Tiny delay to not block UI
            const timer = setTimeout(() => {
                syncMembers();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [conversation, isCreatorOrAdmin, syncMembers]);

    return {
        conversation,
        isLoading,
        syncStatus,
        isReady,
        isGated,
        isUnsupported
    };
}
