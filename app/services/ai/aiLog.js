const stats = {
  aiRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalDurationMs: 0,
  responses: 0,
}

function recordAiEvent(event) {
  const aiRequests = event.aiRequests || 0
  const durationMs = event.durationMs
  if (event.outcome === "hit") stats.cacheHits += 1
  if (event.outcome === "miss") stats.cacheMisses += 1
  if (aiRequests) stats.aiRequests += aiRequests
  if (typeof durationMs === "number") {
    stats.totalDurationMs += durationMs
    stats.responses += 1
  }

  console.log(
    JSON.stringify({
      time: new Date().toISOString(),
      level: "info",
      component: "ai",
      event: event.event,
      outcome: event.outcome,
      durationMs: durationMs == null ? undefined : durationMs,
      aiRequests,
      tokenId: event.tokenId || undefined,
    })
  )
}

function aiMetrics() {
  return {
    aiRequests: stats.aiRequests,
    cacheHits: stats.cacheHits,
    cacheMisses: stats.cacheMisses,
    averageResponseMs: stats.responses ? Math.round(stats.totalDurationMs / stats.responses) : 0,
  }
}

function resetAiMetrics() {
  stats.aiRequests = 0
  stats.cacheHits = 0
  stats.cacheMisses = 0
  stats.totalDurationMs = 0
  stats.responses = 0
}

function singleFlight(map, key, work) {
  const existing = map.get(key)
  if (existing) return existing
  let promise
  promise = new Promise((resolve, reject) => {
    Promise.resolve()
      .then(work)
      .then(resolve, reject)
  }).finally(() => {
    if (map.get(key) === promise) map.delete(key)
  })
  map.set(key, promise)
  return promise
}

module.exports = {
  recordAiEvent,
  aiMetrics,
  resetAiMetrics,
  singleFlight,
}
