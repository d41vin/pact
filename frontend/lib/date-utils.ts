import { formatDistanceToNow, format } from "date-fns";

/**
 * Format timestamp as relative time (e.g., "5 minutes ago", "2 hours ago")
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted relative time string
 *
 * @example
 * formatTimeAgo(Date.now() - 300000) // "5 minutes ago"
 * formatTimeAgo(Date.now() - 7200000) // "2 hours ago"
 */
export function formatTimeAgo(timestamp: number): string {
  return formatDistanceToNow(timestamp, {
    addSuffix: true,
    includeSeconds: true,
  });
}

/**
 * Format timestamp as full date with time
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "Dec 1, 2023, 2:30 PM")
 *
 * @example
 * formatFullDate(1701446400000) // "Dec 1, 2023, 2:30 PM"
 */
export function formatFullDate(timestamp: number): string {
  return format(timestamp, "MMM d, yyyy, h:mm a");
}

/**
 * Format wallet address for display (truncated)
 *
 * @param address - Full wallet address
 * @returns Truncated address (e.g., "0x1234...5678")
 *
 * @example
 * formatAddress("0x1234567890abcdef1234567890abcdef12345678") // "0x1234...5678"
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format timestamp as short date (without time)
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "Dec 1, 2023")
 *
 * @example
 * formatShortDate(1701446400000) // "Dec 1, 2023"
 */
export function formatShortDate(timestamp: number): string {
  return format(timestamp, "MMM d, yyyy");
}

/**
 * Format expiry timestamp with status check
 *
 * @param timestamp - Unix timestamp in milliseconds (optional)
 * @returns "Never" if no timestamp, "Expired" if past, or formatted date
 *
 * @example
 * formatExpiry(undefined) // "Never"
 * formatExpiry(Date.now() - 1000) // "Expired"
 * formatExpiry(Date.now() + 86400000) // "Dec 2, 2023, 2:30 PM"
 */
export function formatExpiry(timestamp?: number): string {
  if (!timestamp) return "Never";

  const now = Date.now();
  if (timestamp < now) return "Expired";

  return format(timestamp, "MMM d, yyyy, h:mm a");
}

/**
 * Format amount to MNT with appropriate decimal places
 * Handles both wei (BigInt string) and ether (decimal string) formats
 *
 * @param amount - Amount as string (can be wei or ether)
 * @returns Formatted amount string (e.g., "0.001 MNT", "1.5 MNT")
 *
 * @example
 * formatAmount("1000000000000000") // "0.001 MNT" (wei)
 * formatAmount("0.001") // "0.001 MNT" (ether)
 * formatAmount("1.5") // "1.5000 MNT" (ether)
 */
export function formatAmount(amount: string): string {
  // Check if it's already in ether format (contains decimal point or is small)
  const isEther = amount.includes(".") || parseFloat(amount) < 1000;

  let ether: number;
  if (isEther) {
    // Already in ether format
    ether = parseFloat(amount);
  } else {
    // In wei format - convert to ether
    const wei = BigInt(amount);
    ether = Number(wei) / 1e18;
  }

  // Format with appropriate decimal places
  if (ether >= 1) {
    return `${ether.toFixed(4)} MNT`;
  } else if (ether >= 0.0001) {
    return `${ether.toFixed(6)} MNT`;
  } else if (ether === 0) {
    return `0 MNT`;
  } else {
    return `${ether.toExponential(2)} MNT`;
  }
}
