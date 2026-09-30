import "./TierCard.css"
import React from "react"

import { database } from "../../helpers/firebase.js"
import { NotificationManager } from "../../helpers/notify"
import { useContext } from "react"
import { useNavigate } from "react-router-dom"
import { ENVS } from "../../helpers/configurations"
import { getWeb3Eip1193Provider } from "../../helpers/activeWeb3Provider"
import { AppContext } from "../../context"
import { ethers } from "ethers"

export const TierCard = (props) => {
  const data = props.data
  const listingInfo = props.info
  const id = props.id

  const { walletAddress } = useContext(AppContext)
  const navigate = useNavigate()

  const pushToDb = (amount) => {
    let db = database.ref("/coinlist")
    listingInfo.dailyCount = amount
    listingInfo.voteCount = amount
    listingInfo.dailyStart = Math.floor(Math.floor(Date.now() / 1000) / 86400) * 86400
    listingInfo.weeklyCount = amount
    let updateWeeklyStart = 0
    let epochNow = Math.floor(Date.now() / 1000)
    let getDayCount = Math.floor(epochNow / 86400) % 7
    switch (getDayCount) {
      case 0: updateWeeklyStart = (Math.floor(epochNow / 86400) - 3) * 86400; break
      case 1: updateWeeklyStart = (Math.floor(epochNow / 86400) - 4) * 86400; break
      case 2: updateWeeklyStart = (Math.floor(epochNow / 86400) - 5) * 86400; break
      case 3: updateWeeklyStart = (Math.floor(epochNow / 86400) - 6) * 86400; break
      case 4: updateWeeklyStart = (Math.floor(epochNow / 86400) - 0) * 86400; break
      case 5: updateWeeklyStart = (Math.floor(epochNow / 86400) - 1) * 86400; break
      case 6: updateWeeklyStart = (Math.floor(epochNow / 86400) - 2) * 86400; break
      default: updateWeeklyStart = 0; break
    }
    listingInfo.weeklyStart = updateWeeklyStart
    db.push(listingInfo)
      .catch((e) => { NotificationManager.error("Listing failed."); console.log(e) })
      .then(() => { NotificationManager.success("Congratulations, listing successful!") })
  }

  const updateToDb = (amount) => {
    let updateWeeklyStart = 0
    let epochNow = Math.floor(Date.now() / 1000)
    let getDayCount = Math.floor(epochNow / 86400) % 7
    switch (getDayCount) {
      case 0: updateWeeklyStart = (Math.floor(epochNow / 86400) - 3) * 86400; break
      case 1: updateWeeklyStart = (Math.floor(epochNow / 86400) - 4) * 86400; break
      case 2: updateWeeklyStart = (Math.floor(epochNow / 86400) - 5) * 86400; break
      case 3: updateWeeklyStart = (Math.floor(epochNow / 86400) - 6) * 86400; break
      case 4: updateWeeklyStart = (Math.floor(epochNow / 86400) - 0) * 86400; break
      case 5: updateWeeklyStart = (Math.floor(epochNow / 86400) - 1) * 86400; break
      case 6: updateWeeklyStart = (Math.floor(epochNow / 86400) - 2) * 86400; break
      default: updateWeeklyStart = 0; break
    }
    let updateDb = database.ref("/coinlist/" + id)
    updateDb.update({
      voteCount: amount ? amount : "",
      dailyCount: amount ? amount : "",
      dailyStart: Math.floor(Math.floor(Date.now() / 1000) / 86400) * 86400,
      weeklyCount: amount ? amount : "",
      weeklyStart: updateWeeklyStart,
    })
  }

  const buyBtnClicked = async () => {
    let voteFee = ENVS.NORMAL_VOTE_FEE
    let voteAmount = 1
    let tgUrl = ""

    if (id === "") {
      if (data.headerString === "Ruby Tier") {
        voteFee = ENVS.RUBY_TIRE_FEE
        voteAmount = ENVS.RUBY_TIRE_LIMIT
        tgUrl = process.env.REACT_APP_SERVER_URL + "/ruby/?token=" + listingInfo.name
      } else if (data.headerString === "Diamond Tier") {
        voteFee = ENVS.DIAMOND_TIRE_FEE
        voteAmount = ENVS.DIAMOND_TIRE_LIMIT
        tgUrl = process.env.REACT_APP_SERVER_URL + "/diamond/?token=" + listingInfo.name
      }
    } else {
      if (data.headerString === "Ruby Tier" && listingInfo.voteCount < ENVS.RUBY_TIRE_LIMIT) {
        voteFee = ENVS.RUBY_TIRE_FEE
        voteAmount = ENVS.RUBY_TIRE_LIMIT
        tgUrl = process.env.REACT_APP_SERVER_URL + "/ruby/?token=" + listingInfo.name
      } else if (data.headerString === "Diamond Tier" && listingInfo.voteCount < ENVS.DIAMOND_TIRE_LIMIT) {
        voteFee = ENVS.DIAMOND_TIRE_FEE
        voteAmount = ENVS.DIAMOND_TIRE_LIMIT
        tgUrl = process.env.REACT_APP_SERVER_URL + "/diamond/?token=" + listingInfo.name
      } else {
        NotificationManager.warning("You can only upgrade.")
        return
      }
    }

    const eth = getWeb3Eip1193Provider()
    if (!eth) {
      NotificationManager.warning("Connect a wallet first.")
      return
    }
    const infuraProvider = new ethers.providers.Web3Provider(eth)
    const signer = infuraProvider.getSigner()
    const tx = {
      from: walletAddress,
      to: ENVS.CHARITY_ADDR,
      value: ethers.utils.parseUnits(voteFee),
    }

    await signer.sendTransaction(tx).then(async () => {
      if (tgUrl) {
        await fetch(tgUrl, { method: "GET" })
          .then(() => NotificationManager.info("Tier notification sent to Telegram."))
          .catch((err) => console.log(err))
      }
      if (id === "") pushToDb(voteAmount)
      else updateToDb(voteAmount)
      navigate("/home", { replace: true })
    })
  }

  return (
    <div className="tierCardOuter">
      <div className="tierCardInner">
        <img src={data.image} alt={data.headerString} className="tierGemIcon" />
        <div className="tierCardHead">
          <h3 style={{ color: data.color }}>{data.headerString}</h3>
          <div className="tierCardPrice">{data.buyAmount}</div>
        </div>
        <div className="tierCardFeatures">
          {data.mainStrings.map((str, i) => (
            <div className="tierFeatureRow" key={i}>
              <img src={data.image} alt="" />
              <span>{str}</span>
            </div>
          ))}
        </div>
        <button className="tierBuyBtn" onClick={buyBtnClicked}>
          {data.buyAmount === "FREE" ? "List Free" : "Buy Now"}
        </button>
      </div>
    </div>
  )
}

export default TierCard
