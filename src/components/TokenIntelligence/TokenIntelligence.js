import "./TokenIntelligence.css"
import React, { useEffect, useRef, useState } from "react"
import { getMarketQuotes } from "../../helpers/marketQuotes"
import { loadTokenAnalysis, marketPayload } from "../../helpers/tokenIntelligenceClient.js"

const DISCLAIMER = "Not financial advice."
const QUALITY_LABELS = {
  high: "High confidence",
  partial: "Partial data",
  insufficient: "Insufficient data",
}

function textOf(value) {
  return typeof value === "string" && value.trim() ? value : "Unavailable"
}

function formatWhen(value) {
  const number = typeof value === "number" ? value : Date.parse(value)
  if (!Number.isFinite(number)) return ""
  const millis = number < 1e12 ? number * 1000 : number
  try {
    return new Date(millis).toLocaleString()
  } catch (error) {
    return ""
  }
}

function formatMetric(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return value.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

function qualityClass(level) {
  if (level === "high") return "aiIntelBadge aiIntelBadgeHigh"
  if (level === "partial") return "aiIntelBadge aiIntelBadgePartial"
  return "aiIntelBadge aiIntelBadgeInsufficient"
}

async function optionalMarket(symbol, presale) {
  if (presale !== false || !symbol) return null
  try {
    const quotes = await Promise.race([
      getMarketQuotes([symbol]),
      new Promise((resolve) => setTimeout(() => resolve(null), 2500)),
    ])
    if (!quotes) return null
    return marketPayload(quotes[symbol])
  } catch (error) {
    return null
  }
}

function Pair({ pair }) {
  const observed = pair && pair.observed
  const interpretation = pair && pair.interpretation
  return (
    <div>
      <p className="aiIntelLabel">Observed</p>
      <p className="aiIntelText">{textOf(observed)}</p>
      <p className="aiIntelLabel">Interpretation</p>
      <p className="aiIntelText">{textOf(interpretation)}</p>
    </div>
  )
}

function Fact({ label, value }) {
  if (value == null || value === "") return null
  return (
    <div className="aiIntelFact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function SignalList({ kind, className, items }) {
  if (!items || !items.length) return null
  return items.map((item, index) => (
    <div className={"aiIntelSignal " + className} key={kind + index}>
      <span className="aiIntelSignalKind">{kind}</span>
      {item}
    </div>
  ))
}

function AnalysisBody({ analysis }) {
  const community = analysis.communityActivity || {}
  const market = analysis.marketContext || {}
  const progress = analysis.listingProgress || {}
  const signals = analysis.notableSignals || {}
  const quality = analysis.dataQualityReport || {}
  const marketFacts = [
    ["Price", formatMetric(market.price)],
    ["Market cap", formatMetric(market.marketCap)],
    ["Volume", formatMetric(market.volume)],
    ["Liquidity", formatMetric(market.liquidity)],
    ["Price movement", formatMetric(market.priceChange)],
  ].filter((entry) => entry[1] != null)

  return (
    <div className="aiIntelGrid">
      <article className="aiIntelCard aiIntelCardWide">
        <h3 className="aiIntelCardTitle">Summary</h3>
        <Pair pair={analysis.executiveSummary} />
      </article>

      <article className="aiIntelCard">
        <h3 className="aiIntelCardTitle">Community insights</h3>
        <p className="aiIntelLabel">Voting activity</p>
        <Pair pair={community.votingActivity} />
        <p className="aiIntelLabel">Voting momentum</p>
        <Pair pair={community.votingMomentum} />
        <p className="aiIntelLabel">Community participation</p>
        <Pair pair={community.communityParticipation} />
        <p className="aiIntelLabel">Unusual changes</p>
        <Pair pair={community.unusualChanges} />
      </article>

      <article className="aiIntelCard">
        <h3 className="aiIntelCardTitle">Market context</h3>
        {market.available && marketFacts.length ? (
          <div className="aiIntelFacts">
            {marketFacts.map((entry) => (
              <Fact key={entry[0]} label={entry[0]} value={entry[1]} />
            ))}
          </div>
        ) : null}
        <Pair pair={market} />
      </article>

      <article className="aiIntelCard">
        <h3 className="aiIntelCardTitle">Listing progress</h3>
        <div className="aiIntelFacts">
          <Fact label="Current tier" value={progress.currentTier} />
          <Fact label="Next tier" value={progress.nextTier} />
          <Fact label="Stored votes" value={formatMetric(progress.voteCount)} />
          <Fact label="Votes remaining" value={formatMetric(progress.votesRemaining)} />
          <Fact label="ETH alternative" value={progress.ethAlternative} />
          <Fact label="Per vote" value={progress.perVoteEth ? progress.perVoteEth + " ETH" : null} />
        </div>
        <Pair pair={progress} />
      </article>

      <article className="aiIntelCard">
        <h3 className="aiIntelCardTitle">Notable signals</h3>
        <div className="aiIntelSignals">
          <SignalList kind="Positive" className="aiIntelSignalPositive" items={signals.positive} />
          <SignalList kind="Neutral" className="aiIntelSignalNeutral" items={signals.neutral} />
          <SignalList kind="Caution" className="aiIntelSignalCaution" items={signals.caution} />
          {!signals.positive?.length && !signals.neutral?.length && !signals.caution?.length ? (
            <p className="aiIntelEmpty">No signals were produced from the stored listing.</p>
          ) : null}
        </div>
      </article>

      <article className="aiIntelCard aiIntelCardWide">
        <h3 className="aiIntelCardTitle">Plain-language explanation</h3>
        <Pair pair={analysis.explanation} />
      </article>

      <article className="aiIntelCard aiIntelCardWide">
        <h3 className="aiIntelCardTitle">Data quality</h3>
        <p className="aiIntelText">
          {[
            "Available fields: " + (quality.available && quality.available.length ? quality.available.length : 0) + ".",
            "Missing fields: " + (quality.missing && quality.missing.length ? quality.missing.join(", ") : "none") + ".",
            quality.stale && quality.stale.length ? "Stale: " + quality.stale.join(", ") + "." : "Nothing is marked stale.",
          ].join(" ")}
        </p>
      </article>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="aiIntelSkeleton" aria-hidden="true">
      <div className="aiIntelBone aiIntelBoneTitle" />
      <div className="aiIntelBone" />
      <div className="aiIntelBone" />
      <div className="aiIntelBone aiIntelBoneShort" />
    </div>
  )
}

export const TokenIntelligence = ({ tokenId, symbol, presale, dataVersion }) => {
  const [status, setStatus] = useState("loading")
  const [analysis, setAnalysis] = useState(null)
  const [message, setMessage] = useState("")
  const [analyzedAt, setAnalyzedAt] = useState(null)
  const symbolRef = useRef(symbol)
  const presaleRef = useRef(presale)
  const versionRef = useRef(dataVersion || "")
  const requestRef = useRef(0)
  symbolRef.current = symbol
  presaleRef.current = presale
  versionRef.current = dataVersion || ""

  const run = (refresh) => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId
    setStatus("loading")
    setMessage("")

    optionalMarket(symbolRef.current, presaleRef.current)
      .then((market) => loadTokenAnalysis({ tokenId, market, refresh, version: versionRef.current }))
      .then((result) => {
        if (requestRef.current !== requestId) return
        if (!result.ok) {
          setAnalysis(null)
          setStatus("error")
          setMessage(result.message)
          return
        }
        setAnalysis(result.analysis)
        setAnalyzedAt(result.analyzedAt)
        setStatus("ready")
      })
      .catch(() => {
        if (requestRef.current !== requestId) return
        setAnalysis(null)
        setStatus("error")
        setMessage("Nexora AI is unavailable right now. The listing details on this page are unchanged.")
      })
  }

  useEffect(() => {
    run(false)
    return () => {
      requestRef.current += 1
    }
    // One request per listing version. A matching cached report is reused on refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenId, dataVersion])

  const level = analysis && (analysis.dataQuality || (analysis.dataQualityReport && analysis.dataQualityReport.level))
  const analyzedLabel = formatWhen(analyzedAt)
  const snapshotLabel = formatWhen(
    analysis && analysis.dataQualityReport && analysis.dataQualityReport.timestamps
      ? analysis.dataQualityReport.timestamps.normalizedAt
      : null
  )

  return (
    <section className="aiIntelDiv" aria-label="Nexora AI">
      <div className="aiIntelWrapped">
        <div className="aiIntelHeader">
          <div>
            <h2 className="aiIntelTitle">Nexora AI</h2>
            <p className="aiIntelTagline">Web3 Token Intelligence</p>
            {status === "ready" ? (
              <div className="aiIntelMeta">
                <span className={qualityClass(level)}>{QUALITY_LABELS[level] || "Data quality unknown"}</span>
                {analyzedLabel ? <span className="aiIntelTime">Last analyzed {analyzedLabel}</span> : null}
                {snapshotLabel ? <span className="aiIntelTime">Snapshot {snapshotLabel}</span> : null}
              </div>
            ) : null}
          </div>
          {status !== "loading" ? (
            <button type="button" className="aiIntelRefresh" onClick={() => run(true)}>
              Refresh analysis
            </button>
          ) : null}
        </div>

        {status === "loading" ? <Skeleton /> : null}
        {status === "error" ? <p className="aiIntelText">{message}</p> : null}
        {status === "ready" && analysis ? <AnalysisBody analysis={analysis} /> : null}

        <p className="aiIntelDisclaimer">{analysis && analysis.disclaimer ? analysis.disclaimer : DISCLAIMER}</p>
      </div>
    </section>
  )
}

export class TokenIntelligenceBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="aiIntelDiv" aria-label="Nexora AI">
          <div className="aiIntelWrapped">
            <h2 className="aiIntelTitle">Nexora AI</h2>
            <p className="aiIntelTagline">Web3 Token Intelligence</p>
            <p className="aiIntelText">
              Nexora AI could not be displayed. The listing and wallet actions on this page are unchanged.
            </p>
            <p className="aiIntelDisclaimer">{DISCLAIMER}</p>
          </div>
        </section>
      )
    }
    return this.props.children
  }
}

export default TokenIntelligence
