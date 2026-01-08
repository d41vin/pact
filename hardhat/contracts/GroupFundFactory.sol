// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./GroupFundImplementation.sol";

contract GroupFundFactory {
    address public implementation;
    mapping(address => address[]) public userGroupFunds;

    event GroupFundDeployed(
        address indexed creator,
        address indexed groupFund,
        address indexed groupAddress
    );

    constructor() {
        implementation = address(new GroupFundImplementation());
    }

    /**
     * @notice Create a new group fund
     * @param _groupCreator The creator of the group
     * @param _groupAddress Off-chain group identifier
     * @param _initialAdmins Initial list of admins (creator auto-included)
     * @return The address of the newly deployed group fund
     */
    function createGroupFund(
        address _groupCreator,
        address _groupAddress,
        address[] memory _initialAdmins
    ) external returns (address) {
        require(_groupCreator != address(0), "Invalid creator");
        require(_groupAddress != address(0), "Invalid group address");

        // Clone implementation using minimal proxy pattern
        address clone = Clones.clone(implementation);

        // Initialize the clone
        GroupFundImplementation(payable(clone)).initialize(
            _groupCreator,
            _groupAddress,
            _initialAdmins
        );

        // Track deployment
        userGroupFunds[_groupCreator].push(clone);

        emit GroupFundDeployed(_groupCreator, clone, _groupAddress);

        return clone;
    }

    /**
     * @notice Get all group funds created by a user
     * @param user Address to query
     * @return Array of group fund addresses
     */
    function getUserGroupFunds(
        address user
    ) external view returns (address[] memory) {
        return userGroupFunds[user];
    }

    /**
     * @notice Get the implementation address
     * @return The address of the implementation contract
     */
    function getImplementation() external view returns (address) {
        return implementation;
    }
}
