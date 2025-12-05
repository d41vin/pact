"use client";

import { useRef } from "react";
import {
  Download,
  Link as LinkIcon,
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
import { QRCode } from "react-qrcode-logo";

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
  const qrRef = useRef<any>(null);

  // Generate shareable link (replace with actual domain in production)
  const shareLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/groups?code=${code}`
      : "";

  const handleDownload = () => {
    if (!qrRef.current) return;

    const canvas = qrRef.current.canvas.current;
    if (!canvas) return;

    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${groupName.replace(/\s+/g, "-").toLowerCase()}-invite-${code}.png`;
    link.href = url;
    link.click();

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
            <QRCode
              ref={qrRef}
              value={shareLink}
              size={300}
              quietZone={10}
              fgColor={accentColor}
              bgColor="#ffffff"
              qrStyle="dots"
              eyeRadius={[
                { outer: 10, inner: 5 },
                { outer: 10, inner: 5 },
                { outer: 10, inner: 5 },
              ]}
              ecLevel="M"
            />
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
