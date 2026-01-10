"use client";

import { formatTimeAgo } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import MessageReactions from "./message-reactions";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface MessageBubbleProps {
    message: {
        id: string;
        content: string;
        senderInboxId: string;
        sentAt: number;
        isFromSelf: boolean;
        reactions?: Record<string, number> | Record<string, { count: number; reactors: string[]; mine: boolean }>;
    };
    reactions?: Record<string, number>;

    showTimestamp?: boolean;
    onReact?: (messageId: string, emoji: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    peerUser?: any;
}


export default function MessageBubble({
    message,
    showTimestamp = true,
    onReact,
    peerUser,
}: MessageBubbleProps) {

    const [copied, setCopied] = useState(false);

    const handleReact = (emoji: string) => {
        if (onReact) {
            onReact(message.id, emoji);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopied(true);
            toast.success("Message copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            console.error("Failed to copy:", error);
            toast.error("Failed to copy message");
        }
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    className={cn(
                        "group mb-4 flex",
                        message.isFromSelf ? "justify-end" : "justify-start"
                    )}
                >
                    <div className="flex max-w-[75%] flex-col gap-1">
                        <div
                            className={cn(
                                "rounded-2xl px-4 py-2",
                                message.isFromSelf
                                    ? "corner-squircle bg-linear-to-br from-blue-500 to-blue-600 text-white"
                                    : "bg-zinc-100 text-zinc-900"
                            )}
                        >
                            <p className="whitespace-pre-wrap break-words text-sm">
                                {message.content}
                            </p>
                            {showTimestamp && (
                                <p
                                    className={cn(
                                        "mt-1 text-xs",
                                        message.isFromSelf ? "text-blue-100" : "text-zinc-500"
                                    )}
                                >
                                    {formatTimeAgo(message.sentAt)}
                                </p>
                            )}
                        </div>

                        {/* Reactions */}
                        {onReact && (
                            <MessageReactions
                                messageId={message.id}
                                reactions={message.reactions as any}
                                onReact={handleReact}
                                peerUser={peerUser}
                            />
                        )}

                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={handleCopy}>
                    {copied ? (
                        <>
                            <Check className="mr-2 h-4 w-4 text-green-600" />
                            Copied!
                        </>
                    ) : (
                        <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Text
                        </>
                    )}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}