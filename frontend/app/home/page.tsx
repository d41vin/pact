"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Spinner } from "@/components/ui/spinner";

export default function HomePage() {
  const router = useRouter();
  const { address, isConnected, status } = useAppKitAccount();

  // Fetch the user's profile from Convex using their connected wallet address.
  // The query will be skipped (`user` will be undefined) until `address` is available.
  const user = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip",
  );

  // Handle redirects based on auth and data state.
  useEffect(() => {
    // If wallet is disconnected, send to the login page.
    if (status === "disconnected") {
      router.replace("/");
    }

    // If connected, but the user query has returned null (no profile found),
    // they need to onboard.
    if (isConnected && user === null) {
      router.replace("/onboarding");
    }
  }, [status, isConnected, user, router]);

  // 3. Show a loading state while connecting or fetching user data.
  // This prevents flickering and ensures we don't show the page prematurely.
  if (status === "connecting" || user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-6 text-zinc-500" />
      </div>
    );
  }

  // If the user exists, render the home page content.
  // If the logic above hasn't redirected, it means `user` has data.
  if (user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Welcome to Pact,</h1>
          <p className="mt-2 mb-4 text-2xl text-gray-600 dark:text-gray-300">
            {user.name} (@{user.username})
          </p>
          <appkit-button />
          {/* Your main application dashboard will go here */}
        </div>
      </main>
    );
  }

  // As a fallback, render nothing while redirect logic is in flight.
  return null;
}
