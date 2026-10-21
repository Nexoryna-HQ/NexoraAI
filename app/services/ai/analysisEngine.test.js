const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const { buildTokenIntelligence } = require("./tokenIntelligence")
const { buildAnalysis, mergeInterpretations, assertAnalysisSchema, DISCLAIMER } = require("./analysisEngine")

const NOW = 1_700_000_000_000
const NOW_SECONDS = Math.floor(NOW / 1000)

function listing() {
  return {
    name: "Alpha",
    symbol: "ALP",
    contractAddr: "0xabc",
    network: "ETH",
    listed: NOW_SECONDS - 86400,
    voteCount: 300,
    dailyCount: 4,
    dailyStart: NOW_SECONDS - 3600,
    weeklyCount: 20,
    weeklyStart: NOW_SECONDS - 86400,
    watchlist: "0x1,0x2,",
    promoted: 1,
    presale: false,
    audit: "https://audit.example",
    kyc: "https://kyc.example",
  }
}

function market() {
  return {
    price: 1.25,
    marketCap: 1000000,
    change24h: -2.5,
    volume: 50000,
    liquidity: 80000,
    asOf: NOW_SECONDS - 60,
  }
}

function analysisFrom(raw, snapshot) {
  return buildAnalysis(buildTokenIntelligence("alpha1", raw, snapshot, NOW))
}

describe("token analysis contract", () => {
  it("matches the schema for a complete listing", () => {
    const analysis = analysisFrom(listing(), market())

    assert.equal(assertAnalysisSchema(analysis), true)
    assert.equal(analysis.dataQuality, "high")
    assert.equal(analysis.disclaimer, DISCLAIMER)
    assert.equal(analysis.listingProgress.currentTier, "ruby")
    assert.equal(analysis.listingProgress.nextTier, "diamond")
    assert.equal(analysis.listingProgress.votesRemaining, 200)
    assert.equal(analysis.listingProgress.ethAlternative, "1")
    assert.equal(analysis.marketContext.available, true)
    assert.equal(analysis.marketContext.price, 1.25)
    assert.equal(analysis.communityActivity.unusualChanges.interpretation.includes("cannot be determined"), true)
    assert.equal(JSON.stringify(analysis).includes("will increase"), false)
    assert.equal(JSON.stringify(analysis).includes("guaranteed"), false)
    assert.equal(JSON.stringify(analysis).includes("0x1"), false)
  })

  it("does not invent market figures when the snapshot is missing", () => {
    const analysis = analysisFrom(listing(), null)

    assert.equal(assertAnalysisSchema(analysis), true)
    assert.equal(analysis.dataQuality, "partial")
    assert.equal(analysis.marketContext.available, false)
    assert.equal(analysis.marketContext.price, null)
    assert.equal(analysis.marketContext.marketCap, null)
    assert.equal(analysis.marketContext.volume, null)
    assert.equal(analysis.marketContext.liquidity, null)
    assert.equal(analysis.marketContext.priceChange, null)
    assert.match(analysis.marketContext.interpretation, /unavailable/i)
    assert.equal(analysis.dataQualityReport.missing.includes("marketPrice"), true)
  })

  it("does not assign a tier when votes are missing", () => {
    const raw = listing()
    delete raw.voteCount
    delete raw.dailyCount
    delete raw.dailyStart
    delete raw.weeklyCount
    delete raw.weeklyStart

    const analysis = analysisFrom(raw, market())
    const text = JSON.stringify(analysis)

    assert.equal(assertAnalysisSchema(analysis), true)
    assert.equal(analysis.dataQuality, "partial")
    assert.equal(analysis.listingProgress.currentTier, null)
    assert.equal(analysis.listingProgress.voteCount, null)
    assert.equal(analysis.listingProgress.votesRemaining, null)
    assert.equal(text.includes("emerald"), false)
    assert.match(analysis.communityActivity.votingActivity.observed, /unavailable/)
  })

  it("returns an insufficient schema for malformed records", () => {
    const analysis = analysisFrom(null, market())

    assert.equal(assertAnalysisSchema(analysis), true)
    assert.equal(analysis.dataQuality, "insufficient")
    assert.deepEqual(analysis.dataQualityReport.missing, ["listingRecord"])
    assert.equal(analysis.marketContext.price, null)
    assert.equal(analysis.listingProgress.currentTier, null)
    assert.match(analysis.explanation.interpretation, /Not financial advice/)
  })

  it("keeps a stale price as observed data and lowers confidence", () => {
    const snapshot = market()
    snapshot.asOf = NOW_SECONDS - 10 * 24 * 60 * 60
    const analysis = analysisFrom(listing(), snapshot)

    assert.equal(assertAnalysisSchema(analysis), true)
    assert.equal(analysis.dataQuality, "partial")
    assert.equal(analysis.marketContext.price, 1.25)
    assert.equal(analysis.dataQualityReport.stale.includes("market"), true)
    assert.match(analysis.marketContext.observed, /stale/)
    assert.equal(JSON.stringify(analysis).includes("will increase"), false)
  })

  it("rejects speculative model text and keeps the deterministic interpretation", () => {
    const analysis = analysisFrom(listing(), market())
    const original = analysis.executiveSummary.interpretation
    const merged = mergeInterpretations(
      analysis,
      JSON.stringify({
        executiveSummary: "The price will increase and returns are guaranteed.",
        marketContext: "Supplied price is 1.25. Not financial advice.",
      })
    )

    assert.equal(merged.executiveSummary.interpretation, original)
    assert.equal(merged.marketContext.interpretation, "Supplied price is 1.25. Not financial advice.")
    assert.equal(merged.dataQuality, "high")
    assert.equal(merged.disclaimer, DISCLAIMER)
  })
})
