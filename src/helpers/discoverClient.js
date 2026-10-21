import { aiBaseUrl } from "./tokenIntelligenceClient.js"

function messageForStatus(status) {
  if (status === 429) return "Too many discovery requests. Wait a minute, then try again."
  if (status === 400) return "Enter a question before searching."
  if (status === 503) return "Nexora AI discovery is not available from the server right now."
  return "Nexora AI discovery is unavailable right now. Wallet actions are unchanged."
}

function isDiscoveryResult(value) {
  return Boolean(value && typeof value === "object" && Array.isArray(value.tokens) && typeof value.explanation === "string")
}

async function discoverTokens(query, options) {
  const settings = options || {}
  const fetchImpl = settings.fetchImpl || fetch
  const text = String(query || "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 300)
  if (!text) return { ok: false, message: messageForStatus(400) }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null
  const timer = setTimeout(() => {
    if (controller) controller.abort()
  }, settings.timeoutMs || 20000)

  try {
    const response = await fetchImpl(aiBaseUrl() + "/ai/discover", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ query: text }),
      signal: controller ? controller.signal : undefined,
    })
    if (!response.ok) return { ok: false, message: messageForStatus(response.status) }
    const body = await response.json()
    if (!isDiscoveryResult(body)) {
      return { ok: false, message: "Nexora AI discovery returned an incomplete result." }
    }
    return { ok: true, result: body }
  } catch (error) {
    return { ok: false, message: messageForStatus(0) }
  } finally {
    clearTimeout(timer)
  }
}

export { discoverTokens }
