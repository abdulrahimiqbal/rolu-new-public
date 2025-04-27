// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RoluRewards
 * @dev Contract to manage the claiming of ROLU rewards by users.
 * Users claim rewards based on a signature provided by a trusted backend admin.
 * The contract pulls tokens from a designated treasury address upon successful claim verification.
 */
contract RoluRewards is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    IERC20 public immutable roluToken;
    address public immutable treasuryAddress;
    address public adminAddress; // The address authorized to sign claim messages

    // Nonce tracking to prevent replay attacks
    // Nonce => claimed status
    mapping(uint256 => bool) public claimedNonces;

    /**
     * @dev Emitted when a user successfully claims rewards.
     * @param user The address of the user claiming rewards.
     * @param amountWei The amount of ROLU claimed (in wei).
     * @param nonce The nonce used for this claim verification.
     */
    event RewardsClaimed(address indexed user, uint256 amountWei, uint256 nonce);

    /**
     * @dev Emitted when the admin address is updated.
     * @param oldAdminAddress The previous admin address.
     * @param newAdminAddress The new admin address.
     */
    event AdminAddressUpdated(address indexed oldAdminAddress, address indexed newAdminAddress);

    /**
     * @dev Thrown when signature verification fails.
     */
    error InvalidSignature();

    /**
     * @dev Thrown when the nonce has already been used.
     */
    error NonceAlreadyClaimed();

    /**
     * @dev Thrown when the claim amount is zero.
     */
    error ZeroClaimAmount();

     /**
     * @dev Thrown when the ERC20 transferFrom fails.
     */
    error TransferFailed();

    /**
     * @param _initialOwner The initial owner of this contract.
     * @param _roluTokenAddress The address of the ROLU ERC20 token contract.
     * @param _treasuryAddress The address holding the ROLU tokens to be distributed.
     * @param _adminAddress The address authorized to sign claim messages.
     */
    constructor(
        address _initialOwner,
        address _roluTokenAddress,
        address _treasuryAddress,
        address _adminAddress
    ) Ownable(_initialOwner) {
        require(_roluTokenAddress != address(0), "Invalid ROLU token address");
        require(_treasuryAddress != address(0), "Invalid treasury address");
        require(_adminAddress != address(0), "Invalid admin address");

        roluToken = IERC20(_roluTokenAddress);
        treasuryAddress = _treasuryAddress;
        adminAddress = _adminAddress;
    }

    /**
     * @notice Allows a user to claim their ROLU rewards.
     * @dev Verifies a signature provided by the backend admin before transferring tokens.
     * The signature must correspond to a hash of the claimant's address, the amount, and a unique nonce.
     * @param _amountWei The total amount of ROLU tokens to claim (in wei, 1e18 format).
     * @param _nonce A unique nonce provided by the backend for this claim attempt.
     * @param _signature The EIP-712 style signature from the admin address.
     */
    function claimRewards(uint256 _amountWei, uint256 _nonce, bytes calldata _signature) external nonReentrant {
        // 1. Check _amountWei > 0
        if (_amountWei == 0) {
            revert ZeroClaimAmount();
        }

        // 2. Check claimedNonces[_nonce] == false
        if (claimedNonces[_nonce]) {
            revert NonceAlreadyClaimed();
        }

        // 3. Construct message hash
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, _amountWei, _nonce));

        // 4. Recover signer using ECDSA library
        // Assumes the signature was created with the standard Ethereum Signed Message prefix
        address recoveredSigner = ECDSA.recover(messageHash, _signature);

        // 5. Require signer == adminAddress
        if (recoveredSigner != adminAddress) {
            revert InvalidSignature();
        }

        // 6. Set claimedNonces[_nonce] = true (Mark nonce as used *before* transfer)
        claimedNonces[_nonce] = true;

        // 7. Call roluToken.transferFrom(treasuryAddress, msg.sender, _amountWei)
        bool success = roluToken.transferFrom(treasuryAddress, msg.sender, _amountWei);
        if (!success) {
            revert TransferFailed();
        }

        // 8. Emit RewardsClaimed event
        emit RewardsClaimed(msg.sender, _amountWei, _nonce);
    }

    // --- Admin Functions ---

    /**
     * @notice Updates the address authorized to sign claim messages.
     * @param _newAdminAddress The new admin address.
     */
    function updateAdminAddress(address _newAdminAddress) external onlyOwner {
        require(_newAdminAddress != address(0), "Invalid admin address");
        address oldAdminAddress = adminAddress;
        adminAddress = _newAdminAddress;
        emit AdminAddressUpdated(oldAdminAddress, _newAdminAddress);
    }

     /**
     * @notice Allows the owner to withdraw any ROLU tokens accidentally sent directly to this contract.
     * @param _amount The amount of ROLU tokens to withdraw.
     */
    function withdrawStuckTokens(uint256 _amount) external onlyOwner {
       require(roluToken.transfer(owner(), _amount), "Withdraw failed");
    }

     /**
     * @notice Allows the owner to withdraw any ETH accidentally sent to this contract.
     */
    function withdrawStuckEth() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
} 