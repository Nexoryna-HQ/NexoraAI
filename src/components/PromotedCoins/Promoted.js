import "./Promoted.css"

import emeraldImg from "../../assets/img/emerald.png"
import rubyImg from "../../assets/img/ruby.png"
import diamondImg from "../../assets/img/diamond.png"
import loadingImg from "../../assets/img/loading.svg"
import { useEffect, useMemo, useState, useContext } from "react"
import { database } from "../../helpers/firebase.js"
import { NotificationManager } from "../../helpers/notify"
import { ConfirmDialog } from "../ConfirmDialog/ConfirmDialog"
import { ListingTable } from "../ListingTable/ListingTable"
import { useNavigate } from "react-router-dom"
import { AppContext } from "../../context"
import watchlistImg from "../../assets/img/watchlisted.png"
import nonwatchlistImg from "../../assets/img/nonwatchlisted.png"
import { ENVS } from "../../helpers/configurations"
import { getMarketQuotes } from "../../helpers/marketQuotes"
import { getWeb3Eip1193Provider } from "../../helpers/activeWeb3Provider"
import { ethers } from "ethers"
import { filterInsightRows, sortListingRows } from "../../helpers/listingInsights.js"
import {
  ListingDiscoveryBar,
  ListingInsightPanel,
  useListingInsights,
} from "../ListingDiscovery/ListingDiscovery"

