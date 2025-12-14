"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Spinner } from "@/components/ui/spinner";
import SendPaymentSheet from "@/components/home/send-payment-sheet";
import ReceivePaymentDialog from "@/components/home/receive-payment-dialog";
import RequestPaymentSheet from "@/components/home/request-payment-sheet";
import PaymentLinkSheet from "@/components/home/payment-link-sheet";
import { Link2, Split, MoreHorizontal, Settings } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { address, isConnected, status } = useAppKitAccount();

  const user = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip"
  );

  useEffect(() => {
    if (status === "disconnected") {
      router.replace("/");
    }
    if (isConnected && user === null) {
      router.replace("/onboarding");
    }
  }, [status, isConnected, user, router]);

  if (status === "connecting" || user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-6 text-zinc-500" />
      </div>
    );
  }

  if (user) {
    return (
      <main className="min-h-screen bg-linear-to-b from-zinc-50 to-white px-4 pb-32 pt-8">
        <div className="mx-auto max-w-4xl">
          {/* Welcome Section */}
          <div className="relative mb-8 rounded-[40px] corner-squircle border border-zinc-200 bg-white p-6 shadow-sm">
            <button
              onClick={() => router.push("/settings")}
              className="absolute right-8 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
            <div className="text-center">
              <h1 className="mb-2 bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent">
                Welcome back, {user.name}!
              </h1>
              <p className="text-zinc-600">@{user.username}</p>
            </div>
          </div>

          {/* Action Buttons Container */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900">
              Quick Actions
            </h2>
            <div className="flex flex-wrap justify-center gap-4">
              {/* Send Button */}
              <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
                <SendPaymentSheet />
              </div>

              {/* Receive Button */}
              <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
                <ReceivePaymentDialog />
              </div>

              {/* Request Button */}
              <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
                <RequestPaymentSheet />
              </div>

              {/* Payment Link Button */}
              <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
                <PaymentLinkSheet />
              </div>

              {/* Claim Link Button */}
              <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
                <button className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-[40px] corner-squircle bg-linear-to-br from-pink-500 to-pink-600 text-white shadow-lg transition-all hover:shadow-xl">
                  <Link2 className="h-6 w-6" />
                  <span className="text-sm font-medium">Claim Link</span>
                </button>
              </div>

              {/* Split Bill Button */}
              <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
                <button className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-[40px] corner-squircle bg-linear-to-br from-teal-500 to-teal-600 text-white shadow-lg transition-all hover:shadow-xl">
                  <Split className="h-6 w-6" />
                  <span className="text-sm font-medium">Split Bill</span>
                </button>
              </div>

              {/* More Button */}
              <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
                <button className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-[40px] corner-squircle bg-linear-to-br from-zinc-500 to-zinc-600 text-white shadow-lg transition-all hover:shadow-xl">
                  <MoreHorizontal className="h-6 w-6" />
                  <span className="text-sm font-medium">More</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity Section - Placeholder */}
          <div className="mt-8 rounded-[40px] corner-squircle border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-zinc-900">
              Recent Activity
            </h2>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                <svg
                  className="h-6 w-6 text-zinc-400"
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
              <p className="text-sm text-zinc-500">
                Your recent transactions will appear here
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return null;
}