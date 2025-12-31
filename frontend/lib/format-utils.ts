import { formatEther } from "viem";

/**
 * Internal helper to format a numeric string for MNT display.
 * - Always shows at least 2 decimal places.
 * - Shows up to 18 decimal places if needed.
 * - Trims unnecessary trailing zeros beyond 2 decimals.
 * - Uses en-US locale for consistent dot decimal separators.
 */
export function formatMntValue(value: string): string {
    const num = parseFloat(value);
    // Fallback for invalid inputs
    if (isNaN(num)) return "0.00";

    return num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 18,
    });
}

/**
 * Formats a Wei amount to MNT.
 * Input must be strictly in Wei (integer string or bigint).
 * Does not guess units.
 *
 * @param wei - The amount in Wei (e.g. from contract).
 * @returns Formatted MNT string (e.g. "1.50 MNT")
 */
export function formatWeiToMnt(wei: string | bigint): string {
    // viem's formatEther safely handles bigint and string integers
    const ether = formatEther(typeof wei === "string" ? BigInt(wei) : wei);
    return `${formatMntValue(ether)} MNT`;
}

/**
 * Formats an Ether amount to MNT.
 * Input must be in Ether (e.g. "1.5" or 1.5).
 * Does not guess units.
 *
 * @param ether - The amount in Ether. Strings are preferred to preserve precision.
 * @returns Formatted MNT string (e.g. "1.50 MNT")
 */
export function formatEtherToMnt(ether: string | number): string {
    const etherStr = typeof ether === "number" ? ether.toString() : ether;
    return `${formatMntValue(etherStr)} MNT`;
}

/**
 * Format wallet address for display (truncated)
 *
 * @param address - Full wallet address
 * @returns Truncated address (e.g., "0x1234...5678")
 */
export function formatAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Smartly formats a value that could be either Wei or Ether (MNT).
 * Used for "Recent Activity" where legacy data might mix units.
 * Heuristic:
 * - If value contains ".", assume Ether (MNT).
 * - If value > 1 trillion (1e12), assume Wei.
 * - Otherwise, assume Ether (MNT).
 */
export function formatSmartMnt(value: string | number): string {
    const strVal = value.toString();

    // If it has a decimal point, it's definitely Ether (Wei is integer)
    if (strVal.includes(".")) {
        return formatEtherToMnt(strVal);
    }

    try {
        const bigVal = BigInt(strVal);
        // Threshold: 1 Trillion.
        // 1 Trillion Wei = 0.000001 MNT.
        // 1 Trillion MNT > Total Supply of MNT (~6B).
        // So anything > 1e12 is definitely Wei.
        if (bigVal > BigInt(1000000000000)) {
            return formatWeiToMnt(bigVal);
        }
    } catch {
        // If BigInt conversion fails (shouldn't if regex passed, but safety first),
        // fallback to standard formatEtherToMnt
    }

    return formatEtherToMnt(strVal);
}
