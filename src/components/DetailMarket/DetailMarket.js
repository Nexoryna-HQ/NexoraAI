import "./DetailMarket.css"
import { useEffect, useState } from "react"
import { getMarketQuotes } from "../../helpers/marketQuotes"

export const DetailMarket = (props) => {
  const data = props.data
  const symbol = data.symbol

  const [loading, setLoading] = useState(true)
  const [mcap, setMCAP] = useState(0)
  const [change24h, setChange] = useState(0)
  const [price, setPrice] = useState(0)
  const [c_supply, setSupply] = useState(0)

  useEffect(() => {
    if (data.presale !== false || !symbol) return undefined
    let cancelled = false

    const fetchData = async () => {
      const quotes = await getMarketQuotes([symbol])
      if (cancelled) return
      const quote = quotes[symbol]
      setMCAP(quote?.market_cap || 0)
      setPrice(quote?.price || 0)
      setChange(quote?.percent_change_24h || 0)
      setSupply(quote?.circulating_supply || 0)
      setLoading(false)
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [symbol, data.presale])

  const floorValue = (value) => {
    if (value > 1000000000) {
      return Math.floor((value / 1000000000) * 100) / 100 + " B"
    } else if (value > 1000000) {
      return Math.floor((value / 1000000) * 100) / 100 + " M"
    } else if (value > 1000) {
      return Math.floor((value / 1000) * 100) / 100 + " K"
    } else {
      return Math.floor(value * 100) / 100
    }
  }

  // useEffect(()=>{
  //     getPrice('0xAe9269f27437f0fcBC232d39Ec814844a51d6b8f')
  //     .then((res)=> console.log("token price", res))
  //   }, [])

  return (
    <div className="detailMarketDiv">
      {loading === false ? (
        <div className="detailMarketWrappedDiv">
          <div className="detailMarketTitleDiv">Coin Market Data</div>
          <div className="detailMarketContentDiv">
            Price(USD)&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;
            {price === 0 ? "" : floorValue(price)}
          </div>
          <div className="detailMarketContentDiv">
            Price Change(24 hrs)&emsp;&nbsp;&nbsp;&nbsp;
            {change24h === 0 ? "" : floorValue(change24h)}
          </div>
          <div className="detailMarketContentDiv">
            Market Cap&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;{mcap === 0 ? "" : floorValue(mcap)}
          </div>
          <div className="detailMarketContentDiv">
            Circulating Supply&emsp;&emsp;&emsp;{c_supply === 0 ? "" : floorValue(c_supply)}
          </div>
        </div>
      ) : (
        <div className="detailMarketWrappedDiv">
          <div className="detailMarketTitleDiv">Coin Market Data</div>
          <div className="detailMarketContentDiv">Price(USD)&emsp;</div>
          <div className="detailMarketContentDiv">Price Change(24 hrs)&emsp;</div>
          <div className="detailMarketContentDiv">Market Cap&emsp;</div>
          <div className="detailMarketContentDiv">Circulating Supply</div>
        </div>
      )}
    </div>
  )
}

export default DetailMarket
