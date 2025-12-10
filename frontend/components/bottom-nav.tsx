"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Users, User } from "lucide-react";
import { motion } from "framer-motion";
import { useAppKitAccount } from "@reown/appkit/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const tabs = [
  { value: "home", icon: Home, label: "Home" },
  { value: "groups", icon: Users, label: "Groups" },
  { value: "profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { address, isConnected } = useAppKitAccount();

  // Fetch user data from Convex using the connected wallet address
  const user = useQuery(api.users.getUser, {
    userAddress: address || "",
  });

  const getActiveTab = () => {
    // Updated to handle dynamic profile routes
    if (pathname.startsWith("/@")) {
      return "profile";
    }
    const tab = tabs.find((t) => pathname.startsWith(`/${t.value}`));
    return tab?.value ?? "home";
  };

  const handleTabChange = (value: string) => {
    if (value === "profile" && user) {
      router.push(`/${user.username}`);
    } else {
      router.push(`/${value}`);
    }
  };

  const activeTab = getActiveTab();

  // Don't render the bottom nav if the user is not connected
  if (!isConnected) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-0 bottom-6 left-0 z-50 px-4">
      <div className="pointer-events-auto mx-auto max-w-md">
        <div className="bg-background/95 border-border/50 w-full rounded-full corner-squircle  border p-1.5 shadow-xl backdrop-blur-lg">
          <div className="relative grid grid-cols-3 gap-1">
            {/* Animated background pill */}
            <motion.div
              className="bg-primary absolute inset-y-0 rounded-full corner-squircle "
              initial={false}
              animate={{
                x: `calc((100% + 4px) * ${tabs.findIndex(
                  (tab) => tab.value === activeTab,
                )})`,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              style={{
                width: `calc(${100 / tabs.length}% - ${((tabs.length - 1) / tabs.length) * 4
                  }px)`,
              }}
            />

            {/* Tab buttons */}
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;

              return (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  aria-label={`Navigate to ${tab.label}`}
                  aria-pressed={isActive}
                  className="relative z-10 h-14 cursor-pointer rounded-full corner-squircle transition-colors duration-200"
                >
                  <div
                    className={`flex flex-col items-center justify-center gap-1 transition-colors duration-200 ${isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[11px] font-medium">{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
