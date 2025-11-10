"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X, Image as ImageIcon, Smile } from "lucide-react";
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
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  GROUP_COLORS,
  DEFAULT_GROUP_COLOR,
  GroupColor,
} from "@/lib/group-constants";
import EmojiPicker from "emoji-picker-react";
import { Id } from "@/convex/_generated/dataModel";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateGroupModal({
  open,
  onOpenChange,
}: CreateGroupModalProps) {
  const router = useRouter();
  const { address } = useAppKitAccount();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] =
    useState<GroupColor>(DEFAULT_GROUP_COLOR);
  const [imageType, setImageType] = useState<"emoji" | "image">("emoji");
  const [emoji, setEmoji] = useState("🎉");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Id<"users">[]>([]);

  // Get current user
  const currentUser = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip",
  );

  // Get friends list
  const friends = useQuery(
    api.friendships.listFriends,
    currentUser ? { userId: currentUser._id } : "skip",
  );

  // Mutations
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

  const toggleFriend = (friendId: Id<"users">) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId],
    );
  };

  const handleCreate = async () => {
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
      let imageOrEmoji = emoji;

      // Upload image if selected
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

      const groupId = await createGroup({
        userAddress: address,
        name: name.trim(),
        description: description.trim(),
        imageOrEmoji,
        imageType,
        accentColor: selectedColor.value,
        inviteFriendIds:
          selectedFriends.length > 0 ? selectedFriends : undefined,
      });

      toast.success("Group created successfully!");

      // Reset form
      setName("");
      setDescription("");
      setSelectedColor(DEFAULT_GROUP_COLOR);
      setImageType("emoji");
      setEmoji("🎉");
      setImageFile(null);
      setImagePreview(null);
      setSelectedFriends([]);

      onOpenChange(false);

      // Navigate to the new group
      router.push(`/groups/${groupId}`);
    } catch (error: any) {
      console.error("Group creation error:", error);
      toast.error(error.message || "Failed to create group");
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = name.trim().length >= 2 && name.trim().length <= 50;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Set up your group profile and invite friends
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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

          {/* Invite Friends */}
          <div className="space-y-2">
            <Label>Invite Friends (Optional)</Label>
            {!friends || friends.length === 0 ? (
              <p className="text-sm text-slate-500">No friends to invite yet</p>
            ) : (
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                {friends.map((friend) => (
                  <label
                    key={friend._id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFriends.includes(friend._id)}
                      onChange={() => toggleFriend(friend._id)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500"
                        style={{
                          backgroundImage: friend.profileImageUrl
                            ? `url(${friend.profileImageUrl})`
                            : undefined,
                          backgroundSize: "cover",
                        }}
                      />
                      <div className="text-sm">
                        <div className="font-medium text-slate-900">
                          {friend.name}
                        </div>
                        <div className="text-slate-500">@{friend.username}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            className="flex-1"
            disabled={!isValid || isLoading}
          >
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
