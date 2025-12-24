// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./ClaimLinkImplementation.sol";

contract ClaimLinkFactory {
    address public implementation;
    mapping(address => address[]) public userClaimLinks;

    event ClaimLinkDeployed(
        address indexed creator,
        address indexed claimLink,
        uint8 assetType
    );

    constructor() {
        implementation = address(new ClaimLinkImplementation());
    }

    function createClaimLink(
        uint8 _assetType,
        address _assetAddress,
        uint256 _totalAmount,
        uint8 _accessMode,
        uint8 _splitMode,
        uint256 _expirationTime, // ⚠️ IN SECONDS (not milliseconds)
        uint256 _maxClaimers,
        address[] memory _allowlist,
        uint256[] memory _customAmounts,
        address _proofAddress
    ) external payable returns (address) {
        // Clone implementation
        address clone = Clones.clone(implementation);

        // Initialize
        ClaimLinkImplementation(payable(clone)).initialize(
            msg.sender,
            ClaimLinkImplementation.AssetType(_assetType),
            _assetAddress,
            _totalAmount,
            ClaimLinkImplementation.AccessMode(_accessMode),
            ClaimLinkImplementation.SplitMode(_splitMode),
            _expirationTime,
            _maxClaimers,
            _allowlist,
            _customAmounts,
            _proofAddress
        );

        // If native, fund immediately
        if (_assetType == 0) {
            // NATIVE
            require(msg.value == _totalAmount, "Incorrect value");
            (bool success, ) = payable(clone).call{value: msg.value}("");
            require(success, "Funding failed");
        }

        // Track
        userClaimLinks[msg.sender].push(clone);

        emit ClaimLinkDeployed(msg.sender, clone, _assetType);

        return clone;
    }

    function getUserClaimLinks(
        address user
    ) external view returns (address[] memory) {
        return userClaimLinks[user];
    }
}
