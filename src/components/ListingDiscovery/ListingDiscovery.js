import "./ListingDiscovery.css"
import React, { useEffect, useState } from "react"
import { PanelDialog } from "../ConfirmDialog/ConfirmDialog"
import { loadInsightIndex } from "../../helpers/listingInsights.js"
import { TokenIntelligence, TokenIntelligenceBoundary } from "../TokenIntelligence/TokenIntelligence"
import { listingVersion } from "../../helpers/tokenIntelligenceClient.js"

export function useListingInsights() {
  const [insights, setInsights] = useState({})
  const [lookupUnavailable, setLookupUnavailable] = useState(false)

  const apply = (result) => {
    const map = {}
    ;(result.insights || []).forEach((item) => {
      if (item && item.tokenId) map[item.tokenId] = item
    })
    setInsights(map)
    setLookupUnavailable(result.remote === false)
  }

  useEffect(() => {
    let cancelled = false
    loadInsightIndex()
      .then((result) => {
        if (!cancelled) apply(result)
      })
      .catch(() => {
        if (!cancelled) setLookupUnavailable(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const refreshInsights = () => loadInsightIndex({ refresh: true }).then(apply).catch(() => setLookupUnavailable(true))

  return { insights, lookupUnavailable, refreshInsights }
}

export function ListingDiscoveryBar({ insightOnly, sortMode, lookupUnavailable, emptyInsight, onInsightOnly, onSort }) {
  const note =
    sortMode === "votes"
      ? "Ordered by stored vote count. This is not a Nexora AI ranking."
      : sortMode === "change24h"
        ? "Ordered by the reported 24h change. Rows without a number stay at the bottom."
        : insightOnly && emptyInsight
          ? "No saved insights for the tokens in this list."
          : insightOnly
            ? "Showing tokens with a saved analysis."
            : lookupUnavailable
              ? "Saved insights are shown. A live insight list could not be loaded."
              : ""

  return (
    <div className="listingDiscovery">
      <button type="button" aria-pressed={insightOnly} onClick={onInsightOnly}>
        Nexora insight
      </button>
      <button type="button" aria-pressed={sortMode === "votes"} onClick={() => onSort("votes")}>
        Most votes
      </button>
      <button type="button" aria-pressed={sortMode === "change24h"} onClick={() => onSort("change24h")}>
        24h change
      </button>
      {sortMode !== "table" ? (
        <button type="button" onClick={() => onSort("table")}>
          Table order
        </button>
      ) : null}
      {note ? <p className="listingDiscoveryNote">{note}</p> : null}
    </div>
  )
}

export function ListingInsightName({ name, insight, onOpen }) {
  return (
    <div className="listingInsightName">
      <span>{name}</span>
      {insight ? (
        <button
          type="button"
          className="listingInsightBadge"
          data-insight-control="true"
          onClick={(event) => {
            event.stopPropagation()
            onOpen()
          }}
        >
          Nexora insight
        </button>
      ) : null}
      {insight && insight.summary ? <span className="listingInsightSummary">{insight.summary}</span> : null}
    </div>
  )
}

export function ListingInsightPanel({ open, tokenId, listing, onClose }) {
  return (
    <PanelDialog open={open} onClose={onClose} label="Nexora AI">
      {open && tokenId ? (
        <TokenIntelligenceBoundary>
          <TokenIntelligence
            tokenId={tokenId}
            symbol={listing && listing.symbol}
            presale={listing && listing.presale}
            dataVersion={listingVersion(listing)}
          />
        </TokenIntelligenceBoundary>
      ) : null}
    </PanelDialog>
  )
}

export default ListingDiscoveryBar
