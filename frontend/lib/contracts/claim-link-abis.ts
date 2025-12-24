// ClaimLink Contract Configuration
// Deployed on Mantle Sepolia (ChainId: 5003)
// Factory: 0x55a4174522d33f0a6358d9683c603b3f4519a3b2
// Implementation: 0x5a7594965C786F03CBfEEbD3612779f1D7de54a1

export const CLAIM_LINK_FACTORY_ADDRESS = "0x55a4174522d33f0a6358d9683c603b3f4519a3b2" as const;
export const CLAIM_LINK_IMPLEMENTATION_ADDRESS = "0x5a7594965C786F03CBfEEbD3612779f1D7de54a1" as const;

// ClaimLinkFactory ABI
export const ClaimLinkFactoryABI = [
    {
        type: "constructor",
        inputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "createClaimLink",
        inputs: [
            { name: "_assetType", type: "uint8", internalType: "uint8" },
            { name: "_assetAddress", type: "address", internalType: "address" },
            { name: "_totalAmount", type: "uint256", internalType: "uint256" },
            { name: "_accessMode", type: "uint8", internalType: "uint8" },
            { name: "_splitMode", type: "uint8", internalType: "uint8" },
            { name: "_expirationTime", type: "uint256", internalType: "uint256" },
            { name: "_maxClaimers", type: "uint256", internalType: "uint256" },
            { name: "_allowlist", type: "address[]", internalType: "address[]" },
            { name: "_customAmounts", type: "uint256[]", internalType: "uint256[]" },
            { name: "_proofAddress", type: "address", internalType: "address" },
        ],
        outputs: [{ name: "", type: "address", internalType: "address" }],
        stateMutability: "payable",
    },
    {
        type: "function",
        name: "getUserClaimLinks",
        inputs: [{ name: "user", type: "address", internalType: "address" }],
        outputs: [{ name: "", type: "address[]", internalType: "address[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "implementation",
        inputs: [],
        outputs: [{ name: "", type: "address", internalType: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "userClaimLinks",
        inputs: [
            { name: "", type: "address", internalType: "address" },
            { name: "", type: "uint256", internalType: "uint256" },
        ],
        outputs: [{ name: "", type: "address", internalType: "address" }],
        stateMutability: "view",
    },
    {
        type: "event",
        name: "ClaimLinkDeployed",
        inputs: [
            { name: "creator", type: "address", indexed: true, internalType: "address" },
            { name: "claimLink", type: "address", indexed: true, internalType: "address" },
            { name: "assetType", type: "uint8", indexed: false, internalType: "uint8" },
        ],
        anonymous: false,
    },
] as const;

// ClaimLinkImplementation ABI
export const ClaimLinkImplementationABI = [
    // State-changing functions
    {
        type: "function",
        name: "initialize",
        inputs: [
            { name: "_creator", type: "address", internalType: "address" },
            { name: "_assetType", type: "uint8", internalType: "enum ClaimLinkImplementation.AssetType" },
            { name: "_assetAddress", type: "address", internalType: "address" },
            { name: "_totalAmount", type: "uint256", internalType: "uint256" },
            { name: "_accessMode", type: "uint8", internalType: "enum ClaimLinkImplementation.AccessMode" },
            { name: "_splitMode", type: "uint8", internalType: "enum ClaimLinkImplementation.SplitMode" },
            { name: "_expirationTime", type: "uint256", internalType: "uint256" },
            { name: "_maxClaimers", type: "uint256", internalType: "uint256" },
            { name: "_allowlist", type: "address[]", internalType: "address[]" },
            { name: "_customAmounts", type: "uint256[]", internalType: "uint256[]" },
            { name: "_proofAddress", type: "address", internalType: "address" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "claimWithProof",
        inputs: [{ name: "signature", type: "bytes", internalType: "bytes" }],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "claim",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "pause",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "unpause",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "cancel",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "reclaimAssets",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "extendExpiration",
        inputs: [{ name: "newExpirationTime", type: "uint256", internalType: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable",
    },
    // View functions
    {
        type: "function",
        name: "creator",
        inputs: [],
        outputs: [{ name: "", type: "address", internalType: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "assetType",
        inputs: [],
        outputs: [{ name: "", type: "uint8", internalType: "enum ClaimLinkImplementation.AssetType" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "assetAddress",
        inputs: [],
        outputs: [{ name: "", type: "address", internalType: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "totalAmount",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "accessMode",
        inputs: [],
        outputs: [{ name: "", type: "uint8", internalType: "enum ClaimLinkImplementation.AccessMode" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "splitMode",
        inputs: [],
        outputs: [{ name: "", type: "uint8", internalType: "enum ClaimLinkImplementation.SplitMode" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "expirationTime",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "maxClaimers",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "status",
        inputs: [],
        outputs: [{ name: "", type: "uint8", internalType: "enum ClaimLinkImplementation.LinkStatus" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "proofAddress",
        inputs: [],
        outputs: [{ name: "", type: "address", internalType: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "totalClaimed",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "hasClaimed",
        inputs: [{ name: "", type: "address", internalType: "address" }],
        outputs: [{ name: "", type: "bool", internalType: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getClaimableAmount",
        inputs: [{ name: "claimer", type: "address", internalType: "address" }],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getClaimers",
        inputs: [],
        outputs: [{ name: "", type: "address[]", internalType: "address[]" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "getRemainingAmount",
        inputs: [],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "isExpired",
        inputs: [],
        outputs: [{ name: "", type: "bool", internalType: "bool" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "canClaim",
        inputs: [{ name: "claimer", type: "address", internalType: "address" }],
        outputs: [
            { name: "", type: "bool", internalType: "bool" },
            { name: "", type: "string", internalType: "string" },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "allowedAddresses",
        inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        outputs: [{ name: "", type: "address", internalType: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "allowedAmounts",
        inputs: [{ name: "", type: "address", internalType: "address" }],
        outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "claimers",
        inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
        outputs: [{ name: "", type: "address", internalType: "address" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "owner",
        inputs: [],
        outputs: [{ name: "", type: "address", internalType: "address" }],
        stateMutability: "view",
    },
    // Events
    {
        type: "event",
        name: "ClaimLinkCreated",
        inputs: [
            { name: "creator", type: "address", indexed: true, internalType: "address" },
            { name: "assetType", type: "uint8", indexed: false, internalType: "enum ClaimLinkImplementation.AssetType" },
            { name: "totalAmount", type: "uint256", indexed: false, internalType: "uint256" },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Claimed",
        inputs: [
            { name: "claimer", type: "address", indexed: true, internalType: "address" },
            { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "AssetsReclaimed",
        inputs: [
            { name: "creator", type: "address", indexed: true, internalType: "address" },
            { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ExpirationExtended",
        inputs: [{ name: "newExpirationTime", type: "uint256", indexed: false, internalType: "uint256" }],
        anonymous: false,
    },
    {
        type: "event",
        name: "LinkPaused",
        inputs: [],
        anonymous: false,
    },
    {
        type: "event",
        name: "LinkUnpaused",
        inputs: [],
        anonymous: false,
    },
    {
        type: "event",
        name: "LinkCancelled",
        inputs: [
            { name: "creator", type: "address", indexed: true, internalType: "address" },
            { name: "remainingAmount", type: "uint256", indexed: false, internalType: "uint256" },
        ],
        anonymous: false,
    },
    // Receive function
    {
        type: "receive",
        stateMutability: "payable",
    },
] as const;

// Enum types for TypeScript
export enum AssetType {
    NATIVE = 0,
    ERC20 = 1,
}

export enum AccessMode {
    ANYONE = 0,
    ALLOWLIST = 1,
}

export enum SplitMode {
    NONE = 0,
    EQUAL = 1,
    CUSTOM = 2,
}

export enum LinkStatus {
    ACTIVE = 0,
    PAUSED = 1,
    COMPLETED = 2,
    CANCELLED = 3,
}
