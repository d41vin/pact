import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function normalizeAddress(address: string | null | undefined): string {
  if (!address) return "";
  // Handle XMTP format "address:inboxId" if present
  const clean = address.includes(":") ? address.split(":").pop()! : address;
  return clean.toLowerCase();
}

export function areAddressesEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeAddress(a) === normalizeAddress(b);
}
