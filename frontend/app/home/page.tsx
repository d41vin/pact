"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatMntValue } from "@/lib/format-utils";
import { useAppKitAccount } from "@reown/appkit/react";
import { useBalance } from "wagmi";
import { Spinner } from "@/components/ui/spinner";
import { MoreHorizontal, Settings } from "lucide-react";
import { motion } from "framer-motion";
import SendPaymentSheet from "@/components/home/send-payment-sheet";
import ReceivePaymentDialog from "@/components/home/receive-payment-dialog";
import RequestPaymentSheet from "@/components/home/request-payment-sheet";
import PaymentLinkSheet from "@/components/home/payment-link-sheet";
import ClaimLinkSheet from "@/components/home/claim-link-sheet";
import SplitBillSheet from "@/components/home/split-bill-sheet";
import RecentActivityFeed from "@/components/home/recent-activity-feed";
import FriendsList from "@/components/home/friends-list";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function HomePage() {
  const router = useRouter();
  const { address, isConnected, status } = useAppKitAccount();

  const user = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip",
  );

  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    if (status === "disconnected") {
      router.replace("/");
    }
    if (isConnected && user === null) {
      router.replace("/onboarding");
    }
  }, [status, isConnected, user, router]);

  useEffect(() => {
    if (!user) return;

    const firstName = user.name.split(" ")[0];
    const now = Date.now();
    const firstVisit = localStorage.getItem("pact_first_visit");

    if (!firstVisit) {
      // First time ever visiting
      setGreeting(`Welcome, ${firstName}!`);
      localStorage.setItem("pact_first_visit", now.toString());
    } else {
      const timeSinceFirstVisit = now - parseInt(firstVisit);
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;

      if (timeSinceFirstVisit < ONE_DAY_MS) {
        // Within 24 hours of first visit
        setGreeting(`Welcome back, ${firstName}.`);
      } else {
        // After 24 hours, default to time-based greeting
        const hour = new Date().getHours();
        let timeGreeting = "Good morning";
        if (hour >= 0 && hour < 3) timeGreeting = "It's late-night";
        if (hour >= 12 && hour < 18) timeGreeting = "Good afternoon";
        if (hour >= 18) timeGreeting = "Good evening";
        setGreeting(`${timeGreeting}, ${firstName}.`);
      }
    }

    // Track last visit for potential future use users might want
    localStorage.setItem("pact_last_visit", now.toString());
  }, [user]);

  const { data: balanceData } = useBalance({
    address: address as `0x${string}`,
  });
  const formattedBalance = balanceData
    ? formatMntValue(balanceData.formatted)
    : "0.00";

  if (status === "connecting" || user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-6 text-zinc-500" />
      </div>
    );
  }

  if (user) {
    return (
      <main className="min-h-screen px-4 pb-32">
        <div className="mx-auto max-w-4xl">
          {/* Welcome Section */}
          {/* Welcome Section */}
          <div className="my-8">
            <div className="relative flex items-center justify-center">
              <h1 className="text-3xl font-bold text-zinc-900 text-center">
                {greeting}
              </h1>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/settings")}
                className="absolute right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-700 shadow-md transition-all hover:bg-zinc-50 hover:shadow-lg"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </motion.button>
            </div>

            {/* Wallet Balance */}
            <div className="mt-4 flex flex-col items-center">
              <span className="text-sm font-medium text-zinc-600">Total Balance</span>
              <div className="mt-1 flex items-baseline justify-center gap-2">
                <span className="text-3xl font-bold tracking-tighter text-zinc-900">
                  {formattedBalance.split(".")[0]}
                  <span className="text-3xl text-zinc-600">
                    .{formattedBalance.split(".")[1]?.slice(0, 5) || "00"}
                  </span>
                </span>
                <span className="text-3xl font-bold text-zinc-900">MNT</span>
              </div>
            </div>
          </div>

          {/* Action Buttons Container */}
          <div className="space-y-4">
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
                <ClaimLinkSheet />
              </div>

              {/* Split Bill Button */}
              <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
                <SplitBillSheet />
              </div>

              {/* More Button */}
              <div className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)]">
                <button className="corner-squircle flex h-24 w-full flex-col items-center justify-center gap-2 rounded-[40px] bg-linear-to-br from-zinc-500 to-zinc-600 text-white shadow-lg transition-all hover:shadow-xl">
                  <MoreHorizontal className="h-6 w-6" />
                  <span className="text-sm font-medium">More</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity & Friends Tabs Section */}
          <div className="corner-squircle mt-8 rounded-[40px] border border-zinc-200 bg-white p-6 shadow-sm">
            <Tabs defaultValue="activity" className="w-full">
              <TabsList className="grid w-fit grid-cols-2 mx-auto h-auto">
                <TabsTrigger value="activity" className="px-6 py-1">Activity</TabsTrigger>
                <TabsTrigger value="friends" className="px-6 py-1">Friends</TabsTrigger>
              </TabsList>
              <TabsContent value="activity" className="mt-4">
                <RecentActivityFeed userId={user._id} />
              </TabsContent>
              <TabsContent value="friends" className="mt-4">
                <FriendsList userId={user._id} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    );
  }

  return null;
}