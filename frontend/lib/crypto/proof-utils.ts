import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { keccak256, encodePacked, hashMessage } from 'viem';

/**
 * Generate keypair for claim link
 * ⚠️ CALL THIS CLIENT-SIDE ONLY
 * ⚠️ NEVER send privateKey to server
 */
export function generateClaimKeyPair(): {
    privateKey: `0x${string}`;
    address: `0x${string}`;
} {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    return {
        privateKey,
        address: account.address,
    };
}

/**
 * Generate proof for claimer
 * Uses EIP-191 "Ethereum Signed Message" standard
 * 
 * ⚠️ SIGNATURE SCHEME (must match contract):
 * 1. Message: claimer's address (raw bytes)
 * 2. Sign with EIP-191 prefix: "\x19Ethereum Signed Message:\n32" + keccak256(address)
 * 3. Contract verifies using ECDSA.recover with toEthSignedMessageHash()
 * 
 * @param privateKey - The claim link's private key (from URL fragment)
 * @param claimerAddress - The address attempting to claim
 * @returns Signature to submit on-chain
 */
export async function generateClaimProof(
    privateKey: `0x${string}`,
    claimerAddress: `0x${string}`
): Promise<`0x${string}`> {
    const account = privateKeyToAccount(privateKey);

    // Contract checks: keccak256(abi.encodePacked(msg.sender))
    // So we must sign the HASH of the address, not the address itself
    const messageHash = keccak256(claimerAddress);

    const signature = await account.signMessage({
        message: { raw: messageHash },
    });

    return signature;
}

/**
 * Extract private key from URL fragment
 * URL format: pact.money/claim/abc123#0x1234...privatekey
 * 
 * @returns Private key or null if not present
 */
export function getPrivateKeyFromURL(): `0x${string}` | null {
    if (typeof window === 'undefined') return null;

    const hash = window.location.hash.slice(1); // Remove #

    // Validate it's a valid private key (0x + 64 hex chars)
    if (hash.match(/^0x[0-9a-fA-F]{64}$/)) {
        return hash as `0x${string}`;
    }

    return null;
}

/**
 * Create shareable claim link URL with private key
 * 
 * @param shortId - The claim link's short ID
 * @param privateKey - The claim link's private key
 * @returns Full URL with private key in fragment
 */
export function createClaimLinkURL(
    shortId: string,
    privateKey: `0x${string}`
): string {
    const origin = typeof window !== 'undefined'
        ? window.location.origin
        : 'https://pact.money';

    return `${origin}/claim/${shortId}#${privateKey}`;
}