import { useXmtp } from "@/providers/xmtp-provider";

/**
 * Hook to access the persistent XMTP client
 * Consumes the XmtpProvider context
 */
export function useXmtpClient() {
    const { client, isInitializing, error, initializeClient } = useXmtp();

    return {
        client,
        isInitializing,
        error,
        initializeClient,
    };
}