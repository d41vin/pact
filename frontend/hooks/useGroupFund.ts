import {
    useReadContract,
    useWriteContract,
} from "wagmi";
import {
    GROUP_FUND_IMPLEMENTATION_ABI,
    GROUP_FUND_FACTORY_ABI,
} from "@/lib/contracts/group-fund-abi";
import { formatEther, parseEther } from "viem";

// Hardcoded for reliability during testnet phase, as env vars require server restart
const FACTORY_ADDRESS = "0x0f3d7f890f7582af4d19665e48c9e6fcf902a221";

export function useGroupFundFactory() {
    const { writeContractAsync } = useWriteContract();

    const createGroupFund = async (
        ownerAddress: string,
        groupAddress: string,
        initialAdmins: string[] = []
    ) => {
        return await writeContractAsync({
            address: FACTORY_ADDRESS,
            abi: GROUP_FUND_FACTORY_ABI,
            functionName: "createGroupFund",
            args: [
                ownerAddress as `0x${string}`,
                groupAddress as `0x${string}`,
                initialAdmins as `0x${string}`[],
            ],
        });
    };

    return {
        createGroupFund,
    };
}

export function useGroupFund(contractAddress: `0x${string}`) {
    // Reads
    const { data: stats, refetch: refetchStats } = useReadContract({
        address: contractAddress,
        abi: GROUP_FUND_IMPLEMENTATION_ABI,
        functionName: "getStats",
    });

    const { data: balance } = useReadContract({
        address: contractAddress,
        abi: GROUP_FUND_IMPLEMENTATION_ABI,
        functionName: "getBalance",
    });

    const { data: creator } = useReadContract({
        address: contractAddress,
        abi: GROUP_FUND_IMPLEMENTATION_ABI,
        functionName: "creator",
    });

    // Writes
    const {
        writeContract: deposit,
        data: depositHash,
        isPending: isDepositing,
    } = useWriteContract();

    const {
        writeContract: withdraw,
        data: withdrawHash,
        isPending: isWithdrawing,
    } = useWriteContract();

    const transferFunds = (amount: string) => {
        deposit({
            address: contractAddress,
            abi: GROUP_FUND_IMPLEMENTATION_ABI,
            functionName: "deposit",
            value: parseEther(amount),
        });
    };

    const withdrawFunds = (amount: string) => {
        withdraw({
            address: contractAddress,
            abi: GROUP_FUND_IMPLEMENTATION_ABI,
            functionName: "withdraw",
            args: [parseEther(amount)],
        });
    };

    return {
        // Data
        stats: stats
            ? {
                balance: formatEther(stats[0]),
                totalDeposited: formatEther(stats[1]),
                totalWithdrawn: formatEther(stats[2]),
                memberCount: Number(stats[3]),
                adminCount: Number(stats[4]),
            }
            : null,
        balance: balance ? formatEther(balance) : "0",
        creator,
        refetchStats,

        // Actions
        deposit: transferFunds,
        withdraw: withdrawFunds,
        isDepositing,
        isWithdrawing,
        depositHash,
        withdrawHash,
    };
}
