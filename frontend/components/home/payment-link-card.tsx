"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Share2, Eye, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatFullDate } from "@/lib/date-utils";
import { formatEtherToMnt } from "@/lib/format-utils";

interface PaymentLinkCardProps {
    link: {
        _id: string;
        title: string;
        amount: string;
        status: string;
        linkType: string;
        paymentCount: number;
        totalCollected: string;
        imageOrEmoji: string;
        imageType: "emoji" | "image";
        imageUrl: string;
        shortId: string;
        _creationTime: number;
        expiresAt?: number;
    };
    onClick: () => void;
}

export function PaymentLinkCard({ link, onClick }: PaymentLinkCardProps) {
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}/pay/${link.shortId}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}/pay/${link.shortId}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: link.title,
                    text: `Pay via this link: ${url}`,
                    url: url,
                });
            } catch (err) {
                // User cancelled
            }
        } else {
            navigator.clipboard.writeText(url);
            toast.success("Link copied to clipboard!");
        }
    };

    const handleView = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.open(`/pay/${link.shortId}`, "_blank");
    };

    const getStatusBadge = () => {
        switch (link.status) {
            case "active":
                return (
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-0">
                        Active
                    </Badge>
                );
            case "completed":
                return (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-0">
                        Completed
                    </Badge>
                );
            case "expired":
                return (
                    <Badge variant="outline" className="bg-zinc-200 text-zinc-700 border-0">
                        Expired
                    </Badge>
                );
            case "paused":
                return (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-0">
                        Paused
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="bg-zinc-200 text-zinc-700 border-0">
                        Inactive
                    </Badge>
                );
        }
    };

    return (
        <div
            onClick={onClick}
            className="cursor-pointer rounded-[25px] corner-squircle border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50"
        >
            <div className="flex items-start gap-3">
                {/* Visual */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center">
                    {link.imageType === "emoji" ? (
                        <span className="text-3xl">{link.imageUrl}</span>
                    ) : (
                        <img
                            src={link.imageUrl}
                            alt={link.title}
                            className="h-12 w-12 rounded-lg object-cover"
                        />
                    )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-zinc-900 line-clamp-1">
                            {link.title}
                        </h3>
                        {getStatusBadge()}
                    </div>

                    <div className="mb-2 text-sm text-zinc-600">
                        {formatEtherToMnt(link.amount)} • {link.linkType === "single-use" ? "One-time" : "Reusable"}
                    </div>

                    {link.linkType === "reusable" && (
                        <div className="mb-3 text-sm text-zinc-500">
                            {link.paymentCount} payment{link.paymentCount !== 1 ? "s" : ""} • {formatEtherToMnt(link.totalCollected)} collected
                        </div>
                    )}

                    <div className="text-xs text-zinc-400">
                        Created {formatFullDate(link._creationTime)}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-3 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        className="h-8 text-xs"
                    >
                        <Copy className="mr-1 h-3 w-3" />
                        Copy
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShare}
                        className="h-8 text-xs"
                    >
                        <Share2 className="mr-1 h-3 w-3" />
                        Share
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleView}
                        className="h-8 text-xs"
                    >
                        <Eye className="mr-1 h-3 w-3" />
                        View
                    </Button>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onClick}>
                            View Details
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}