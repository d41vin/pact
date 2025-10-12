// todo:
// 1. make it squircle
// 2. make it mobile responsive, and test it
// 3. if user is not connected then don't show it

"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Users, User } from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { value: "home", icon: Home, label: "Home" },
  { value: "groups", icon: Users, label: "Groups" },
  { value: "profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveTab = () => {
    const tab = tabs.find((t) => pathname.startsWith(`/${t.value}`));
    return tab?.value ?? "home";
  };

  const handleTabChange = (value: string) => {
    router.push(`/${value}`);
  };

  const activeTab = getActiveTab();

  return (
    <div className="pointer-events-none fixed right-0 bottom-6 left-0 z-50 px-4">
      <div className="pointer-events-auto mx-auto max-w-md">
        <div className="bg-background/95 border-border/50 w-full rounded-full border p-1.5 shadow-xl backdrop-blur-lg">
          <div className="relative grid grid-cols-3 gap-1">
            {/* Animated background pill */}
            <motion.div
              className="bg-primary absolute inset-y-0 rounded-full"
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
                width: `calc(${100 / tabs.length}% - ${
                  ((tabs.length - 1) / tabs.length) * 4
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
                  className="relative z-10 h-14 cursor-pointer rounded-full transition-colors duration-200"
                >
                  <div
                    className={`flex flex-col items-center justify-center gap-1 transition-colors duration-200 ${
                      isActive
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
