const crypto = require("crypto")
const { complete, readConfig } = require("./aiProvider")
const { buildTokenPrompt } = require("./prompts")
const { buildTokenIntelligence } = require("./tokenIntelligence")
const { buildAnalysis, mergeInterpretations } = require("./analysisEngine")
const { fetchToken } = require("./tokenAnalyzer")
const { recordAiEvent, singleFlight } = require("./aiLog")

const cache = new Map()
const inflight = new Map()
const insightIndex = new Map()

function flag(value) {
  if (value === true) return true
  if (value === false) return false
  return null
}

function roundMetric(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return Math.round(value * 1e6) / 1e6
}

function windowPart(activity) {
  if (!activity) return null
  return { count: activity.count == null ? null : activity.count, start: activity.windowStart == null ? null : activity.windowStart }
}

function analysisVersion(intel) {
  const metadata = intel.metadata || {}
  const material = {
    tokenId: intel.tokenId,
    name: intel.name,
    symbol: intel.symbol,
    network: intel.network,
    voteCount: intel.voteCount,
    daily: windowPart(intel.dailyVotingActivity),
    weekly: windowPart(intel.recentVotingActivity),
    marketPrice: roundMetric(intel.marketPrice),
    marketCap: roundMetric(intel.marketCap),
    priceChange: roundMetric(intel.priceChange),
    promotionStatus: intel.promotionStatus,
    presale: flag(metadata.presale),
    audit: flag(metadata.audit),
    kyc: flag(metadata.kyc),
    stale: (intel.stale || []).slice().sort().join(","),
  }
  return crypto.createHash("sha256").update(JSON.stringify(material)).digest("hex").slice(0, 24)
}

function providerView(intel) {
  const metadata = intel.metadata || {}
  const community = intel.communityActivity || {}
  return {
    tokenId: intel.tokenId,
    name: intel.name,
    symbol: intel.symbol,
    network: intel.network,
    tier: intel.tier,
    voteCount: intel.voteCount,
    dailyVotingActivity: windowPart(intel.dailyVotingActivity),
    recentVotingActivity: windowPart(intel.recentVotingActivity),
    marketPrice: intel.marketPrice,
    marketCap: intel.marketCap,
    volume: intel.volume,
    liquidity: intel.liquidity,
    priceChange: intel.priceChange,
    watchlistCount: community.watchlistCount == null ? null : community.watchlistCount,
    promotionStatus: intel.promotionStatus,
    presale: flag(metadata.presale),
    hasAuditLink: flag(metadata.audit),
    hasKycLink: flag(metadata.kyc),
    dataQuality: intel.dataQuality,
    missing: intel.missing,
    stale: intel.stale,
  }
}

function readCache(key) {
  const hit = cache.get(key)
  if (!hit) return null
  if (hit.expires < Date.now()) {
    cache.delete(key)
    return null
  }
  return hit.value
}

function writeCache(key, value) {
  const { cacheTtlMs } = readConfig()
  cache.set(key, { expires: Date.now() + cacheTtlMs, value })
}

function summaryFrom(analysis) {
  const observed = analysis && analysis.executiveSummary && analysis.executiveSummary.observed
  if (typeof observed !== "string") return ""
  return observed.replace(/\s+/g, " ").trim().slice(0, 160)
}

function rememberInsight(tokenId, analysis, nowMs) {
  if (!tokenId || !analysis || typeof analysis !== "object") return
  const now = nowMs || Date.now()
  const { cacheTtlMs } = readConfig()
  insightIndex.set(String(tokenId), {
    expires: now + cacheTtlMs,
    summary: summaryFrom(analysis),
    dataQuality: analysis.dataQuality || null,
    analyzedAt: now,
  })
}

function listInsights(nowMs) {
  const now = nowMs || Date.now()
  const insights = []
  insightIndex.forEach((entry, tokenId) => {
    if (entry.expires <= now) {
      insightIndex.delete(tokenId)
      return
    }
    insights.push({
      tokenId,
      summary: entry.summary,
      dataQuality: entry.dataQuality,
      analyzedAt: entry.analyzedAt,
    })
  })
  return insights
}

function resetInsightIndex() {
  insightIndex.clear()
}

async function generateAnalysis(intel, completeImpl) {
  const started = Date.now()
  const version = analysisVersion(intel)
  const base = buildAnalysis(intel)
  let response = base
  let aiRequests = 0
  if (!intel.missing.includes("listingRecord")) {
    aiRequests = 1
    const result = await completeImpl(buildTokenPrompt(providerView(intel)))
    if (result.ok && result.content) {
      response = mergeInterpretations(base, result.content)
    }
  }
  writeCache(intel.tokenId, { version, value: response })
  rememberInsight(intel.tokenId, response)
  recordAiEvent({
    event: "analysis",
    outcome: "miss",
    durationMs: Date.now() - started,
    aiRequests,
    tokenId: intel.tokenId,
  })
  return { analysis: response }
}

async function analyzeToken(id, market, options) {
  const settings = options || {}
  const started = Date.now()
  let intel = settings.intel
  if (!intel) {
    const loaded = await (settings.fetchToken || fetchToken)(id)
    if (loaded.error) return { error: loaded.error, message: loaded.message }
    intel = buildTokenIntelligence(id, loaded.raw, market)
  }

  const version = analysisVersion(intel)
  const cached = readCache(intel.tokenId)
  if (cached && cached.version === version) {
    recordAiEvent({
      event: "analysis",
      outcome: "hit",
      durationMs: Date.now() - started,
      aiRequests: 0,
      tokenId: intel.tokenId,
    })
    return { analysis: cached.value }
  }

  const flightKey = intel.tokenId + ":" + version
  const completeImpl = settings.complete || complete
  return singleFlight(inflight, flightKey, () => generateAnalysis(intel, completeImpl))
}

function resetAnalysisCache() {
  cache.clear()
  inflight.clear()
}

module.exports = {
  analyzeToken,
  analysisVersion,
  providerView,
  rememberInsight,
  listInsights,
  resetInsightIndex,
  resetAnalysisCache,
}
