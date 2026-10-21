import "./Intelligence.css"
import React, { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { database } from "../../helpers/firebase"
import { getMarketQuotes } from "../../helpers/marketQuotes"
import { buildDashboard, rowsFromCatalog, searchListings } from "../../helpers/catalogMetrics.js"

function formatNumber(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—"
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function formatWhen(seconds) {
  if (typeof seconds !== "number") return null
  const date = new Date(seconds * 1000)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString()
}

function Stat({ label, value, note, kind }) {
  return (
    <article className="intelStat">
      <div className="intelStatTop">
        <h3>{label}</h3>
        <span className={"intelTag intelTag" + kind}>{kind}</span>
      </div>
      <p className="intelStatValue">{value}</p>
      {note ? <p className="intelStatNote">{note}</p> : null}
    </article>
  )
}

function Fact({ label, value }) {
  if (value == null || value === "") return null
  return (
    <span>
      <strong>{label}</strong>
      {value}
    </span>
  )
}

function TokenCards({ group, empty }) {
  if (!group || !group.total) return <p className="intelEmpty">{empty}</p>
  return (
    <div>
      {group.total > group.items.length ? (
        <p className="intelCount">
          Showing {group.items.length} of {group.total}.
        </p>
      ) : null}
      <div className="intelCards">
        {group.items.map((token) => {
          const title = token.name || token.symbol || token.id
          return (
            <article className="intelCard" key={token.id}>
              <h3>{title}</h3>
              <div className="intelMeta">{[token.symbol, token.network, token.tier].filter(Boolean).join(" · ")}</div>
              <div className="intelFacts">
                <Fact label="Stored votes" value={formatNumber(token.voteCount)} />
                <Fact label="Votes remaining" value={token.votesRemaining == null ? null : formatNumber(token.votesRemaining)} />
                <Fact label="Daily votes" value={token.dailyCount == null ? null : formatNumber(token.dailyCount)} />
                <Fact label="Weekly votes" value={token.weeklyCount == null ? null : formatNumber(token.weeklyCount)} />
                <Fact label="Watchlist entries" value={token.watchlistCount == null ? null : formatNumber(token.watchlistCount)} />
                <Fact label="Listed" value={formatWhen(token.listed)} />
                <Fact label="Quote price" value={token.price == null ? null : formatNumber(token.price)} />
                <Fact label="Quote market cap" value={token.marketCap == null ? null : formatNumber(token.marketCap)} />
              </div>
              <p className="intelDetail">{token.detail}</p>
              <Link className="intelLink" to={"/details/" + encodeURIComponent(token.id)}>
                View in Nexora AI
              </Link>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function CatalogBody({ state, ready }) {
  if (state === "ready") return ready
  if (state === "error") return <p className="intelEmpty">Listings could not be loaded.</p>
  return <p className="intelEmpty">Waiting for the catalog.</p>
}

function Section({ id, title, rule, children }) {
  return (
    <section className="intelSection" aria-labelledby={id}>
      <div className="intelSectionInner">
        <h2 id={id}>{title}</h2>
        <p className="intelRule">{rule}</p>
        {children}
      </div>
    </section>
  )
}

export const Intelligence = () => {
  const [catalog, setCatalog] = useState(null)
  const [catalogState, setCatalogState] = useState("loading")
  const [quotes, setQuotes] = useState(null)
  const [quoteState, setQuoteState] = useState("loading")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const ref = database.ref("/coinlist")
    const timer = setTimeout(() => {
      setCatalogState((current) => (current === "loading" ? "error" : current))
    }, 8000)
    const onValue = (snapshot) => {
      clearTimeout(timer)
      setCatalog(snapshot.exists() ? snapshot.val() : {})
      setCatalogState("ready")
    }
    const onError = () => {
      clearTimeout(timer)
      setCatalogState("error")
    }
    ref.on("value", onValue, onError)
    return () => {
      clearTimeout(timer)
      ref.off("value", onValue)
    }
  }, [])

  const rows = useMemo(() => rowsFromCatalog(catalog), [catalog])

  useEffect(() => {
    if (catalogState !== "ready") return undefined
    const symbols = rows.filter((row) => !row.presale && row.symbol).map((row) => row.symbol)
    if (!symbols.length) {
      setQuotes({})
      setQuoteState("ready")
      return undefined
    }
    let cancelled = false
    setQuoteState("loading")
    getMarketQuotes(symbols)
      .then((result) => {
        if (cancelled) return
        setQuotes(result || {})
        setQuoteState("ready")
      })
      .catch(() => {
        if (cancelled) return
        setQuotes({})
        setQuoteState("error")
      })
    return () => {
      cancelled = true
    }
  }, [catalogState, rows])

  const dash = useMemo(
    () => buildDashboard(rows, quoteState === "error" ? {} : quotes, Math.floor(Date.now() / 1000)),
    [rows, quotes, quoteState]
  )
  const matches = useMemo(() => searchListings(rows, search), [rows, search])

  const quoteNote =
    quoteState === "error"
      ? "Market quotes are unavailable. Listing figures above still use the catalog."
      : quoteState === "loading"
        ? "Market quotes are loading."
        : dash.overview.marketCapSum == null
          ? "No market-cap quote returned."
          : "Sum of returned market-cap quotes only. Listings without a quote are excluded."

  return (
    <div className="intelPage">
      <header className="intelHero">
        <div>
          <p className="nxPrompt">$ ls ./intelligence</p>
          <h1 className="nxTitle">Intelligence</h1>
          <p className="nxLede">
            Figures come from stored listings, returned market quotes, and calculations from those figures. Not financial advice.
          </p>
        </div>
      </header>

      <Section
        id="intel-overview"
        title="Market and community overview"
        rule="Listing counts come from the catalog. Vote totals and tier counts are calculated from stored vote counts. Ruby is 250 votes and Diamond is 500."
      >
        {catalogState === "loading" ? (
          <div className="intelStats" aria-busy="true">
            <div className="intelBone" />
            <div className="intelBone" />
            <div className="intelBone" />
            <div className="intelBone" />
          </div>
        ) : null}
        {catalogState === "error" ? (
          <p className="intelAlert" role="alert">
            Listings could not be loaded. Discovery and wallet actions are still available.
          </p>
        ) : null}
        {catalogState === "ready" ? (
          <div className="intelStats">
            <Stat kind="Stored" label="Listings" value={formatNumber(dash.overview.listings)} note="Records in the catalog." />
            <Stat kind="Stored" label="Promoted" value={formatNumber(dash.overview.promoted)} note="Listings stored as promoted." />
            <Stat
              kind="Calculated"
              label="Stored votes"
              value={formatNumber(dash.overview.storedVotes)}
              note={"Sum across " + dash.overview.votesCounted + " listings with a vote count."}
            />
            <Stat
              kind="Calculated"
              label="Listed in 7 days"
              value={formatNumber(dash.overview.listedThisWeek)}
              note="Calculated from the stored listing time."
            />
            <Stat
              kind="Calculated"
              label="Daily momentum"
              value={formatNumber(dash.overview.dailyActive)}
              note="Daily vote count above 0 and the window started within 2 days."
            />
            <Stat
              kind="Calculated"
              label="Weekly activity"
              value={formatNumber(dash.overview.weeklyActive)}
              note="Weekly vote count above 0 and the window started within 14 days."
            />
            <Stat
              kind="Calculated"
              label="Tier mix"
              value={dash.overview.tiers.emerald + " / " + dash.overview.tiers.ruby + " / " + dash.overview.tiers.diamond}
              note={"Emerald, Ruby, and Diamond. " + dash.overview.tiers.unknown + " listings have no stored vote count."}
            />
            <Stat
              kind="Quote"
              label="Market cap quotes"
              value={dash.overview.marketCapSum == null ? "—" : formatNumber(dash.overview.marketCapSum)}
              note={quoteNote}
            />
          </div>
        ) : null}
      </Section>

      <Section
        id="intel-emerging"
        title="Emerging tokens"
        rule="Calculated from the stored listing time. A token is included when that time is within the last 7 days."
      >
        <CatalogBody
          state={catalogState}
          ready={<TokenCards group={dash.emerging} empty="No listings have a stored time within the last 7 days." />}
        />
      </Section>

      <Section
        id="intel-momentum"
        title="Voting momentum"
        rule="Calculated from the stored daily vote window. Included when the count is above 0 and the window started within the last 2 days. One snapshot cannot prove the count is rising."
      >
        <CatalogBody
          state={catalogState}
          ready={<TokenCards group={dash.momentum} empty="No listing has votes in a current daily window." />}
        />
      </Section>

      <Section
        id="intel-active"
        title="Recently active tokens"
        rule="Calculated from stored daily and weekly windows. Included when either window is still current and its vote count is above 0."
      >
        <CatalogBody
          state={catalogState}
          ready={<TokenCards group={dash.recentlyActive} empty="No listing has a current daily or weekly vote count." />}
        />
      </Section>

      <Section
        id="intel-tiers"
        title="Tier progress"
        rule="Calculated from stored votes. Included when more than 0 and at most 50 votes remain until Ruby at 250 or Diamond at 500."
      >
        <CatalogBody
          state={catalogState}
          ready={<TokenCards group={dash.tierProgress} empty="No listing is within 50 stored votes of the next tier." />}
        />
      </Section>

      <Section
        id="intel-community"
        title="Community activity"
        rule="Calculated from the stored weekly vote window. Included when the count is above 0 and the window started within the last 14 days. Watchlist size counts stored entries, not holders."
      >
        <CatalogBody
          state={catalogState}
          ready={<TokenCards group={dash.community} empty="No listing has votes in a current weekly window." />}
        />
      </Section>

      <Section
        id="intel-search"
        title="Listing search"
        rule="Search matches the name, symbol, or id already loaded from the Nexora AI catalog. Opening a result loads the Nexora AI report for that listing only."
      >
        <form
          className="intelSearch"
          onSubmit={(event) => event.preventDefault()}
          role="search"
        >
          <label htmlFor="intel-token-search">Find a listing</label>
          <input
            id="intel-token-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, symbol, or id"
            autoComplete="off"
            disabled={catalogState !== "ready"}
          />
        </form>
        {catalogState === "error" ? <p className="intelEmpty">Listings could not be loaded, so search has nothing to match.</p> : null}
        {catalogState === "ready" && search.trim() && !matches.length ? (
          <p className="intelEmpty">No loaded listing matches that text.</p>
        ) : null}
        {matches.length ? (
          <div className="intelResults">
            {matches.map((row) => (
              <Link className="intelResult" key={row.id} to={"/details/" + encodeURIComponent(row.id)}>
                <span>
                  {row.name || row.symbol || row.id}
                  <br />
                  <small>{[row.symbol, row.network, row.tier].filter(Boolean).join(" · ")}</small>
                </span>
                <span>View in Nexora AI</span>
              </Link>
            ))}
          </div>
        ) : null}
      </Section>
    </div>
  )
}

export default Intelligence
