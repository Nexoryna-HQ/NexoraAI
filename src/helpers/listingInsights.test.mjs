import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { loadTokenAnalysis, resetTokenIntelligenceCache } from "./tokenIntelligenceClient.js"
import { sortListingRows, filterInsightRows, loadInsightIndex, resetInsightIndexCache } from "./listingInsights.js"

function row(id, votes, change) {
  return ["logo", "Name", "ETH", 1, change, "Today", "tier", votes, "", "wl", id]
}

function analysis() {
  return {
    disclaimer: "Not financial advice.",
    dataQuality: "partial",
    executiveSummary: { observed: "Alpha is stored at the emerald tier.", interpretation: "Restatement." },
    communityActivity: {},
    marketContext: {},
    listingProgress: {},
    notableSignals: {},
    dataQualityReport: {},
    explanation: {},
  }
}

describe("listing insight discovery", () => {
  it("sorts by stored votes and reported 24h change without adding a score", () => {
    const rows = [row("a", 10, 1), row("b", 40, "Presale"), row("c", 25, -3)]
    const byVotes = sortListingRows(rows, "votes")
    assert.deepEqual(byVotes.map((item) => item[10]), ["b", "c", "a"])

    const byChange = sortListingRows(rows, "change24h")
    assert.deepEqual(byChange.map((item) => item[10]), ["a", "c", "b"])
    assert.equal(JSON.stringify(byVotes).includes("score"), false)
  })

  it("filters to tokens that already have an insight", () => {
    const rows = [row("a", 1, 0), row("b", 2, 0)]
    const filtered = filterInsightRows(rows, { b: { tokenId: "b", summary: "Stored." } })
    assert.deepEqual(filtered.map((item) => item[10]), ["b"])
  })

  it("loads one insight list and keeps the table data when the service is down", async () => {
    resetTokenIntelligenceCache()
    resetInsightIndexCache()
    await loadTokenAnalysis({
      tokenId: "alpha1",
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => analysis() }),
      now: 1000,
    })

    let calls = 0
    const fetchImpl = async (url) => {
      calls += 1
      assert.equal(String(url).includes("/ai/token/"), false)
      assert.match(String(url), /\/ai\/insights$/)
      throw new Error("offline")
    }

    const first = await loadInsightIndex({ fetchImpl, now: 2000 })
    const second = await loadInsightIndex({ fetchImpl, now: 2000 })

    assert.equal(first.remote, false)
    assert.equal(first.insights.length, 1)
    assert.equal(first.insights[0].tokenId, "alpha1")
    assert.equal(first.insights[0].summary, "Alpha is stored at the emerald tier.")
    assert.equal(second, first)
    assert.equal(calls, 1)
  })
})
