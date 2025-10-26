"use client";

import { useState } from "react";
import {
  Link as LinkIcon,
  Plus,
  Copy,
  Check,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  QrCode,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Id } from "@/convex/_generated/dataModel";

interface InviteCodesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: Id<"groups">;
  groupName: string;
}

export default function InviteCodesModal({
  open,
  onOpenChange,
  groupId,
  groupName,
}: InviteCodesModalProps) {
  const { address } = useAppKitAccount();
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expiresIn, setExpiresIn] = useState<string>("never");
  const [maxUses, setMaxUses] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Queries
  const codes = useQuery(api.inviteCodes.listGroupCodes, { groupId });

  // Mutations
  const createCode = useMutation(api.inviteCodes.createInviteCode);
  const deactivateCode = useMutation(api.inviteCodes.deactivateCode);
  const reactivateCode = useMutation(api.inviteCodes.reactivateCode);
  const deleteCode = useMutation(api.inviteCodes.deleteCode);

  const handleCreateCode = async () => {
    if (!address) return;

    setIsCreating(true);

    try {
      let expiresAt: number | undefined;
      if (expiresIn !== "never") {
        const hours = parseInt(expiresIn);
        expiresAt = Date.now() + hours * 60 * 60 * 1000;
      }

      const maxUsesNum = maxUses ? parseInt(maxUses) : undefined;

      const result = await createCode({
        userAddress: address,
        groupId,
        expiresAt,
        maxUses: maxUsesNum,
      });

      toast.success("Invite code created!");

      // Auto-copy the new code
      await navigator.clipboard.writeText(result.code);
      setCopiedCode(result.code);
      setTimeout(() => setCopiedCode(null), 3000);

      // Reset form
      setShowCreateForm(false);
      setExpiresIn("never");
      setMaxUses("");
    } catch (error: any) {
      toast.error(error.message || "Failed to create invite code");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setCopiedCode(null), 3000);
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  const handleToggleActive = async (
    codeId: Id<"groupInviteCodes">,
    isActive: boolean,
  ) => {
    if (!address) return;

    try {
      if (isActive) {
        await deactivateCode({ userAddress: address, codeId });
        toast.success("Code deactivated");
      } else {
        await reactivateCode({ userAddress: address, codeId });
        toast.success("Code reactivated");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update code");
    }
  };

  const handleDeleteCode = async (codeId: Id<"groupInviteCodes">) => {
    if (!address) return;

    if (!confirm("Delete this invite code? This cannot be undone.")) {
      return;
    }

    try {
      await deleteCode({ userAddress: address, codeId });
      toast.success("Code deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete code");
    }
  };

  const formatExpiry = (timestamp?: number) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = Date.now();

    if (timestamp < now) return "Expired";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Invite Codes
          </DialogTitle>
          <DialogDescription>
            Create and manage invite codes for {groupName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create Button */}
          {!showCreateForm && (
            <Button
              onClick={() => setShowCreateForm(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Code
            </Button>
          )}

          {/* Create Form */}
          {showCreateForm && (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">
                Create Invite Code
              </h3>

              {/* Expiration */}
              <div className="space-y-2">
                <Label htmlFor="expires">Expires After</Label>
                <select
                  id="expires"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="never">Never</option>
                  <option value="1">1 hour</option>
                  <option value="24">24 hours</option>
                  <option value="168">7 days</option>
                  <option value="720">30 days</option>
                </select>
              </div>

              {/* Max Uses */}
              <div className="space-y-2">
                <Label htmlFor="maxUses">Maximum Uses (Optional)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  placeholder="Unlimited"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  min="1"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateCode}
                  disabled={isCreating}
                  className="flex-1"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Code
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Codes List */}
          <div>
            <h3 className="mb-3 font-semibold text-slate-900">
              Active Codes{" "}
              {codes && `(${codes.filter((c) => c.isActive).length})`}
            </h3>

            <ScrollArea className="h-[300px]">
              {!codes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : codes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <LinkIcon className="mb-3 h-12 w-12 text-slate-300" />
                  <p className="mb-2 text-sm font-medium text-slate-900">
                    No invite codes yet
                  </p>
                  <p className="text-sm text-slate-500">
                    Create a code to share with others
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {codes.map((code) => {
                    const isExpired = !!(
                      code.expiresAt && code.expiresAt < Date.now()
                    );
                    const isMaxed = code.maxUses && code.uses >= code.maxUses;
                    const canUse = code.isActive && !isExpired && !isMaxed;

                    return (
                      <div
                        key={code._id}
                        className={`rounded-lg border p-4 transition-colors ${
                          canUse
                            ? "border-slate-200 bg-white"
                            : "border-slate-200 bg-slate-50 opacity-60"
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <code className="rounded bg-slate-100 px-2 py-1 font-mono text-lg font-semibold text-slate-900">
                                {code.code}
                              </code>
                              <button
                                onClick={() => handleCopyCode(code.code)}
                                className="text-slate-400 transition-colors hover:text-slate-600"
                              >
                                {copiedCode === code.code ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>

                            <div className="space-y-1 text-sm text-slate-500">
                              <div>
                                Created by {code.creator?.name || "Unknown"} on{" "}
                                {formatDate(code._creationTime)}
                              </div>
                              <div>Expires: {formatExpiry(code.expiresAt)}</div>
                              <div>
                                Uses: {code.uses}
                                {code.maxUses
                                  ? ` / ${code.maxUses}`
                                  : " / Unlimited"}
                              </div>
                              {!canUse && (
                                <div className="font-medium text-red-600">
                                  {isExpired
                                    ? "Expired"
                                    : isMaxed
                                      ? "Max uses reached"
                                      : "Inactive"}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                handleToggleActive(code._id, code.isActive)
                              }
                              disabled={isExpired}
                              className="rounded p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                              title={
                                code.isActive ? "Deactivate" : "Reactivate"
                              }
                            >
                              {code.isActive ? (
                                <Power className="h-4 w-4" />
                              ) : (
                                <PowerOff className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteCode(code._id)}
                              className="rounded p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
