import { useState } from "react";
import { useGroupFund } from "@/hooks/useGroupFund";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowDownLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppKitAccount } from "@reown/appkit/react";

interface DepositModalProps {
    contractAddress: string;
    pactName: string;
    trigger?: React.ReactNode;
}

export function DepositModal({ contractAddress, pactName, trigger }: DepositModalProps) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const { isConnected } = useAppKitAccount();

    const { deposit, isDepositing } = useGroupFund(contractAddress as `0x${string}`);

    const handleDeposit = () => {
        if (!isConnected) {
            toast.error("Please connect your wallet");
            return;
        }
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        try {
            deposit(amount);
            setOpen(false);
            setAmount("");
            toast.info("Deposit transaction initiated...");
        } catch (error: any) {
            toast.error("Deposit failed: " + error.message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="default" size="sm" className="w-full">
                        <ArrowDownLeft className="mr-2 h-3 w-3" />
                        Deposit
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Deposit into {pactName}</DialogTitle>
                    <DialogDescription>
                        Contribute MNT to this group fund.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            Amount
                        </Label>
                        <div className="col-span-3">
                            <div className="relative">
                                <Input
                                    id="amount"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.0"
                                    className="pr-12"
                                />
                                <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                                    MNT
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleDeposit} disabled={isDepositing}>
                        {isDepositing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Depositing...
                            </>
                        ) : (
                            "Confirm Deposit"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
