"use client";

import UserSearch from "@/components/user-search"; 
import Notifications from "@/components/notifications"; 

export function TopNav() {
  return (
    <div className="fixed top-4 right-0 left-0 z-40 px-4">
      <div className="mx-auto max-w-4xl rounded-full border border-zinc-200/50 bg-white/80 shadow-sm backdrop-blur-lg">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Left side - Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-zinc-900">Pact</h1>
          </div>

          {/* Right side - Search, Notifications, Wallet */}
          <div className="flex items-center gap-3">
            <UserSearch />
            <Notifications />
            <appkit-button />
          </div>
        </div>
      </div>
    </div>
  );
}
