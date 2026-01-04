"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Spinner } from "@/components/ui/spinner";

export default function RootPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { address, isConnected, status } = useAppKitAccount();

  // Conditionally query for the user only when we have a connected address
  // AND we're not on a payment link page
  const isPaymentLinkPage = pathname?.startsWith("/pay/");

  const user = useQuery(
    api.users.getUser,
    address && !isPaymentLinkPage ? { userAddress: address } : "skip",
  );

  // This useEffect handles redirects based on auth state
  // BUT it should NOT run on payment link pages
  useEffect(() => {
    // Skip all redirect logic if we're on a payment link page
    if (isPaymentLinkPage) {
      return;
    }

    // Only proceed if the user is fully connected and we have a definitive
    // answer from our database (user is either an object or null)
    if (isConnected && user !== undefined) {
      if (user === null) {
        // If the user is connected but we found no profile, they are a new user
        // Send them to onboarding
        router.replace("/onboarding");
      } else {
        // If the user is connected AND we found a profile, they are a returning user
        // Send them to the home page
        router.replace("/home");
      }
    }
  }, [isConnected, user, router, isPaymentLinkPage]);

  // If we're on a payment link page, don't show anything here
  // (the payment link page itself will render)
  if (isPaymentLinkPage) {
    return null;
  }

  // If the user is connected but we're still waiting for the database query to finish,
  // show a loading spinner
  if (isConnected && user === undefined) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  // If the user is not connected, show the default landing page content
  return (
    <div className="grid min-h-screen grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 p-8 pb-20 font-sans sm:p-20">
      <main className="row-start-2 flex flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold">Pact</h1>
        <p className="text-lg text-zinc-600 dark:text-gray-300">
          Your all-in-one finance app on Mantle.
        </p>
        <appkit-button />
      </main>
    </div>
  );
}