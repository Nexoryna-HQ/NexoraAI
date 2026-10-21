const { describe, it } = require("node:test")
const assert = require("node:assert/strict")
const {
  parseDiscoveryQuery,
  acceptModelFilter,
  rowsFromCatalog,
  applyDiscoveryQuery,
  explainDiscovery,
  groundExplanation,
} = require("./discoveryQuery")
const { discoverTokens, resetDiscoveryCache } = require("./discoveryService")

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
  }
}

function catalog() {
  return {
    hot: listing({
      name: "Alpha",
      voteCount: 210,
      dailyCount: 6,
      dailyStart: NOW - 3600,
      weeklyCount: 10,
      weeklyStart: NOW - 86400,
      listed: NOW - 86400,
      watchlist: "0x1,0x2,0x3,0x4,",
    }),
    weekly: listing({
      name: "Beta",
      voteCount: 10,
      dailyCount: 0,
      dailyStart: NOW - 3600,
      weeklyCount: 8,
      weeklyStart: NOW - 2 * 86400,
      listed: NOW - 30 * 86400,
      watchlist: "0x1,",
    }),
    stale: listing({
      name: "Gamma",
      voteCount: 400,
      dailyCount: 9,
      dailyStart: NOW - 5 * 86400,
      weeklyCount: 4,
      weeklyStart: NOW - 20 * 86400,
      listed: NOW - 2 * 86400,
      watchlist: "0x1,0x2,0x3,0x4,0x5,0x6,",
    }),
    closeRuby: listing({
      name: "Delta",
      voteCount: 220,
      dailyCount: 0,
      dailyStart: NOW - 10 * 86400,
      weeklyCount: 0,
      weeklyStart: NOW - 20 * 86400,
      listed: NOW - 40 * 86400,
    }),
    closeDiamond: listing({
      name: "Echo",
      voteCount: 470,
      listed: NOW - 40 * 86400,
    }),
    diamond: listing({
      name: "Far",
      voteCount: 500,
      listed: NOW - 86400,
    }),
    fresh: listing({
      name: "Gulf",
      voteCount: 1,
      listed: NOW - 2 * 86400,
    }),
    old: listing({
      name: "Hotel",
      voteCount: 1,
      listed: NOW - 30 * 86400,
    }),
    crowd: listing({
      name: "India",
      voteCount: 20,
      weeklyCount: 2,
      weeklyStart: NOW - 86400,
      listed: NOW - 40 * 86400,
      watchlist: "0x1,0x2,0x3,0x4,0x5,",
    }),
    novotes: listing({
      name: "Kilo",
      voteCount: null,
      listed: NOW - 86400,
    }),
  }
}

function idsFor(question) {
  const filter = parseDiscoveryQuery(question)
  const applied = applyDiscoveryQuery(rowsFromCatalog(catalog()), filter, NOW)
  return applied.tokens.map((token) => token.id)
}

describe("discovery filters", () => {
  it("maps the suggested questions onto catalog rules", () => {
    assert.deepEqual(parseDiscoveryQuery("Show me tokens with increasing community activity."), {
      metric: "communityActivity",
      direction: "increasing",
      period: "recent",
    })
    assert.deepEqual(parseDiscoveryQuery("Which tokens recently gained voting momentum?"), {
      metric: "votingMomentum",
      direction: "increasing",
      period: "recent",
    })
    assert.deepEqual(parseDiscoveryQuery("Show me recently listed tokens."), {
      metric: "listingAge",
      direction: "recent",
      period: "recent",
    })
    assert.deepEqual(parseDiscoveryQuery("Find tokens approaching the next tier."), {
      metric: "tierProgress",
      direction: "approaching",
      period: null,
    })
    assert.deepEqual(parseDiscoveryQuery("Show me tokens with strong recent community participation."), {
      metric: "communityParticipation",
      direction: "strong",
      period: "recent",
    })
  })

  it("calculates matches from stored records", () => {
    assert.deepEqual(idsFor("Which tokens recently gained voting momentum?"), ["hot"])
    assert.deepEqual(idsFor("Show me tokens with increasing community activity."), ["hot", "weekly", "crowd"])
    assert.deepEqual(idsFor("Show me recently listed tokens."), ["diamond", "hot", "novotes", "fresh", "stale"])
    assert.deepEqual(idsFor("Find tokens approaching the next tier."), ["closeDiamond", "closeRuby", "hot"])
    assert.deepEqual(idsFor("Show me tokens with strong recent community participation."), ["crowd", "hot"])
  })

  it("drops invented token ids from a model filter", async () => {
    resetDiscoveryCache()
    let fetches = 0
    const result = await discoverTokens("Which tokens recently gained voting momentum?", {
      nowMs: NOW * 1000,
      rows: rowsFromCatalog(catalog()),
      complete: async () => ({
        ok: true,
        content: JSON.stringify({
          metric: "votingMomentum",
          direction: "increasing",
          period: "recent",
          tokens: ["fake", "stale"],
          explanation: "Gamma will increase.",
        }),
      }),
    })

    assert.deepEqual(result.tokens.map((token) => token.id), ["hot"])
    assert.equal(JSON.stringify(result.tokens).includes("fake"), false)
    assert.equal(JSON.stringify(result.tokens).includes("stale"), false)
    assert.equal(result.explanation.includes("will increase"), false)
    assert.equal(fetches, 0)
  })

  it("falls back to the keyword rule when the model metric is not allowed", async () => {
    resetDiscoveryCache()
    const result = await discoverTokens("Show me recently listed tokens.", {
      nowMs: NOW * 1000,
      rows: rowsFromCatalog(catalog()),
      complete: async () => ({
        ok: true,
        content: JSON.stringify({ metric: "priceTarget", direction: "increasing", period: "recent", tokens: ["fake"] }),
      }),
    })

    assert.equal(result.query.metric, "listingAge")
    assert.equal(result.tokens.some((token) => token.id === "fake"), false)
    assert.equal(result.tokens.some((token) => token.id === "fresh"), true)
    assert.equal(acceptModelFilter(JSON.stringify({ metric: "priceTarget" })), null)
  })

  it("returns no tokens for a question outside the catalog rules", async () => {
    resetDiscoveryCache()
    const result = await discoverTokens("Which token will double next week?", {
      nowMs: NOW * 1000,
      rows: rowsFromCatalog(catalog()),
      allowModel: false,
    })

    assert.equal(result.supported, false)
    assert.deepEqual(result.tokens, [])
    assert.match(result.explanation, /does not map/)
  })

  it("keeps a grounded explanation and rejects an ungrounded one", () => {
    const filter = parseDiscoveryQuery("Which tokens recently gained voting momentum?")
    const applied = applyDiscoveryQuery(rowsFromCatalog(catalog()), filter, NOW)
    const base = explainDiscovery(applied)
    assert.match(base, /Alpha/)
    assert.equal(base.includes("Gamma"), false)

    const grounded = groundExplanation("Alpha has 6 votes stored in the current daily window. Not financial advice.", applied)
    assert.match(grounded, /Alpha/)
    assert.equal(groundExplanation("Gamma has 9 votes and the price will increase.", applied), null)
  })
})
