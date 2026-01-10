import { useCallback, useEffect } from "react";
import { useXmtpClient } from "./use-xmtp-client";
import { setXmtpConsent, batchSetXmtpConsent } from "@/lib/xmtp/consent";

/**
 * Hook to manage XMTP consent state
 * Allows setting consent for addresses (allow/deny messaging)
 */
export function useXmtpConsent() {
    const { client } = useXmtpClient();

    const setConsent = useCallback(
        async (peerAddress: string, state: "allowed" | "denied") => {
            return await setXmtpConsent(client, peerAddress, state);
        },
        [client]
    );

    const batchSetConsent = useCallback(
        async (addresses: string[], state: "allowed" | "denied") => {
            return await batchSetXmtpConsent(client, addresses, state);
        },
        [client]
    );

    return {
        setConsent,
        batchSetConsent,
        isReady: !!client,
    };
}

/**
 * Hook to sync XMTP consent on mount
 * Use this to set consent when component mounts
 */
export function useSyncXmtpConsent(
    peerAddress: string | null | undefined,
    consentState: "allowed" | "denied" | null
) {
    const { setConsent, isReady } = useXmtpConsent();

    useEffect(() => {
        if (!peerAddress || !consentState || !isReady) return;

        // Set consent on mount
        setConsent(peerAddress, consentState);
    }, [peerAddress, consentState, isReady, setConsent]);
}