"use client";

import { useState } from "react";
import {
  Wallet,
  Split,
  HandCoins,
  TrendingUp,
  DollarSign,
  Users,
  Plus,
  Settings,
  Check,
  X,
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
  _id: string;
  name: string;
  profileImageUrl?: string;
}

interface PactTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  category: string;
}

interface Pact {
  id: string;
  templateId: string;
  name: string;
  goal: number | null;
  members: string[];
  balance: number;
  transactions: unknown[];
  createdAt: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface MockPactsProps {
  groupId: string;
  groupName: string;
  members: Member[];
  accentColor: string;
}

// Mock pact templates
const PACT_TEMPLATES = [
  {
    id: "group-fund",
    name: "Group Fund",
    description: "Pooled savings for group expenses",
    icon: Wallet,
    color: "#3B82F6",
    category: "system",
  },
  {
    id: "expense-split",
    name: "Expense Split",
    description: "Split bills and expenses equally",
    icon: Split,
    color: "#10B981",
    category: "system",
  },
  {
    id: "loan-pool",
    name: "Loan Pool",
    description: "Internal lending with tracked repayments",
    icon: HandCoins,
    color: "#F59E0B",
    category: "system",
  },
  {
    id: "investment-club",
    name: "Investment Club",
    description: "Pool funds for group investments",
    icon: TrendingUp,
    color: "#8B5CF6",
    category: "community",
  },
];

export default function MockPacts({ members, accentColor }: MockPactsProps) {
  const [activePacts, setActivePacts] = useState<Pact[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PactTemplate | null>(
    null,
  );
  const [pactName, setPactName] = useState("");
  const [pactGoal, setPactGoal] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(),
  );

  const handleCreatePact = () => {
    if (!selectedTemplate) {
      toast.error("Please select a pact template");
      return;
    }

    if (!pactName.trim()) {
      toast.error("Please enter a pact name");
      return;
    }

    // Create mock pact
    const newPact = {
      id: Date.now().toString(),
      templateId: selectedTemplate.id,
      name: pactName,
      goal: pactGoal ? parseFloat(pactGoal) : null,
      members: Array.from(selectedMembers),
      balance: 0,
      transactions: [],
      createdAt: Date.now(),
      icon: selectedTemplate.icon,
      color: selectedTemplate.color,
    };

    setActivePacts([...activePacts, newPact]);
    toast.success(`${pactName} created successfully! (Mock)`);

    // Reset form
    setPactName("");
    setPactGoal("");
    setSelectedMembers(new Set());
    setSelectedTemplate(null);
    setCreateModalOpen(false);
  };

  const handleSelectTemplate = (template: PactTemplate) => {
    setSelectedTemplate(template);
    setPactName(template.name);
  };

  const toggleMemberSelection = (memberId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      newSelection.add(memberId);
    }
    setSelectedMembers(newSelection);
  };

  const PactCard = ({ pact }: { pact: Pact }) => {
    const Icon = pact.icon;
    const participantCount = pact.members.length;
    const progress = pact.goal ? (pact.balance / pact.goal) * 100 : 0;

    return (
      <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-md">
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundColor: pact.color }}
        />

        <div className="relative space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: pact.color }}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{pact.name}</h3>
                <p className="text-sm text-slate-500">
                  {participantCount} participant
                  {participantCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Balance */}
          <div>
            <div className="mb-1 text-sm text-slate-600">Current Balance</div>
            <div className="text-2xl font-bold text-slate-900">
              ${pact.balance.toFixed(2)}
            </div>
            {pact.goal && (
              <div className="text-sm text-slate-500">
                Goal: ${pact.goal.toFixed(2)}
              </div>
            )}
          </div>

          {/* Progress Bar (if goal exists) */}
          {pact.goal && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Progress</span>
                <span className="font-medium text-slate-900">
                  {progress.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(progress, 100)}%`,
                    backgroundColor: pact.color,
                  }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              style={{ backgroundColor: pact.color }}
              onClick={() =>
                toast.info("Mock pact - transactions not implemented")
              }
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Contribute
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() =>
                toast.info("Mock pact - view details not implemented")
              }
            >
              View Details
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Pacts</h2>
            <p className="text-slate-600">
              Financial tools for group coordination
            </p>
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            style={{ backgroundColor: accentColor }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Pact
          </Button>
        </div>

        {/* Mock Notice */}
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Settings className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="mb-1 font-semibold text-blue-900">
                Mock Pacts System
              </h3>
              <p className="text-sm text-blue-700">
                This is a mock implementation for UI testing. Pacts are stored
                locally and will not persist. Real implementation coming in
                Phase 3.
              </p>
            </div>
          </div>
        </div>

        {/* Active Pacts */}
        {activePacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
              <Wallet className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              No Active Pacts
            </h3>
            <p className="mb-4 max-w-md text-center text-sm text-slate-500">
              Create your first pact to start coordinating finances with your
              group
            </p>
            <Button
              onClick={() => setCreateModalOpen(true)}
              style={{ backgroundColor: accentColor }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Pact
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activePacts.map((pact) => (
              <PactCard key={pact.id} pact={pact} />
            ))}
          </div>
        )}
      </div>

      {/* Create Pact Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
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
              <div className="grid gap-3 sm:grid-cols-2">
                {PACT_TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate?.id === template.id;

                  return (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                        isSelected
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
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
                      {isSelected && (
                        <Check className="h-5 w-5 text-slate-900" />
                      )}
                    </button>
                  );
                })}
              </div>
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
              onClick={() => {
                setCreateModalOpen(false);
                setSelectedTemplate(null);
                setPactName("");
                setPactGoal("");
                setSelectedMembers(new Set());
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePact}
              className="flex-1"
              disabled={!selectedTemplate || !pactName.trim()}
              style={{
                backgroundColor: selectedTemplate?.color || accentColor,
              }}
            >
              Create Pact
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
