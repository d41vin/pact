import { useState, useCallback } from "react";

const MAX_MESSAGE_LENGTH = 1000;

export function useMessageInput() {
    const [message, setMessage] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleChange = useCallback((value: string) => {
        if (value.length > MAX_MESSAGE_LENGTH) {
            setError(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`);
            return;
        }
        setError(null);
        setMessage(value);
    }, []);

    const clear = useCallback(() => {
        setMessage("");
        setError(null);
    }, []);

    const canSend = message.trim().length > 0 && !error;

    return {
        message,
        error,
        canSend,
        handleChange,
        clear,
        characterCount: message.length,
        maxLength: MAX_MESSAGE_LENGTH,
    };
}