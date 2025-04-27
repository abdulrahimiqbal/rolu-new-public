// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RoluToken
 * @dev ERC20 token for the Rolu educational gaming platform
 * - Implements pausable functionality for emergency situations
 * - Owner can mint new tokens (used only during initial deployment)
 * - Fixed supply of 100,000,000 tokens
 */
contract RoluToken is ERC20, ERC20Pausable, Ownable {
    // Token configuration
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18; // 100 million tokens with 18 decimals
    uint256 public constant TREASURY_ALLOCATION = 90_000_000 * 10**18; // 90% to treasury
    uint256 public constant TEAM_ALLOCATION = 10_000_000 * 10**18; // 10% to team/operations/marketing

    // Initial allocations for treasury and team addresses
    address public treasuryAddress;
    address public teamAddress;

    /**
     * @dev Constructor initializes the token and mints initial supply
     * @param _treasury Treasury address to receive 90% of tokens
     * @param _team Team address to receive 10% of tokens
     */
    constructor(
        address _treasury,
        address _team
    ) ERC20("Rolu Token", "ROLU") Ownable(msg.sender) {
        require(_treasury != address(0), "Treasury address cannot be 0");
        require(_team != address(0), "Team address cannot be 0");

        treasuryAddress = _treasury;
        teamAddress = _team;

        // Mint initial supply
        _mint(_treasury, TREASURY_ALLOCATION);
        _mint(_team, TEAM_ALLOCATION);
    }

    /**
     * @dev Function to pause all token transfers
     * Only callable by the owner in emergency situations
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Function to unpause all token transfers
     * Only callable by the owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Implementation of the ERC20 and ERC20Pausable _update function
     * Handles transfers while respecting the pause status
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, amount);
    }
} 