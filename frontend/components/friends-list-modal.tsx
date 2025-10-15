"use client";

import { useRouter } from "next/navigation";
import { Users, UserMinus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FriendsListModalProps {
  userId: Id<"users">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canViewList: boolean; // Only mutual friends can view
}

export default function FriendsListModal({
  userId,
  open,
  onOpenChange,
  canViewList,
}: FriendsListModalProps) {
  const router = useRouter();
  const { address } = useAppKitAccount();

  const currentUser = useQuery(
    api.users.getUser,
    address ? { userAddress: address } : "skip",
  );

  const friends = useQuery(
    api.friendships.listFriends,
    canViewList ? { userId } : "skip",
  );

  const unfriend = useMutation(api.friendships.unfriend);

  const handleUnfriend = async (
    friendshipId: Id<"friendships">,
    name: string,
  ) => {
    if (!currentUser) return;
    try {
      await unfriend({ userId: currentUser._id, friendshipId });
      toast.success(`Removed ${name} from friends`);
    } catch (error: any) {
      toast.error(error.message || "Failed to unfriend");
    }
  };

  const handleProfileClick = (username: string) => {
    router.push(`/${username}`);
    onOpenChange(false);
  };

  if (!canViewList) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Friends</DialogTitle>
            <DialogDescription>
              Only mutual friends can view the friends list
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Users className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-center text-slate-600">
              You must be friends with this user to view their friends list
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Friends</DialogTitle>
          <DialogDescription>
            {friends === undefined
              ? "Loading..."
              : `${friends.length} friend${friends.length !== 1 ? "s" : ""}`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {friends === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600">No friends yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div
                  key={friend._id}
                  className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-slate-50"
                >
                  <button
                    onClick={() =>
                      friend.username && handleProfileClick(friend.username)
                    }
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={friend.profileImageUrl}
                        alt={friend.name}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                        {friend.name?.charAt(0).toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-900">
                        {friend.name}
                      </div>
                      <div className="truncate text-sm text-slate-500">
                        @{friend.username}
                      </div>
                    </div>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        •••
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          handleUnfriend(
                            friend.friendshipId,
                            friend.name ?? "this user",
                          )
                        }
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Unfriend
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
