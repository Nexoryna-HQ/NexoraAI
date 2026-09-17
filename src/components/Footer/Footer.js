import "./Footer.css"
import logoImg from "../../assets/img/nitrogem.png"
import React from "react"
import { Link } from "react-router-dom"

export const Footer = () => {
  return (
    <footer className="siteFooter">
      <div className="footerInner">
        <div className="footerBrand">
          <div className="footerBrandMark">
            <img src={logoImg} alt="Nexora AI" className="footerLogo" />
            <span className="footerBrandName">Nexora AI</span>
          </div>
          <p className="footerTagline">
            Web3 token intelligence. Public listings, on-chain votes, and read-only AI analysis.
          </p>
        </div>

        <div className="footerColGroup">
          <div className="footerCol">
            <h4>Product</h4>
            <Link to="/home">Listings</Link>
            <Link to="/discover">Discovery</Link>
            <Link to="/intelligence">Intelligence</Link>
            <Link to="/listcoin">List a token</Link>
          </div>
          <div className="footerCol">
            <h4>Network</h4>
            <Link to="/treasury">Treasury</Link>
            <Link to="/promote">Promote</Link>
            <span>Ethereum votes</span>
          </div>
        </div>
      </div>

      <div className="footerBottom">
        <span>&copy; 2026 Nexora AI. Not financial advice.</span>
      </div>
    </footer>
  )
}

export default Footer
