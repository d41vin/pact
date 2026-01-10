import { Client, ConsentEntityType, ConsentState } from "@xmtp/browser-sdk";

/**
 * Helper to clean peerInboxId (handles "address:inboxId" and "0x" prefixes)
 */
const cleanInboxId = (id: string | null | undefined) => {
    if (!id || typeof id !== 'string') return "";
    const result = id.includes(":") ? id.split(":").pop()! : id;
    return result.startsWith("0x") ? result.slice(2) : result;
};

/**
 * Helper to determine if a string is likely an Ethereum address
 */
const isAddress = (id: string | null | undefined) => {
    if (!id || typeof id !== 'string') return false;
    return /^0x[a-fA-F0-9]{40}$/.test(id);
};

/**
 * Set XMTP consent for a peer inbox ID or address
 * This allows/denies the peer to send messages
 */
export async function setXmtpConsent(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: any | null,
    peerId: string,
    state: "allowed" | "denied"

): Promise<boolean> {
    if (!client || !peerId) {
        console.warn("XMTP client or peerId missing");
        return false;
    }

    try {
        const consentState =
            state === "allowed" ? ConsentState.Allowed : ConsentState.Denied;

        // Determine if this is an address or inbox ID
        const isAddr = isAddress(peerId);
        // In this version of the SDK, we use the value directly or fallback to "address" string if enum is missing
        const entityType = isAddr ? "address" : "inbox_id";
        const cleanId = isAddr ? peerId : cleanInboxId(peerId);

        if (!cleanId) {
            console.warn("Invalid peerId provided to setXmtpConsent");
            return false;
        }

        // In XMTP v5 (MLS), consent methods are on client.preferences
        const target = client.preferences || client;

        if (typeof target.setConsentStates === "function") {
            await target.setConsentStates([
                {
                    entity: cleanId,
                    entityType: entityType as unknown as ConsentEntityType,
                    state: consentState,
                },
            ]);
        } else if (typeof target.setConsentState === "function") {

            await target.setConsentState(cleanId, entityType as unknown as ConsentEntityType, consentState);

        } else {
            console.error("XMTP client does not support consent state methods on client or client.preferences");
            return false;
        }

        console.log(`XMTP consent set to ${state} for ${isAddr ? 'address' : 'inbox'} ${cleanId}`);
        return true;
    } catch (error) {
        console.error("Failed to set XMTP consent:", error);
        return false;
    }
}

/**
 * Get XMTP consent state for a peer inbox ID or address
 */
export async function getXmtpConsent(
    client: any | null,
    peerId: string
): Promise<"allowed" | "denied" | "unknown" | null> {
    if (!client || !peerId) {
        return null;
    }

    try {
        const isAddr = isAddress(peerId);
        const entityType = isAddr ? "address" : "inbox_id";
        const cleanId = isAddr ? peerId : cleanInboxId(peerId);

        if (!cleanId) return null;

        const target = client.preferences || client;

        if (typeof target.getConsentState !== "function") {
            console.warn("XMTP client getConsentState not found on client or client.preferences");
            return null;
        }

        const state = await target.getConsentState(
            entityType as unknown as ConsentEntityType,
            cleanId
        );


        if (state === ConsentState.Allowed) return "allowed";
        if (state === ConsentState.Denied) return "denied";
        return "unknown";
    } catch (error) {
        console.error("Failed to get XMTP consent:", error);
        return null;
    }
}

/**
 * Batch set XMTP consent for multiple inbox IDs or addresses
 */
export async function batchSetXmtpConsent(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: any | null,
    ids: string[],

    state: "allowed" | "denied"
): Promise<boolean> {
    if (!client || !ids || !Array.isArray(ids) || ids.length === 0) {
        return false;
    }

    try {
        const consentState =
            state === "allowed" ? ConsentState.Allowed : ConsentState.Denied;

        const target = client.preferences || client;

        // Filter out any invalid IDs to prevent crashes in the WASM binding layer
        const records = ids
            .map((id) => {
                const isAddr = isAddress(id);
                const cleanId = isAddr ? id : cleanInboxId(id);
                if (!cleanId) return null;

                return {
                    entity: cleanId,
                    entityType: (isAddr ? "address" : "inbox_id") as unknown as ConsentEntityType,
                    state: consentState,
                };

            })
            .filter((record): record is NonNullable<typeof record> => record !== null);


        if (records.length === 0) return false;

        if (typeof target.setConsentStates === "function") {
            await target.setConsentStates(records);
        } else if (typeof target.setConsentState === "function") {
            for (const record of records) {
                await target.setConsentState(record.entity, record.entityType, record.state);
            }
        } else {
            console.error("XMTP client does not support consent state methods on client or client.preferences");
            return false;
        }

        console.log(`XMTP consent set to ${state} for ${records.length} entities`);
        return true;
    } catch (error) {
        console.error("Failed to batch set XMTP consent:", error);
        return false;
    }
}