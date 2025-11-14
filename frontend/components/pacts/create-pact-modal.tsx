"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  Wallet,
  Split,
  HandCoins,
  TrendingUp,
  DollarSign,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Member {
  _id: Id<"users">;
  name: string;
  username: string;
  profileImageUrl?: string;
}

interface CreatePactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: Id<"groups">;
  groupName: string;
  members: Member[];
  accentColor: string;
}

// Icon mapper for pact templates
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  wallet: Wallet,
  split: Split,
  "hand-coins": HandCoins,
  "trending-up": TrendingUp,
};

export default function CreatePactModal({
  open,
  onOpenChange,
  groupId,
  members,
  accentColor,
}: CreatePactModalProps) {
  const router = useRouter();
  const { address } = useAppKitAccount();
  const [selectedTemplateId, setSelectedTemplateId] = useState<
    Id<"pacts"> | null
  >(null);
  const [pactName, setPactName] = useState("");
  const [pactGoal, setPactGoal] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<Id<"users">>>(
    new Set(),
  );
  const [isCreating, setIsCreating] = useState(false);

  // Fetch pact templates
  const templates = useQuery(api.pacts.listPactTemplates, { type: "group" });
  const createPactInstance = useMutation(api.pacts.createPactInstance);

  const selectedTemplate = templates?.find((t) => t._id === selectedTemplateId);

  const handleSelectTemplate = (templateId: Id<"pacts">, templateName: string) => {
    setSelectedTemplateId(templateId);
    setPactName(templateName);
  };

  const toggleMemberSelection = (memberId: Id<"users">) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      newSelection.add(memberId);
    }
    setSelectedMembers(newSelection);
  };

  const handleCreatePact = async () => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!selectedTemplateId) {
      toast.error("Please select a pact template");
      return;
    }

    if (!pactName.trim()) {
      toast.error("Please enter a pact name");
      return;
    }

    if (pactName.trim().length < 2) {
      toast.error("Pact name must be at least 2 characters");
      return;
    }

    setIsCreating(true);

    try {
      const pactInstanceId = await createPactInstance({
        userAddress: address,
        groupId,
        pactId: selectedTemplateId,
        instanceName: pactName.trim(),
        config: {
          goal: pactGoal ? parseFloat(pactGoal) : undefined,
          participants: Array.from(selectedMembers),
        },
      });

      toast.success(`${pactName} created successfully!`);

      // Reset form
      setPactName("");
      setPactGoal("");
      setSelectedMembers(new Set());
      setSelectedTemplateId(null);
      onOpenChange(false);

      // Navigate to pact detail page
      router.push(`/groups/${groupId}/pacts/${pactInstanceId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create pact";
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setPactName("");
    setPactGoal("");
    setSelectedMembers(new Set());
    setSelectedTemplateId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Pact</DialogTitle>
          <DialogDescription>
            Choose a template and configure your pact
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Selection */}
          <div className="space-y-3">
            <Label>Select Pact Template</Label>

            {templates === undefined ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : templates === null || templates.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <AlertCircle className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                <p className="text-sm text-slate-600">
                  No pact templates available
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {templates.map((template) => {
                  const Icon = iconMap[template.icon] || Wallet;
                  const isSelected = selectedTemplateId === template._id;

                  return (
                    <button
                      key={template._id}
                      onClick={() =>
                        handleSelectTemplate(template._id, template.name)
                      }
                      className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                        isSelected
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      disabled={isCreating}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: template.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 font-semibold text-slate-900">
                          {template.name}
                        </div>
                        <div className="text-sm text-slate-600">
                          {template.description}
                        </div>
                      </div>
                      {isSelected && <Check className="h-5 w-5 text-slate-900" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Configuration (if template selected) */}
          {selectedTemplate && (
            <>
              {/* Pact Name */}
              <div className="space-y-2">
                <Label htmlFor="pactName">Pact Name</Label>
                <Input
                  id="pactName"
                  value={pactName}
                  onChange={(e) => setPactName(e.target.value)}
                  placeholder="e.g. Vacation Fund"
                  disabled={isCreating}
                />
              </div>

              {/* Goal Amount (optional) */}
              <div className="space-y-2">
                <Label htmlFor="goal">Goal Amount (Optional)</Label>
                <div className="relative">
                  <DollarSign className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="goal"
                    type="number"
                    value={pactGoal}
                    onChange={(e) => setPactGoal(e.target.value)}
                    placeholder="0.00"
                    className="pl-9"
                    step="0.01"
                    min="0"
                    disabled={isCreating}
                  />
                </div>
              </div>

              {/* Member Selection */}
              <div className="space-y-2">
                <Label>Participants (Optional)</Label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                  {members.map((member) => {
                    const isSelected = selectedMembers.has(member._id);

                    return (
                      <label
                        key={member._id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMemberSelection(member._id)}
                          className="h-4 w-4 rounded border-slate-300"
                          disabled={isCreating}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profileImageUrl} />
                          <AvatarFallback
                            className="text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-slate-900">
                          {member.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500">
                  Leave empty to include all members
                </p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-slate-200 pt-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1"
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreatePact}
            className="flex-1"
            disabled={
              !selectedTemplateId || !pactName.trim() || isCreating
            }
            style={{
              backgroundColor: selectedTemplate?.color || accentColor,
            }}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Pact"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
