"use client";

import { useState, useRef } from "react";
import { Loader2, Upload, X, CheckCircle2 } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { useRouter } from "next/navigation";
import { useUsernameValidation } from "@/hooks/useUsernameValidation";
import { Id } from "@/convex/_generated/dataModel";

interface EditProfileModalProps {
  user: {
    _id: Id<"users">;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditProfileModal({
  user,
  open,
  onOpenChange,
}: EditProfileModalProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(
    user.profileImageUrl,
  );
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { address } = useAppKitAccount();

  // Convex mutations
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  // Username validation
  const {
    isValid: isUsernameValid,
    error: usernameError,
    isChecking,
  } = useUsernameValidation({
    username,
    originalUsername: user.username,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Profile image must be less than 5MB");
        return;
      }
      setProfileImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    setPreviewUrl(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!isUsernameValid || !address) return;

    setIsLoading(true);

    try {
      let profileImageId: any | undefined = undefined;

      // Upload profile image if changed
      if (profileImage) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": profileImage.type },
          body: profileImage,
        });
        const { storageId } = await result.json();
        profileImageId = storageId;
      }

      const usernameChanged = username !== user.username;

      // Update profile
      await updateProfile({
        userAddress: address,
        name,
        username: username.toLowerCase(),
        profileImageId,
      });

      toast.success("Profile updated successfully!");
      onOpenChange(false);

      // Navigate to new username URL if changed
      if (usernameChanged) {
        router.push(`/${username.toLowerCase()}`);
      } else {
        // Just reload to show updated data
        window.location.reload();
      }
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast.error(
        error.message || "Could not update profile. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges =
    name !== user.name || username !== user.username || profileImage !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your profile information</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Image */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-white shadow-lg ring-2 ring-zinc-200">
                <AvatarImage src={previewUrl} alt={name} />
                <AvatarFallback className="bg-linear-to-br from-blue-400 to-purple-500 text-2xl font-semibold text-white">
                  {name.charAt(0).toUpperCase()}
                </AvatarFallback>
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
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="Enter username"
                className={
                  usernameError
                    ? "border-red-500 pr-10"
                    : isUsernameValid && username !== user.username
                      ? "border-green-500 pr-10"
                      : "pr-10"
                }
              />
              <div className="absolute top-1/2 right-3 -translate-y-1/2">
                {isChecking && (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                )}
                {!isChecking &&
                  isUsernameValid &&
                  username !== user.username && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
              </div>
            </div>
            {usernameError && (
              <p className="text-sm text-red-500">{usernameError}</p>
            )}
            {isChecking && (
              <p className="text-sm text-zinc-500">Checking availability...</p>
            )}
            {!isChecking && isUsernameValid && username !== user.username && (
              <p className="text-sm text-green-600">Username is available!</p>
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
            onClick={handleSave}
            className="flex-1"
            disabled={
              !hasChanges || !isUsernameValid || isChecking || isLoading
            }
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
      </DialogContent>
    </Dialog>
  );
}
