/* global globalThis */
const TOKEN_ID = /^[A-Za-z0-9_-]{1,128}$/
const CACHE_TTL_MS = 10 * 60 * 1000
const DEFAULT_TIMEOUT_MS = 20000

const memory = new Map()
const inflight = new Map()
const generation = new Map()

function aiBaseUrl() {
  const configured = process.env.REACT_APP_SERVER_URL
  if (typeof configured === "string" && configured.trim()) {
    return configured.replace(/\/$/, "")
  }
  return "http://localhost:8080"
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
}

function roundMetric(value) {
  if (!finiteNumber(value)) return null
  return Math.round(value * 1e6) / 1e6
}

function marketPayload(quote) {
  if (!quote || typeof quote !== "object") return null
  const market = {}
  if (finiteNumber(quote.price) && quote.price !== 0) market.price = quote.price
  if (finiteNumber(quote.market_cap) && quote.market_cap !== 0) market.marketCap = quote.market_cap
  if (finiteNumber(quote.percent_change_24h) && (market.price != null || market.marketCap != null)) {
    market.change24h = quote.percent_change_24h
  }
  if (Object.keys(market).length === 0) return null
  return market
}

function listingVersion(listing) {
  if (!listing || typeof listing !== "object") return ""
  return [
    listing.voteCount == null ? "" : listing.voteCount,
    listing.dailyCount == null ? "" : listing.dailyCount,
    listing.dailyStart == null ? "" : listing.dailyStart,
    listing.weeklyCount == null ? "" : listing.weeklyCount,
    listing.weeklyStart == null ? "" : listing.weeklyStart,
    listing.promoted == null ? "" : listing.promoted,
    typeof listing.name === "string" ? listing.name : "",
    typeof listing.symbol === "string" ? listing.symbol : "",
  ].join("|")
}

function marketKey(market) {
  if (!market) return ""
  return [roundMetric(market.price), roundMetric(market.marketCap), roundMetric(market.change24h)].join(",")
}

function entryId(tokenId, version, market) {
  return tokenId + "\n" + (version || "") + "\n" + marketKey(market)
}

function storage() {
  try {
    if (!globalThis.sessionStorage) return null
    return globalThis.sessionStorage
  } catch (error) {
    return null
  }
}

function storageKey(tokenId) {
  return "nexora-ai-analysis:" + tokenId
}

function isAnalysis(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      value.disclaimer &&
      value.executiveSummary &&
      value.communityActivity &&
      value.marketContext &&
      value.listingProgress &&
      value.notableSignals &&
      value.dataQualityReport &&
      value.explanation
  )
}

