import { Client } from "@xmtp/browser-sdk";
import type { XmtpIdentifier } from "./types";

/**
 * Check if addresses are reachable on XMTP network
 * Returns a map of address -> boolean
 */
export async function checkXmtpReachability(
    addresses: string[]
): Promise<Map<string, boolean>> {
    try {
        const identifiers: XmtpIdentifier[] = addresses.map((addr) => ({
            identifier: addr,
            identifierKind: "Ethereum",
        }));

        return await Client.canMessage(identifiers);
    } catch (error) {
        console.error("Failed to check XMTP reachability:", error);
        return new Map();
    }
}

/**
 * Check if a single address is reachable on XMTP
 */
export async function isXmtpReachable(address: string): Promise<boolean> {
    const result = await checkXmtpReachability([address]);
    return result.get(address) || false;
}