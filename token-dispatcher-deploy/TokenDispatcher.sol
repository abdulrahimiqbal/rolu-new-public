// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TokenDispatcher
 * @dev Contract for batch processing of ROLU token transfers
 * This contract accepts arrays of recipients and amounts, then transfers tokens
 * from the sender (admin wallet) to multiple recipients in a single transaction
 */
contract TokenDispatcher is Ownable, ReentrancyGuard {
    // ROLU Token contract address
    IERC20 public roluToken;
    
    // Events for tracking batch transfers
    event BatchTransferExecuted(
        address indexed sender,
        uint256 recipientCount,
        uint256 totalAmount
    );
    
    event SingleTransferFailed(
        address indexed recipient,
        uint256 amount,
        string reason
    );

    /**
     * @dev Constructor initializes the contract with the ROLU token address
     * @param _roluTokenAddress Address of the deployed RoluToken contract
     */
    constructor(address _roluTokenAddress) Ownable(msg.sender) {
        require(_roluTokenAddress != address(0), "Token address cannot be zero");
        roluToken = IERC20(_roluTokenAddress);
    }
    
    /**
     * @dev Executes batch transfers of tokens from sender to multiple recipients
     * @param recipients Array of recipient addresses
     * @param amounts Array of token amounts to transfer (in token units, not wei)
     * @return successCount Number of successful transfers
     * 
     * Requirements:
     * - Arrays must be equal length
     * - Sender must have approved this contract to spend the total amount
     * - Sender must have sufficient balance
     */
    function batchTransfer(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external nonReentrant returns (uint256 successCount) {
        require(recipients.length == amounts.length, "Arrays must be equal length");
        require(recipients.length > 0, "Batch must not be empty");
        
        uint256 totalAmount = 0;
        successCount = 0;
        
        // Calculate total amount to transfer
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        // Execute transfers
        for (uint256 i = 0; i < recipients.length; i++) {
            address recipient = recipients[i];
            uint256 amount = amounts[i];
            
            if (recipient == address(0)) {
                emit SingleTransferFailed(recipient, amount, "Zero address");
                continue;
            }
            
            try roluToken.transferFrom(msg.sender, recipient, amount) returns (bool success) {
                if (success) {
                    successCount++;
                } else {
                    emit SingleTransferFailed(recipient, amount, "Transfer returned false");
                }
            } catch Error(string memory reason) {
                emit SingleTransferFailed(recipient, amount, reason);
            } catch (bytes memory) {
                emit SingleTransferFailed(recipient, amount, "Unknown error");
            }
        }
        
        emit BatchTransferExecuted(msg.sender, successCount, totalAmount);
        return successCount;
    }
    
    /**
     * @dev Updates the ROLU token address - only callable by owner
     * @param _newRoluTokenAddress New address of the ROLU token contract
     */
    function updateTokenAddress(address _newRoluTokenAddress) external onlyOwner {
        require(_newRoluTokenAddress != address(0), "Token address cannot be zero");
        roluToken = IERC20(_newRoluTokenAddress);
    }
    
    /**
     * @dev Emergency function to recover any ERC20 tokens sent to contract by mistake
     * @param tokenAddress Address of the token to recover
     * @param to Address to send the recovered tokens
     * @param amount Amount of tokens to recover
     */
    function recoverERC20(address tokenAddress, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot recover to zero address");
        IERC20(tokenAddress).transfer(to, amount);
    }
} 