const RUBY_VOTES = 250
const DIAMOND_VOTES = 500
const APPROACH_VOTES = 50
const RECENT_LIST_SECONDS = 7 * 24 * 60 * 60
const DAILY_WINDOW_SECONDS = 2 * 24 * 60 * 60
const WEEKLY_WINDOW_SECONDS = 14 * 24 * 60 * 60
const LIST_LIMIT = 6

function numberOrNull(value) {
  if (value == null || value === "" || typeof value === "boolean") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function textOrNull(value, max) {
  if (typeof value !== "string") return null
  const text = value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, max)
  return text || null
}

function watchlistCount(value) {
  if (typeof value !== "string") return null
  if (value.trim() === "") return 0
  return value.split(",").filter((part) => part.trim()).length
}

function tierFor(voteCount) {
  if (voteCount == null) return null
  if (voteCount >= DIAMOND_VOTES) return "diamond"
  if (voteCount >= RUBY_VOTES) return "ruby"
  return "emerald"
}

function currentWindow(start, nowSeconds, maxAge) {
  if (start == null) return false
  const age = nowSeconds - start
  return age >= 0 && age <= maxAge
}

function votesRemaining(voteCount) {
  if (voteCount == null || voteCount >= DIAMOND_VOTES) return voteCount == null ? null : 0
  if (voteCount >= RUBY_VOTES) return DIAMOND_VOTES - voteCount
  return RUBY_VOTES - voteCount
}

function has(raw, key) {
  return Object.prototype.hasOwnProperty.call(raw, key)
}

function rowFrom(id, raw) {
  if (!id || !raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const voteCount = has(raw, "voteCount") ? numberOrNull(raw.voteCount) : null
  const promotedValue = has(raw, "promoted") ? raw.promoted : null
  const promotedNumber = numberOrNull(promotedValue)
  return {
    id: String(id),
    name: textOrNull(raw.name, 120),
    symbol: textOrNull(raw.symbol, 32),
    network: textOrNull(raw.network, 32),
    voteCount,
    tier: tierFor(voteCount),
    dailyCount: has(raw, "dailyCount") ? numberOrNull(raw.dailyCount) : null,
    dailyStart: has(raw, "dailyStart") ? numberOrNull(raw.dailyStart) : null,
    weeklyCount: has(raw, "weeklyCount") ? numberOrNull(raw.weeklyCount) : null,
    weeklyStart: has(raw, "weeklyStart") ? numberOrNull(raw.weeklyStart) : null,
    listed: has(raw, "listed") ? numberOrNull(raw.listed) : null,
    watchlistCount: has(raw, "watchlist") ? watchlistCount(raw.watchlist) : null,
    presale: raw.presale === true,
    promoted: promotedValue === true || (promotedNumber != null && promotedNumber >= 1),
  }
}

function rowsFromCatalog(catalog) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) return []
  return Object.keys(catalog)
    .map((id) => rowFrom(id, catalog[id]))
    .filter(Boolean)
}

function dailyFresh(row, nowSeconds) {
  return row.dailyCount > 0 && currentWindow(row.dailyStart, nowSeconds, DAILY_WINDOW_SECONDS)
}

function weeklyFresh(row, nowSeconds) {
  return row.weeklyCount > 0 && currentWindow(row.weeklyStart, nowSeconds, WEEKLY_WINDOW_SECONDS)
}

function withQuote(row, quotes) {
  const quote = row.symbol && quotes ? quotes[row.symbol] : null
  const price = quote && numberOrNull(quote.price)
  const marketCap = quote && numberOrNull(quote.market_cap)
  const change24h = quote && numberOrNull(quote.percent_change_24h)
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
    presale: row.presale,
    price: price != null && price !== 0 ? price : null,
    marketCap: marketCap != null && marketCap !== 0 ? marketCap : null,
    change24h: price != null && price !== 0 ? change24h : null,
  }
}

function take(list) {
  return {
    total: list.length,
    items: list.slice(0, LIST_LIMIT),
  }
}

