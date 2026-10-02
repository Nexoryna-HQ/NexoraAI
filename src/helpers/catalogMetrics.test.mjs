import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { rowsFromCatalog, buildDashboard, searchListings } from "./catalogMetrics.js"

const NOW = 1_700_000_000

function listing(fields) {
  return {
    name: fields.name,
    symbol: fields.symbol || "SYM",
    network: "ETH",
    voteCount: fields.voteCount,
    dailyCount: fields.dailyCount,
    dailyStart: fields.dailyStart,
    weeklyCount: fields.weeklyCount,
    weeklyStart: fields.weeklyStart,
    listed: fields.listed,
    watchlist: fields.watchlist || "",
    promoted: fields.promoted || 0,
    presale: fields.presale === true,
  }
}

function board() {
  const catalog = {
    hot: listing({
      name: "Alpha",
      symbol: "ALP",
      voteCount: 210,
      dailyCount: 6,
      dailyStart: NOW - 3600,
      weeklyCount: 10,
      weeklyStart: NOW - 86400,
      listed: NOW - 86400,
      promoted: 1,
      watchlist: "0x1,0x2,",
    }),
    quiet: listing({
      name: "Beta",
      symbol: "BETA",
      voteCount: 10,
      dailyCount: 0,
      dailyStart: NOW - 3600,
      weeklyCount: 3,
      weeklyStart: NOW - 3 * 86400,
      listed: NOW - 30 * 86400,
    }),
    stale: listing({
      name: "Gamma",
      symbol: "GAM",
      voteCount: 400,
      dailyCount: 9,
      dailyStart: NOW - 5 * 86400,
      weeklyCount: 4,
      weeklyStart: NOW - 20 * 86400,
      listed: NOW - 40 * 86400,
    }),
    missing: listing({
      name: "Kilo",
      voteCount: null,
      listed: NOW - 2 * 86400,
    }),
  }
  return buildDashboard(rowsFromCatalog(catalog), { ALP: { price: 2, market_cap: 1000, percent_change_24h: -1 } }, NOW)
}

describe("catalog dashboard metrics", () => {
  it("calculates overview figures from stored fields and returned quotes", () => {
    const dash = board()
    assert.equal(dash.overview.listings, 4)
    assert.equal(dash.overview.storedVotes, 620)
    assert.equal(dash.overview.votesCounted, 3)
    assert.equal(dash.overview.promoted, 1)
    assert.equal(dash.overview.listedThisWeek, 2)
    assert.equal(dash.overview.dailyActive, 1)
    assert.equal(dash.overview.weeklyActive, 2)
    assert.deepEqual(dash.overview.tiers, { emerald: 2, ruby: 1, diamond: 0, unknown: 1 })
    assert.equal(dash.overview.quotesReturned, 1)
    assert.equal(dash.overview.marketCapSum, 1000)
    assert.equal(JSON.stringify(dash).includes("score"), false)
  })

  it("keeps each section on its own stored rule", () => {
    const dash = board()
    assert.deepEqual(dash.momentum.items.map((item) => item.id), ["hot"])
    assert.deepEqual(dash.community.items.map((item) => item.id), ["hot", "quiet"])
    assert.deepEqual(dash.emerging.items.map((item) => item.id), ["hot", "missing"])
    assert.deepEqual(dash.tierProgress.items.map((item) => item.id), ["hot"])
    assert.equal(dash.recentlyActive.items.some((item) => item.id === "stale"), false)
    assert.equal(dash.momentum.items[0].price, 2)
    assert.equal(dash.community.items[1].price, null)
  })

  it("leaves market totals empty when no quote returned", () => {
    const dash = buildDashboard(rowsFromCatalog({ a: listing({ name: "Alpha", voteCount: 1, listed: NOW }) }), null, NOW)
    assert.equal(dash.overview.marketCapSum, null)
    assert.equal(dash.overview.quotesReturned, 0)
  })

  it("searches loaded listings by name without calling an analysis service", () => {
    const rows = rowsFromCatalog({ hot: listing({ name: "Alpha", symbol: "ALP", voteCount: 1 }) })
    assert.deepEqual(searchListings(rows, "alp").map((row) => row.id), ["hot"])
    assert.deepEqual(searchListings(rows, ""), [])
  })
})
