"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DeclinedRequestTooltipProps {
  declinedAt: number;
  cooldownExpiresAt: number;
}

export function DeclinedRequestTooltip({
  declinedAt,
  cooldownExpiresAt,
}: DeclinedRequestTooltipProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const remaining = cooldownExpiresAt - now;

      if (remaining <= 0) {
        setIsExpired(true);
        setTimeRemaining("Expired");
        return;
      }

      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [cooldownExpiresAt]);

  const declinedDate = new Date(declinedAt).toLocaleString();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 text-amber-500 cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold text-sm">Request Declined</p>
            <p className="text-xs text-gray-300">
              This user declined your friend request on {declinedDate}
            </p>
            <div className="pt-2 border-t border-gray-600">
              <p className="text-xs font-medium">
                {isExpired
                  ? "You can send a new request now"
                  : `Try again in: ${timeRemaining}`}
              </p>
            </div>
            <p className="text-xs text-gray-400 italic">
              We respect user preferences. You can try again after 24 hours.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

