"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, X, Users, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { toast } from "sonner";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (groupId: string) => void;
}

const PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#10b981", // green
  "#3b82f6", // blue
  "#8b5cf6", // purple
];

export default function CreateGroupModal({
  open,
  onOpenChange,
  onCreated,
}: CreateGroupModalProps) {
  const { address } = useAppKitAccount();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accentColor, setAccentColor] = useState(PALETTE[4]);
  const [emoji, setEmoji] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createGroup = useMutation(api.groups.createGroup);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setEmoji(""); // clear emoji if image selected
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewUrl(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreate = async () => {
    if (!address) return;
    if (!name.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    if (!emoji && !imageFile) {
      toast.error("Please choose an image or an emoji for your group");
      return;
    }

    setIsLoading(true);
    try {
      let imageId: any | undefined = undefined;
      if (imageFile) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": imageFile.type },
          body: imageFile,
        });
        const { storageId } = await result.json();
        imageId = storageId;
      }

      const groupId = await createGroup({
        userAddress: address,
        name: name.trim(),
        description: description.trim() || undefined,
        accentColor,
        imageId,
        emoji: emoji || undefined,
        privacy: "public",
        joinMethod: "invite",
      });

      toast.success("Group created!");
      onOpenChange(false);
      setName("");
      setDescription("");
      setEmoji("");
      setImageFile(null);
      setPreviewUrl(undefined);
      if (onCreated) onCreated(groupId as unknown as string);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create group");
    } finally {
      setIsLoading(false);
    }
  };

  const hasRequired = !!name.trim() && (!!emoji || !!imageFile);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
          <DialogDescription>
            Set up your group details and invite friends
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Image or Emoji */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-white shadow-lg ring-2 ring-slate-200">
                {previewUrl ? (
                  <AvatarImage src={previewUrl} alt={name || "Group"} />
                ) : (
                  <AvatarFallback
                    className="text-3xl font-semibold text-white"
                    style={{
                      backgroundColor: accentColor,
                    }}
                  >
                    {emoji || <Users className="h-8 w-8" />}
                  </AvatarFallback>
                )}
              </Avatar>
              {previewUrl && (
                <button
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {previewUrl ? "Change Photo" : "Upload Photo"}
              </Button>
              <Input
                placeholder="🙂"
                value={emoji}
                onChange={(e) => {
                  setEmoji(e.target.value.slice(0, 2));
                  if (e.target.value) setPreviewUrl(undefined);
                }}
                className="w-20 text-center"
              />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="groupName">Name</Label>
            <Input
              id="groupName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekend Trip"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="groupDescription">Description</Label>
            <Textarea
              id="groupDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional. Max 300 characters"
              maxLength={300}
            />
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <Label>Accent Color</Label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setAccentColor(c)}
                  className={`h-8 w-8 rounded-full border-2 ${accentColor === c ? "ring-2 ring-offset-2" : ""}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} className="flex-1" disabled={!hasRequired || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Group"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
