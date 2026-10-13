import { aiBaseUrl, listCachedInsights } from "./tokenIntelligenceClient.js"

const INDEX_TTL_MS = 60 * 1000
let indexCache = null
let indexFlight = null

function numericChange(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : Number.NEGATIVE_INFINITY
}

function sortListingRows(rows, mode) {
  const copy = (rows || []).slice()
  if (mode === "votes") {
    copy.sort((a, b) => Number(b[7] || 0) - Number(a[7] || 0))
  } else if (mode === "change24h") {
    copy.sort((a, b) => numericChange(b[4]) - numericChange(a[4]))
  }
  return copy
}

function filterInsightRows(rows, insights) {
  const available = insights || {}
  return (rows || []).filter((row) => row && available[row[10]])
}

function validInsight(item) {
  return Boolean(item && typeof item.tokenId === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(item.tokenId))
}

function mergeInsights(remote, local) {
  const map = new Map()
  remote.forEach((item) => {
    if (validInsight(item)) map.set(item.tokenId, item)
  })
  local.forEach((item) => {
    if (!validInsight(item)) return
    const existing = map.get(item.tokenId)
    if (!existing || (item.analyzedAt || 0) >= (existing.analyzedAt || 0)) map.set(item.tokenId, item)
  })
  return Array.from(map.values())
}

async function fetchIndex(options, now) {
  const local = listCachedInsights(now)
  const fetchImpl = options.fetchImpl || fetch
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null
  const timer = setTimeout(() => {
    if (controller) controller.abort()
  }, options.timeoutMs || 4000)

  try {
    const response = await fetchImpl(aiBaseUrl() + "/ai/insights", {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller ? controller.signal : undefined,
    })
    if (!response.ok) {
      const missed = { ok: true, remote: false, insights: local }
      indexCache = { expires: now + 15000, value: missed }
      return missed
    }
    const body = await response.json()
    const remote = body && Array.isArray(body.insights) ? body.insights : []
    const value = { ok: true, remote: true, insights: mergeInsights(remote, local) }
    indexCache = { expires: now + INDEX_TTL_MS, value }
    return value
  } catch (error) {
    const missed = { ok: true, remote: false, insights: local }
    indexCache = { expires: now + 15000, value: missed }
    return missed
  } finally {
    clearTimeout(timer)
  }
}

function loadInsightIndex(options) {
  const settings = options || {}
  const now = settings.now || Date.now()
  if (!settings.refresh && indexCache && indexCache.expires > now) {
    return Promise.resolve(indexCache.value)
  }
  if (!settings.refresh && indexFlight) return indexFlight

  const job = fetchIndex(settings, now).finally(() => {
    if (indexFlight === job) indexFlight = null
  })
  indexFlight = job
  return job
}

function resetInsightIndexCache() {
  indexCache = null
  indexFlight = null
}

export {
  sortListingRows,
  filterInsightRows,
  loadInsightIndex,
  resetInsightIndexCache,
}
