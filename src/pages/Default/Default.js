import "./Default.css"
import React from "react"

const Icon = ({ children }) => (
  <span className="nxIcon" aria-hidden="true">
    <svg viewBox="0 0 24 24">{children}</svg>
  </span>
)

export const Default = () => {
  return (
    <div className="dashboardPage">
      <section aria-labelledby="project-overview-title">
        <p className="nxPrompt">$ ls ./listings</p>
        <h1 id="project-overview-title" className="nxTitle">Public listings</h1>
        <p className="nxLede">
          Market data, community sentiment, and on-chain signals for tokens listed on Nexora AI.
        </p>
        <div className="nxGrid">
          <article className="nxCard">
            <Icon><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></Icon>
            <h2>Listings</h2>
            <p>Name, network, contract, and tier for each public token. Emerald starts the catalog. Ruby is 250 votes. Diamond is 500.</p>
          </article>
          <article className="nxCard">
            <Icon><path d="M12 3v18" /><path d="M7 8h7a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8" /></Icon>
            <h2>On-chain votes</h2>
            <p>A confirmed vote sends 0.0035 ETH from the connected wallet. Each wallet can vote 5 times per day.</p>
          </article>
          <article className="nxCard">
            <Icon><circle cx="11" cy="11" r="6" /><path d="M20 20l-3.5-3.5" /></Icon>
            <h2>Discovery</h2>
            <p>A question becomes a filter on the stored catalog. The model does not write the list.</p>
          </article>
          <article className="nxCard">
            <Icon><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 15l3-4 3 2 4-6" /></Icon>
            <h2>Intelligence</h2>
            <p>Reports use stored listings and returned market quotes. Calculated figures are marked. Not financial advice.</p>
          </article>
          <article className="nxCard">
            <Icon><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></Icon>
            <h2>Treasury</h2>
            <p>The treasury wallet balance, shown in ETH and in USD when a market quote is available.</p>
          </article>
          <article className="nxCard">
            <Icon><path d="M4 10v4" /><path d="M8 7v10" /><path d="M12 4v16" /><path d="M16 8v8" /><path d="M20 11v2" /></Icon>
            <h2>Promotion</h2>
            <p>Banner placements on the listings and token pages, priced by day.</p>
          </article>
        </div>
      </section>
    </div>
  )
}

export default Default
