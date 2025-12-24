// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ClaimLinkImplementation is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using ECDSA for bytes32;

    // Asset types
    enum AssetType {
        NATIVE,
        ERC20
    }

    // Access modes
    enum AccessMode {
        ANYONE,
        ALLOWLIST
    }

    // Split modes
    enum SplitMode {
        NONE,
        EQUAL,
        CUSTOM
    }

    // Link status
    enum LinkStatus {
        ACTIVE,
        PAUSED,
        COMPLETED,
        CANCELLED
    }

    // State variables
    address public creator;
    AssetType public assetType;
    address public assetAddress; // 0x0 for native
    uint256 public totalAmount;
    AccessMode public accessMode;
    SplitMode public splitMode;
    uint256 public expirationTime; // ⚠️ IN SECONDS (not milliseconds)
    uint256 public maxClaimers; // Only for ANYONE + EQUAL mode
    LinkStatus public status;

    // For allowlist
    address[] public allowedAddresses;
    mapping(address => uint256) public allowedAmounts; // if custom splits

    // Tracking
    mapping(address => bool) public hasClaimed;
    address[] public claimers;
    uint256 public totalClaimed;

    // For anyone mode - PUBLIC KEY ONLY (never private key)
    address public proofAddress;

    // Events
    event ClaimLinkCreated(
        address indexed creator,
        AssetType assetType,
        uint256 totalAmount
    );
    event Claimed(address indexed claimer, uint256 amount);
    event AssetsReclaimed(address indexed creator, uint256 amount);
    event ExpirationExtended(uint256 newExpirationTime);
    event LinkPaused();
    event LinkUnpaused();
    event LinkCancelled(address indexed creator, uint256 remainingAmount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _creator,
        AssetType _assetType,
        address _assetAddress,
        uint256 _totalAmount,
        AccessMode _accessMode,
        SplitMode _splitMode,
        uint256 _expirationTime, // ⚠️ IN SECONDS
        uint256 _maxClaimers,
        address[] memory _allowlist,
        uint256[] memory _customAmounts,
        address _proofAddress
    ) external initializer {
        __Ownable_init(_creator);
        __ReentrancyGuard_init();

        creator = _creator;
        assetType = _assetType;
        assetAddress = _assetAddress;
        totalAmount = _totalAmount;
        accessMode = _accessMode;
        splitMode = _splitMode;
        expirationTime = _expirationTime;
        status = LinkStatus.ACTIVE;

        // maxClaimers only applies to ANYONE + EQUAL mode
        if (_accessMode == AccessMode.ANYONE && _splitMode == SplitMode.EQUAL) {
            require(
                _maxClaimers > 0 && _maxClaimers <= 50,
                "Max claimers 1-50"
            );
            maxClaimers = _maxClaimers;
        } else {
            maxClaimers = 0; // Not applicable
        }

        if (_accessMode == AccessMode.ALLOWLIST) {
            require(
                _allowlist.length > 0 && _allowlist.length <= 50,
                "Allowlist 1-50"
            );
            allowedAddresses = _allowlist;

            if (_splitMode == SplitMode.CUSTOM) {
                require(
                    _customAmounts.length == _allowlist.length,
                    "Amounts length mismatch"
                );
                uint256 sum = 0;
                for (uint256 i = 0; i < _allowlist.length; i++) {
                    allowedAmounts[_allowlist[i]] = _customAmounts[i];
                    sum += _customAmounts[i];
                }
                require(sum == _totalAmount, "Amounts sum mismatch");
            }
        } else {
            // Anyone mode
            require(_proofAddress != address(0), "Proof address required");
            proofAddress = _proofAddress;
        }

        emit ClaimLinkCreated(_creator, _assetType, _totalAmount);
    }

    /**
     * @notice Claim with cryptographic proof (for anyone mode)
     * @param signature EIP-191 signature of msg.sender signed by private key
     *
     * ⚠️ SIGNATURE SCHEME (must match frontend):
     * - Message: keccak256(abi.encodePacked(msg.sender))
     * - Prefixed: "\x19Ethereum Signed Message:\n32" + messageHash
     * - Signer: proofAddress (public key)
     */
    function claimWithProof(bytes memory signature) external nonReentrant {
        require(status == LinkStatus.ACTIVE, "Link not active");
        require(!isExpired(), "Link expired");
        require(!hasClaimed[msg.sender], "Already claimed");
        require(accessMode == AccessMode.ANYONE, "Not anyone mode");

        // Verify signature using EIP-191 standard
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender));
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(
            messageHash
        );
        address recovered = ECDSA.recover(ethSignedHash, signature);

        require(recovered == proofAddress, "Invalid proof");

        // Check max claimers limit (only for equal splits)
        if (splitMode == SplitMode.EQUAL) {
            require(claimers.length < maxClaimers, "Max claimers reached");
        }

        // Mark as claimed BEFORE transfer (CEI pattern)
        hasClaimed[msg.sender] = true;
        claimers.push(msg.sender);

        // Calculate amount
        uint256 amount = _calculateClaimAmount();
        totalClaimed += amount;

        // Transfer assets
        _transferAssets(msg.sender, amount);

        // Update status if fully claimed
        if (totalClaimed >= totalAmount) {
            status = LinkStatus.COMPLETED;
        }

        emit Claimed(msg.sender, amount);
    }

    /**
     * @notice Claim (for allowlist mode)
     */
    function claim() external nonReentrant {
        require(status == LinkStatus.ACTIVE, "Link not active");
        require(!isExpired(), "Link expired");
        require(!hasClaimed[msg.sender], "Already claimed");
        require(accessMode == AccessMode.ALLOWLIST, "Not allowlist mode");
        require(_isInAllowlist(msg.sender), "Not in allowlist");

        // Mark as claimed BEFORE transfer (CEI pattern)
        hasClaimed[msg.sender] = true;
        claimers.push(msg.sender);

        // Calculate amount
        uint256 amount;
        if (splitMode == SplitMode.CUSTOM) {
            amount = allowedAmounts[msg.sender];
        } else {
            // Equal split
            amount = totalAmount / allowedAddresses.length;
        }

        totalClaimed += amount;

        // Transfer assets
        _transferAssets(msg.sender, amount);

        // Update status if fully claimed
        if (totalClaimed >= totalAmount) {
            status = LinkStatus.COMPLETED;
        }

        emit Claimed(msg.sender, amount);
    }

    /**
     * @notice Pause link (temporarily disable claims)
     */
    function pause() external onlyOwner {
        require(status == LinkStatus.ACTIVE, "Not active");
        require(!isExpired(), "Cannot pause expired link");
        status = LinkStatus.PAUSED;
        emit LinkPaused();
    }

    /**
     * @notice Unpause link (re-enable claims)
     */
    function unpause() external onlyOwner {
        require(status == LinkStatus.PAUSED, "Not paused");
        require(!isExpired(), "Cannot unpause expired link");
        status = LinkStatus.ACTIVE;
        emit LinkUnpaused();
    }

    /**
     * @notice Reclaim remaining assets (only if expired or no expiration)
     */
    function reclaimAssets() external onlyOwner {
        require(
            isExpired() || expirationTime == 0,
            "Can only reclaim if expired or no expiration set"
        );

        uint256 remaining = getRemainingAmount();
        require(remaining > 0, "Nothing to reclaim");

        totalClaimed = totalAmount;

        // Set status
        if (claimers.length > 0) {
            status = LinkStatus.COMPLETED;
        } else {
            status = LinkStatus.CANCELLED;
        }

        _transferAssets(creator, remaining);

        emit AssetsReclaimed(creator, remaining);
    }

    /**
     * @notice Cancel link (permanent disable + immediate reclaim)
     */
    function cancel() external onlyOwner {
        require(status != LinkStatus.CANCELLED, "Already cancelled");
        require(status != LinkStatus.COMPLETED, "Already completed");

        uint256 remaining = getRemainingAmount();

        status = LinkStatus.CANCELLED;

        if (remaining > 0) {
            totalClaimed = totalAmount;
            _transferAssets(creator, remaining);
        }

        emit LinkCancelled(creator, remaining);
    }

    /**
     * @notice Extend expiration time
     * @param newExpirationTime New expiration timestamp IN SECONDS
     */
    function extendExpiration(uint256 newExpirationTime) external onlyOwner {
        require(newExpirationTime > block.timestamp, "Must be future");
        require(
            expirationTime == 0 || newExpirationTime > expirationTime,
            "Must extend, not reduce"
        );
        expirationTime = newExpirationTime;
        emit ExpirationExtended(newExpirationTime);
    }

    // View functions

    function getClaimableAmount(
        address claimer
    ) external view returns (uint256) {
        if (hasClaimed[claimer]) return 0;
        if (status != LinkStatus.ACTIVE) return 0;
        if (isExpired()) return 0;

        if (accessMode == AccessMode.ALLOWLIST) {
            if (!_isInAllowlist(claimer)) return 0;
            if (splitMode == SplitMode.CUSTOM) {
                return allowedAmounts[claimer];
            } else {
                return totalAmount / allowedAddresses.length;
            }
        } else {
            // Anyone mode
            if (splitMode == SplitMode.EQUAL) {
                if (claimers.length >= maxClaimers) return 0;
                return totalAmount / maxClaimers;
            } else {
                return totalAmount;
            }
        }
    }

    function getClaimers() external view returns (address[] memory) {
        return claimers;
    }

    function getRemainingAmount() public view returns (uint256) {
        return totalAmount - totalClaimed;
    }

    function isExpired() public view returns (bool) {
        return expirationTime > 0 && block.timestamp >= expirationTime;
    }

    function canClaim(
        address claimer
    ) external view returns (bool, string memory) {
        if (hasClaimed[claimer]) return (false, "Already claimed");
        if (status != LinkStatus.ACTIVE) return (false, "Link not active");
        if (isExpired()) return (false, "Link expired");

        if (accessMode == AccessMode.ALLOWLIST) {
            if (!_isInAllowlist(claimer)) return (false, "Not in allowlist");
        } else {
            if (
                splitMode == SplitMode.EQUAL && claimers.length >= maxClaimers
            ) {
                return (false, "Max claimers reached");
            }
        }

        return (true, "");
    }

    // Internal functions

    function _calculateClaimAmount() internal view returns (uint256) {
        if (splitMode == SplitMode.EQUAL) {
            return totalAmount / maxClaimers;
        } else {
            return totalAmount;
        }
    }

    function _isInAllowlist(address addr) internal view returns (bool) {
        for (uint256 i = 0; i < allowedAddresses.length; i++) {
            if (allowedAddresses[i] == addr) return true;
        }
        return false;
    }

    function _transferAssets(address to, uint256 amount) internal {
        if (assetType == AssetType.NATIVE) {
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "Transfer failed");
        } else {
            require(
                IERC20(assetAddress).transfer(to, amount),
                "Transfer failed"
            );
        }
    }

    // Allow contract to receive ETH
    receive() external payable {}
}
