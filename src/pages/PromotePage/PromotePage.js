import "./PromotePage.css"
import React from "react"

export const PromotePage = () => {
  const packages = [
    { name: "Wide Header Banner", location: "Main Page", days: [
      { label: "1 day", price: "0.3 BNB" },
      { label: "3 days", price: "0.75 BNB" },
      { label: "7 days", price: "1.5 BNB" },
    ], specs: "600 x 240px | .jpg .png .gif | < 4 MB" },
    { name: "Rotating Header Banner", location: "Main Page", days: [
      { label: "1 day", price: "0.3 BNB" },
      { label: "3 days", price: "0.75 BNB" },
      { label: "7 days", price: "1.5 BNB" },
    ], specs: "600 x 240px | .jpg .png .gif | < 4 MB" },
    { name: "Wide Header Banner", location: "Coin Page", days: [
      { label: "1 day", price: "0.3 BNB" },
      { label: "3 days", price: "0.75 BNB" },
      { label: "7 days", price: "1.5 BNB" },
    ], specs: "600 x 240px | .jpg .png .gif | < 4 MB" },
    { name: "Trending Coin Section", location: "", days: [
      { label: "1 day", price: "0.3 BNB" },
      { label: "3 days", price: "0.75 BNB" },
      { label: "7 days", price: "1.5 BNB" },
    ], specs: "600 x 240px | .jpg .png .gif | < 4 MB" },
  ]

  return (
    <div className="promPage">
      <div className="promHeader">
        <p className="nxPrompt">$ ls ./promote</p>
        <h1 className="nxTitle">Promote</h1>
        <p className="nxLede">Banner placements for a listed token, priced by day.</p>
      </div>

      <div className="promGrid">
        {packages.map((pkg, idx) => (
          <div className="promCardOuter" key={idx}>
            <div className="promCard">
              <div className="promCardTop">
                <h3>{pkg.name}</h3>
                {pkg.location && <span className="promCardLocation">{pkg.location}</span>}
              </div>
              <div className="promCardPrices">
                {pkg.days.map((d, i) => (
                  <div className="promPriceRow" key={i}>
                    <span className="promDuration">{d.label}</span>
                    <span className="promPrice">{d.price}</span>
                  </div>
                ))}
              </div>
              <div className="promCardSpecs">{pkg.specs}</div>
              <button className="promBuyBtn">Buy Now</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PromotePage
