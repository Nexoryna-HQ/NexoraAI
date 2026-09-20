import "./Details.css"
import { useParams } from "react-router-dom"
import { useEffect, useState, useContext } from "react"
import Overview from "../../components/Overview/Overview"
import { database } from "../../helpers/firebase.js"
import nitrogemImg from "../../assets/img/nitrogem.png"
import emeraldImg from "../../assets/img/emerald.png"
import rubyImg from "../../assets/img/ruby.png"
import diamondImg from "../../assets/img/diamond.png"
import loadingImg from "../../assets/img/loading.svg"
import dextoolIcon from "../../assets/img/dextools_icon.svg"
import poocoinIcon from "../../assets/img/poocoin_icon.png"
import telegramIcon from "../../assets/img/telegram.svg"
import twiterIcon from "../../assets/img/twitter.svg"
import DetailInfo from "../../components/DetailInfo/DetailInfo"
import DetailMarket from "../../components/DetailMarket/DetailMarket"
import Promoted from "../../components/PromotedCoins/Promoted"
import { TokenIntelligence, TokenIntelligenceBoundary } from "../../components/TokenIntelligence/TokenIntelligence"
import { listingVersion } from "../../helpers/tokenIntelligenceClient.js"
import flightImg from "../../assets/img/flight.png"
import bscImg from "../../assets/img/binance.svg"
import ethImg from "../../assets/img/ethereum.svg"
import { ConfirmDialog } from "../../components/ConfirmDialog/ConfirmDialog"
import { NotificationManager } from "../../helpers/notify"
import { AppContext } from "../../context"
import { ENVS } from "../../helpers/configurations"
import { getWeb3Eip1193Provider } from "../../helpers/activeWeb3Provider"
import { ethers } from "ethers"
import React from "react"

