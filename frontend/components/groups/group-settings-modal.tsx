"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Loader2,
  Upload,
  X,
  Image as ImageIcon,
  Smile,
  Trash2,
  Lock,
  Globe,
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Id } from "@/convex/_generated/dataModel";
import { GROUP_COLORS } from "@/lib/group-constants";
import EmojiPicker from "emoji-picker-react";

interface GroupSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: {
    _id: Id<"groups">;
    name: string;
    description: string;
    imageOrEmoji: string;
    imageType: "emoji" | "image";
    accentColor: string;
    privacy: "public" | "private";
    creatorId: Id<"users">;
  };
  isCreator: boolean;
}

export default function GroupSettingsModal({
  open,
  onOpenChange,
  group,
  isCreator,
}: GroupSettingsModalProps) {
  const router = useRouter();
  const { address } = useAppKitAccount();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [imageType, setImageType] = useState<"emoji" | "image">(
    group.imageType,
  );
  const [emoji, setEmoji] = useState(
    group.imageType === "emoji" ? group.imageOrEmoji : "🎉",
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    group.imageType === "image" ? group.imageOrEmoji : null,
  );
  const [selectedColor, setSelectedColor] = useState(
    GROUP_COLORS.find((c) => c.value === group.accentColor) || GROUP_COLORS[8],
  );
  const [privacy, setPrivacy] = useState<"public" | "private">(group.privacy);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Mutations
  const updateGroup = useMutation(api.groups.updateGroup);
  const deleteGroup = useMutation(api.groups.deleteGroup);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setImageType("image");
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEmojiSelect = (emojiData: any) => {
    setEmoji(emojiData.emoji);
    setImageType("emoji");
    setShowEmojiPicker(false);
  };

  const handleSave = async () => {
    if (!address || !name.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    if (name.length < 2 || name.length > 50) {
      toast.error("Group name must be between 2 and 50 characters");
      return;
    }

    if (description.length > 300) {
      toast.error("Description must be 300 characters or less");
      return;
    }

    setIsLoading(true);

    try {
      let imageOrEmoji = imageType === "emoji" ? emoji : group.imageOrEmoji;

      // Upload new image if selected
      if (imageType === "image" && imageFile) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": imageFile.type },
          body: imageFile,
        });
        const { storageId } = await result.json();
        const url = await fetch(`/api/convex/storage/${storageId}`).then((r) =>
          r.text(),
        );
        imageOrEmoji = url;
      }

      await updateGroup({
        userAddress: address,
        groupId: group._id,
        name: name.trim(),
        description: description.trim(),
        imageOrEmoji,
        imageType,
        accentColor: selectedColor.value,
        privacy,
      });

      toast.success("Group settings updated!");
      onOpenChange(false);

      // Reload to show changes
      window.location.reload();
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error.message || "Failed to update group settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!address || !isCreator) return;

    if (
      !confirm(
        "Are you sure you want to delete this group? This action cannot be undone.",
      )
    ) {
      return;
    }

    const confirmText = prompt('Type "DELETE" to confirm group deletion:');

    if (confirmText !== "DELETE") {
      toast.error("Group deletion cancelled");
      return;
    }

    setIsLoading(true);

    try {
      await deleteGroup({
        userAddress: address,
        groupId: group._id,
      });

      toast.success("Group deleted successfully");
      onOpenChange(false);
      router.push("/groups");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete group");
      setIsLoading(false);
    }
  };

  const hasChanges =
    name !== group.name ||
    description !== group.description ||
    imageType !== group.imageType ||
    (imageType === "emoji" && emoji !== group.imageOrEmoji) ||
    (imageType === "image" && imageFile !== null) ||
    selectedColor.value !== group.accentColor ||
    privacy !== group.privacy;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Group Settings
          </DialogTitle>
          <DialogDescription>
            Manage your group settings and preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6 py-4">
            {/* Image/Emoji Selection */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {imageType === "image" && imagePreview ? (
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-lg ring-2 ring-slate-200">
                    <img
                      src={imagePreview}
                      alt="Group"
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white text-5xl shadow-lg ring-2 ring-slate-200"
                    style={{ backgroundColor: selectedColor.light }}
                  >
                    {emoji}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Smile className="mr-2 h-4 w-4" />
                  Choose Emoji
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Upload Image
                </Button>
              </div>

              {showEmojiPicker && (
                <div className="rounded-lg border border-slate-200 shadow-lg">
                  <EmojiPicker onEmojiClick={handleEmojiSelect} />
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            {/* Group Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Group Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 50))}
                placeholder="e.g. Weekend Trip"
                maxLength={50}
              />
              <p className="text-xs text-slate-500">
                {name.length}/50 characters
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 300))}
                placeholder="What's this group about?"
                maxLength={300}
                rows={3}
              />
              <p className="text-xs text-slate-500">
                {description.length}/300 characters
              </p>
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="grid grid-cols-6 gap-2">
                {GROUP_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`h-10 w-full rounded-lg transition-all ${
                      selectedColor.value === color.value
                        ? "ring-2 ring-slate-900 ring-offset-2"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Privacy Toggle */}
            <div className="space-y-2">
              <Label>Privacy</Label>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  {privacy === "private" ? (
                    <Lock className="h-5 w-5 text-slate-600" />
                  ) : (
                    <Globe className="h-5 w-5 text-slate-600" />
                  )}
                  <div>
                    <div className="font-medium text-slate-900">
                      {privacy === "private" ? "Private Group" : "Public Group"}
                    </div>
                    <div className="text-sm text-slate-500">
                      {privacy === "private"
                        ? "Only members can see this group"
                        : "Anyone can see this group on profiles"}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={privacy === "private"}
                  onCheckedChange={(checked) =>
                    setPrivacy(checked ? "private" : "public")
                  }
                />
              </div>
            </div>
          </TabsContent>

          {/* Danger Zone */}
          <TabsContent value="danger" className="space-y-4 py-4">
            {isCreator ? (
              <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
                <div className="mb-4">
                  <h3 className="mb-2 text-lg font-semibold text-red-900">
                    Delete Group
                  </h3>
                  <p className="text-sm text-red-700">
                    Once you delete a group, there is no going back. This will
                    permanently delete the group, all members, invitations, and
                    activity history.
                  </p>
                </div>
                <Button
                  onClick={handleDelete}
                  variant="destructive"
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Group Permanently
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm text-slate-600">
                  Only the group creator can delete this group.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        {activeTab === "general" && (
          <div className="flex gap-3 border-t border-slate-200 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={!hasChanges || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
