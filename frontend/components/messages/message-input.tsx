"use client";

import { useMessageInput } from "@/hooks/use-message-input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MessageInputProps {
    onSend: (message: string) => Promise<boolean>;
    isSending?: boolean;
    disabled?: boolean;
}

export default function MessageInput({
    onSend,
    isSending = false,
    disabled = false,
}: MessageInputProps) {
    const { message, error, canSend, handleChange, clear, characterCount, maxLength } =
        useMessageInput();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canSend || isSending || disabled) return;

        const success = await onSend(message);

        if (success) {
            clear();
        } else {
            toast.error("Failed to send message");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Submit on Enter (without Shift)
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="border-t border-zinc-200 bg-white p-4">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <div className="flex-1">
                    <Textarea
                        value={message}
                        onChange={(e) => handleChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        disabled={disabled || isSending}
                        className="min-h-[44px] max-h-[120px] resize-none"
                        rows={1}
                    />
                    {error && (
                        <p className="mt-1 text-xs text-red-600">{error}</p>
                    )}
                    {characterCount > maxLength * 0.8 && (
                        <p className="mt-1 text-xs text-zinc-500">
                            {characterCount}/{maxLength}
                        </p>
                    )}
                </div>
                <Button
                    type="submit"
                    disabled={!canSend || isSending || disabled}
                    className="h-11 rounded-xl corner-squircle px-4"
                >
                    {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </Button>
            </form>
        </div>
    );
}