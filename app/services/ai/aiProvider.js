const fs = require("fs")
const path = require("path")
const { MAX_PROMPT_CHARS, MAX_COMPLETION_CHARS, blockedModelText } = require("./aiGuard")

let envLoaded = false

function loadEnvFile() {
  if (envLoaded) return
  envLoaded = true
  const envPath = path.join(__dirname, "../../../.env")
  if (!fs.existsSync(envPath)) return

  const text = fs.readFileSync(envPath, "utf8")
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) return
    const eq = trimmed.indexOf("=")
    if (eq <= 0) return
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = value
    }
  })
}

function readNumber(name, fallback) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function readConfig() {
  loadEnvFile()
  return {
    provider: (process.env.AI_PROVIDER || "openai").toLowerCase(),
    timeoutMs: readNumber("AI_TIMEOUT_MS", 15000),
    openaiKey: process.env.OPENAI_KEY || "",
    openaiModel: process.env.OPENAI_MODEL || "gpt-4o",
    databaseURL: (
      process.env.FIREBASE_DATABASE_URL ||
      process.env.REACT_APP_FIREBASE_DATABASE_URL ||
      ""
    ).replace(/\/$/, ""),
    cacheTtlMs: readNumber("AI_CACHE_TTL_MS", 600000),
    rateLimit: readNumber("AI_RATE_LIMIT_TOKEN", 10),
  }
}

async function openAIComplete(config, { system, user }) {
  if (!config.openaiKey) {
    return { ok: false, reason: "missing_api_key" }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.timeoutMs)
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.openaiModel,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    })

    if (!response.ok) {
      return { ok: false, reason: "provider_http_" + response.status }
    }

    const payload = await response.json()
    const content = payload && payload.choices && payload.choices[0] && payload.choices[0].message
      ? payload.choices[0].message.content
      : ""
    return { ok: true, content: typeof content === "string" ? content : "" }
  } catch (error) {
    const reason = error && error.name === "AbortError" ? "provider_timeout" : "provider_unreachable"
    return { ok: false, reason }
  } finally {
    clearTimeout(timer)
  }
}

const providers = {
  openai: openAIComplete,
}

function acceptedPrompt(messages) {
  const system = messages && messages.system
  const user = messages && messages.user
  if (typeof system !== "string" || typeof user !== "string") return false
  if (system.length + user.length > MAX_PROMPT_CHARS) return false
  if (blockedModelText(user)) return false
  return true
}

async function complete(messages) {
  if (!acceptedPrompt(messages)) return { ok: false, reason: "prompt_rejected" }
  const config = readConfig()
  const provider = providers[config.provider]
  if (!provider) {
    return { ok: false, reason: "unknown_provider" }
  }
  try {
    const result = await provider(config, messages)
    if (result && result.ok && typeof result.content === "string" && result.content.length > MAX_COMPLETION_CHARS) {
      return { ok: false, reason: "prompt_rejected" }
    }
    return result
  } catch (error) {
    return { ok: false, reason: "provider_failed" }
  }
}

module.exports = {
  readConfig,
  complete,
}
