import { formatDistanceToNow, format } from "date-fns";

/**
 * Format timestamp as relative time (e.g., "5 minutes ago", "2 hours ago")
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted relative time string
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
 */
export function formatFullDate(timestamp: number): string {
  return format(timestamp, "MMM d, yyyy, h:mm a");
}


/**
 * Format timestamp as short date (without time)
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "Dec 1, 2023")
 */
export function formatShortDate(timestamp: number): string {
  return format(timestamp, "MMM d, yyyy");
}

/**
 * Format expiry timestamp with status check
 *
 * @param timestamp - Unix timestamp in milliseconds (optional)
 * @returns "Never" if no timestamp, "Expired" if past, or formatted date
 */
export function formatExpiry(timestamp?: number): string {
  if (!timestamp) return "Never";

  const now = Date.now();
  if (timestamp < now) return "Expired";

  return format(timestamp, "MMM d, yyyy, h:mm a");
}
