"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Spinner } from "@/components/ui/spinner";
import SendPaymentSheet from "@/components/home/send-payment-sheet";

export default function HomePage() {
  const router = useRouter();
  const { address, isConnected, status } = useAppKitAccount();

  // Fetch the user's profile from Convex using their connected wallet address.
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

  // Show a loading state while connecting or fetching user data.
  if (status === "connecting" || user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-6 text-zinc-500" />
      </div>
    );
  }

  // If the user exists, render the home page content.
  if (user) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 pt-24 pb-32">
        <div className="mx-auto max-w-4xl">
          {/* Welcome Section */}
          <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="text-center">
              <h1 className="mb-2 text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Welcome back, {user.name}!
              </h1>
              <p className="text-slate-600">
                @{user.username}
              </p>
            </div>
          </div>

          {/* Action Buttons Container */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">
              Quick Actions
            </h2>
            <div className="flex flex-wrap justify-center gap-4">
              {/* Send Button */}
              <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
                <SendPaymentSheet />
              </div>

              {/* Placeholder for more action buttons */}
              <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
                <button className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg transition-all hover:shadow-xl">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="text-sm font-medium">Request</span>
                </button>
              </div>

              <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
                <button className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg transition-all hover:shadow-xl">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium">Split</span>
                </button>
              </div>

              <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
                <button className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg transition-all hover:shadow-xl">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm font-medium">More</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity Section - Placeholder */}
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">
              Recent Activity
            </h2>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <svg
                  className="h-6 w-6 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-sm text-slate-500">
                Your recent transactions will appear here
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // As a fallback, render nothing while redirect logic is in flight.
  return null;
}