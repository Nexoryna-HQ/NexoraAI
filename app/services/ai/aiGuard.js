const MAX_AI_BODY_CHARS = 4096
const MAX_PROMPT_CHARS = 6000
const MAX_COMPLETION_CHARS = 8000
const TOKEN_BYTES = 256 * 1024
const CATALOG_BYTES = 1500 * 1024
const MAX_MARKET = 1e15
const MAX_CHANGE = 1e6
const MAX_AS_OF = 4102444800

const SENSITIVE_KEY = /private.?key|seed.?phrase|mnemonic|secret|signed.?transaction|wallet|signature/i
const BLOCKED_TEXT = /private key|seed phrase|mnemonic|begin (?:ec|rsa|openssh) private|signed transaction|eth_sendTransaction|eth_sign|personal_sign|signTypedData|calldata|ignore previous|sign this|\btransaction\b/i
const HEX_SECRET = /\b(?:0x)?[a-fA-F0-9]{64}\b/
const ADDRESS = /0x[a-fA-F0-9]{8,}/

function plainCatalogText(value, max) {
  if (typeof value !== "string") return ""
  const text = value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
  return text
}

function bodyTooLarge(body) {
  if (body == null || body === "") return false
  try {
    return JSON.stringify(body).length > MAX_AI_BODY_CHARS
  } catch (error) {
    return true
  }
}

function containsSensitive(value, depth) {
  const level = depth || 0
  if (level > 4 || value == null) return false
  if (typeof value === "string") return BLOCKED_TEXT.test(value) || HEX_SECRET.test(value)
  if (typeof value !== "object") return false
  const keys = Object.keys(value)
  for (let i = 0; i < keys.length; i += 1) {
    if (SENSITIVE_KEY.test(keys[i])) return true
    if (containsSensitive(value[keys[i]], level + 1)) return true
  }
  return false
}

function blockedModelText(text) {
  return typeof text === "string" && (BLOCKED_TEXT.test(text) || HEX_SECRET.test(text) || ADDRESS.test(text))
}

function withinMarket(key, number) {
  if (key === "change24h") return Math.abs(number) <= MAX_CHANGE
  if (key === "asOf") return number >= 0 && number <= MAX_AS_OF
  return Math.abs(number) <= MAX_MARKET
}

function safeCatalogUrl(databaseURL, suffix) {
  let base
  try {
    base = new URL(databaseURL)
  } catch (error) {
    return null
  }
  if (base.username || base.password) return null
  if (base.protocol === "http:") {
    const host = base.hostname
    if (host !== "localhost" && host !== "127.0.0.1" && host !== "[::1]" && host !== "::1") return null
  } else if (base.protocol !== "https:") {
    return null
  }
  let target
  try {
    target = new URL(suffix, base.href.endsWith("/") ? base.href : base.href + "/")
  } catch (error) {
    return null
  }
  if (target.origin !== base.origin) return null
  if (target.username || target.password) return null
  return target.href
}

async function readLimitedJson(response, maxBytes) {
  if (!response || !response.body || typeof response.body.getReader !== "function") {
    const text = await response.text()
    if (text.length > maxBytes) return { ok: false }
    try {
      return { ok: true, value: JSON.parse(text) }
    } catch (error) {
      return { ok: false }
    }
  }

  const reader = response.body.getReader()
  const parts = []
  let received = 0
  while (true) {
    const step = await reader.read()
    if (step.done) break
    received += step.value.byteLength
    if (received > maxBytes) {
      try {
        await reader.cancel()
      } catch (error) {
        /* The unread remainder is discarded. */
      }
      return { ok: false }
    }
    parts.push(Buffer.from(step.value))
  }

  try {
    return { ok: true, value: JSON.parse(Buffer.concat(parts).toString("utf8")) }
  } catch (error) {
    return { ok: false }
  }
}

async function fetchCatalogJson(url, timeoutMs, maxBytes) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
      headers: { Accept: "application/json" },
    })
    if (response.status >= 300 && response.status < 400) return { error: "source_unavailable" }
    if (!response.ok) return { error: "source_unavailable" }
    const parsed = await readLimitedJson(response, maxBytes)
    if (!parsed.ok) return { error: "source_unavailable" }
    return { value: parsed.value }
  } catch (error) {
    return { error: "source_unavailable" }
  } finally {
    clearTimeout(timer)
  }
}

function allowRequest(map, key, limit, now) {
  const current = now || Date.now()
  if (map.size > 2000) {
    map.forEach((times, stored) => {
      const live = times.filter((time) => current - time < 60000)
      if (!live.length) map.delete(stored)
    })
  }
  const recent = (map.get(key) || []).filter((time) => current - time < 60000)
  if (recent.length >= limit) {
    map.set(key, recent)
    return false
  }
  recent.push(current)
  map.set(key, recent)
  return true
}

function releaseAnalysis(analysis) {
  if (!analysis || typeof analysis !== "object") return analysis
  const copy = JSON.parse(JSON.stringify(analysis))
  ;[
    "transaction",
    "signedTransaction",
    "privateKey",
    "mnemonic",
    "seed",
    "signature",
    "wallet",
    "to",
    "from",
    "gas",
    "data",
  ].forEach((key) => {
    delete copy[key]
  })
  return copy
}

module.exports = {
  TOKEN_BYTES,
  CATALOG_BYTES,
  MAX_PROMPT_CHARS,
  MAX_COMPLETION_CHARS,
  plainCatalogText,
  bodyTooLarge,
  containsSensitive,
  blockedModelText,
  withinMarket,
  safeCatalogUrl,
  readLimitedJson,
  fetchCatalogJson,
  allowRequest,
  releaseAnalysis,
}
