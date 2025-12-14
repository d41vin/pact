"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { QRCode } from "react-qrcode-logo";
import { toast } from "sonner";

interface PaymentLinkQRModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    linkUrl: string;
    linkTitle: string;
}

export function PaymentLinkQRModal({
    open,
    onOpenChange,
    linkUrl,
    linkTitle,
}: PaymentLinkQRModalProps) {
    const handleDownload = () => {
        const canvas = document.getElementById("payment-link-qr-canvas") as HTMLCanvasElement;
        if (!canvas) {
            toast.error("Failed to generate QR code");
            return;
        }

        const link = document.createElement("a");
        link.download = `${linkTitle.toLowerCase().replace(/\s+/g, "-")}-qr.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast.success("QR code downloaded!");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-[50px] corner-squircle w-fit" showCloseButton={false}>
                <DialogHeader className="relative">
                    <DialogTitle className="text-center text-xl font-semibold">
                        Payment Link QR Code
                    </DialogTitle>
                    <DialogClose autoFocus={false} className="absolute top-0 right-0 rounded-xs opacity-70 transition-opacity hover:opacity-100">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </DialogClose>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* QR Code */}
                    <div className="flex justify-center">
                        <div className="rounded-[25px] corner-squircle bg-white p-4 shadow-lg ring-1 ring-black/5 w-fit">
                            <QRCode
                                id="payment-link-qr-canvas"
                                value={linkUrl}
                                size={256}
                                ecLevel="H"
                                quietZone={10}
                                qrStyle="dots"
                                eyeRadius={100}
                                fgColor="#000000"
                                bgColor="transparent"
                                logoImage="/favicon.ico"
                                logoWidth={60}
                                logoHeight={60}
                                logoOpacity={1}
                                logoPadding={4}
                                logoPaddingStyle="circle"
                                removeQrCodeBehindLogo={true}
                                style={{ width: '100%', height: 'auto' }}
                            />
                        </div>
                    </div>

                    {/* Link Title */}
                    <div className="text-center">
                        <p className="text-sm font-medium text-zinc-900">{linkTitle}</p>
                        <p className="mt-1 text-xs text-zinc-500">Scan to pay</p>
                    </div>

                    {/* Download Button */}
                    <div className="flex justify-center">
                        <Button
                            onClick={handleDownload}
                            className="rounded-[50px] corner-squircle"
                            size="lg"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download QR Code
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}