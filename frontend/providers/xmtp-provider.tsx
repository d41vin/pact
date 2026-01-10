"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { Client } from "@xmtp/browser-sdk";
import { ReactionCodec } from "@xmtp/content-type-reaction";
import { useAppKitAccount } from "@reown/appkit/react";
import { useWalletClient } from "wagmi";
import { recoverMessageAddress } from "viem";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XmtpClient = Client<any>;

interface XmtpContextType {
    client: XmtpClient | null;
    isInitializing: boolean;
    error: string | null;
    initializeClient: () => Promise<void>;
}

const XmtpContext = createContext<XmtpContextType | undefined>(undefined);

export function XmtpProvider({ children }: { children: React.ReactNode }) {
    const [client, setClient] = useState<XmtpClient | null>(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { address } = useAppKitAccount();
    const { data: walletClient } = useWalletClient();

    // Use ref to prevent multiple simultaneous initializations
    const initializingRef = useRef(false);

    const initializeClient = useCallback(async () => {
        if (!address || !walletClient) {
            setError("Wallet not connected");
            return;
        }

        if (client || initializingRef.current) {
            return;
        }

        initializingRef.current = true;
        setIsInitializing(true);
        setError(null);

        try {
            console.log("XmtpProvider: Initializing client for address:", address);

            // WASM Check
            try {
                const wasmPath = "/bindings_wasm_bg.wasm";
                const response = await fetch(wasmPath, { method: "HEAD" });
                if (!response.ok) throw new Error("WASM missing");
            } catch (e) {
                throw new Error("XMTP WASM file missing in public folder.");
            }

            const signer = {
                type: "EOA" as const,
                getIdentifier: () => ({
                    identifier: address,
                    identifierKind: "Ethereum" as const,
                }),
                getAddress: async () => address,
                signMessage: async (message: string) => {
                    console.log("XmtpProvider: Requesting signature (EOA)...");
                    const signature = await walletClient.signMessage({
                        account: address as `0x${string}`,
                        message
                    });


                    const sigBytes = Buffer.from(signature.slice(2), 'hex');

                    if (sigBytes.length !== 65) {
                        console.warn("Non-standard signature length detected.");
                    }

                    const rootSig = signature.slice(0, 130);

                    // Try v=27
                    const sig27Hex = rootSig + "1b";
                    const addr27 = await recoverMessageAddress({ message, signature: sig27Hex as `0x${string}` });
                    if (addr27.toLowerCase() === address.toLowerCase()) {
                        sigBytes[64] = 27;
                        return sigBytes;
                    }

                    // Try v=28
                    const sig28Hex = rootSig + "1c";
                    const addr28 = await recoverMessageAddress({ message, signature: sig28Hex as `0x${string}` });
                    if (addr28.toLowerCase() === address.toLowerCase()) {
                        sigBytes[64] = 28;
                        return sigBytes;
                    }

                    throw new Error("UNSUPPORTED_SIGNER");
                }
            };

            const clientOptions = {
                env: "dev",
                codecs: [new ReactionCodec()],
                wasm: {
                    url: window.location.origin + "/bindings_wasm_bg.wasm",
                    path: "/bindings_wasm_bg.wasm"
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any;


            const xmtpClient = await Client.create(signer, clientOptions);
            setClient(xmtpClient);
            console.log("XmtpProvider: Initialization complete.");
        } catch (err: any) {
            console.error("XmtpProvider: Initialization failed:", err);
            let errorMessage = err.message || "Failed to initialize messaging";

            if (errorMessage.includes("NoVerifier") || errorMessage.includes("UNSUPPORTED_SIGNER") || errorMessage.includes("Unknown signer")) {
                errorMessage = "Messaging is currently only supported for standard wallets (MetaMask, Rabby, etc.) on Mantle. Social Login wallets are not yet supported for XMTP on this chain.";
            } else if (errorMessage.includes("NoModificationAllowedError") ||
                errorMessage.includes("Access Handles cannot be created") ||
                errorMessage.includes("Database is locked")) {
                errorMessage = "Messaging database is locked. Please close other browser tabs and try again.";
            }

            setError(errorMessage);
        } finally {
            setIsInitializing(false);
            initializingRef.current = false;
        }
    }, [address, walletClient, client]);

    return (
        <XmtpContext.Provider value={{ client, isInitializing, error, initializeClient }}>
            {children}
        </XmtpContext.Provider>
    );
}

export function useXmtp() {
    const context = useContext(XmtpContext);
    if (context === undefined) {
        throw new Error("useXmtp must be used within an XmtpProvider");
    }
    return context;
}