import React from "react"
export const Promoted = (props) => {
  const titleStr = props.title
  const caption = props.caption
  const [loading, setLoading] = useState(true)
  const [allData, setAllData] = useState({})
  const { walletAddress, synchroTables, handleSynchroTables } = useContext(AppContext)

  const [allShowData, setAllShowData] = useState([])
  const [insightOnly, setInsightOnly] = useState(false)
  const [sortMode, setSortMode] = useState("table")
  const [openInsightId, setOpenInsightId] = useState("")
  const { insights, lookupUnavailable, refreshInsights } = useListingInsights()
  const [openWatchListDlg, setWatchListDlg] = useState(false)
  const [rowId, setRowId] = useState("")
  const [wlDlgTitle, setWlDlgTitle] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const query = database.ref("/coinlist").orderByChild("promoted").startAt(1)

    let requestId = 0
    const onValue = async (snapshot) => {
      const current = ++requestId
      try {
        if (!snapshot.exists()) {
          if (!cancelled && current === requestId) {
            setAllData({})
            setAllShowData([])
          }
          return
        }

        const tempSnapShot = snapshot.val()
        if (!cancelled && current === requestId) setAllData(tempSnapShot)

        const symbols = []
        for (const i in tempSnapShot) {
          if (tempSnapShot[i].presale !== true && tempSnapShot[i].symbol) {
            symbols.push(tempSnapShot[i].symbol)
          }
        }

        const quotes = await getMarketQuotes(symbols)
        if (cancelled || current !== requestId) return

        const tempData = []
        for (let i in tempSnapShot) {
          let wlImg = nonwatchlistImg
          const wlList = tempSnapShot[i].watchlist
          if (wlList?.includes(walletAddress)) {
            wlImg = watchlistImg
          }

          let tierImg = emeraldImg
          if (tempSnapShot[i].voteCount >= ENVS.DIAMOND_TIRE_LIMIT) {
            tierImg = diamondImg
          } else if (tempSnapShot[i].voteCount >= ENVS.RUBY_TIRE_LIMIT) {
            tierImg = rubyImg
          }

          let mcap
          let change24h
          if (tempSnapShot[i].presale === true) {
            mcap = "Presale"
            change24h = "-"
          } else {
            const quote = quotes[tempSnapShot[i].symbol]
            mcap = quote?.market_cap
            change24h = quote?.percent_change_24h
          }

          tempData.push([
            tempSnapShot[i].logo,
            tempSnapShot[i].name,
            tempSnapShot[i].network,
            isNaN(mcap) ? mcap ?? "-" : floorValue(mcap),
            isNaN(change24h) ? change24h ?? "-" : floorValue(change24h),
            convertLaunchDate(tempSnapShot[i].launch),
            tierImg,
            tempSnapShot[i].voteCount,
            "",
            wlImg,
            i,
          ])
        }

        setAllShowData(tempData)
      } catch (error) {
        console.log("Promoted list load error:", error)
        if (!cancelled && current === requestId) setAllShowData([])
      } finally {
        if (!cancelled && current === requestId) setLoading(false)
      }
    }

    query.on("value", onValue)
    return () => {
      cancelled = true
      query.off("value", onValue)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress])

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

  const handleOpenWatchListDlg = (id) => {
    let wllist = allData[id].watchlist

    if (wllist.includes(walletAddress)) {
      setWlDlgTitle("You are going to remove this project from your Watchlist?")
    } else {
      setWlDlgTitle("You are going to add this project to your Watchlist?")
    }
    setRowId(id)
    setWatchListDlg(true)
  }
  const handleCloseWatchListDlg = () => {
    setWatchListDlg(false)
  }
  const convertLaunchDate = (epoch) => {
    let dateDiff = 0
    let monthDiff = 0
    let yearDiff = 0

    let countNow = Math.floor(Math.floor(Date.now() / 1000) / 86400)
    let launchDate = Math.floor(epoch / 86400)

    if (countNow > launchDate) {
      dateDiff = countNow - launchDate
      if (countNow - launchDate > 365) {
        yearDiff = Math.floor(dateDiff / 365)
        return yearDiff.toString() + " Year Ago"
      } else if (dateDiff > 30) {
        monthDiff = Math.floor(dateDiff / 30)
        return monthDiff.toString() + " Mon Ago"
      } else {
        dateDiff = countNow - launchDate
        return dateDiff.toString() + " Day Ago"
      }
    } else if (countNow < launchDate) {
      dateDiff = launchDate - countNow
      if (dateDiff > 365) {
        yearDiff = Math.floor(dateDiff / 365)
        return "In " + yearDiff.toString() + " Year"
      } else if (dateDiff > 30) {
        monthDiff = Math.floor(dateDiff / 30)
        return "In " + monthDiff.toString() + " Mon"
      } else {
        return "In " + dateDiff.toString() + " Day"
      }
    } else {
      return "Today"
    }
  }

  const chooseSort = (mode) => {
    if (mode === "table") setSortMode("table")
    else setSortMode((current) => (current === mode ? "table" : mode))
  }

  const wlBtnClicked = () => {
    if (walletAddress === "") {
      NotificationManager.error("You have to connect wallet first")
      return
    }

    handleCloseWatchListDlg()

    let wllist = allData[rowId].watchlist
    if (wllist.includes(walletAddress)) {
      let db = database.ref("/coinlist/" + rowId)
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
      let db = database.ref("/coinlist/" + rowId)
      db.update({ watchlist: allData[rowId].watchlist + walletAddress + "," })
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

  const voteClicked = async (id) => {
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
        if (epochNowDay - Number(allData[id].updateWeeklyStart) > 86400 * 7) {
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
          updateWeeklyStart = allData[id].weeklyStart
          updateWeeklyCount = allData[id].weeklyCount + 1
        }

        if (epochNow - Number(allData[id].dailyStart) < 86400) {
          updateDailyCount = Number(allData[id].dailyCount) + 1
          updateDailyStart = Number(allData[id].dailyStart)
        } else {
          updateDailyCount = 1
          updateDailyStart = Math.floor(epochNow / 86400) * 86400
        }

        db.update({
          voteCount: Number(allData[id].voteCount) + 1,
          dailyStart: updateDailyStart,
          dailyCount: updateDailyCount,
          weeklyStart: updateWeeklyStart,
          weeklyCount: updateWeeklyCount,
        })

        if (
          Number(allData[id].voteCount) < ENVS.DIAMOND_TIRE_LIMIT &&
          Number(allData[id].voteCount) + 1 >= ENVS.DIAMOND_TIRE_LIMIT
        ) {
          await fetch(`${process.env.REACT_APP_SERVER_URL}/diamond/?token=${allData[id].name}`, {
            method: "GET",
          })
            .then(() => {
              NotificationManager.info("Notification about Diamond Tier has sent to TG channel.")
            })
            .catch((err) => console.log(err))
        } else if (
          Number(allData[id].voteCount) < ENVS.RUBY_TIRE_LIMIT &&
          Number(allData[id].voteCount) + 1 >= ENVS.RUBY_TIRE_LIMIT
        ) {
          await fetch(`${process.env.REACT_APP_SERVER_URL}/ruby/?token=${allData[id].name}`, {
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

  const tableRows = useMemo(() => {
    const filtered = insightOnly ? filterInsightRows(allShowData, insights) : allShowData
    return sortMode === "table" ? filtered : sortListingRows(filtered, sortMode)
  }, [allShowData, insightOnly, insights, sortMode])

  return (
    <div className="showcoinDivWrapped">
      {loading === false ? (
        <div className="showcoinDiv">
          <div className="diamondWrappedDiv">
            <div className="diamondDiv">
              <span>{titleStr}</span>
            </div>
          </div>

          <ListingDiscoveryBar
            insightOnly={insightOnly}
            sortMode={sortMode}
            lookupUnavailable={lookupUnavailable}
            emptyInsight={insightOnly && tableRows.length === 0}
            onInsightOnly={() => setInsightOnly((current) => !current)}
            onSort={chooseSort}
          />
          <ListingTable
            caption={caption}
            rows={tableRows}
            insights={insights}
            watchlistImg={watchlistImg}
            nonwatchlistImg={nonwatchlistImg}
            onRowNavigate={(tokenId) => navigate("/details/" + tokenId, { replace: true })}
            onVote={voteClicked}
            onWatchlist={handleOpenWatchListDlg}
            onOpenInsight={setOpenInsightId}
          />
          <ConfirmDialog
            open={openWatchListDlg}
            title={wlDlgTitle}
            onConfirm={wlBtnClicked}
            onCancel={handleCloseWatchListDlg}
          />
          <ListingInsightPanel
            open={Boolean(openInsightId)}
            tokenId={openInsightId}
            listing={allData[openInsightId]}
            onClose={() => {
              setOpenInsightId("")
              refreshInsights()
            }}
          />
        </div>
      ) : (
        <div className="showcoinDiv">
          <div className="diamondWrappedDiv">
            <div className="diamondDiv">
              <span>{titleStr}</span>
            </div>
          </div>

          <div className="loadingDiv">
            <img src={loadingImg} alt="loading" />
          </div>
        </div>
      )}
    </div>
  )
}

export default Promoted
