"use client";

import { useGroupChat } from "@/hooks/use-group-chat";
import { useXmtpClient } from "@/hooks/use-xmtp-client";
import { Id } from "@/convex/_generated/dataModel";
import { GroupChatPlaceholder } from "./group-chat-placeholder";
import ConversationView from "@/components/messages/conversation-view"; // We will reuse/refactor this
import { Loader2 } from "lucide-react";

interface GroupMember {
    userAddress?: string;
    role: "admin" | "member";
    name?: string;
}

interface GroupChatTabProps {
    groupId: Id<"groups">;
    groupName: string;
    xmtpTopic?: string;
    members: GroupMember[];
    currentUserAddress?: string;
    isCreatorOrAdmin: boolean;
}

export default function GroupChatTab(props: GroupChatTabProps) {
    const {
        conversation,
        isLoading,
        syncStatus,
        isReady,
        isGated,
        isUnsupported,
    } = useGroupChat(props);

    const { initializeClient, isInitializing } = useXmtpClient();

    if (isLoading || syncStatus) {
        return (
            <div className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white">
                <Loader2 className="mb-4 h-8 w-8 animate-spin text-zinc-400" />
                <p className="text-zinc-500">
                    {syncStatus || "Loading secure chat..."}
                </p>
            </div>
        );
    }

    if (isUnsupported) {
        return <GroupChatPlaceholder state="unsupported" />;
    }

    if (isGated) {
        return (
            <GroupChatPlaceholder
                state="gated"
                isInitializing={isInitializing}
                onEnable={initializeClient}
            />
        );
    }

    if (!conversation) {
        // This state happens if:
        // 1. User is enabled (Ready)
        // 2. But the group hasn't appeared in their list yet (sync lag)
        // 3. Or they are not an Admin so they can't create it
        return (
            <div className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-center">
                <Loader2 className="mb-4 h-8 w-8 animate-spin text-zinc-400" />
                <h3 className="mb-2 text-lg font-semibold text-zinc-900">
                    Syncing Group Membership...
                </h3>
                <p className="text-zinc-500">
                    Waiting to be added to the secure group. This usually happens automatically when an admin visits.
                </p>
            </div>
        );
    }

    // Active Chat State
    return (
        <div className="h-[600px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            {/* We need to ensure ConversationView handles Group objects correctly */}
            {/* For now, we pass the conversation object. */}
            {/* We might need to wrap this in a provider or adjust the component if it strictly expects DMs */}
            <ConversationView
                peerAddress={props.groupId} // Hack: Passing groupId as peerAddress to force uniqueness if needed
                conversation={conversation} // Passing the actual conversation object
                isGroup={true}
            />
        </div>
    );
}
