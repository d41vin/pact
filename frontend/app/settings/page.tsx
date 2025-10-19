"use client";

import { useState } from "react";
import { User, Shield, Bell, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import AccountSettings from "@/components/settings/account-settings";
import PrivacySettings from "@/components/settings/privacy-settings";
import NotificationSettings from "@/components/settings/notification-settings";
import AboutSettings from "@/components/settings/about-settings";

type SettingsSection = "account" | "privacy" | "notifications" | "about";

const sections = [
  {
    id: "account" as SettingsSection,
    label: "Account",
    icon: User,
  },
  {
    id: "privacy" as SettingsSection,
    label: "Privacy & Security",
    icon: Shield,
  },
  {
    id: "notifications" as SettingsSection,
    label: "Notifications",
    icon: Bell,
  },
  {
    id: "about" as SettingsSection,
    label: "About",
    icon: Info,
  },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("account");

  const renderSection = () => {
    switch (activeSection) {
      case "account":
        return <AccountSettings />;
      case "privacy":
        return <PrivacySettings />;
      case "notifications":
        return <NotificationSettings />;
      case "about":
        return <AboutSettings />;
      default:
        return <AccountSettings />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-24 pb-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 text-slate-600">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors",
                      activeSection === section.id
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              {renderSection()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
