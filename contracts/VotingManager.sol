// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title VotingManager
 * @notice On-chain voting for token listings in the Nexora AI dApp.
 *         Users pay a small ETH fee per vote. Votes are tracked per listing
 *         (identified by a bytes32 coinId). Daily vote limits apply per wallet.
 */
contract VotingManager is ReentrancyGuard, Ownable, Pausable {

    // ─── State ────────────────────────────────────────────────────────────

    /// @notice ETH fee per vote (configurable)
    uint256 public voteFee = 0.0035 ether;

    /// @notice Max votes per wallet per day
    uint256 public dailyVoteLimit = 5;

    /// @notice Treasury that receives vote fees
    address payable public treasury;

    /// @notice Total votes per listing (coinId => count)
    mapping(bytes32 => uint256) public totalVotes;

    /// @notice Votes per listing per user
    mapping(bytes32 => mapping(address => uint256)) public userVotesForCoin;

    /// @notice Daily vote tracking: keccak256(address, dayNumber) => count
    mapping(bytes32 => uint256) public dailyVoteCount;

    /// @notice Global vote counter
    uint256 public totalVotesCast;

    /// @notice All coin IDs that have received at least one vote
    bytes32[] public votedCoins;
    mapping(bytes32 => bool) public coinExists;

    // ─── Events ───────────────────────────────────────────────────────────

    event Voted(address indexed voter, bytes32 indexed coinId, uint256 newTotal);
    event VoteFeeUpdated(uint256 oldFee, uint256 newFee);
    event DailyLimitUpdated(uint256 oldLimit, uint256 newLimit);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event FeesWithdrawn(address indexed to, uint256 amount);

    // ─── Constructor ──────────────────────────────────────────────────────

    /**
     * @param _treasury  Address that receives vote fees.
     */
    constructor(address payable _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "VotingManager: zero treasury");
        treasury = _treasury;
    }

    // ─── Public ───────────────────────────────────────────────────────────

    /**
     * @notice Vote for a token listing.
     * @param  coinId  Unique identifier for the listing (e.g. keccak256 of Firebase key).
     */
    function vote(bytes32 coinId) external payable nonReentrant whenNotPaused {
        require(msg.value == voteFee, "VotingManager: incorrect fee");
        require(coinId != bytes32(0), "VotingManager: empty coinId");

        // Enforce daily limit
        bytes32 dayKey = keccak256(abi.encodePacked(msg.sender, _currentDay()));
        require(dailyVoteCount[dayKey] < dailyVoteLimit, "VotingManager: daily limit reached");
        dailyVoteCount[dayKey]++;

        // Record vote
        totalVotes[coinId]++;
        userVotesForCoin[coinId][msg.sender]++;
        totalVotesCast++;

        // Track new coins
        if (!coinExists[coinId]) {
            coinExists[coinId] = true;
            votedCoins.push(coinId);
        }

        // Forward fee to treasury
        (bool ok, ) = treasury.call{value: msg.value}("");
        require(ok, "VotingManager: fee transfer failed");

        emit Voted(msg.sender, coinId, totalVotes[coinId]);
    }

    /**
     * @notice Get the total votes for a listing.
     */
    function getVotes(bytes32 coinId) external view returns (uint256) {
        return totalVotes[coinId];
    }

    /**
     * @notice Get how many votes a user has cast for a specific listing.
     */
    function getUserVotesForCoin(bytes32 coinId, address voter) external view returns (uint256) {
        return userVotesForCoin[coinId][voter];
    }

    /**
     * @notice Check how many votes a user has remaining today.
     */
    function votesRemainingToday(address voter) external view returns (uint256) {
        bytes32 dayKey = keccak256(abi.encodePacked(voter, _currentDay()));
        uint256 used = dailyVoteCount[dayKey];
        if (used >= dailyVoteLimit) return 0;
        return dailyVoteLimit - used;
    }

    /**
     * @notice Get the number of unique coins that have been voted on.
     */
    function getVotedCoinsCount() external view returns (uint256) {
        return votedCoins.length;
    }

    // ─── Owner Admin ──────────────────────────────────────────────────────

    function setVoteFee(uint256 _fee) external onlyOwner {
        emit VoteFeeUpdated(voteFee, _fee);
        voteFee = _fee;
    }

    function setDailyVoteLimit(uint256 _limit) external onlyOwner {
        emit DailyLimitUpdated(dailyVoteLimit, _limit);
        dailyVoteLimit = _limit;
    }

    function setTreasury(address payable _treasury) external onlyOwner {
        require(_treasury != address(0), "VotingManager: zero address");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * @notice Withdraw any ETH stuck in the contract (shouldn't accumulate
     *         since vote() forwards fees immediately, but just in case).
     */
    function withdrawStuck() external nonReentrant onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "VotingManager: nothing to withdraw");
        (bool ok, ) = treasury.call{value: bal}("");
        require(ok, "VotingManager: transfer failed");
        emit FeesWithdrawn(treasury, bal);
    }

    // ─── Internal ─────────────────────────────────────────────────────────

    /// @dev Returns the current UTC day number (block.timestamp / 86400).
    function _currentDay() internal view returns (uint256) {
        return block.timestamp / 86400;
    }

    receive() external payable {}
}
