import "./SiteInsight.css"
import React, { useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import { database } from "../../helpers/firebase"
import { buildDashboard, rowsFromCatalog } from "../../helpers/catalogMetrics.js"
import DiscoveryPanel from "../DiscoveryPanel/DiscoveryPanel"

const COPY = {
  "/home": {
    prompt: "$ cat ./insights",
    title: "Catalog insight",
    lede: "Counts from stored listings. Tier labels are calculated from stored votes.",
    note: "Emerald is below 250 votes. Ruby is 250. Diamond is 500. A daily or weekly window counts only when its stored start is still current and its vote count is above 0.",
  },
  "/discover": {
    prompt: "$ cat ./insights",
    title: "What the catalog can answer",
    lede: "The chart is the stored catalog. The chat turns a question into a filter on those same records.",
    note: "The list in a reply is calculated from stored listings. It is not written by the model, and it is not a price view.",
  },
  "/intelligence": {
    prompt: "$ cat ./insights",
    title: "Read the figures with the chart",
    lede: "The report above and this chart use the same stored listings.",
    note: "Calculated values are marked on the report. The bars here are counts, not a claim that a token is rising.",
  },
  "/treasury": {
    prompt: "$ cat ./insights",
    title: "Catalog beside the treasury",
    lede: "The balance above is the treasury wallet. The chart is the public listing catalog.",
    note: "A market quote is shown for the treasury only when one is returned. Listing bars do not describe that balance.",
  },
  "/promote": {
    prompt: "$ cat ./insights",
    title: "Catalog beside promotion",
    lede: "Packages above are placements and prices. The chart is stored listings.",
    note: "Promotion does not change a token’s vote count. The bars stay on the catalog record.",
  },
  "/listcoin": {
    prompt: "$ cat ./insights",
    title: "The catalog you are joining",
    lede: "A new listing starts at Emerald until stored votes reach the next tier.",
    note: "Ruby is 250 stored votes. Diamond is 500. The form above does not buy votes.",
  },
  "/tiers": {
    prompt: "$ cat ./insights",
    title: "Where tiers sit in the catalog",
    lede: "The cards above set this listing’s tier. The chart shows how the whole catalog is split today.",
    note: "Tier labels are calculated from stored votes. They are not a quality score.",
  },
}

function copyFor(pathname) {
  if (pathname.startsWith("/details/")) {
    return {
      prompt: "$ cat ./insights",
      title: "This listing in the catalog",
      lede: "The page above is one stored listing. The chart is every listing currently stored.",
      note: "Vote totals here are stored counts. They are not a forecast for this token.",
    }
  }
  return COPY[pathname] || COPY["/home"]
}

function formatCount(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0"
  return value.toLocaleString()
}

function InsightBars({ items }) {
  const max = Math.max(1, ...items.map((item) => item.value))
  return (
    <div className="insightBars">
      {items.map((item) => (
        <div className="insightBar" key={item.label}>
          <span>{item.label}</span>
          <div className="insightTrack" aria-hidden="true">
            <i className={item.tone ? "insightFill insightFill-" + item.tone : "insightFill"} style={{ width: (item.value / max) * 100 + "%" }} />
          </div>
          <strong>{formatCount(item.value)}</strong>
        </div>
      ))}
    </div>
  )
}

export const SiteInsight = () => {
  const { pathname } = useLocation()
  const copy = copyFor(pathname)
  const [rows, setRows] = useState([])
  const [state, setState] = useState("loading")

  useEffect(() => {
    const ref = database.ref("/coinlist")
    const timer = setTimeout(() => {
      setState((current) => (current === "loading" ? "error" : current))
    }, 8000)
    const onValue = (snapshot) => {
      clearTimeout(timer)
      setRows(rowsFromCatalog(snapshot.exists() ? snapshot.val() : {}))
      setState("ready")
    }
    const onError = () => {
      clearTimeout(timer)
      setState("error")
    }
    ref.on("value", onValue, onError)
    return () => {
      clearTimeout(timer)
      ref.off("value", onValue)
    }
  }, [])

  const dash = useMemo(() => buildDashboard(rows, {}, Math.floor(Date.now() / 1000)), [rows])

  const networkBars = useMemo(() => {
    const counts = {}
    rows.forEach((row) => {
      const key = row.network || "Unspecified"
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))
      .slice(0, 4)
      .map((label) => ({ label, value: counts[label] }))
  }, [rows])

  const voteBars = useMemo(() => {
    return rows
      .filter((row) => row.voteCount != null)
      .sort((a, b) => b.voteCount - a.voteCount || String(a.id).localeCompare(String(b.id)))
      .slice(0, 5)
      .map((row) => ({
        label: (row.symbol || row.name || row.id).slice(0, 16),
        value: row.voteCount,
      }))
  }, [rows])

  const tiers = dash.overview.tiers

  return (
    <section className="siteInsight" aria-labelledby="site-insight-title">
      <p className="nxPrompt">{copy.prompt}</p>
      <h2 id="site-insight-title" className="insightHeading">{copy.title}</h2>
      <p className="nxLede">{copy.lede}</p>
      <p className="siteNote">{copy.note} Not financial advice.</p>

      {state === "loading" ? <p className="insightStatus">Reading the catalog.</p> : null}
      {state === "error" ? <p className="insightStatus">Listings could not be loaded. The chat can still be used when discovery is available.</p> : null}

      {state === "ready" ? (
        <>
          <div className="insightFigures">
            <div>
              <strong>{formatCount(dash.overview.listings)}</strong>
              <span>listings</span>
            </div>
            <div>
              <strong>{formatCount(dash.overview.storedVotes)}</strong>
              <span>stored votes</span>
            </div>
            <div>
              <strong>{formatCount(dash.overview.listedThisWeek)}</strong>
              <span>listed in 7 days</span>
            </div>
            <div>
              <strong>{formatCount(dash.overview.dailyActive)}</strong>
              <span>daily vote windows</span>
            </div>
          </div>

          <div className="insightLayout">
            <article className="nxCard insightChart">
              <h3>Tier mix</h3>
              <p>Calculated from stored votes.</p>
              <InsightBars
                items={[
                  { label: "Emerald", value: tiers.emerald, tone: "emerald" },
                  { label: "Ruby", value: tiers.ruby, tone: "ruby" },
                  { label: "Diamond", value: tiers.diamond, tone: "diamond" },
                ]}
              />
            </article>
            <article className="nxCard insightChart">
              <h3>Recent activity</h3>
              <p>Stored times and vote windows.</p>
              <InsightBars
                items={[
                  { label: "Listed in 7 days", value: dash.overview.listedThisWeek },
                  { label: "Daily windows", value: dash.overview.dailyActive },
                  { label: "Weekly windows", value: dash.overview.weeklyActive },
                ]}
              />
            </article>
            <article className="nxCard insightChart">
              <h3>Networks</h3>
              <p>Count of stored listings by network.</p>
              {networkBars.length ? <InsightBars items={networkBars} /> : <p className="insightStatus">No listings are stored yet.</p>}
            </article>
            <article className="nxCard insightChart">
              <h3>Highest stored votes</h3>
              <p>The five listings with the largest stored vote count.</p>
              {voteBars.length ? <InsightBars items={voteBars} /> : <p className="insightStatus">No stored vote counts yet.</p>}
            </article>
          </div>
        </>
      ) : null}

      <div className="siteChat">
        <p className="nxPrompt">$ ask nexora</p>
        <h3>Ask the catalog</h3>
        <p>A question filters stored listings. The reply does not trade, vote, or predict a price.</p>
        <DiscoveryPanel />
      </div>
    </section>
  )
}

export default SiteInsight