function buildDashboard(rows, quotes, nowSeconds) {
  const now = Number(nowSeconds) || 0
  const list = rows || []
  const quoteMap = quotes || {}
  let storedVotes = 0
  let votesCounted = 0
  let promoted = 0
  let listedThisWeek = 0
  let dailyActive = 0
  let weeklyActive = 0
  let quotesReturned = 0
  let marketCapSum = 0
  let marketCapCount = 0
  const tiers = { emerald: 0, ruby: 0, diamond: 0, unknown: 0 }

  list.forEach((row) => {
    if (row.voteCount != null) {
      storedVotes += row.voteCount
      votesCounted += 1
      tiers[row.tier] += 1
    } else {
      tiers.unknown += 1
    }
    if (row.promoted) promoted += 1
    if (currentWindow(row.listed, now, RECENT_LIST_SECONDS)) listedThisWeek += 1
    if (dailyFresh(row, now)) dailyActive += 1
    if (weeklyFresh(row, now)) weeklyActive += 1
    if (!row.presale && row.symbol && quoteMap[row.symbol]) {
      quotesReturned += 1
      const cap = numberOrNull(quoteMap[row.symbol].market_cap)
      if (cap != null && cap !== 0) {
        marketCapSum += cap
        marketCapCount += 1
      }
    }
  })

  const emerging = list
    .filter((row) => currentWindow(row.listed, now, RECENT_LIST_SECONDS))
    .sort((a, b) => b.listed - a.listed || a.id.localeCompare(b.id))
    .map((row) => ({ ...withQuote(row, quoteMap), detail: "Stored listing time is within the last 7 days." }))

  const momentum = list
    .filter((row) => dailyFresh(row, now))
    .sort((a, b) => b.dailyCount - a.dailyCount || a.id.localeCompare(b.id))
    .map((row) => ({
      ...withQuote(row, quoteMap),
      detail: row.dailyCount + " votes are stored in the current daily window.",
    }))

  const recentlyActive = list
    .map((row) => {
      const stamps = []
      if (dailyFresh(row, now)) stamps.push(row.dailyStart)
      if (weeklyFresh(row, now)) stamps.push(row.weeklyStart)
      if (!stamps.length) return null
      return { row, stamp: Math.max.apply(null, stamps) }
    })
    .filter(Boolean)
    .sort((a, b) => b.stamp - a.stamp || a.row.id.localeCompare(b.row.id))
    .map((entry) => ({
      ...withQuote(entry.row, quoteMap),
      detail: "A current daily or weekly vote window has a stored count above 0.",
    }))

  const tierProgress = list
    .map((row) => ({ row, remaining: votesRemaining(row.voteCount) }))
    .filter((entry) => entry.remaining != null && entry.remaining > 0 && entry.remaining <= APPROACH_VOTES)
    .sort((a, b) => a.remaining - b.remaining || a.row.id.localeCompare(b.row.id))
    .map((entry) => ({
      ...withQuote(entry.row, quoteMap),
      detail: entry.remaining + " stored votes remain until the next catalog tier.",
    }))

  const community = list
    .filter((row) => weeklyFresh(row, now))
    .sort((a, b) => b.weeklyCount - a.weeklyCount || a.id.localeCompare(b.id))
    .map((row) => ({
      ...withQuote(row, quoteMap),
      detail: row.weeklyCount + " votes are stored in the current weekly window.",
    }))

  return {
    overview: {
      listings: list.length,
      storedVotes,
      votesCounted,
      promoted,
      listedThisWeek,
      dailyActive,
      weeklyActive,
      tiers,
      quotesReturned,
      marketCapSum: marketCapCount ? marketCapSum : null,
      marketCapCount,
    },
    emerging: take(emerging),
    momentum: take(momentum),
    recentlyActive: take(recentlyActive),
    tierProgress: take(tierProgress),
    community: take(community),
  }
}

function searchListings(rows, query) {
  const needle = String(query || "").trim().toLowerCase()
  if (!needle) return []
  return rows
    .filter((row) => {
      const haystack = [row.name, row.symbol, row.id].filter(Boolean).join(" ").toLowerCase()
      return haystack.includes(needle)
    })
    .slice(0, 8)
}

export {
  rowsFromCatalog,
  buildDashboard,
  searchListings,
  RUBY_VOTES,
  DIAMOND_VOTES,
}
