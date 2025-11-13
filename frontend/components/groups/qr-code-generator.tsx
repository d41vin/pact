"use client";

import { useEffect, useRef } from "react";
import {
  Download,
  Link as LinkIcon,
  X,
  QrCode as QrCodeIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import QRCodeStyling from "qr-code-styling";

interface QRCodeGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  groupName: string;
  accentColor: string;
}

export default function QRCodeGenerator({
  open,
  onOpenChange,
  code,
  groupName,
  accentColor,
}: QRCodeGeneratorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);

  // Generate shareable link (replace with actual domain in production)
  const shareLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/groups?code=${code}`
      : "";

  // Generate QR code
  useEffect(() => {
    if (!open || !code || !shareLink) return;

    const link = shareLink;

    // Create QR code
    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling({
        width: 300,
        height: 300,
        data: link,
        margin: 10,
        qrOptions: {
          typeNumber: 0,
          mode: "Byte",
          errorCorrectionLevel: "M",
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.4,
          margin: 8,
        },
        dotsOptions: {
          color: accentColor,
          type: "rounded",
        },
        backgroundOptions: {
          color: "#ffffff",
        },
        cornersSquareOptions: {
          color: accentColor,
          type: "extra-rounded",
        },
        cornersDotOptions: {
          color: accentColor,
          type: "dot",
        },
      });
    } else {
      qrCodeRef.current.update({
        data: link,
        dotsOptions: {
          color: accentColor,
          type: "rounded",
        },
        cornersSquareOptions: {
          color: accentColor,
          type: "extra-rounded",
        },
        cornersDotOptions: {
          color: accentColor,
          type: "dot",
        },
      });
    }

    // Clear previous QR code
    if (ref.current) {
      ref.current.innerHTML = "";
      qrCodeRef.current.append(ref.current);
    }
  }, [open, code, accentColor, shareLink]);

  const handleDownload = () => {
    if (!qrCodeRef.current) return;

    qrCodeRef.current.download({
      name: `${groupName.replace(/\s+/g, "-").toLowerCase()}-invite-${code}`,
      extension: "png",
    });

    toast.success("QR code downloaded!");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCodeIcon className="h-5 w-5" />
            QR Code for {groupName}
          </DialogTitle>
          <DialogDescription>
            Share this QR code or link to invite members
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Code Display */}
          <div className="flex justify-center rounded-lg border border-slate-200 bg-white p-4">
            <div ref={ref} />
          </div>

          {/* Invite Code */}
          <div className="rounded-lg bg-slate-50 p-4 text-center">
            <div className="mb-2 text-sm text-slate-600">Invite Code</div>
            <code className="text-2xl font-bold tracking-wider text-slate-900">
              {code}
            </code>
          </div>

          {/* Shareable Link */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-900">
              Shareable Link
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              />
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <LinkIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 border-t border-slate-200 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              onClick={handleDownload}
              className="flex-1"
              style={{ backgroundColor: accentColor }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download QR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
