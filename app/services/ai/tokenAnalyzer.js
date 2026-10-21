const { readConfig } = require("./aiProvider")
const {
  TOKEN_BYTES,
  plainCatalogText,
  withinMarket,
  safeCatalogUrl,
  fetchCatalogJson,
} = require("./aiGuard")

const TOKEN_ID = /^[A-Za-z0-9_-]{1,128}$/
const MARKET_FIELDS = ["price", "marketCap", "change24h", "volume", "liquidity", "asOf"]

function validateTokenId(id) {
  return typeof id === "string" && TOKEN_ID.test(id)
}

function plainText(value, max) {
  return plainCatalogText(value, max)
}

function shown(value) {
  return value == null ? "unavailable" : String(value)
}

function readMarket(body) {
  if (body == null || body === "") return { value: null }
  if (typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object." }
  }
  if (body.market == null) return { value: null }
  if (typeof body.market !== "object" || Array.isArray(body.market)) {
    return { error: "market must be an object." }
  }

  const market = {}
  for (let i = 0; i < MARKET_FIELDS.length; i += 1) {
    const key = MARKET_FIELDS[i]
    if (body.market[key] == null || body.market[key] === "") continue
    const number = Number(body.market[key])
    if (!Number.isFinite(number) || !withinMarket(key, number)) {
      return { error: "market." + key + " must be a number." }
    }
    market[key] = number
  }
  return { value: market }
}

async function fetchToken(id) {
  const { databaseURL, timeoutMs } = readConfig()
  if (!databaseURL) {
    return { error: "not_configured", message: "Firebase database URL is not configured." }
  }

  const url = safeCatalogUrl(databaseURL, "coinlist/" + encodeURIComponent(id) + ".json")
  if (!url) {
    return { error: "not_configured", message: "Firebase database URL is not configured." }
  }

  const loaded = await fetchCatalogJson(url, Math.min(timeoutMs, 10000), TOKEN_BYTES)
  if (loaded.error) {
    return { error: "source_unavailable", message: "Token catalog could not be read." }
  }
  if (!loaded.value || typeof loaded.value !== "object" || Array.isArray(loaded.value)) {
    return { error: "not_found", message: "Token listing was not found." }
  }
  return { raw: loaded.value }
}

function fallbackAnalysis(intel, reason) {
  const signals = []
  if (intel.metadata && intel.metadata.presale === true) signals.push("Listing is marked as a presale.")
  if (intel.metadata && intel.metadata.audit === false) signals.push("No audit link is stored on the listing.")
  if (intel.metadata && intel.metadata.kyc === false) signals.push("No KYC link is stored on the listing.")
  if (intel.promotionStatus === "promoted") signals.push("Listing is flagged as promoted.")
  if (intel.stale.includes("market")) signals.push("The supplied market snapshot is stale.")

  const dailyCount = intel.dailyVotingActivity ? intel.dailyVotingActivity.count : null
  const weeklyCount = intel.recentVotingActivity ? intel.recentVotingActivity.count : null
  const watchlistCount = intel.communityActivity ? intel.communityActivity.watchlistCount : null

  return {
    summary:
      shown(intel.name) +
      " (" +
      shown(intel.symbol) +
      ") is " +
      shown(intel.tier) +
      " on " +
      shown(intel.network) +
      ".",
    communityInsights:
      "Vote count is " + shown(intel.voteCount) + ". Watchlist size is " + shown(watchlistCount) + ".",
    marketInsights:
      "Price is " +
      shown(intel.marketPrice) +
      ". Market cap is " +
      shown(intel.marketCap) +
      ". Price change is " +
      shown(intel.priceChange) +
      ". Volume is " +
      shown(intel.volume) +
      ". Liquidity is " +
      shown(intel.liquidity) +
      ".",
    activityInsights: "Listing date is " + shown(intel.listingDate) + ".",
    momentum: "Daily votes are " + shown(dailyCount) + ". Recent weekly votes are " + shown(weeklyCount) + ".",
    notableSignals: signals,
    limitations: [
      reason,
      intel.missing.length
        ? "Unavailable fields: " + intel.missing.join(", ") + "."
        : "No listed fields were missing.",
    ],
  }
}

function shapeModelJson(content) {
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch (error) {
    return null
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null

  const signals = Array.isArray(parsed.notableSignals) ? parsed.notableSignals : []
  const limitations = Array.isArray(parsed.limitations) ? parsed.limitations : []

  return {
    summary: plainText(parsed.summary, 1200),
    communityInsights: plainText(parsed.communityInsights, 1200),
    marketInsights: plainText(parsed.marketInsights, 1200),
    activityInsights: plainText(parsed.activityInsights, 1200),
    momentum: plainText(parsed.momentum, 1200),
    notableSignals: signals.map((item) => plainText(item, 240)).filter(Boolean).slice(0, 8),
    limitations: limitations.map((item) => plainText(item, 240)).filter(Boolean).slice(0, 8),
  }
}

module.exports = {
  validateTokenId,
  readMarket,
  fetchToken,
  fallbackAnalysis,
  shapeModelJson,
  plainText,
}