function readCache(tokenId, version, market, now) {
  const id = entryId(tokenId, version, market)
  const hit = memory.get(tokenId)
  if (hit && hit.expires > now && hit.id === id) return hit.value
  if (hit && hit.expires <= now) memory.delete(tokenId)

  const store = storage()
  if (!store) return null
  try {
    const raw = store.getItem(storageKey(tokenId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.expires <= now || parsed.id !== id || !isAnalysis(parsed.analysis)) {
      if (parsed && parsed.expires <= now) store.removeItem(storageKey(tokenId))
      return null
    }
    const value = { ok: true, analysis: parsed.analysis, analyzedAt: parsed.analyzedAt, cached: true }
    memory.set(tokenId, { id, expires: parsed.expires, value })
    return value
  } catch (error) {
    return null
  }
}

function writeCache(tokenId, version, market, value, now) {
  const id = entryId(tokenId, version, market)
  const expires = now + CACHE_TTL_MS
  memory.set(tokenId, { id, expires, value: { ...value, cached: true } })
  const store = storage()
  if (!store) return
  try {
    store.setItem(
      storageKey(tokenId),
      JSON.stringify({
        id,
        expires,
        analyzedAt: value.analyzedAt,
        analysis: value.analysis,
        tokenId,
      })
    )
  } catch (error) {
    /* Private mode or a full quota should not affect the page. */
  }
}

function clearCache(tokenId) {
  memory.delete(tokenId)
  const store = storage()
  if (!store) return
  try {
    store.removeItem(storageKey(tokenId))
  } catch (error) {
    /* Ignore storage failures. */
  }
}

function messageForStatus(status) {
  if (status === 429) return "Too many analysis requests. Wait a minute, then use Refresh analysis."
  if (status === 404) return "This listing was not found, so it could not be analyzed."
  if (status === 503) return "Nexora AI is not available from the server right now."
  return "Nexora AI is unavailable right now. The listing details on this page are unchanged."
}

async function requestAnalysis(options, gen) {
  const fetchImpl = options.fetchImpl || fetch
  const now = options.now || Date.now()
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null
  const timer = setTimeout(() => {
    if (controller) controller.abort()
  }, timeoutMs)

  try {
    const headers = { Accept: "application/json" }
    const init = { method: "GET", headers, signal: controller ? controller.signal : undefined }
    if (options.market) {
      init.method = "POST"
      headers["Content-Type"] = "application/json"
      init.body = JSON.stringify({ market: options.market })
    }

    const response = await fetchImpl(aiBaseUrl() + "/ai/token/" + encodeURIComponent(options.tokenId), init)
    if (generation.get(options.tokenId) !== gen) {
      return { ok: false, message: messageForStatus(0), stale: true }
    }
    if (!response.ok) {
      return { ok: false, message: messageForStatus(response.status) }
    }

    const body = await response.json()
    if (!isAnalysis(body)) {
      return {
        ok: false,
        message: "Nexora AI returned an incomplete report. The listing details on this page are unchanged.",
      }
    }

    const value = { ok: true, analysis: body, analyzedAt: now, cached: false }
    writeCache(options.tokenId, options.version, options.market, value, now)
    return value
  } catch (error) {
    if (generation.get(options.tokenId) !== gen) {
      return { ok: false, message: messageForStatus(0), stale: true }
    }
    return { ok: false, message: messageForStatus(0) }
  } finally {
    clearTimeout(timer)
  }
}

function loadTokenAnalysis(options) {
  const tokenId = options && options.tokenId
  if (typeof tokenId !== "string" || !TOKEN_ID.test(tokenId)) {
    return Promise.resolve({
      ok: false,
      message: "This listing could not be analyzed.",
    })
  }

  const now = options.now || Date.now()
  const version = options.version || ""
  const flightKey = entryId(tokenId, version, options.market)
  if (!options.refresh) {
    const cached = readCache(tokenId, version, options.market, now)
    if (cached) return Promise.resolve(cached)
    const pending = inflight.get(flightKey)
    if (pending) return pending
  } else {
    clearCache(tokenId)
  }

  const gen = (generation.get(tokenId) || 0) + 1
  generation.set(tokenId, gen)
  const job = requestAnalysis({ ...options, tokenId, version }, gen).finally(() => {
    if (inflight.get(flightKey) === job) inflight.delete(flightKey)
  })
  inflight.set(flightKey, job)
  return job
}

function insightRecord(tokenId, value) {
  const analysis = value && value.analysis
  const observed = analysis && analysis.executiveSummary && analysis.executiveSummary.observed
  return {
    tokenId,
    summary: typeof observed === "string" ? observed.replace(/\s+/g, " ").trim().slice(0, 160) : "",
    dataQuality: analysis && analysis.dataQuality ? analysis.dataQuality : null,
    analyzedAt: value.analyzedAt || null,
  }
}

function readStoredInsight(tokenId, now) {
  const hit = memory.get(tokenId)
  if (hit && hit.expires > now && hit.value && hit.value.ok) return hit.value
  const store = storage()
  if (!store) return null
  try {
    const raw = store.getItem(storageKey(tokenId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.expires <= now || !isAnalysis(parsed.analysis)) return null
    return { ok: true, analysis: parsed.analysis, analyzedAt: parsed.analyzedAt, cached: true }
  } catch (error) {
    return null
  }
}

function listCachedInsights(now) {
  const current = now || Date.now()
  const items = []
  const seen = new Set()
  memory.forEach((hit, tokenId) => {
    if (!hit || hit.expires <= current || !hit.value || !hit.value.ok) return
    seen.add(tokenId)
    items.push(insightRecord(tokenId, hit.value))
  })

  const store = storage()
  if (!store) return items
  try {
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i)
      if (!key || key.indexOf("nexora-ai-analysis:") !== 0) continue
      const tokenId = key.slice("nexora-ai-analysis:".length)
      if (seen.has(tokenId)) continue
      const cached = readStoredInsight(tokenId, current)
      if (cached && cached.ok) items.push(insightRecord(tokenId, cached))
    }
  } catch (error) {
    return items
  }
  return items
}

function resetTokenIntelligenceCache() {
  memory.clear()
  inflight.clear()
  generation.clear()
}

export {
  marketPayload,
  listingVersion,
  loadTokenAnalysis,
  listCachedInsights,
  resetTokenIntelligenceCache,
  aiBaseUrl,
}
