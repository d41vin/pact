"use client";

import BlockedUsersManagement from "./blocked-user-management";

export default function PrivacySettings() {
  return (
    <div className="p-8">
      <h2 className="mb-6 text-2xl font-bold text-slate-900">
        Privacy & Security
      </h2>

      <div className="space-y-8">
        <BlockedUsersManagement />

        {/* Placeholder for future privacy settings */}
        <div className="border-t border-slate-200 pt-8">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Privacy</h3>
          <div className="text-sm text-slate-500">
            Additional privacy settings coming soon
          </div>
        </div>
      </div>
    </div>
  );
}
