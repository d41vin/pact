/**
 * Convert JavaScript Date to Unix timestamp in SECONDS
 * (Solidity uses seconds, not milliseconds)
 */
export function dateToSeconds(date: Date): number {
    return Math.floor(date.getTime() / 1000);
}

/**
 * Convert seconds to milliseconds for JavaScript Date
 */
export function secondsToMillis(seconds: number): number {
    return seconds * 1000;
}

/**
 * Get current timestamp in SECONDS
 */
export function nowInSeconds(): number {
    return Math.floor(Date.now() / 1000);
}