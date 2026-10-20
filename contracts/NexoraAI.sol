// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Nexora AI
 * @notice Platform credit system for the Nexora AI token voting and promotion dApp.
 *         Users purchase Nexora AI credits with ETH. Credits can be spent to vote
 *         for token listings or to purchase tier upgrades (Ruby / Diamond).
 * @dev    All ETH received is held in the contract until the owner withdraws.
 */
contract NexoraAI is ReentrancyGuard, Ownable, Pausable {

    // ─── State ────────────────────────────────────────────────────────────

    /// @notice Nexora AI credit balance per address
    mapping(address => uint256) public credits;

    /// @notice Total credits ever minted (for analytics)
    uint256 public totalCreditsMinted;

    /// @notice Tier prices in wei (configurable by owner)
    uint256 public rubyTierPrice  = 0.5 ether;   // 250 votes equivalent
    uint256 public diamondTierPrice = 1 ether;    // 500 votes equivalent

    /// @notice Credit rates: ETH amount => credits granted
    /// Stored as sorted parallel arrays for gas-efficient lookup.
    uint256[9] public creditAmounts = [
        0.001 ether,   // → 5 credits
        0.005 ether,   // → 25 credits
        0.01  ether,   // → 55 credits
        0.05  ether,   // → 275 credits
        0.1   ether,   // → 550 credits
        0.5   ether,   // → 2750 credits
        1     ether,   // → 5500 credits
        3     ether,   // → 18000 credits
        5     ether    // → 30000 credits
    ];

    uint256[9] public creditRewards = [
        5, 25, 55, 275, 550, 2750, 5500, 18000, 30000
    ];

    /// @notice Treasury address that receives vote fees (ETH transfers)
    address payable public treasury;

    // ─── Events ───────────────────────────────────────────────────────────

    event CreditsPurchased(address indexed buyer, uint256 ethAmount, uint256 creditsReceived);
    event RubyTierPurchased(address indexed buyer, uint256 ethPaid);
    event DiamondTierPurchased(address indexed buyer, uint256 ethPaid);
    event CreditsSpent(address indexed spender, uint256 amount, string reason);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event TierPriceUpdated(string tier, uint256 oldPrice, uint256 newPrice);
    event CreditRateUpdated(uint256 index, uint256 ethAmount, uint256 credits);
    event Withdrawn(address indexed to, uint256 amount);

    // ─── Constructor ──────────────────────────────────────────────────────

    /**
     * @param _treasury  Address that receives vote-fee ETH transfers
     */
    constructor(address payable _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "Nexora AI: zero treasury");
        treasury = _treasury;
    }

    // ─── Public / External ────────────────────────────────────────────────

    /**
     * @notice Purchase Nexora AI credits by sending one of the accepted ETH amounts.
     * @dev    Reverts if msg.value does not match any rate tier.
     */
    function buyCredits() external payable nonReentrant whenNotPaused {
        uint256 reward = _creditRewardFor(msg.value);
        require(reward > 0, "Nexora AI: invalid ETH amount");

        credits[msg.sender] += reward;
        totalCreditsMinted += reward;

        emit CreditsPurchased(msg.sender, msg.value, reward);
    }

    /**
     * @notice Purchase a Ruby tier upgrade by sending the exact rubyTierPrice.
     */
    function buyRubyTier() external payable nonReentrant whenNotPaused {
        require(msg.value == rubyTierPrice, "Nexora AI: incorrect ruby price");
        emit RubyTierPurchased(msg.sender, msg.value);
    }

    /**
     * @notice Purchase a Diamond tier upgrade by sending the exact diamondTierPrice.
     */
    function buyDiamondTier() external payable nonReentrant whenNotPaused {
        require(msg.value == diamondTierPrice, "Nexora AI: incorrect diamond price");
        emit DiamondTierPurchased(msg.sender, msg.value);
    }

    /**
     * @notice Spend credits (e.g. for voting). Called by trusted contracts or owner.
     * @param  amount  Number of credits to spend.
     * @param  reason  Human-readable reason (e.g. "vote").
     */
    function spendCredits(uint256 amount, string calldata reason) external nonReentrant {
        require(credits[msg.sender] >= amount, "Nexora AI: insufficient credits");
        credits[msg.sender] -= amount;
        emit CreditsSpent(msg.sender, amount, reason);
    }

    /**
     * @notice Read a user's credit balance.
     */
    function getCredits(address account) external view returns (uint256) {
        return credits[account];
    }

    // ─── Owner Admin ──────────────────────────────────────────────────────

    /**
     * @notice Update the treasury address.
     */
    function setTreasury(address payable _treasury) external onlyOwner {
        require(_treasury != address(0), "Nexora AI: zero address");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    /**
     * @notice Update tier prices.
     */
    function setRubyTierPrice(uint256 _price) external onlyOwner {
        emit TierPriceUpdated("ruby", rubyTierPrice, _price);
        rubyTierPrice = _price;
    }

    function setDiamondTierPrice(uint256 _price) external onlyOwner {
        emit TierPriceUpdated("diamond", diamondTierPrice, _price);
        diamondTierPrice = _price;
    }

    /**
     * @notice Update a credit rate tier (index 0-8).
     */
    function setCreditRate(uint256 index, uint256 ethAmount, uint256 creditsGiven) external onlyOwner {
        require(index < 9, "Nexora AI: index out of range");
        creditAmounts[index] = ethAmount;
        creditRewards[index] = creditsGiven;
        emit CreditRateUpdated(index, ethAmount, creditsGiven);
    }

    /**
     * @notice Withdraw all ETH held by the contract to the treasury.
     */
    function withdraw() external nonReentrant onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Nexora AI: nothing to withdraw");
        (bool ok, ) = treasury.call{value: balance}("");
        require(ok, "Nexora AI: transfer failed");
        emit Withdrawn(treasury, balance);
    }

    /**
     * @notice Pause / unpause the contract (disables credit purchases & tier buys).
     */
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── Internal ─────────────────────────────────────────────────────────

    function _creditRewardFor(uint256 ethAmount) internal view returns (uint256) {
        for (uint256 i = 0; i < 9; i++) {
            if (ethAmount == creditAmounts[i]) return creditRewards[i];
        }
        return 0;
    }

    /// @notice Accept plain ETH transfers (treated same as buyCredits).
    receive() external payable {
        // Accept ETH — allows contract to hold funds.
    }
}
