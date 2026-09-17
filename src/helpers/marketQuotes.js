import { ENVS } from "./configurations"

const CMC_URL =
  "https://agile-cove-74302.herokuapp.com/https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest"

const SUCCESS_TTL_MS = 60 * 1000
const FAILURE_TTL_MS = 10 * 1000
const BATCH_SIZE = 25

const cache = new Map()
const inflight = new Map()

function readCache(symbol) {
  const hit = cache.get(symbol)
  if (!hit) return { hit: false }
  if (hit.expires < Date.now()) {
    cache.delete(symbol)
    return { hit: false }
  }
  return { hit: true, quote: hit.quote }
}

function remember(symbol, quote) {
  cache.set(symbol, {
    expires: Date.now() + (quote ? SUCCESS_TTL_MS : FAILURE_TTL_MS),
    quote,
  })
}

function toQuote(entry) {
  if (!entry?.quote?.USD) return null
  return {
    market_cap: entry.quote.USD.market_cap,
    percent_change_24h: entry.quote.USD.percent_change_24h,
    price: entry.quote.USD.price,
    circulating_supply: entry.circulating_supply,
  }
}

async function requestSymbols(symbols) {
  const qs = `?symbol=${symbols.map((symbol) => encodeURIComponent(symbol)).join(",")}&convert=USD`
  const res = await fetch(CMC_URL + qs, {
    headers: { "X-CMC_PRO_API_KEY": ENVS.CMC_KEY },
  })
  if (!res.ok) throw new Error(`quotes ${res.status}`)
  const body = await res.json()
  const data = body?.data || {}
  const quotes = {}
  symbols.forEach((symbol) => {
    quotes[symbol] = toQuote(data[symbol])
  })
  return quotes
}

async function fetchBatch(symbols) {
  const chunks = []
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    chunks.push(symbols.slice(i, i + BATCH_SIZE))
  }

  try {
    const parts = await Promise.all(chunks.map((chunk) => requestSymbols(chunk)))
    return Object.assign({}, ...parts)
  } catch (error) {
    const quotes = {}
    const queue = symbols.slice()
    const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (queue.length) {
        const symbol = queue.shift()
        try {
          const single = await requestSymbols([symbol])
          quotes[symbol] = single[symbol] ?? null
        } catch (singleError) {
          quotes[symbol] = null
        }
      }
    })
    await Promise.all(workers)
    return quotes
  }
}

export async function getMarketQuotes(symbols) {
  const unique = [...new Set((symbols || []).filter((symbol) => symbol != null && symbol !== ""))]
  const result = {}
  const missing = []

  unique.forEach((symbol) => {
    const cached = readCache(symbol)
    if (cached.hit) result[symbol] = cached.quote
    else missing.push(symbol)
  })

  if (missing.length === 0) return result

  const toFetch = []
  const waits = []

  missing.forEach((symbol) => {
    const pending = inflight.get(symbol)
    if (pending) {
      waits.push(
        pending.then((quote) => {
          result[symbol] = quote
        })
      )
    } else {
      toFetch.push(symbol)
    }
  })

  if (toFetch.length) {
    const job = fetchBatch(toFetch).then((quotes) => {
      toFetch.forEach((symbol) => {
        const quote = quotes[symbol] ?? null
        remember(symbol, quote)
        result[symbol] = quote
      })
      return quotes
    })

    toFetch.forEach((symbol) => {
      const pending = job
        .then((quotes) => quotes[symbol] ?? null)
        .catch(() => null)
        .finally(() => inflight.delete(symbol))
      inflight.set(symbol, pending)
    })

    await job
  }

  await Promise.all(waits)
  return result
}
