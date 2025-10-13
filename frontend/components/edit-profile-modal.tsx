"use client";

import { useState, useRef } from "react";
import { Loader2, Upload, X } from "lucide-react";
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
// import { useMutation, useQuery } from 'convex/react'
// import { api } from '@/convex/_generated/api'

interface EditProfileModalProps {
  user: {
    _id: string;
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
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(
    user.profileImageUrl,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TODO: Replace with Convex queries/mutations
  // const checkUsername = useQuery(api.users.checkUsername, { username })
  // const updateProfile = useMutation(api.users.updateProfile)

  const handleUsernameChange = async (newUsername: string) => {
    setUsername(newUsername);

    if (newUsername === user.username) {
      setUsernameError(null);
      return;
    }

    if (newUsername.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return;
    }

    // TODO: Implement real-time username validation with Convex
    setCheckingUsername(true);
    // Simulate API call
    setTimeout(() => {
      // const isTaken = checkUsername
      const isTaken = false; // Mock value
      setUsernameError(isTaken ? "Username is already taken" : null);
      setCheckingUsername(false);
    }, 500);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large", {
          description: "Profile image must be less than 5MB",
        });
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
    if (usernameError) return;

    setIsLoading(true);

    try {
      // TODO: Implement with Convex
      // 1. Upload profile image if changed
      // 2. Update user profile with new data

      console.log("Saving profile:", { name, username, profileImage });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.success("Profile updated", {
        description: "Your profile has been successfully updated",
      });

      onOpenChange(false);
    } catch (error) {
      toast.error("Update failed", {
        description: "Could not update profile. Please try again.",
      });
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
              <Avatar className="h-24 w-24 border-4 border-white shadow-lg ring-2 ring-slate-200">
                <AvatarImage src={previewUrl} alt={name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-2xl font-semibold text-white">
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
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="Enter username"
                className={usernameError ? "border-red-500" : ""}
              />
              {checkingUsername && (
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                </div>
              )}
            </div>
            {usernameError && (
              <p className="text-sm text-red-500">{usernameError}</p>
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
            disabled={!hasChanges || !!usernameError || isLoading}
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
