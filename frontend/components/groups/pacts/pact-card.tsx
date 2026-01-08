import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, ChevronRight } from "lucide-react";
import { formatAddress, formatEtherToMnt } from "@/lib/format-utils";
import { useGroupFund } from "@/hooks/useGroupFund";
import { Id } from "@/convex/_generated/dataModel";

interface PactCardProps {
    pact: {
        _id: Id<"groupPacts">;
        name: string;
        description?: string;
        contractAddress: string;
        creatorName?: string;
    };
    onClick: () => void;
}

export function PactCard({ pact, onClick }: PactCardProps) {
    const { balance } = useGroupFund(pact.contractAddress as `0x${string}`);

    return (
        <Card
            className="group cursor-pointer transition-all hover:bg-accent/50 hover:border-primary/50"
            onClick={onClick}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20">
                        <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-semibold">{pact.name}</CardTitle>
                        <CardDescription className="text-xs">Group Fund</CardDescription>
                    </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
            </CardHeader>
            <CardContent>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Balance</p>
                        <p className="text-2xl font-bold">
                            {Number(balance) > 0 ? (
                                <span className="text-foreground">{formatEtherToMnt(balance)}</span>
                            ) : (
                                <span className="text-foreground/50">0.00 MNT</span>
                            )}
                        </p>
                    </div>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                        {formatAddress(pact.contractAddress)}
                    </Badge>
                </div>
                {pact.description && (
                    <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">
                        {pact.description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
