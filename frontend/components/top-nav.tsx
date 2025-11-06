"use client";

import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import UserSearch from "@/components/user-search";
import Notifications from "@/components/notifications";

export function TopNav() {
  const router = useRouter();

  return (
    <div className="fixed top-4 right-0 left-0 z-40 px-4">
      <div className="mx-auto max-w-4xl rounded-full border border-slate-200/50 bg-white/80 shadow-sm backdrop-blur-lg">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Left side - Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-slate-900">Pact</h1>
          </div>

          {/* Right side - Search, Notifications, Settings, Wallet */}
          <div className="flex items-center gap-3">
            <UserSearch />
            <Notifications />
            <button
              onClick={() => router.push("/settings")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition-shadow hover:shadow-lg"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5 text-slate-700" />
            </button>
            <appkit-button />
          </div>
        </div>
      </div>
    </div>
  );
}
