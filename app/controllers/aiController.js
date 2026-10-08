const { analyzeToken, listInsights } = require("../services/ai/aiService")
const { aiMetrics } = require("../services/ai/aiLog")
const { discoverTokens } = require("../services/ai/discoveryService")
const { validateTokenId, readMarket } = require("../services/ai/tokenAnalyzer")
const { readConfig } = require("../services/ai/aiProvider")
const { allowRequest, bodyTooLarge, containsSensitive, plainCatalogText, releaseAnalysis } = require("../services/ai/aiGuard")

const hits = new Map()

function clientKey(req) {
  return req.ip || (req.socket && req.socket.remoteAddress) || "unknown"
}

function rateLimited(req, bucket) {
  const { rateLimit } = readConfig()
  const limit = bucket === "read" ? Math.max(rateLimit * 3, 30) : rateLimit
  return !allowRequest(hits, bucket + ":" + clientKey(req), limit, Date.now())
}

function rejectedRequest(req, res) {
  if (bodyTooLarge(req.body) || containsSensitive(req.body)) {
    res.status(400).json({
      error: "invalid_request",
      message: "This request cannot be processed.",
    })
    return true
  }
  return false
}

async function analyzeTokenRequest(req, res) {
  try {
    if (!validateTokenId(req.params.id)) {
      res.status(400).json({
        error: "invalid_token_id",
        message: "Token id must be 1-128 letters, numbers, underscores, or hyphens.",
      })
      return
    }

    if (rejectedRequest(req, res)) return

    if (rateLimited(req, "generate")) {
      res.status(429).json({
        error: "rate_limited",
        message: "Too many token analysis requests. Try again in a minute.",
      })
      return
    }

    const market = readMarket(req.body)
    if (market.error) {
      res.status(400).json({ error: "invalid_market", message: market.error })
      return
    }

    const result = await analyzeToken(req.params.id, market.value)
    if (result.error === "not_found") {
      res.status(404).json({ error: "token_not_found", message: result.message })
      return
    }
    if (result.error === "not_configured") {
      res.status(503).json({ error: "not_configured", message: result.message })
      return
    }
    if (result.error) {
      res.status(502).json({ error: result.error, message: result.message })
      return
    }

    res.json(releaseAnalysis(result.analysis))
  } catch (error) {
    console.error("AI token analysis failed")
    if (!res.headersSent) {
      res.status(500).json({
        error: "analysis_failed",
        message: "Token analysis could not be completed.",
      })
    }
  }
}

async function discoverRequest(req, res) {
  try {
    const query = plainCatalogText(req.body && req.body.query, 300)
    if (rejectedRequest(req, res)) return
    if (!query || query.length > 300) {
      res.status(400).json({
        error: "invalid_query",
        message: "Enter a question of 1 to 300 characters.",
      })
      return
    }
    if (rateLimited(req, "generate")) {
      res.status(429).json({
        error: "rate_limited",
        message: "Too many discovery requests. Try again in a minute.",
      })
      return
    }

    const result = await discoverTokens(query)
    if (result.error === "not_configured") {
      res.status(503).json({
        error: "not_configured",
        message: "Token discovery is not available from the server right now.",
      })
      return
    }
    if (result.error) {
      res.status(502).json({
        error: result.error,
        message: "The token catalog could not be read. The rest of Nexora AI is unchanged.",
      })
      return
    }
    res.json(result)
  } catch (error) {
    console.error("AI discovery failed")
    if (!res.headersSent) {
      res.status(500).json({
        error: "discovery_failed",
        message: "Token discovery could not be completed.",
      })
    }
  }
}

function metricsRequest(req, res) {
  if (rateLimited(req, "read")) {
    res.status(429).json({ error: "rate_limited", message: "Too many requests. Try again in a minute." })
    return
  }
  res.json(aiMetrics())
}

function listInsightsRequest(req, res) {
  try {
    if (rateLimited(req, "read")) {
      res.status(429).json({ insights: [], error: "rate_limited" })
      return
    }
    res.json({ insights: listInsights() })
  } catch (error) {
    res.json({ insights: [] })
  }
}

module.exports = {
  analyzeToken: analyzeTokenRequest,
  listInsights: listInsightsRequest,
  discover: discoverRequest,
  metrics: metricsRequest,
}
