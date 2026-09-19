const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("Nexora AI", function () {
  let NexoraAI, nitroGem
  let owner, treasury, user1, user2

  beforeEach(async function () {
    ;[owner, treasury, user1, user2] = await ethers.getSigners()
    NexoraAI = await ethers.getContractFactory("NexoraAI")
    nitroGem = await NexoraAI.deploy(treasury.address)
    await nitroGem.deployed()
  })

  // ─── Deployment ───────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await nitroGem.owner()).to.equal(owner.address)
    })

    it("should set the correct treasury", async function () {
      expect(await nitroGem.treasury()).to.equal(treasury.address)
    })

    it("should set default tier prices", async function () {
      expect(await nitroGem.rubyTierPrice()).to.equal(ethers.utils.parseEther("0.5"))
      expect(await nitroGem.diamondTierPrice()).to.equal(ethers.utils.parseEther("1"))
    })

    it("should revert if treasury is zero address", async function () {
      await expect(
        NexoraAI.deploy(ethers.constants.AddressZero)
      ).to.be.revertedWith("Nexora AI: zero treasury")
    })
  })

  // ─── Buy Credits ──────────────────────────────────────────────────────

  describe("buyCredits", function () {
    const testCases = [
      { eth: "0.001", credits: 5 },
      { eth: "0.005", credits: 25 },
      { eth: "0.01", credits: 55 },
      { eth: "0.05", credits: 275 },
      { eth: "0.1", credits: 550 },
      { eth: "0.5", credits: 2750 },
      { eth: "1", credits: 5500 },
      { eth: "3", credits: 18000 },
      { eth: "5", credits: 30000 },
    ]

    testCases.forEach(({ eth, credits }) => {
      it(`should grant ${credits} credits for ${eth} ETH`, async function () {
        await nitroGem.connect(user1).buyCredits({
          value: ethers.utils.parseEther(eth),
        })
        expect(await nitroGem.credits(user1.address)).to.equal(credits)
        expect(await nitroGem.getCredits(user1.address)).to.equal(credits)
      })
    })

    it("should accumulate credits on multiple purchases", async function () {
      await nitroGem.connect(user1).buyCredits({ value: ethers.utils.parseEther("0.001") })
      await nitroGem.connect(user1).buyCredits({ value: ethers.utils.parseEther("0.005") })
      expect(await nitroGem.credits(user1.address)).to.equal(30) // 5 + 25
    })

    it("should emit CreditsPurchased event", async function () {
      await expect(
        nitroGem.connect(user1).buyCredits({ value: ethers.utils.parseEther("0.01") })
      )
        .to.emit(nitroGem, "CreditsPurchased")
        .withArgs(user1.address, ethers.utils.parseEther("0.01"), 55)
    })

    it("should revert for invalid ETH amount", async function () {
      await expect(
        nitroGem.connect(user1).buyCredits({ value: ethers.utils.parseEther("0.0042") })
      ).to.be.revertedWith("Nexora AI: invalid ETH amount")
    })

    it("should track totalCreditsMinted", async function () {
      await nitroGem.connect(user1).buyCredits({ value: ethers.utils.parseEther("1") })
      await nitroGem.connect(user2).buyCredits({ value: ethers.utils.parseEther("0.5") })
      expect(await nitroGem.totalCreditsMinted()).to.equal(5500 + 2750)
    })

    it("should hold ETH in the contract", async function () {
      await nitroGem.connect(user1).buyCredits({ value: ethers.utils.parseEther("1") })
      expect(await ethers.provider.getBalance(nitroGem.address)).to.equal(
        ethers.utils.parseEther("1")
      )
    })
  })

  // ─── Spend Credits ────────────────────────────────────────────────────

  describe("spendCredits", function () {
    beforeEach(async function () {
      await nitroGem.connect(user1).buyCredits({ value: ethers.utils.parseEther("0.01") })
    })

    it("should deduct credits", async function () {
      await nitroGem.connect(user1).spendCredits(10, "vote")
      expect(await nitroGem.credits(user1.address)).to.equal(45) // 55 - 10
    })

    it("should emit CreditsSpent event", async function () {
      await expect(nitroGem.connect(user1).spendCredits(5, "vote"))
        .to.emit(nitroGem, "CreditsSpent")
        .withArgs(user1.address, 5, "vote")
    })

    it("should revert if insufficient credits", async function () {
      await expect(
        nitroGem.connect(user1).spendCredits(100, "vote")
      ).to.be.revertedWith("Nexora AI: insufficient credits")
    })
  })

  // ─── Tier Purchases ───────────────────────────────────────────────────

  describe("Tier Purchases", function () {
    it("should accept Ruby tier purchase at correct price", async function () {
      await expect(
        nitroGem.connect(user1).buyRubyTier({ value: ethers.utils.parseEther("0.5") })
      ).to.emit(nitroGem, "RubyTierPurchased")
    })

    it("should reject Ruby tier at wrong price", async function () {
      await expect(
        nitroGem.connect(user1).buyRubyTier({ value: ethers.utils.parseEther("0.3") })
      ).to.be.revertedWith("Nexora AI: incorrect ruby price")
    })

    it("should accept Diamond tier purchase at correct price", async function () {
      await expect(
        nitroGem.connect(user1).buyDiamondTier({ value: ethers.utils.parseEther("1") })
      ).to.emit(nitroGem, "DiamondTierPurchased")
    })

    it("should reject Diamond tier at wrong price", async function () {
      await expect(
        nitroGem.connect(user1).buyDiamondTier({ value: ethers.utils.parseEther("0.5") })
      ).to.be.revertedWith("Nexora AI: incorrect diamond price")
    })
  })

  // ─── Owner Functions ──────────────────────────────────────────────────

  describe("Owner Admin", function () {
    it("should allow owner to update treasury", async function () {
      await nitroGem.setTreasury(user2.address)
      expect(await nitroGem.treasury()).to.equal(user2.address)
    })

    it("should reject non-owner treasury update", async function () {
      await expect(
        nitroGem.connect(user1).setTreasury(user2.address)
      ).to.be.reverted
    })

    it("should allow owner to update tier prices", async function () {
      await nitroGem.setRubyTierPrice(ethers.utils.parseEther("0.3"))
      expect(await nitroGem.rubyTierPrice()).to.equal(ethers.utils.parseEther("0.3"))

      await nitroGem.setDiamondTierPrice(ethers.utils.parseEther("0.8"))
      expect(await nitroGem.diamondTierPrice()).to.equal(ethers.utils.parseEther("0.8"))
    })

    it("should allow owner to update credit rates", async function () {
      await nitroGem.setCreditRate(0, ethers.utils.parseEther("0.002"), 12)
      expect(await nitroGem.creditAmounts(0)).to.equal(ethers.utils.parseEther("0.002"))
      expect(await nitroGem.creditRewards(0)).to.equal(12)
    })

    it("should reject out-of-range credit rate index", async function () {
      await expect(
        nitroGem.setCreditRate(10, ethers.utils.parseEther("1"), 100)
      ).to.be.revertedWith("Nexora AI: index out of range")
    })

    it("should allow owner to withdraw ETH to treasury", async function () {
      await nitroGem.connect(user1).buyCredits({ value: ethers.utils.parseEther("1") })

      const treasuryBefore = await ethers.provider.getBalance(treasury.address)
      await nitroGem.withdraw()
      const treasuryAfter = await ethers.provider.getBalance(treasury.address)

      expect(treasuryAfter.sub(treasuryBefore)).to.equal(ethers.utils.parseEther("1"))
    })

    it("should revert withdraw when nothing to withdraw", async function () {
      await expect(nitroGem.withdraw()).to.be.revertedWith("Nexora AI: nothing to withdraw")
    })

    it("should allow pausing and unpausing", async function () {
      await nitroGem.pause()
      await expect(
        nitroGem.connect(user1).buyCredits({ value: ethers.utils.parseEther("0.01") })
      ).to.be.reverted

      await nitroGem.unpause()
      await nitroGem.connect(user1).buyCredits({ value: ethers.utils.parseEther("0.01") })
      expect(await nitroGem.credits(user1.address)).to.equal(55)
    })
  })
})
