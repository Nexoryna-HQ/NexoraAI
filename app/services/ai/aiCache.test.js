const { describe, it, beforeEach } = require("node:test")
const assert = require("node:assert/strict")
const { analyzeToken, analysisVersion, providerView, resetAnalysisCache, resetInsightIndex } = require("./aiService")
const { aiMetrics, resetAiMetrics } = require("./aiLog")
const { discoverTokens, resetDiscoveryCache } = require("./discoveryService")

function intel(overrides) {
  return {
    tokenId: "alpha",
    name: "Alpha",
    symbol: "ALP",
    network: "ETH",
    contractAddress: "0x1111111111111111111111111111111111111111",
    tier: "emerald",
    voteCount: 4,
    dailyVotingActivity: { count: 1, windowStart: 100 },
    recentVotingActivity: { count: 2, windowStart: 50 },
    marketPrice: 1.25,
    marketCap: 1000,
    volume: null,
    liquidity: null,
    priceChange: -2,
    communityActivity: { watchlistCount: 2, addresses: ["0xabc"] },
    promotionStatus: "not_promoted",
    metadata: {
      description: "private note",
      presale: false,
      audit: false,
      kyc: null,
      links: { website: "https://example.com" },
    },
    timestamps: { marketAsOf: 1_700_000_000 },
    sources: {},
    missing: [],
    stale: [],
    dataQuality: "partial",
    walletAddress: "0x9999999999999999999999999999999999999999",
    ...overrides,
  }
}

describe("analysis cache", () => {
  beforeEach(() => {
    resetAnalysisCache()
    resetInsightIndex()
    resetAiMetrics()
    resetDiscoveryCache()
  })

  it("omits wallet addresses and catalog prose from the provider payload", () => {
    const view = providerView(intel())
    const encoded = JSON.stringify(view)
    assert.equal(encoded.includes("0x1111"), false)
    assert.equal(encoded.includes("0xabc"), false)
    assert.equal(encoded.includes("0x9999"), false)
    assert.equal(encoded.includes("private note"), false)
    assert.equal(encoded.includes("example.com"), false)
    assert.equal(view.watchlistCount, 2)
  })

  it("keeps the same version when only the quote timestamp changes", () => {
    const first = analysisVersion(intel())
    const second = analysisVersion(intel({ timestamps: { marketAsOf: 1_700_000_500 } }))
    const changed = analysisVersion(intel({ voteCount: 5 }))
    assert.equal(first, second)
    assert.notEqual(first, changed)
  })

  it("calls the provider once for the same listing version", async () => {
    let calls = 0
    const complete = async (prompt) => {
      calls += 1
      assert.equal(JSON.stringify(prompt).includes("0xabc"), false)
      return { ok: true, content: "{}" }
    }

    const first = await analyzeToken("alpha", null, { intel: intel(), complete })
    const second = await analyzeToken("alpha", null, { intel: intel(), complete })

    assert.equal(first.analysis.disclaimer, "Not financial advice.")
    assert.equal(second.analysis.executiveSummary.observed, first.analysis.executiveSummary.observed)
    assert.equal(calls, 1)
    assert.deepEqual(aiMetrics(), {
      aiRequests: 1,
      cacheHits: 1,
      cacheMisses: 1,
      averageResponseMs: aiMetrics().averageResponseMs,
    })
  })

  it("generates again when the stored vote count changes", async () => {
    let calls = 0
    const complete = async () => {
      calls += 1
      return { ok: false, reason: "missing_api_key" }
    }

    await analyzeToken("alpha", null, { intel: intel({ voteCount: 4 }), complete })
    await analyzeToken("alpha", null, { intel: intel({ voteCount: 9 }), complete })

    assert.equal(calls, 2)
    assert.equal(aiMetrics().cacheMisses, 2)
    assert.equal(aiMetrics().aiRequests, 2)
  })

  it("shares one provider call across concurrent requests", async () => {
    let calls = 0
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    const complete = async () => {
      calls += 1
      await gate
      return { ok: true, content: "{}" }
    }

    const pendingA = analyzeToken("alpha", null, { intel: intel(), complete })
    const pendingB = analyzeToken("alpha", null, { intel: intel(), complete })
    release()
    const [a, b] = await Promise.all([pendingA, pendingB])

    assert.equal(a.analysis.disclaimer, b.analysis.disclaimer)
    assert.equal(calls, 1)
    assert.equal(aiMetrics().aiRequests, 1)
    assert.equal(aiMetrics().cacheMisses, 1)
  })

  it("does not call the provider again for an unchanged discovery question", async () => {
    const now = 1_700_000_000
    const rows = [
      {
        id: "hot",
        name: "Alpha",
        symbol: "ALP",
        network: "ETH",
        voteCount: 10,
        tier: "emerald",
        dailyCount: 3,
        dailyStart: now - 100,
        weeklyCount: 3,
        weeklyStart: now - 100,
        listed: now - 100,
        watchlistCount: 1,
      },
    ]
    let calls = 0
    const complete = async (prompt) => {
      calls += 1
      assert.equal(JSON.stringify(prompt).includes("0x"), false)
      return { ok: false, reason: "missing_api_key" }
    }

    const first = await discoverTokens("Which tokens recently gained voting momentum?", {
      nowMs: now * 1000,
      rows,
      complete,
    })
    const second = await discoverTokens("Which tokens recently gained voting momentum?", {
      nowMs: now * 1000 + 1000,
      rows,
      complete,
    })
    const changed = await discoverTokens("Which tokens recently gained voting momentum?", {
      nowMs: now * 1000 + 2000,
      rows: [{ ...rows[0], dailyCount: 8 }],
      complete,
    })

    assert.equal(first.tokens[0].id, "hot")
    assert.equal(second.explanation, first.explanation)
    assert.equal(changed.tokens[0].dailyCount, 8)
    assert.equal(calls, 2)
    assert.equal(aiMetrics().cacheHits >= 1, true)
  })
})
