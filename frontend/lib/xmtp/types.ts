/**
 * XMTP type definitions and helpers
 */

export type ConsentState = "allowed" | "denied" | "unknown";

export interface XmtpIdentifier {
    identifier: string;
    identifierKind: "Ethereum";
}

export interface XmtpMessage {
    id: string;
    content: string | any;
    senderAddress: string;
    sentAt: Date;
    contentType: any;
    conversation: {
        peerInboxId: string;
    };
}

export interface XmtpReaction {
    reference: string; // Message ID being reacted to
    action: "added" | "removed";
    content: string; // Emoji
    schema: "unicode" | "shortcode" | "custom";
}