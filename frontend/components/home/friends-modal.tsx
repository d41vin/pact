"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import FriendsList from "@/components/home/friends-list";

interface FriendsModalProps {
    userId: Id<"users">;
    triggerClassName?: string;
}

export default function FriendsModal({
    userId,
    triggerClassName,
}: FriendsModalProps) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className={triggerClassName}>
                    <Users className="mr-2 h-4 w-4" />
                    Friends
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] rounded-[40px] corner-squircle sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Friends</DialogTitle>
                    <DialogDescription>
                        Your friends on Pact
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[calc(85vh-120px)] pr-4">
                    <FriendsList
                        userId={userId}
                        onPayClick={() => setOpen(false)}
                        onRequestClick={() => setOpen(false)}
                    />
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}