"use client";

import { useState } from "react";
import { Shield, Users, FileText, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Id } from "@/convex/_generated/dataModel";

interface PermissionsSettingsProps {
  groupId: Id<"groups">;
  currentPermissions: {
    whoCanInvite: "all" | "admins" | "creator";
    whoCanCreatePacts: "all" | "admins";
  };
}

export default function PermissionsSettings({
  groupId,
  currentPermissions,
}: PermissionsSettingsProps) {
  const { address } = useAppKitAccount();
  const [whoCanInvite, setWhoCanInvite] = useState(
    currentPermissions.whoCanInvite,
  );
  const [whoCanCreatePacts, setWhoCanCreatePacts] = useState(
    currentPermissions.whoCanCreatePacts,
  );
  const [isLoading, setIsLoading] = useState(false);

  const updatePermissions = useMutation(api.groups.updatePermissions);

  const hasChanges =
    whoCanInvite !== currentPermissions.whoCanInvite ||
    whoCanCreatePacts !== currentPermissions.whoCanCreatePacts;

  const handleSave = async () => {
    if (!address || !hasChanges) return;

    setIsLoading(true);

    try {
      await updatePermissions({
        userAddress: address,
        groupId,
        whoCanInvite,
        whoCanCreatePacts,
      });

      toast.success("Permissions updated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update permissions");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">
          Group Permissions
        </h3>
        <p className="text-sm text-zinc-600">
          Control who can perform actions in this group
        </p>
      </div>

      {/* Who Can Invite */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-zinc-600" />
          <Label className="text-base font-medium">
            Who can invite members
          </Label>
        </div>

        <div className="space-y-2 pl-7">
          <label className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50">
            <input
              type="radio"
              name="whoCanInvite"
              value="creator"
              checked={whoCanInvite === "creator"}
              onChange={(e) => setWhoCanInvite(e.target.value as "creator")}
              className="h-4 w-4"
            />
            <div>
              <div className="font-medium text-zinc-900">Creator Only</div>
              <div className="text-sm text-zinc-500">
                Only the group creator can invite new members
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50">
            <input
              type="radio"
              name="whoCanInvite"
              value="admins"
              checked={whoCanInvite === "admins"}
              onChange={(e) => setWhoCanInvite(e.target.value as "admins")}
              className="h-4 w-4"
            />
            <div>
              <div className="font-medium text-zinc-900">Admins Only</div>
              <div className="text-sm text-zinc-500">
                Any admin can invite new members (recommended)
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50">
            <input
              type="radio"
              name="whoCanInvite"
              value="all"
              checked={whoCanInvite === "all"}
              onChange={(e) => setWhoCanInvite(e.target.value as "all")}
              className="h-4 w-4"
            />
            <div>
              <div className="font-medium text-zinc-900">All Members</div>
              <div className="text-sm text-zinc-500">
                Any member can invite new members
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Who Can Create Pacts */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-zinc-600" />
          <Label className="text-base font-medium">Who can create pacts</Label>
        </div>

        <div className="space-y-2 pl-7">
          <label className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50">
            <input
              type="radio"
              name="whoCanCreatePacts"
              value="admins"
              checked={whoCanCreatePacts === "admins"}
              onChange={(e) => setWhoCanCreatePacts(e.target.value as "admins")}
              className="h-4 w-4"
            />
            <div>
              <div className="font-medium text-zinc-900">Admins Only</div>
              <div className="text-sm text-zinc-500">
                Only admins can create and manage pacts (recommended)
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50">
            <input
              type="radio"
              name="whoCanCreatePacts"
              value="all"
              checked={whoCanCreatePacts === "all"}
              onChange={(e) => setWhoCanCreatePacts(e.target.value as "all")}
              className="h-4 w-4"
            />
            <div>
              <div className="font-medium text-zinc-900">All Members</div>
              <div className="text-sm text-zinc-500">
                Any member can create and manage pacts
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end border-t border-zinc-200 pt-4">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Save Permissions
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
