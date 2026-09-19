const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("VotingManager", function () {
  let VotingManager, votingManager
  let owner, treasury, user1, user2

  const VOTE_FEE = ethers.utils.parseEther("0.0035")
  const COIN_ID_1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("coin-abc123"))
  const COIN_ID_2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("coin-xyz789"))

  beforeEach(async function () {
    ;[owner, treasury, user1, user2] = await ethers.getSigners()
    VotingManager = await ethers.getContractFactory("VotingManager")
    votingManager = await VotingManager.deploy(treasury.address)
    await votingManager.deployed()
  })

  // ─── Deployment ───────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await votingManager.owner()).to.equal(owner.address)
    })

    it("should set the correct treasury", async function () {
      expect(await votingManager.treasury()).to.equal(treasury.address)
    })

    it("should set default vote fee", async function () {
      expect(await votingManager.voteFee()).to.equal(VOTE_FEE)
    })

    it("should set default daily vote limit of 5", async function () {
      expect(await votingManager.dailyVoteLimit()).to.equal(5)
    })
  })

  // ─── Voting ───────────────────────────────────────────────────────────

  describe("Voting", function () {
    it("should record a vote", async function () {
      await votingManager.connect(user1).vote(COIN_ID_1, { value: VOTE_FEE })
      expect(await votingManager.totalVotes(COIN_ID_1)).to.equal(1)
      expect(await votingManager.getUserVotesForCoin(COIN_ID_1, user1.address)).to.equal(1)
      expect(await votingManager.totalVotesCast()).to.equal(1)
    })

    it("should emit Voted event", async function () {
      await expect(
        votingManager.connect(user1).vote(COIN_ID_1, { value: VOTE_FEE })
      )
        .to.emit(votingManager, "Voted")
        .withArgs(user1.address, COIN_ID_1, 1)
    })

    it("should forward fees to treasury", async function () {
      const treasuryBefore = await ethers.provider.getBalance(treasury.address)
      await votingManager.connect(user1).vote(COIN_ID_1, { value: VOTE_FEE })
      const treasuryAfter = await ethers.provider.getBalance(treasury.address)

      expect(treasuryAfter.sub(treasuryBefore)).to.equal(VOTE_FEE)
    })

    it("should accumulate votes from multiple users", async function () {
      await votingManager.connect(user1).vote(COIN_ID_1, { value: VOTE_FEE })
      await votingManager.connect(user2).vote(COIN_ID_1, { value: VOTE_FEE })
      expect(await votingManager.totalVotes(COIN_ID_1)).to.equal(2)
    })

    it("should track different coins separately", async function () {
      await votingManager.connect(user1).vote(COIN_ID_1, { value: VOTE_FEE })
      await votingManager.connect(user1).vote(COIN_ID_2, { value: VOTE_FEE })
      expect(await votingManager.totalVotes(COIN_ID_1)).to.equal(1)
      expect(await votingManager.totalVotes(COIN_ID_2)).to.equal(1)
      expect(await votingManager.getVotedCoinsCount()).to.equal(2)
    })

    it("should revert with incorrect fee", async function () {
      await expect(
        votingManager.connect(user1).vote(COIN_ID_1, { value: ethers.utils.parseEther("0.01") })
      ).to.be.revertedWith("VotingManager: incorrect fee")
    })

    it("should revert with empty coinId", async function () {
      await expect(
        votingManager.connect(user1).vote(ethers.constants.HashZero, { value: VOTE_FEE })
      ).to.be.revertedWith("VotingManager: empty coinId")
    })
  })

  // ─── Daily Limit ──────────────────────────────────────────────────────

  describe("Daily Vote Limit", function () {
    it("should allow up to 5 votes per day", async function () {
      for (let i = 0; i < 5; i++) {
        await votingManager.connect(user1).vote(COIN_ID_1, { value: VOTE_FEE })
      }
      expect(await votingManager.totalVotes(COIN_ID_1)).to.equal(5)
    })

    it("should revert on 6th vote in same day", async function () {
      for (let i = 0; i < 5; i++) {
        await votingManager.connect(user1).vote(COIN_ID_1, { value: VOTE_FEE })
      }
      await expect(
        votingManager.connect(user1).vote(COIN_ID_1, { value: VOTE_FEE })
      ).to.be.revertedWith("VotingManager: daily limit reached")
    })

    it("should report remaining votes correctly", async function () {
      expect(await votingManager.votesRemainingToday(user1.address)).to.equal(5)

      await votingManager.connect(user1).vote(COIN_ID_1, { value: VOTE_FEE })
      expect(await votingManager.votesRemainingToday(user1.address)).to.equal(4)
    })

    it("should not share limits between users", async function () {
      for (let i = 0; i < 5; i++) {
        await votingManager.connect(user1).vote(COIN_ID_1, { value: VOTE_FEE })
      }
      // user2 should still be able to vote
      await votingManager.connect(user2).vote(COIN_ID_1, { value: VOTE_FEE })
      expect(await votingManager.totalVotes(COIN_ID_1)).to.equal(6)
    })

    it("should allow owner to change daily limit", async function () {
      await votingManager.setDailyVoteLimit(10)
      expect(await votingManager.dailyVoteLimit()).to.equal(10)

      // Now user can vote 10 times
      for (let i = 0; i < 10; i++) {
        await votingManager.connect(user1).vote(COIN_ID_1, { value: VOTE_FEE })
      }
      expect(await votingManager.totalVotes(COIN_ID_1)).to.equal(10)
    })
  })

  // ─── Owner Functions ──────────────────────────────────────────────────

  describe("Owner Admin", function () {
    it("should allow owner to update vote fee", async function () {
      const newFee = ethers.utils.parseEther("0.005")
      await votingManager.setVoteFee(newFee)
      expect(await votingManager.voteFee()).to.equal(newFee)
    })

    it("should allow owner to update treasury", async function () {
      await votingManager.setTreasury(user2.address)
      expect(await votingManager.treasury()).to.equal(user2.address)
    })

    it("should reject non-owner admin calls", async function () {
      await expect(
        votingManager.connect(user1).setVoteFee(ethers.utils.parseEther("0.01"))
      ).to.be.reverted
      await expect(
        votingManager.connect(user1).setTreasury(user2.address)
      ).to.be.reverted
    })

    it("should allow pausing and unpausing", async function () {
      await votingManager.pause()
      await expect(
        votingManager.connect(user1).vote(COIN_ID_1, { value: VOTE_FEE })
      ).to.be.reverted

      await votingManager.unpause()
      await votingManager.connect(user1).vote(COIN_ID_1, { value: VOTE_FEE })
      expect(await votingManager.totalVotes(COIN_ID_1)).to.equal(1)
    })
  })
})
