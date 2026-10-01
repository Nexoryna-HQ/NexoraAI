import "./Discover.css"
import React from "react"

export const Discover = () => {
  return (
    <section className="discoverPage">
      <header className="discoverHeader">
        <p className="nxPrompt">$ ls ./discovery</p>
        <h1 className="nxTitle">Discovery</h1>
        <p className="nxLede">
          A question becomes a filter on the stored catalog. Matching tokens are listed from those records. The chat on this page uses those same records.
        </p>
      </header>
    </section>
  )
}

export default Discover
