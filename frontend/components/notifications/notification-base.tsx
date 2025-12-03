"use client";

import { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatTimeAgo } from "@/lib/date-utils";

interface NotificationBaseProps {
  avatar?: string | null;
  fallbackIcon: ReactNode;
  title: string;
  description: string;
  timestamp: number;
  isRead: boolean;
  actions?: ReactNode;
  onClick?: () => void;
}

export default function NotificationBase({
  avatar,
  fallbackIcon,
  title,
  description,
  timestamp,
  isRead,
  actions,
  onClick,
}: NotificationBaseProps) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-white px-6 py-4 transition-colors hover:bg-slate-50"
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white">
            {avatar ? (
              <Avatar className="h-10 w-10">
                <AvatarImage src={avatar} />
                <AvatarFallback>{fallbackIcon}</AvatarFallback>
              </Avatar>
            ) : (
              fallbackIcon
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
            <span className="text-xs whitespace-nowrap text-slate-500">
              {formatTimeAgo(timestamp)}
            </span>
          </div>
          <p className="mb-1 text-sm text-slate-600">{description}</p>
          {!isRead && (
            <div className="mb-2 flex items-center gap-1 text-xs font-medium text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
              New
            </div>
          )}
          {actions && <div className="mt-3">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
