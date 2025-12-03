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
