const RUBY_VOTES = 250
const DIAMOND_VOTES = 500
const APPROACH_VOTES = 50
const RECENT_LIST_SECONDS = 7 * 24 * 60 * 60
const DAILY_WINDOW_SECONDS = 2 * 24 * 60 * 60
const WEEKLY_WINDOW_SECONDS = 14 * 24 * 60 * 60
const STRONG_WATCHLIST = 3
const RESULT_LIMIT = 24

const FILTERS = {
  votingMomentum: {
    direction: "increasing",
    period: "recent",
    methodology:
      "Voting momentum uses the stored daily vote count. A listing matches when that count is greater than 0 and the daily window started within the last 2 days. Matches are ordered by that daily count. One snapshot cannot prove the count is rising.",
  },
  communityActivity: {
    direction: "increasing",
    period: "recent",
    methodology:
      "Community activity uses the stored weekly vote count. A listing matches when that count is greater than 0 and the weekly window started within the last 14 days. Matches are ordered by that weekly count. One snapshot cannot prove the count is rising.",
  },
  listingAge: {
    direction: "recent",
    period: "recent",
    methodology:
      "Recently listed uses the stored listing time. A listing matches when that time is within the last 7 days. Matches are ordered from newest to oldest.",
  },
  tierProgress: {
    direction: "approaching",
    period: null,
    methodology:
      "Approaching the next tier uses the stored vote count. Ruby is 250 votes and Diamond is 500. A listing matches when more than 0 and at most 50 votes remain until the next threshold. Diamond listings are excluded. Closest thresholds are listed first.",
  },
  communityParticipation: {
    direction: "strong",
    period: "recent",
    methodology:
      "Strong recent participation requires at least 3 stored watchlist entries and a weekly vote count greater than 0 inside a window that started within the last 14 days. Matches are ordered by watchlist size. Watchlist size is not a count of holders.",
  },
}

const { plainCatalogText, blockedModelText } = require("./aiGuard")

const BANNED = /will (increase|rise|pump|moon|go up|soar)|guaranteed|\bbuy\b|\bsell\b|partnership|\bholders?\b|\busers?\b/i
const PLAIN_WORDS = new Set(
  "not financial advice daily weekly stored current window votes vote listing listings catalog tier tiers token tokens recent snapshot count counts remaining next community activity participation momentum days day watchlist entries entry matched showing single cannot prove rising rule records strong within ordered ruby diamond emerald eth bsc from that this these with and the are has have only last until more most size name symbol network total result results filter question catalog".split(
    " "
  )
)

function filterFor(metric) {
  const spec = FILTERS[metric]
  if (!spec) return null
  return { metric, direction: spec.direction, period: spec.period }
}

function parseDiscoveryQuery(text) {
  const question = String(text || "").toLowerCase()
  if (!question.trim()) return null
  if (/next tier|approaching/.test(question)) return filterFor("tierProgress")
  if (/recently listed|just listed|new listing|recent listing|listed tokens/.test(question)) {
    return filterFor("listingAge")
  }
  if (/participation|watchlist/.test(question)) return filterFor("communityParticipation")
  if (/momentum/.test(question)) return filterFor("votingMomentum")
  if (/community activity|increasing activity|\bactivity\b/.test(question)) return filterFor("communityActivity")
  return null
}

function acceptModelFilter(content) {
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch (error) {
    return null
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
  const spec = FILTERS[parsed.metric]
  if (!spec) return null
  if (parsed.direction !== spec.direction) return null
  if ((parsed.period == null ? null : parsed.period) !== spec.period) return null
  return { metric: parsed.metric, direction: spec.direction, period: spec.period }
}

function numberOrNull(value) {
  if (value == null || value === "" || typeof value === "boolean") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function currentWindow(start, nowSeconds, maxAge) {
  if (start == null) return false
  const age = nowSeconds - start
  return age >= 0 && age <= maxAge
}

function votesRemaining(voteCount) {
  if (voteCount == null) return null
  if (voteCount >= DIAMOND_VOTES) return 0
  if (voteCount >= RUBY_VOTES) return DIAMOND_VOTES - voteCount
  return RUBY_VOTES - voteCount
}

function tierFor(voteCount) {
  if (voteCount == null) return null
  if (voteCount >= DIAMOND_VOTES) return "diamond"
  if (voteCount >= RUBY_VOTES) return "ruby"
  return "emerald"
}

function watchlistCount(value) {
  if (typeof value !== "string") return null
  if (value.trim() === "") return 0
  const source = value.slice(0, 20000)
  let count = 0
  const parts = source.split(",")
  for (let i = 0; i < parts.length && count < 10000; i += 1) {
    if (parts[i].trim()) count += 1
  }
  return count
}

function catalogRow(id, raw) {
  if (!id || !raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const voteCount = Object.prototype.hasOwnProperty.call(raw, "voteCount") ? numberOrNull(raw.voteCount) : null
  return {
    id: String(id),
    name: plainCatalogText(raw.name, 120) || null,
    symbol: plainCatalogText(raw.symbol, 32) || null,
    network: plainCatalogText(raw.network, 32) || null,
    voteCount,
    tier: tierFor(voteCount),
    dailyCount: Object.prototype.hasOwnProperty.call(raw, "dailyCount") ? numberOrNull(raw.dailyCount) : null,
    dailyStart: Object.prototype.hasOwnProperty.call(raw, "dailyStart") ? numberOrNull(raw.dailyStart) : null,
    weeklyCount: Object.prototype.hasOwnProperty.call(raw, "weeklyCount") ? numberOrNull(raw.weeklyCount) : null,
    weeklyStart: Object.prototype.hasOwnProperty.call(raw, "weeklyStart") ? numberOrNull(raw.weeklyStart) : null,
    listed: Object.prototype.hasOwnProperty.call(raw, "listed") ? numberOrNull(raw.listed) : null,
    watchlistCount: Object.prototype.hasOwnProperty.call(raw, "watchlist") ? watchlistCount(raw.watchlist) : null,
  }
}

function rowsFromCatalog(catalog) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) return []
  return Object.keys(catalog)
    .filter((id) => /^[A-Za-z0-9_-]{1,128}$/.test(id))
    .map((id) => catalogRow(id, catalog[id]))
    .filter(Boolean)
    .slice(0, 2000)
}

function publicToken(row, reason) {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    network: row.network,
    tier: row.tier,
    voteCount: row.voteCount,
    dailyCount: row.dailyCount,
    weeklyCount: row.weeklyCount,
    watchlistCount: row.watchlistCount,
    listed: row.listed,
    votesRemaining: votesRemaining(row.voteCount),
    reason,
  }
}

