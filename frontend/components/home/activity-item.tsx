"use client";

import { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatTimeAgo } from "@/lib/date-utils";
import { User } from "lucide-react";

interface ActivityItemProps {
  icon: ReactNode;
  iconBgClass: string;
  title: string;
  description: string;
  amount?: string;
  amountPrefix?: string; // "+" or "-" or ""
  amountClass?: string;
  timestamp: number;
  avatar?: string | null;
  onClick?: () => void;
}

export default function ActivityItem({
  icon,
  iconBgClass,
  title,
  description,
  amount,
  amountPrefix = "",
  amountClass = "text-zinc-900",
  timestamp,
  avatar,
  onClick,
}: ActivityItemProps) {
  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-colors hover:bg-zinc-50"
    >
      {/* Icon or Avatar */}
      <div className="shrink-0">
        {avatar ? (
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatar} />
            <AvatarFallback className={iconBgClass}>
              <User className="h-5 w-5 text-white" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBgClass}`}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900">
              {title}
            </p>
            <p className="truncate text-sm text-zinc-500">{description}</p>
          </div>
          <div className="shrink-0 text-right">
            {amount && (
              <p className={`text-sm font-semibold ${amountClass}`}>
                {amountPrefix}
                {amount}
              </p>
            )}
            <p className="text-xs text-zinc-400">{formatTimeAgo(timestamp)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
