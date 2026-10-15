import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  marketPayload,
  listingVersion,
  loadTokenAnalysis,
  resetTokenIntelligenceCache,
} from "./tokenIntelligenceClient.js"

function analysis() {
  return {
    disclaimer: "Not financial advice.",
    executiveSummary: { observed: "Alpha.", interpretation: "Restatement." },
    communityActivity: {
      votingActivity: { observed: "Vote count is 10.", interpretation: "Stored total." },
    },
    marketContext: { available: false, observed: "No market snapshot was supplied.", interpretation: "Unavailable." },
    listingProgress: { currentTier: "emerald", observed: "Emerald.", interpretation: "Catalog rule." },
    notableSignals: { positive: [], neutral: [], caution: [] },
    dataQualityReport: { level: "partial", missing: ["marketPrice"], stale: [] },
    explanation: { observed: "Alpha.", interpretation: "Plain language." },
  }
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

describe("token intelligence client", () => {
  it("omits a market body when quotes are missing", () => {
    assert.equal(marketPayload(null), null)
    assert.equal(marketPayload({ price: 0, market_cap: 0, percent_change_24h: 0 }), null)
  })

  it("sends finite market numbers and reuses the first response", async () => {
    resetTokenIntelligenceCache()
    const market = marketPayload({ price: 1.25, market_cap: 1000, percent_change_24h: -2 })
    assert.equal(market.price, 1.25)
    assert.equal(market.marketCap, 1000)
    assert.equal(market.change24h, -2)

    let calls = 0
    const fetchImpl = async (url, init) => {
      calls += 1
      assert.equal(init.method, "POST")
      assert.equal(init.headers.Authorization, undefined)
      assert.equal(init.headers["X-CMC_PRO_API_KEY"], undefined)
      const body = JSON.parse(init.body)
      assert.deepEqual(body.market.price, 1.25)
      assert.equal(body.market.asOf, undefined)
      assert.equal(body.walletAddress, undefined)
      assert.equal(body.watchlist, undefined)
      assert.match(url, /\/ai\/token\/alpha1$/)
      return jsonResponse(200, analysis())
    }

    const first = await loadTokenAnalysis({ tokenId: "alpha1", market, fetchImpl, now: 1000 })
    const second = await loadTokenAnalysis({ tokenId: "alpha1", market, fetchImpl, now: 1000 })

    assert.equal(first.ok, true)
    assert.equal(second.cached, true)
    assert.equal(calls, 1)
  })

  it("uses GET when market data is absent and shares one in-flight request", async () => {
    resetTokenIntelligenceCache()
    let calls = 0
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    const fetchImpl = async (url, init) => {
      calls += 1
      assert.equal(init.method, "GET")
      assert.equal(init.body, undefined)
      await gate
      return jsonResponse(200, analysis())
    }

    const pendingA = loadTokenAnalysis({ tokenId: "beta2", fetchImpl, now: 2000 })
    const pendingB = loadTokenAnalysis({ tokenId: "beta2", fetchImpl, now: 2000 })
    release()
    const [a, b] = await Promise.all([pendingA, pendingB])

    assert.equal(a.ok, true)
    assert.equal(b.ok, true)
    assert.equal(calls, 1)
  })

  it("returns a fallback message when the API fails", async () => {
    resetTokenIntelligenceCache()
    const fetchImpl = async () => jsonResponse(503, { error: "not_configured" })
    const result = await loadTokenAnalysis({ tokenId: "gamma3", fetchImpl, now: 3000 })

    assert.equal(result.ok, false)
    assert.match(result.message, /not available/)
  })

  it("returns a fallback when the API is too slow", async () => {
    resetTokenIntelligenceCache()
    const fetchImpl = (url, init) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(jsonResponse(200, analysis())), 200)
        if (init.signal) {
          init.signal.addEventListener("abort", () => {
            clearTimeout(timer)
            reject(new Error("aborted"))
          })
        }
      })

    const result = await loadTokenAnalysis({
      tokenId: "delta4",
      fetchImpl,
      now: 4000,
      timeoutMs: 30,
    })

    assert.equal(result.ok, false)
    assert.match(result.message, /unavailable/)
  })

  it("lets refresh request a new analysis", async () => {
    resetTokenIntelligenceCache()
    let calls = 0
    const fetchImpl = async () => {
      calls += 1
      return jsonResponse(200, analysis())
    }

    await loadTokenAnalysis({ tokenId: "epsilon5", fetchImpl, now: 5000 })
    const refreshed = await loadTokenAnalysis({
      tokenId: "epsilon5",
      fetchImpl,
      now: 5001,
      refresh: true,
    })

    assert.equal(refreshed.ok, true)
    assert.equal(refreshed.cached, false)
    assert.equal(calls, 2)
  })

  it("keeps the saved analysis across a refresh until the listing version changes", async () => {
    const store = new Map()
    globalThis.sessionStorage = {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
      key: (index) => Array.from(store.keys())[index] || null,
      get length() {
        return store.size
      },
    }
    resetTokenIntelligenceCache()
    let calls = 0
    const fetchImpl = async () => {
      calls += 1
      return jsonResponse(200, analysis())
    }
    const listing = { voteCount: 10, name: "Alpha", symbol: "ALP", watchlist: "0xabc,0xdef" }
    const version = listingVersion(listing)
    assert.equal(version.includes("0xabc"), false)

    await loadTokenAnalysis({ tokenId: "alpha1", version, fetchImpl, now: 6000 })
    resetTokenIntelligenceCache()
    const again = await loadTokenAnalysis({ tokenId: "alpha1", version, fetchImpl, now: 7000 })
    const changed = await loadTokenAnalysis({
      tokenId: "alpha1",
      version: listingVersion({ ...listing, voteCount: 11 }),
      fetchImpl,
      now: 8000,
    })

    assert.equal(again.cached, true)
    assert.equal(changed.cached, false)
    assert.equal(calls, 2)
    delete globalThis.sessionStorage
  })
})
