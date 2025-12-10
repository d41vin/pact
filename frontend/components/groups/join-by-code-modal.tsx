"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link as LinkIcon, Loader2, Check } from "lucide-react";
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
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";

interface JoinByCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function JoinByCodeModal({
  open,
  onOpenChange,
}: JoinByCodeModalProps) {
  const router = useRouter();
  const { address } = useAppKitAccount();
  const [code, setCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [validationStep, setValidationStep] = useState<
    "input" | "validating" | "preview"
  >("input");

  // Query to validate code
  const validation = useQuery(
    api.inviteCodes.validateCode,
    code.length === 8 ? { code: code.toUpperCase() } : "skip",
  );

  // Mutation
  const joinWithCode = useMutation(api.inviteCodes.joinWithCode);

  const handleCodeChange = (value: string) => {
    const cleaned = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);
    setCode(cleaned);

    if (cleaned.length === 8) {
      setValidationStep("validating");
    } else {
      setValidationStep("input");
    }
  };

  const handleJoin = async () => {
    if (!address || !code) return;

    setIsJoining(true);

    try {
      const groupId = await joinWithCode({
        userAddress: address,
        code: code.toUpperCase(),
      });

      toast.success("Successfully joined group!");

      // Reset and close
      setCode("");
      setValidationStep("input");
      onOpenChange(false);

      // Navigate to group
      router.push(`/groups/${groupId}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to join group");
    } finally {
      setIsJoining(false);
    }
  };

  // Show preview when validation succeeds
  if (validation && validation.valid && validationStep === "validating") {
    setValidationStep("preview");
  }

  const showPreview = validationStep === "preview" && validation?.valid;
  const showError = code.length === 8 && validation && !validation.valid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Join Group with Code
          </DialogTitle>
          <DialogDescription>
            Enter an invite code to join a group
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Code Input */}
          <div className="space-y-2">
            <Label htmlFor="code">Invite Code</Label>
            <div className="relative">
              <Input
                id="code"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="ABCD1234"
                className="font-mono text-lg tracking-wider uppercase"
                maxLength={8}
                autoComplete="off"
                autoFocus
              />
              {code.length === 8 && (
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  {validationStep === "validating" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  ) : showPreview ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : showError ? (
                    <span className="text-sm text-red-600">✕</span>
                  ) : null}
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-500">{code.length}/8 characters</p>
          </div>

          {/* Error Message */}
          {showError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {validation.reason || "Invalid code"}
            </div>
          )}

          {/* Group Preview */}
          {showPreview && validation.group && (
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-900">
                  Valid Code!
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {validation.group.imageType === "emoji" ? (
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                      style={{
                        backgroundColor: validation.group.accentColor + "20",
                      }}
                    >
                      {validation.group.imageOrEmoji}
                    </div>
                  ) : (
                    <div className="h-12 w-12 overflow-hidden rounded-full">
                      <img
                        src={validation.group.imageOrEmoji}
                        alt={validation.group.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-zinc-900">
                      {validation.group.name}
                    </div>
                    {validation.group.description && (
                      <div className="text-sm text-zinc-600">
                        {validation.group.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 border-t border-zinc-200 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setCode("");
                setValidationStep("input");
                onOpenChange(false);
              }}
              className="flex-1"
              disabled={isJoining}
            >
              Cancel
            </Button>
            <Button
              onClick={handleJoin}
              className="flex-1"
              disabled={!showPreview || isJoining}
            >
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Group"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
