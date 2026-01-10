import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { useXmtpConsent } from "./use-xmtp-consent";

/**
 * Hook to automatically sync XMTP consent with friendship status
 * Sets consent to "allowed" for all accepted friends
 */
export function useFriendshipConsentSync() {
    const { address } = useAppKitAccount();
    const { batchSetConsent, isReady } = useXmtpConsent();

    // Get current user
    const currentUser = useQuery(
        api.users.getUser,
        address ? { userAddress: address } : "skip"
    );

    // Get all friends
    const friends = useQuery(
        api.friendships.listFriends,
        currentUser ? { userId: currentUser._id } : "skip"
    );

    // Sync consent for all friends when XMTP is ready
    useEffect(() => {
        if (!isReady || !friends || friends.length === 0) return;

        const friendAddresses = friends.map((friend) => friend.userAddress);

        // Set all friends to "allowed"
        batchSetConsent(friendAddresses, "allowed");
    }, [isReady, friends, batchSetConsent]);
}

/**
 * Hook to sync consent for a single friendship change
 * Use this after accepting/declining friend requests
 */
export function useSingleFriendshipConsentSync(
    friendAddress: string | null | undefined,
    action: "allow" | "deny" | null
) {
    const { setConsent, isReady } = useXmtpConsent();

    useEffect(() => {
        if (!friendAddress || !action || !isReady) return;

        const consentState = action === "allow" ? "allowed" : "denied";
        setConsent(friendAddress, consentState);
    }, [friendAddress, action, isReady, setConsent]);
}