function applyDiscoveryQuery(rows, filter, nowSeconds) {
  const spec = FILTERS[filter && filter.metric]
  if (!spec) return { tokens: [], matchedCount: 0, methodology: "" }
  const now = Number(nowSeconds) || 0
  const matched = []

  rows.forEach((row) => {
    if (!row || !row.id) return
    if (filter.metric === "votingMomentum") {
      if (row.dailyCount > 0 && currentWindow(row.dailyStart, now, DAILY_WINDOW_SECONDS)) {
        matched.push(publicToken(row, row.dailyCount + " votes are stored in the current daily window."))
      }
      return
    }
    if (filter.metric === "communityActivity") {
      if (row.weeklyCount > 0 && currentWindow(row.weeklyStart, now, WEEKLY_WINDOW_SECONDS)) {
        matched.push(publicToken(row, row.weeklyCount + " votes are stored in the current weekly window."))
      }
      return
    }
    if (filter.metric === "listingAge") {
      if (row.listed != null && currentWindow(row.listed, now, RECENT_LIST_SECONDS)) {
        matched.push(publicToken(row, "The stored listing time is within the last 7 days."))
      }
      return
    }
    if (filter.metric === "tierProgress") {
      const remaining = votesRemaining(row.voteCount)
      if (remaining != null && remaining > 0 && remaining <= APPROACH_VOTES) {
        matched.push(publicToken(row, remaining + " stored votes remain until the next catalog tier."))
      }
      return
    }
    if (filter.metric === "communityParticipation") {
      const weeklyFresh = row.weeklyCount > 0 && currentWindow(row.weeklyStart, now, WEEKLY_WINDOW_SECONDS)
      if (row.watchlistCount != null && row.watchlistCount >= STRONG_WATCHLIST && weeklyFresh) {
        matched.push(
          publicToken(row, row.watchlistCount + " watchlist entries are stored, with votes in the current weekly window.")
        )
      }
    }
  })

  matched.sort((a, b) => {
    if (filter.metric === "votingMomentum") return b.dailyCount - a.dailyCount || a.id.localeCompare(b.id)
    if (filter.metric === "communityActivity") return b.weeklyCount - a.weeklyCount || a.id.localeCompare(b.id)
    if (filter.metric === "listingAge") return b.listed - a.listed || a.id.localeCompare(b.id)
    if (filter.metric === "tierProgress") return a.votesRemaining - b.votesRemaining || a.id.localeCompare(b.id)
    return b.watchlistCount - a.watchlistCount || a.id.localeCompare(b.id)
  })

  return {
    tokens: matched.slice(0, RESULT_LIMIT),
    matchedCount: matched.length,
    methodology: spec.methodology,
  }
}

function explainDiscovery(applied) {
  if (!applied || !applied.matchedCount) {
    return applied.methodology + " No catalog records matched this rule. Not financial advice."
  }
  const names = applied.tokens
    .map((token) => token.name || token.symbol || token.id)
    .filter(Boolean)
    .slice(0, 8)
  const shown = applied.tokens.length
  const lead =
    applied.matchedCount > shown
      ? shown + " of " + applied.matchedCount + " matching listings are shown"
      : applied.matchedCount + " listings matched"
  return applied.methodology + " " + lead + (names.length ? ": " + names.join(", ") + "." : ".") + " Not financial advice."
}

function allowedNumbers(applied) {
  const set = new Set(["0", "2", "3", "5", "7", "14", "24", "50", "250", "500", String(applied.matchedCount)])
  const blob = JSON.stringify(applied.tokens) + " " + applied.methodology
  ;(blob.match(/\d+(?:\.\d+)?/g) || []).forEach((number) => set.add(number))
  return set
}

function allowedLabels(applied) {
  const set = new Set(PLAIN_WORDS)
  applied.tokens.forEach((token) => {
    ;[token.name, token.symbol, token.id].forEach((value) => {
      if (value) set.add(String(value).toLowerCase())
    })
  })
  return set
}

function groundExplanation(text, applied) {
  if (typeof text !== "string") return null
  const clean = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
  if (!clean || clean.length > 700 || BANNED.test(clean) || blockedModelText(clean)) return null
  const numbers = clean.match(/\d+(?:\.\d+)?/g) || []
  const allowed = allowedNumbers(applied)
  if (!numbers.every((number) => allowed.has(number))) return null
  const labels = allowedLabels(applied)
  const words = clean.match(/[A-Za-z][A-Za-z0-9]{2,}/g) || []
  const grounded = words.every((word) => labels.has(word.toLowerCase()) || word === word.toLowerCase())
  return grounded ? clean : null
}

module.exports = {
  FILTERS,
  parseDiscoveryQuery,
  acceptModelFilter,
  rowsFromCatalog,
  applyDiscoveryQuery,
  explainDiscovery,
  groundExplanation,
}
