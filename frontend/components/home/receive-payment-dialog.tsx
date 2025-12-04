import { useState, useEffect } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download, QrCode, X } from "lucide-react";
import { QRCode } from "react-qrcode-logo";

export default function ReceivePaymentDialog() {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const { address } = useAppKitAccount();

    const handleCopy = async () => {
        if (!address) return;
        await navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const handleDownload = () => {
        const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement;
        if (!canvas) return;

        const link = document.createElement("a");
        link.download = "wallet-qr.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    // Remove focus from close button when dialog opens
    useEffect(() => {
        if (open) {
            setTimeout(() => {
                const activeElement = document.activeElement as HTMLElement;
                if (activeElement) {
                    activeElement.blur();
                }
            }, 0);
        }
    }, [open]);

    if (!address) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {/* Button */}
            <DialogTrigger asChild>
                <Button className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-[100px] corner-squircle bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl">
                    <QrCode className="h-6 w-6" />
                    <span className="text-sm font-medium">Receive</span>
                </Button>
            </DialogTrigger>

            {/* Modal */}
            <DialogContent className="sm:max-w-md rounded-[100px] w-fit corner-squircle" showCloseButton={false}>
                <DialogHeader className="relative">
                    <DialogTitle className="text-center text-xl font-semibold">
                        Receive
                    </DialogTitle>
                    <DialogClose autoFocus={false} className="absolute top-0 right-0 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </DialogClose>
                </DialogHeader>

                <div className="space-y-6 py-0">
                    <div className="hello flex justify-center">
                        <div className="inline-flex flex-col gap-6">
                            {/* Modern QR */}
                            <div className="rounded-[25px] corner-squircle bg-white dark:bg-zinc-800 p-0 shadow-lg ring-1 ring-black/5 dark:ring-white/10 w-full overflow-hidden min-w-[256px]">
                                <QRCode
                                    id="qr-canvas"
                                    value={address}
                                    size={256}
                                    ecLevel="H"
                                    quietZone={10}
                                    qrStyle="dots"             // clean rounded dots
                                    eyeRadius={100}             // rounded eye corners
                                    fgColor="#000000"          // solid color
                                    bgColor="transparent"

                                    // Logo
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

                            {/* Address Box */}
                            <div className="rounded-[50px] corner-squircle bg-zinc-100 dark:bg-zinc-700 p-4">
                                <p className="break-all text-center text-xs font-mono text-zinc-700 dark:text-zinc-200">
                                    {address}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* <p className="text-center text-sm text-zinc-600 dark:text-zinc-300">
                        Copy your address or scan the QR code
                    </p> */}

                    {/* Copy Button */}
                    <div className="flex justify-center">
                        <div className="inline-flex flex-col gap-6 w-auto">
                            <Button
                                onClick={handleCopy}
                                className="rounded-[50px] corner-squircle bg-black text-white dark:bg-white dark:text-black hover:opacity-90 w-full"
                                size="lg"
                            >
                                {copied ? (
                                    <>
                                        <Check className="mr-2 h-4 w-4" /> Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="mr-2 h-4 w-4" /> Copy Address
                                    </>
                                )}
                            </Button>

                            {/* Download */}
                            <Button
                                onClick={handleDownload}
                                variant="outline"
                                className="rounded-[50px] corner-squircle w-full"
                                size="lg"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Download QR Code
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
