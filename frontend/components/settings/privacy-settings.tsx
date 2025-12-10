"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import BlockedUsersManagement from "./blocked-user-management";

export default function PrivacySettings() {
  const { address } = useAppKitAccount();

  const currentUser = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip"
  );

  const updatePrivacy = useMutation(api.users.updateRequestPrivacy);

  const [isUpdating, setIsUpdating] = useState(false);

  const requestPrivacy = currentUser?.requestPrivacy || "anyone";

  const handlePrivacyChange = async (value: string) => {
    if (!address || isUpdating) return;

    setIsUpdating(true);
    try {
      await updatePrivacy({
        userAddress: address,
        privacy: value as "anyone" | "friends_only",
      });
      toast.success("Privacy settings updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update settings");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-8">
      <h2 className="mb-6 text-2xl font-bold text-zinc-900">
        Privacy & Security
      </h2>

      <div className="space-y-8">
        {/* Payment Request Privacy */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-zinc-900">
            Payment Request Privacy
          </h3>
          <p className="mb-4 text-sm text-zinc-600">
            Control who can send you payment requests
          </p>

          <RadioGroup
            value={requestPrivacy}
            onValueChange={handlePrivacyChange}
            disabled={isUpdating}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50">
              <RadioGroupItem value="anyone" id="anyone" className="mt-0.5" />
              <div className="flex-1">
                <Label
                  htmlFor="anyone"
                  className="cursor-pointer font-medium text-zinc-900"
                >
                  Anyone
                </Label>
                <p className="mt-1 text-sm text-zinc-500">
                  Any Pact user can send you payment requests
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50">
              <RadioGroupItem
                value="friends_only"
                id="friends_only"
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label
                  htmlFor="friends_only"
                  className="cursor-pointer font-medium text-zinc-900"
                >
                  Friends Only
                </Label>
                <p className="mt-1 text-sm text-zinc-500">
                  Only your friends can send you payment requests
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <div className="border-t border-zinc-200" />

        {/* Blocked Users */}
        <BlockedUsersManagement />

        {/* Placeholder for future privacy settings */}
        <div className="border-t border-zinc-200 pt-8">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900">
            Additional Privacy
          </h3>
          <div className="text-sm text-zinc-500">
            More privacy settings coming soon
          </div>
        </div>
      </div>
    </div>
  );
}