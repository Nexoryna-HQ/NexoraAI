import "../../pages/Discover/Discover.css"
import React, { useState } from "react"
import { Link } from "react-router-dom"
import { discoverTokens } from "../../helpers/discoverClient.js"

const SUGGESTIONS = [
  "Show me tokens with increasing community activity.",
  "Which tokens recently gained voting momentum?",
  "Show me recently listed tokens.",
  "Find tokens approaching the next tier.",
  "Show me tokens with strong recent community participation.",
]

function fact(label, value) {
  if (value == null || value === "") return null
  return (
    <span>
      <strong>{label}</strong>
      {value}
    </span>
  )
}

function ResultCard({ token }) {
  const title = token.name || token.symbol || token.id
  return (
    <article className="discoverCard">
      <h3>{title}</h3>
      <div className="discoverSymbol">{[token.symbol, token.network, token.tier].filter(Boolean).join(" · ")}</div>
      <div className="discoverFacts">
        {fact("Votes", token.voteCount)}
        {fact("Votes remaining", token.votesRemaining)}
        {fact("Daily votes", token.dailyCount)}
        {fact("Weekly votes", token.weeklyCount)}
        {fact("Watchlist", token.watchlistCount)}
      </div>
      {token.reason ? <p className="discoverReason">{token.reason}</p> : null}
      <Link className="discoverLink" to={"/details/" + encodeURIComponent(token.id)}>
        View details
      </Link>
    </article>
  )
}

export const DiscoveryPanel = () => {
  const [text, setText] = useState("")
  const [status, setStatus] = useState("idle")
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState("")

  const ask = async (question) => {
    const query = String(question || "").trim()
    if (!query) return
    setText(query)
    setStatus("loading")
    setMessage("")
    setResult(null)
    try {
      const response = await discoverTokens(query)
      if (!response.ok) {
        setStatus("error")
        setMessage(response.message)
        return
      }
      setResult(response.result)
      if (response.result.supported === false) setStatus("unsupported")
      else if (!response.result.tokens.length) setStatus("empty")
      else setStatus("ready")
    } catch (error) {
      setStatus("error")
      setMessage("Nexora AI discovery is unavailable right now. Wallet actions are unchanged.")
    }
  }

  return (
    <div>
      <form
        className="discoverForm"
        onSubmit={(event) => {
          event.preventDefault()
          ask(text)
        }}
      >
        <input
          className="discoverInput"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Ask about votes, listings, or tier progress"
          aria-label="Nexora AI discovery question"
          maxLength={300}
        />
        <button className="discoverSubmit" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Searching" : "Search"}
        </button>
      </form>
      <div className="discoverSuggestions">
        {SUGGESTIONS.map((suggestion) => (
          <button key={suggestion} type="button" onClick={() => ask(suggestion)} disabled={status === "loading"}>
            {suggestion}
          </button>
        ))}
      </div>

      {status === "loading" ? (
        <div className="discoverStatus" aria-busy="true" aria-live="polite">
          <div className="discoverStatusInner">
            <div className="discoverBone discoverBoneTitle" />
            <div className="discoverBone" />
            <div className="discoverBone" />
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="discoverStatus" role="alert">
          <div className="discoverStatusInner">
            <p>{message}</p>
            <p className="discoverDisclaimer">Not financial advice.</p>
          </div>
        </div>
      ) : null}

      {result && status !== "loading" && status !== "error" ? (
        <div className="discoverStatus">
          <div className="discoverStatusInner">
            <p className="discoverMethod">{result.methodology}</p>
            <p className="discoverExplain">{result.explanation}</p>
            <p className="discoverDisclaimer">{result.disclaimer || "Not financial advice."}</p>
          </div>
        </div>
      ) : null}

      {status === "ready" && result ? (
        <div className="discoverResults">
          {result.tokens.map((token) => (
            <ResultCard key={token.id} token={token} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default DiscoveryPanel
