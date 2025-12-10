"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAppKitAccount } from "@reown/appkit/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function BlockedUsersManagement() {
  const { address } = useAppKitAccount();
  const router = useRouter();

  const currentUser = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip",
  );

  const blockedUsers = useQuery(
    api.blocks.listBlockedUsers,
    currentUser ? { userId: currentUser._id } : "skip",
  );

  const unblockUser = useMutation(api.blocks.unblockUser);

  const handleUnblock = async (blockedId: any, name: any) => {
    if (!address) return;
    try {
      await unblockUser({ userAddress: address, blockedId });
      toast.success(`Unblocked ${name}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to unblock user");
    }
  };

  const handleViewProfile = (username: string) => {
    router.push(`/${username}`);
  };

  if (!blockedUsers) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-zinc-900">
        Blocked Users
      </h3>

      {blockedUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
            <UserX className="h-8 w-8 text-zinc-400" />
          </div>
          <h4 className="mb-2 text-lg font-semibold text-zinc-900">
            No blocked users
          </h4>
          <p className="max-w-sm text-sm text-zinc-500">
            When you block someone, they won't be able to send you friend
            requests or see your profile.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {blockedUsers.map((blockedUser) => (
            <div
              key={blockedUser._id}
              className="flex items-center gap-4 rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={blockedUser.profileImageUrl}
                  alt={blockedUser.name}
                />
                <AvatarFallback className="bg-linear-to-br from-blue-400 to-purple-500 text-white">
                  {blockedUser.name
                    ? blockedUser.name.charAt(0).toUpperCase()
                    : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-zinc-900">
                  {blockedUser.name}
                </div>
                <div className="truncate text-sm text-zinc-500">
                  @{blockedUser.username}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!blockedUser.username}
                  onClick={() => {
                    if (blockedUser.username)
                      handleViewProfile(blockedUser.username);
                  }}
                >
                  View Profile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!blockedUser._id || !blockedUser.name}
                  onClick={() => {
                    if (blockedUser._id && blockedUser.name)
                      handleUnblock(blockedUser._id, blockedUser.name);
                  }}
                >
                  Unblock
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