export const Details = (data) => {
  const { id } = useParams()

  const [detailData, setDetailData] = useState([])
  const [openWatchListDlg, setWatchListDlg] = useState(false)
  const [loading, setLoading] = useState(true)
  const { walletAddress, synchroTables, handleSynchroTables } = useContext(AppContext)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const dbRef = database.ref("/coinlist/" + id)
    const onValue = (snapshot) => {
      if (cancelled) return
      if (snapshot.exists()) {
        setDetailData(snapshot.val())
        setLoading(false)
      }
    }
    dbRef.on("value", onValue)
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    })
    return () => {
      cancelled = true
      dbRef.off("value", onValue)
    }
  }, [id])

  const tierReturn = (symbol, count) => {
    if (count >= ENVS.DIAMOND_TIRE_LIMIT) {
      return (
        <div className="symbolTierDiv">
          <span>${symbol}&nbsp;&nbsp;</span>
          <img src={diamondImg} alt="tierLogo"></img>
          {/* <span style={{ color: "white !important"}}>Diamond</span> */}
        </div>
      )
    } else if (count >= ENVS.RUBY_TIRE_LIMIT) {
      return (
        <div className="symbolTierDiv">
          <span>${symbol}&nbsp;&nbsp;</span>
          <img src={rubyImg} alt="tierLogo"></img>
          {/* <span style={{ color: "red !important"}}>Ruby</span> */}
        </div>
      )
    } else {
      return (
        <div className="symbolTierDiv">
          <span>${symbol}&nbsp;&nbsp;</span>
          <img src={emeraldImg} alt="tierLogo"></img>
          {/* <span style={{ color: "green !important"}}>Emeralda</span> */}
        </div>
      )
    }
  }
  const handleCloseWatchListDlg = () => {
    setWatchListDlg(false)
  }

  const chainImg = (chain) => {
    if (chain === "ETH") {
      return ethImg
    } else if (chain === "BSC") {
      return bscImg
    } else {
      return ""
    }
  }

  const contractReturn = (addr) => {
    return addr?.substring(0, 5) + "..." + addr?.substring(36, 40)
  }

  const contractLink = (addr, chain) => {
    console.log(addr, chain, "")
    if (chain === "ETH") {
      return "https://etherscan.io/address/" + addr
    } else if (chain === "BSC") {
      return "https://bscscan.com/address/" + addr
    } else {
      return ""
    }
  }

  const returnWlBtnTitle = () => {
    let wlList = detailData.watchlist
    if (wlList?.includes(walletAddress)) {
      return "Remove from watchlist"
    } else {
      return "Add to watchlist"
    }
  }

  const wlDlgTitle = () => {
    let wlList = detailData.watchlist
    if (wlList?.includes(walletAddress)) {
      return "Are you going to remove this project from your watchlist?"
    } else {
      return "Are you going to add this project to your watchlist?"
    }
  }

  const handleOpenWatchListDlg = () => {
    setWatchListDlg(true)
  }

  const wlBtnClicked = () => {
    if (walletAddress === "") {
      NotificationManager.error("You have to connect wallet first")
      return
    }

    handleCloseWatchListDlg()

    let wllist = detailData.watchlist
    if (wllist.includes(walletAddress)) {
      let db = database.ref("/coinlist/" + id)
      db.update({ watchlist: wllist.replace(walletAddress + ",", "") })
        .catch((e) => {
          NotificationManager.error("Can not add.")
          console.log(e)
        })
        .then(() => {
          NotificationManager.success("Removed successfully.")
          handleSynchroTables(synchroTables + 1)
        })
    } else {
      let db = database.ref("/coinlist/" + id)
      db.update({ watchlist: detailData.watchlist + walletAddress + "," })
        .catch((e) => {
          NotificationManager.error("Can not add.")
          console.log(e)
        })
        .then(() => {
          NotificationManager.success("Added successfully.")
          handleSynchroTables(synchroTables + 1)
        })
    }
  }

  const voteBtnClicked = async () => {
    let dbRef = database.ref("/votelimit")
    let dailyStart = 0
    let dailyCount = 0
    let epochNow = Math.floor(Date.now() / 1000)
    let tempId = ""
    const snapshot = await dbRef.orderByChild("wallet").equalTo(walletAddress).once("value")
    if (snapshot.exists()) {
      const tempRow = snapshot.val()

      for (let i in tempRow) {
        tempId = i
        dailyStart = tempRow[i].dailyStart
        dailyCount = tempRow[i].dailyCount
      }

      if (dailyCount >= 5 && epochNow - dailyStart <= 24 * 60 * 60) {
        NotificationManager.error("You can only vote 5 times per day.")
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
      value: ethers.utils.parseUnits(ENVS.NORMAL_VOTE_FEE),
    }

    await signer
      .sendTransaction(tx)
      .then(async () => {
        if (tempId === "") {
          dbRef.push({
            wallet: walletAddress,
            dailyStart: Math.floor(epochNow / 86400) * 86400,
            dailyCount: dailyCount + 1,
          })
        } else {
          let dbRefUpdate = database.ref("/votelimit/" + tempId)
          dbRefUpdate.update({ dailyCount: dailyCount + 1 })
        }

        let db = database.ref("/coinlist/" + id)

        let updateDailyCount = 0
        let updateDailyStart = 0

        let updateWeeklyCount = 0
        let updateWeeklyStart = 0

        let epochNowDay = Math.floor(epochNow / 86400) * 86400
        if (epochNowDay - Number(detailData.updateWeeklyStart) > 86400 * 7) {
          updateWeeklyCount = 1
          let getDayCount = Math.floor(epochNow / 86400) % 7
          switch (getDayCount) {
            case 0:
              updateWeeklyStart = (Math.floor(epochNow / 86400) - 3) * 86400
              break
            case 1:
              updateWeeklyStart = (Math.floor(epochNow / 86400) - 4) * 86400
              break
            case 2:
              updateWeeklyStart = (Math.floor(epochNow / 86400) - 5) * 86400
              break
            case 3:
              updateWeeklyStart = (Math.floor(epochNow / 86400) - 6) * 86400
              break
            case 4:
              updateWeeklyStart = (Math.floor(epochNow / 86400) - 0) * 86400
              break
            case 5:
              updateWeeklyStart = (Math.floor(epochNow / 86400) - 1) * 86400
              break
            case 6:
              updateWeeklyStart = (Math.floor(epochNow / 86400) - 2) * 86400
              break
            default:
              updateWeeklyStart = 0
              break
          }
        } else {
          updateWeeklyStart = detailData.weeklyStart
          updateWeeklyCount = detailData.weeklyCount + 1
        }

        if (epochNow - Number(detailData.dailyStart) < 86400) {
          updateDailyCount = Number(detailData.dailyCount) + 1
          updateDailyStart = Number(detailData.dailyStart)
        } else {
          updateDailyCount = 1
          updateDailyStart = Math.floor(epochNow / 86400) * 86400
        }

        db.update({
          voteCount: Number(detailData.voteCount) + 1,
          dailyStart: updateDailyStart,
          dailyCount: updateDailyCount,
          weeklyStart: updateWeeklyStart,
          weeklyCount: updateWeeklyCount,
        })

        if (
          Number(detailData.voteCount) < ENVS.DIAMOND_TIRE_LIMIT &&
          Number(detailData.voteCount) + 1 >= ENVS.DIAMOND_TIRE_LIMIT
        ) {
          await fetch(`${process.env.REACT_APP_SERVER_URL}/diamond/?token=${detailData.name}`, {
            method: "GET",
          })
            .then(() => {
              NotificationManager.info("Notification about Diamond Tier has sent to TG channel.")
            })
            .catch((err) => console.log(err))
        } else if (
          Number(detailData.voteCount) < ENVS.RUBY_TIRE_LIMIT &&
          Number(detailData.voteCount) + 1 >= ENVS.RUBY_TIRE_LIMIT
        ) {
          await fetch(`${process.env.REACT_APP_SERVER_URL}/ruby/?token=${detailData.name}`, {
            method: "GET",
          })
            .then(() => {
              NotificationManager.info("Notification about Ruby has sent to TG channel.")
            })
            .catch((err) => console.log(err))
        } else {
        }
      })
      .catch((e) => {
        NotificationManager.error("Transaction failed.")
        console.log(e)
      })

    handleSynchroTables(synchroTables + 1)
  }
  return (
    <div className="detailsDiv">
      {loading === false ? (
        <div className="detailsWrappedDiv">
          <p className="nxPrompt">$ ls ./token</p>
          <div className="detailsHeaderDiv">
            <div className="headerLeftDiv">
              <div className="firstHeaderDiv">
                <div className="logo1Div">
                  <div className="logoLeftDiv">
                    <img src={detailData.logo} alt="logo"></img>
                  </div>
                  <div className="logoMiddleDiv">
                    <div className="nameDiv">
                      <span>{detailData.name}</span>
                    </div>
                    {tierReturn(detailData.symbol, detailData.voteCount)}
                  </div>
                </div>
                <div className="logoRightDiv">
                  <div className="logoVoteDivWrapped">
                    <button className="logoVoteBtn" onClick={voteBtnClicked}>
                      Vote
                    </button>
                  </div>
                </div>
              </div>
              <div className="secondHeaderDiv">
                <div
                  className="secondHeaderWrappedDiv"
                  onClick={() =>
                    window.open(contractLink(detailData.contractAddr, detailData.network), "_blank")
                  }
                >
                  <img src={chainImg(detailData.network)} alt="chainLogo" />
                  <span>&nbsp;&nbsp;Contract : {contractReturn(detailData.contractAddr)}</span>
                </div>
              </div>
              <div className="thirdHeaderDiv">
                <img
                  src={telegramIcon}
                  onClick={() => window.open(detailData.telegramlink, "_blank")}
                  alt="tgIcon"
                ></img>
                <img
                  src={twiterIcon}
                  onClick={() => window.open(detailData.twitterlink, "_blank")}
                  alt="twitterIcon"
                ></img>
                <button className="addwatchlistbtn" onClick={handleOpenWatchListDlg}>
                  {returnWlBtnTitle()}
                </button>
              </div>

              {detailData.chartlink !== "" &&
              detailData.chartlink.includes("https://poocoin.app/", 0) ? (
                <div className="fourthHeaderDiv">
                  Charts &nbsp;&nbsp;
                  <img
                    className="poocoinImg"
                    src={poocoinIcon}
                    onClick={() => window.open(detailData.chartlink, "_blank")}
                    alt="tgIcon"
                  ></img>
                </div>
              ) : (
                <div></div>
              )}

              {detailData.chartlink !== "" &&
              detailData.chartlink.includes("https://dextools.io/", 0) ? (
                <div className="fourthHeaderDiv">
                  Charts &nbsp;&nbsp;
                  <img
                    className="dextoolImg"
                    src={dextoolIcon}
                    onClick={() => window.open(detailData.chartlink, "_blank")}
                    alt="tgIcon"
                  ></img>
                </div>
              ) : (
                <div></div>
              )}
            </div>
            <div className="headerRightDiv">
              <div className="detailsAdBanner">
                <img src={nitrogemImg} alt="Nexora AI" className="adBannerLogo" />
                <div className="adBannerText">
                  <span className="adBannerTitle">Nexora AI</span>
                  <span className="adBannerSub">Advertise Here</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mainDetailsDiv">
            <Overview data={detailData} />
            <div className="detailInfoWrapDiv">
              <DetailInfo data={detailData} id={id} />
              <DetailMarket data={detailData} />
            </div>
            <div className="flightImgDiv">
              <img src={flightImg} alt="flightImg" />
            </div>
          </div>
          <TokenIntelligenceBoundary>
            <TokenIntelligence
              tokenId={id}
              symbol={detailData.symbol}
              presale={detailData.presale}
              dataVersion={listingVersion(detailData)}
            />
          </TokenIntelligenceBoundary>
          <Promoted title="promoted" filter="promoted" caption="" />

          <ConfirmDialog
            open={openWatchListDlg}
            title={wlDlgTitle()}
            onConfirm={wlBtnClicked}
            onCancel={handleCloseWatchListDlg}
          />
        </div>
      ) : (
        <div className="loadingDetailsDiv">
          <img src={loadingImg} alt="loading" />
        </div>
      )}
    </div>
  )
}

export default Details
