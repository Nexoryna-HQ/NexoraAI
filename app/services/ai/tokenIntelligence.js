const RUBY_VOTES = 250
const DIAMOND_VOTES = 500
const STALE_MARKET_SECONDS = 24 * 60 * 60
const STALE_DAILY_SECONDS = 2 * 24 * 60 * 60
const STALE_WEEKLY_SECONDS = 14 * 24 * 60 * 60

const { plainCatalogText } = require("./aiGuard")

function textOrNull(value, max) {
  const text = plainCatalogText(value, max)
  return text || null
}

function numberOrNull(value) {
  if (value == null || value === "") return null
  if (typeof value === "boolean") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function hasOwn(raw, key) {
  return raw != null && typeof raw === "object" && !Array.isArray(raw) && Object.prototype.hasOwnProperty.call(raw, key)
}

function tierFor(voteCount) {
  if (voteCount == null) return null
  if (voteCount >= DIAMOND_VOTES) return "diamond"
  if (voteCount >= RUBY_VOTES) return "ruby"
  return "emerald"
}

function promotionStatus(raw) {
  if (!hasOwn(raw, "promoted")) return null
  const value = raw.promoted
  if (value === true) return "promoted"
  if (value === false) return "not_promoted"
  const number = numberOrNull(value)
  if (number == null) return null
  return number >= 1 ? "promoted" : "not_promoted"
}

function communityActivity(raw) {
  if (!hasOwn(raw, "watchlist")) return null
  if (typeof raw.watchlist !== "string") return { watchlistCount: null }
  if (raw.watchlist.trim() === "") return { watchlistCount: 0 }
  const source = raw.watchlist.slice(0, 20000)
  let count = 0
  const parts = source.split(",")
  for (let i = 0; i < parts.length && count < 10000; i += 1) {
    if (parts[i].trim()) count += 1
  }
  return { watchlistCount: count }
}

function activityWindow(raw, countKey, startKey) {
  const hasCount = hasOwn(raw, countKey)
  const hasStart = hasOwn(raw, startKey)
  if (!hasCount && !hasStart) return null
  return {
    count: hasCount ? numberOrNull(raw[countKey]) : null,
    windowStart: hasStart ? numberOrNull(raw[startKey]) : null,
  }
}

function linkFlag(raw, key) {
  if (!hasOwn(raw, key)) return null
  return textOrNull(raw[key], 500) != null
}

function metadataFrom(raw) {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null
  return {
    description: hasOwn(raw, "description") ? textOrNull(raw.description, 1200) : null,
    presale: hasOwn(raw, "presale") ? raw.presale === true : null,
    hasLogo: hasOwn(raw, "logo") ? textOrNull(raw.logo, 20) != null : null,
    kyc: linkFlag(raw, "kyc"),
    audit: linkFlag(raw, "audit"),
    links: {
      chart: linkFlag(raw, "chartlink"),
      swap: linkFlag(raw, "swaplink"),
      website: linkFlag(raw, "websitelink"),
      telegram: linkFlag(raw, "telegramlink"),
      twitter: linkFlag(raw, "twitterlink"),
      discord: linkFlag(raw, "discordlink"),
      cmc: linkFlag(raw, "cmclink"),
    },
  }
}

function marketNumber(market, key) {
  if (!market || typeof market !== "object") return null
  if (!Object.prototype.hasOwnProperty.call(market, key)) return null
  return numberOrNull(market[key])
}

function pushMissing(missing, name, value) {
  if (value == null) missing.push(name)
}

function isStale(epochSeconds, nowSeconds, maxAge) {
  if (epochSeconds == null) return false
  return nowSeconds - epochSeconds > maxAge
}

function dataQualityFor(intel) {
  if (intel.missing.includes("listingRecord")) return "insufficient"

  const identityMissing = !intel.name && !intel.symbol && !intel.contractAddress
  const noVotes = intel.voteCount == null
  const noMarket = intel.marketPrice == null && intel.marketCap == null && intel.priceChange == null
  const noListing = intel.listingDate == null
  if (identityMissing || (noVotes && noMarket && noListing)) return "insufficient"

  const coreMissing = [
    "name",
    "symbol",
    "contractAddress",
    "network",
    "listingDate",
    "voteCount",
    "dailyVotingActivity",
    "recentVotingActivity",
    "marketPrice",
    "marketCap",
    "priceChange",
  ].some((field) => intel.missing.includes(field))

  if (coreMissing || intel.stale.length > 0) return "partial"
  return "high"
}

function buildTokenIntelligence(id, raw, market, nowMs) {
  const now = Number.isFinite(nowMs) ? nowMs : Date.now()
  const nowSeconds = Math.floor(now / 1000)
  const malformed = raw == null || typeof raw !== "object" || Array.isArray(raw)

  if (malformed) {
    return {
      tokenId: textOrNull(id, 128),
      name: null,
      symbol: null,
      contractAddress: null,
      network: null,
      listingDate: null,
      tier: null,
      voteCount: null,
      recentVotingActivity: null,
      dailyVotingActivity: null,
      marketPrice: null,
      marketCap: null,
      volume: null,
      liquidity: null,
      priceChange: null,
      communityActivity: null,
      promotionStatus: null,
      metadata: null,
      timestamps: {
        listingDate: null,
        launchDate: null,
        marketAsOf: null,
        normalizedAt: nowSeconds,
      },
      sources: {
        identity: null,
        listingDate: null,
        votes: null,
        market: null,
        community: null,
        promotion: null,
        metadata: null,
      },
      missing: ["listingRecord"],
      stale: [],
      dataQuality: "insufficient",
    }
  }

  const voteCount = hasOwn(raw, "voteCount") ? numberOrNull(raw.voteCount) : null
  const listingDate = hasOwn(raw, "listed") ? numberOrNull(raw.listed) : null
  const launchDate = hasOwn(raw, "launch") ? numberOrNull(raw.launch) : null
  const dailyVotingActivity = activityWindow(raw, "dailyCount", "dailyStart")
  const recentVotingActivity = activityWindow(raw, "weeklyCount", "weeklyStart")
  const marketAsOf = marketNumber(market, "asOf")
  const catalog = "firebase_coinlist"

  const intel = {
    tokenId: textOrNull(id, 128),
    name: textOrNull(raw.name, 120),
    symbol: textOrNull(raw.symbol, 32),
    contractAddress: textOrNull(raw.contractAddr, 80),
    network: textOrNull(raw.network, 32),
    listingDate,
    tier: tierFor(voteCount),
    voteCount,
    recentVotingActivity,
    dailyVotingActivity,
    marketPrice: marketNumber(market, "price"),
    marketCap: marketNumber(market, "marketCap"),
    volume: marketNumber(market, "volume"),
    liquidity: marketNumber(market, "liquidity"),
    priceChange: marketNumber(market, "change24h"),
    communityActivity: communityActivity(raw),
    promotionStatus: promotionStatus(raw),
    metadata: metadataFrom(raw),
    timestamps: {
      listingDate,
      launchDate,
      marketAsOf,
      normalizedAt: nowSeconds,
    },
    sources: {
      identity: null,
      listingDate: listingDate == null ? null : catalog,
      votes: voteCount == null ? null : catalog,
      market: null,
      community: null,
      promotion: promotionStatus(raw) == null ? null : catalog,
      metadata: catalog,
      tier: voteCount == null ? null : "derived_from_vote_count",
    },
    missing: [],
    stale: [],
    dataQuality: "partial",
  }

  if (intel.name || intel.symbol || intel.contractAddress || intel.network) {
    intel.sources.identity = catalog
  }
  if (intel.communityActivity) intel.sources.community = catalog
  if (
    intel.marketPrice != null ||
    intel.marketCap != null ||
    intel.volume != null ||
    intel.liquidity != null ||
    intel.priceChange != null
  ) {
    intel.sources.market = "request_market"
  }

  pushMissing(intel.missing, "name", intel.name)
  pushMissing(intel.missing, "symbol", intel.symbol)
  pushMissing(intel.missing, "contractAddress", intel.contractAddress)
  pushMissing(intel.missing, "network", intel.network)
  pushMissing(intel.missing, "listingDate", intel.listingDate)
  pushMissing(intel.missing, "tier", intel.tier)
  pushMissing(intel.missing, "voteCount", intel.voteCount)
  pushMissing(intel.missing, "recentVotingActivity", intel.recentVotingActivity)
  pushMissing(intel.missing, "dailyVotingActivity", intel.dailyVotingActivity)
  pushMissing(intel.missing, "marketPrice", intel.marketPrice)
  pushMissing(intel.missing, "marketCap", intel.marketCap)
  pushMissing(intel.missing, "volume", intel.volume)
  pushMissing(intel.missing, "liquidity", intel.liquidity)
  pushMissing(intel.missing, "priceChange", intel.priceChange)
  pushMissing(intel.missing, "communityActivity", intel.communityActivity)
  pushMissing(intel.missing, "promotionStatus", intel.promotionStatus)

  if (isStale(marketAsOf, nowSeconds, STALE_MARKET_SECONDS)) intel.stale.push("market")
  if (dailyVotingActivity && isStale(dailyVotingActivity.windowStart, nowSeconds, STALE_DAILY_SECONDS)) {
    intel.stale.push("dailyVotingActivity")
  }
  if (recentVotingActivity && isStale(recentVotingActivity.windowStart, nowSeconds, STALE_WEEKLY_SECONDS)) {
    intel.stale.push("recentVotingActivity")
  }

  intel.dataQuality = dataQualityFor(intel)
  return intel
}

module.exports = {
  buildTokenIntelligence,
}
