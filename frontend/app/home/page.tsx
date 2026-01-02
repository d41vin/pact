"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatMntValue } from "@/lib/format-utils";
import { useAppKitAccount } from "@reown/appkit/react";
import { useBalance } from "wagmi";
import { Spinner } from "@/components/ui/spinner";
import { MoreHorizontal, Settings } from "lucide-react";
import SendPaymentSheet from "@/components/home/send-payment-sheet";
import ReceivePaymentDialog from "@/components/home/receive-payment-dialog";
import RequestPaymentSheet from "@/components/home/request-payment-sheet";
import PaymentLinkSheet from "@/components/home/payment-link-sheet";
import ClaimLinkSheet from "@/components/home/claim-link-sheet";
import SplitBillSheet from "@/components/home/split-bill-sheet";
import RecentActivityFeed from "@/components/home/recent-activity-feed";
import FriendsList from "@/components/home/friends-list";
import FriendsModal from "@/components/home/friends-modal";
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

  useEffect(() => {
    if (status === "disconnected") {
      router.replace("/");
    }
    if (isConnected && user === null) {
      router.replace("/onboarding");
    }
  }, [status, isConnected, user, router]);

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
      <main className="min-h-screen bg-linear-to-b from-zinc-50 to-white px-4 pt-8 pb-32">
        <div className="mx-auto max-w-4xl">
          {/* Welcome Section */}
          <div className="corner-squircle relative mb-8 rounded-[40px] border border-zinc-200 bg-white p-6 shadow-sm">
            <button
              onClick={() => router.push("/settings")}
              className="absolute top-6 right-8 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
            <div className="text-center">
              <h1 className="mb-2 bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent">
                Welcome back, {user.name}!
              </h1>
              <p className="mb-6 text-zinc-600">@{user.username}</p>

              {/* Wallet Balance */}
              <div className="inline-flex items-center gap-2 rounded-[20px] border border-zinc-200 bg-zinc-50 px-6 py-3 shadow-xs">
                <div className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                </div>
                <span className="font-mono text-lg font-semibold tracking-tight text-zinc-900">
                  {formattedBalance} MNT
                </span>
              </div>

              {/* Friends Button */}
              <div className="mt-4">
                <FriendsModal userId={user._id} />
              </div>
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="activity">Recent Activity</TabsTrigger>
                <TabsTrigger value="friends">Friends</TabsTrigger>
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