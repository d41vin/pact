// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract GroupFundImplementation is Initializable, ReentrancyGuardUpgradeable {
    // State variables
    address public creator;
    address public groupAddress; // Off-chain group identifier

    mapping(address => bool) public isAdmin;
    address[] private adminsList;

    mapping(address => uint256) public memberContributions;
    address[] private membersList;
    mapping(address => bool) private isMemberTracked;

    uint256 public totalDeposited;
    uint256 public totalWithdrawn;

    // Events
    event GroupFundCreated(
        address indexed creator,
        address indexed groupAddress
    );
    event Deposited(address indexed member, uint256 amount);
    event Withdrawn(
        address indexed admin,
        address indexed recipient,
        uint256 amount
    );
    event AdminAdded(address indexed admin, address indexed addedBy);
    event AdminRemoved(address indexed admin, address indexed removedBy);

    // Errors
    error OnlyCreator();
    error OnlyAdmin();
    error ZeroAmount();
    error InsufficientBalance();
    error CannotRemoveCreator();
    error AlreadyAdmin();
    error NotAnAdmin();
    error TransferFailed();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the group fund
     * @param _creator The creator of the group (permanent admin)
     * @param _groupAddress Off-chain group identifier
     * @param _initialAdmins Initial list of admins (creator is auto-included)
     */
    function initialize(
        address _creator,
        address _groupAddress,
        address[] memory _initialAdmins
    ) external initializer {
        __ReentrancyGuard_init();

        require(_creator != address(0), "Invalid creator");
        require(_groupAddress != address(0), "Invalid group address");

        creator = _creator;
        groupAddress = _groupAddress;

        // Creator is always an admin
        isAdmin[_creator] = true;
        adminsList.push(_creator);

        // Add initial admins
        for (uint256 i = 0; i < _initialAdmins.length; i++) {
            address admin = _initialAdmins[i];
            if (admin != address(0) && admin != _creator && !isAdmin[admin]) {
                isAdmin[admin] = true;
                adminsList.push(admin);
            }
        }

        emit GroupFundCreated(_creator, _groupAddress);
    }

    /**
     * @notice Deposit ETH into the group fund
     * @dev Anyone can deposit, contributions are tracked per address
     */
    function deposit() external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

        // Track member if first deposit
        if (!isMemberTracked[msg.sender]) {
            membersList.push(msg.sender);
            isMemberTracked[msg.sender] = true;
        }

        memberContributions[msg.sender] += msg.value;
        totalDeposited += msg.value;

        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw funds from the group fund (admin only)
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant {
        if (!isAdmin[msg.sender]) revert OnlyAdmin();
        if (amount == 0) revert ZeroAmount();
        if (amount > getBalance()) revert InsufficientBalance();

        totalWithdrawn += amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Withdrawn(msg.sender, msg.sender, amount);
    }

    /**
     * @notice Add a new admin (creator only)
     * @param newAdmin Address to grant admin privileges
     */
    function addAdmin(address newAdmin) external {
        if (msg.sender != creator) revert OnlyCreator();
        if (newAdmin == address(0)) revert("Invalid address");
        if (isAdmin[newAdmin]) revert AlreadyAdmin();

        isAdmin[newAdmin] = true;
        adminsList.push(newAdmin);

        emit AdminAdded(newAdmin, msg.sender);
    }

    /**
     * @notice Remove an admin (creator only)
     * @param admin Address to revoke admin privileges
     */
    function removeAdmin(address admin) external {
        if (msg.sender != creator) revert OnlyCreator();
        if (admin == creator) revert CannotRemoveCreator();
        if (!isAdmin[admin]) revert NotAnAdmin();

        isAdmin[admin] = false;

        // Remove from admins list
        for (uint256 i = 0; i < adminsList.length; i++) {
            if (adminsList[i] == admin) {
                adminsList[i] = adminsList[adminsList.length - 1];
                adminsList.pop();
                break;
            }
        }

        emit AdminRemoved(admin, msg.sender);
    }

    // ==================== VIEW FUNCTIONS ====================

    /**
     * @notice Get current balance of the fund
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Get total contribution by a member
     * @param member Address to check
     */
    function getMemberContribution(
        address member
    ) external view returns (uint256) {
        return memberContributions[member];
    }

    /**
     * @notice Get list of all admins
     */
    function getAdmins() external view returns (address[] memory) {
        return adminsList;
    }

    /**
     * @notice Get list of all members who have deposited
     */
    function getMembers() external view returns (address[] memory) {
        return membersList;
    }

    /**
     * @notice Get fund statistics
     * @return balance Current balance
     * @return deposited Total amount ever deposited
     * @return withdrawn Total amount ever withdrawn
     * @return memberCount Number of unique depositors
     * @return adminCount Number of admins
     */
    function getStats()
        external
        view
        returns (
            uint256 balance,
            uint256 deposited,
            uint256 withdrawn,
            uint256 memberCount,
            uint256 adminCount
        )
    {
        return (
            getBalance(),
            totalDeposited,
            totalWithdrawn,
            membersList.length,
            adminsList.length
        );
    }

    // Allow contract to receive ETH
    receive() external payable {
        // Auto-deposit when sending ETH directly
        if (msg.value > 0) {
            if (!isMemberTracked[msg.sender]) {
                membersList.push(msg.sender);
                isMemberTracked[msg.sender] = true;
            }
            memberContributions[msg.sender] += msg.value;
            totalDeposited += msg.value;
            emit Deposited(msg.sender, msg.value);
        }
    }
}
