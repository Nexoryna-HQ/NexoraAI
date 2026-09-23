const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { buildTokenIntelligence } = require("./tokenIntelligence")

const NOW = 1_700_000_000_000
const NOW_SECONDS = Math.floor(NOW / 1000)

function completeListing() {
  return {
    name: "Alpha",
    symbol: "ALP",
    contractAddr: "0xabc",
    network: "ETH",
    listed: NOW_SECONDS - 86400,
    launch: NOW_SECONDS - 172800,
    voteCount: 300,
    dailyCount: 4,
    dailyStart: NOW_SECONDS - 3600,
    weeklyCount: 20,
    weeklyStart: NOW_SECONDS - 86400,
    watchlist: "0x1,0x2,",
    promoted: 1,
    description: "Listed token",
    presale: false,
    chartlink: "https://dextools.io/alpha",
    websitelink: "https://alpha.example",
    telegramlink: "https://t.me/alpha",
    twitterlink: "https://x.com/alpha",
    kyc: "https://kyc.example",
    audit: "https://audit.example",
    logo: "data:image/png;base64,aaaa",
  }
}

function completeMarket() {
  return {
    price: 1.25,
    marketCap: 1000000,
    change24h: -2.5,
    volume: 50000,
    liquidity: 80000,
    asOf: NOW_SECONDS - 60,
  }
}

describe("token intelligence normalization", () => {
  it("keeps a complete listing at high confidence", () => {
    const intel = buildTokenIntelligence("alpha1", completeListing(), completeMarket(), NOW)

    assert.equal(intel.dataQuality, "high")
    assert.equal(intel.tokenId, "alpha1")
    assert.equal(intel.name, "Alpha")
    assert.equal(intel.symbol, "ALP")
    assert.equal(intel.contractAddress, "0xabc")
    assert.equal(intel.network, "ETH")
    assert.equal(intel.tier, "ruby")
    assert.equal(intel.voteCount, 300)
    assert.equal(intel.dailyVotingActivity.count, 4)
    assert.equal(intel.recentVotingActivity.count, 20)
    assert.equal(intel.marketPrice, 1.25)
    assert.equal(intel.marketCap, 1000000)
    assert.equal(intel.volume, 50000)
    assert.equal(intel.liquidity, 80000)
    assert.equal(intel.priceChange, -2.5)
    assert.equal(intel.communityActivity.watchlistCount, 2)
    assert.equal(intel.promotionStatus, "promoted")
    assert.equal(intel.sources.identity, "firebase_coinlist")
    assert.equal(intel.sources.votes, "firebase_coinlist")
    assert.equal(intel.sources.market, "request_market")
    assert.equal(intel.sources.tier, "derived_from_vote_count")
    assert.deepEqual(intel.stale, [])
    assert.equal(intel.missing.includes("voteCount"), false)
    assert.equal(JSON.stringify(intel).includes("0x1"), false)
  })

  it("leaves market metrics null when no snapshot is supplied", () => {
    const intel = buildTokenIntelligence("alpha1", completeListing(), null, NOW)

    assert.equal(intel.dataQuality, "partial")
    assert.equal(intel.marketPrice, null)
    assert.equal(intel.marketCap, null)
    assert.equal(intel.volume, null)
    assert.equal(intel.liquidity, null)
    assert.equal(intel.priceChange, null)
    assert.equal(intel.sources.market, null)
    assert.equal(intel.timestamps.marketAsOf, null)
    assert.ok(intel.missing.includes("marketPrice"))
    assert.ok(intel.missing.includes("marketCap"))
    assert.ok(intel.missing.includes("priceChange"))
    assert.equal(intel.voteCount, 300)
  })

  it("does not invent a tier or zero votes when voting fields are absent", () => {
    const raw = completeListing()
    delete raw.voteCount
    delete raw.dailyCount
    delete raw.dailyStart
    delete raw.weeklyCount
    delete raw.weeklyStart

    const intel = buildTokenIntelligence("alpha1", raw, completeMarket(), NOW)

    assert.equal(intel.dataQuality, "partial")
    assert.equal(intel.voteCount, null)
    assert.equal(intel.tier, null)
    assert.equal(intel.dailyVotingActivity, null)
    assert.equal(intel.recentVotingActivity, null)
    assert.equal(intel.sources.votes, null)
    assert.equal(intel.sources.tier, null)
    assert.ok(intel.missing.includes("voteCount"))
    assert.ok(intel.missing.includes("dailyVotingActivity"))
    assert.ok(intel.missing.includes("recentVotingActivity"))
    assert.equal(intel.marketPrice, 1.25)
  })

  it("marks malformed records insufficient without throwing", () => {
    for (const raw of [null, undefined, [], "alpha", 12, true]) {
      const intel = buildTokenIntelligence("alpha1", raw, completeMarket(), NOW)
      assert.equal(intel.dataQuality, "insufficient")
      assert.equal(intel.name, null)
      assert.equal(intel.voteCount, null)
      assert.equal(intel.marketPrice, null)
      assert.deepEqual(intel.missing, ["listingRecord"])
      assert.equal(intel.sources.identity, null)
    }
  })

  it("downgrades fresh-looking records when the market snapshot is stale", () => {
    const market = completeMarket()
    market.asOf = NOW_SECONDS - 10 * 24 * 60 * 60

    const intel = buildTokenIntelligence("alpha1", completeListing(), market, NOW)

    assert.equal(intel.dataQuality, "partial")
    assert.equal(intel.marketPrice, 1.25)
    assert.ok(intel.stale.includes("market"))
    assert.equal(intel.sources.market, "request_market")
  })
})
