import "./Listcoin.css"

import React from "react"

import openFolderImg from "../../assets/img/Form/openFolder.png"
import getListedCoin from "../../assets/img/Form/getListedCoin.png"

import { useState, useEffect } from "react"
import { NotificationManager } from "../../helpers/notify"

import { useNavigate } from "react-router-dom"
import bscImg from "../../assets/img/binance.svg"
import ethImg from "../../assets/img/ethereum.svg"

export const Listcoin = (event) => {
  const [name, setName] = useState("")
  const [symbol, setSymbol] = useState("")
  const [network, setNetwork] = useState("BSC")
  const [description, setDescription] = useState("")
  const [chartlink, setChartlink] = useState("")
  const [swaplink, setSwaplink] = useState("")
  const [websitelink, setWebsitelink] = useState("")
  const [telegramlink, setTelegramlink] = useState("")
  const [twitterlink, setTwitterlink] = useState("")
  const [discordlink, setDiscordlink] = useState("")
  const [contactemail, setContactEmail] = useState("")
  const [kyc, setKYC] = useState("")
  const [audit, setAudit] = useState("")
  const [videolink, setVideoLink] = useState("")
  const [cmclink, setCMCLink] = useState("")
  const [contractAddr, setContractAddr] = useState("")

  const [presaleflag, setPresaleFlag] = useState(false)
  const [logoImg, setLogoImg] = useState(openFolderImg)
  const [checked, setChecked] = useState(false)
  const [startDate, setStartDate] = useState(new Date())

  /* eslint-disable no-unused-vars */
  const [submitClicked, setSubmitClicked] = useState(false)
  const [listingInfo, setListingInfo] = useState({})
  /* eslint-enable no-unused-vars */

  const navigate = useNavigate()

  const onChangeName = (event) => {
    setName(event.target.value)
  }

  const onChangeSymbol = (event) => {
    setSymbol(event.target.value)
  }

  const onChangeNetwork = (event) => {
    if (event.target.value === "BSC") {
      setNetwork("BSC")
    } else {
      setNetwork("ETH")
    }
  }

  const onChangeDescription = (event) => {
    setDescription(event.target.value)
  }

  const onChangeChartlink = (event) => {
    setChartlink(event.target.value)
  }

  const onChangeSwaplink = (rooent) => {
    setSwaplink(event.target.value)
  }

  const onChangeWebsitelink = (event) => {
    setWebsitelink(event.target.value)
  }
  const onChangeTelegramlink = (event) => {
    setTelegramlink(event.target.value)
  }
  const onChangeTwitterlink = (event) => {
    setTwitterlink(event.target.value)
  }
  const onChangeKYC = (event) => {
    setKYC(event.target.value)
  }
  const onChangeAudit = (event) => {
    setAudit(event.target.value)
  }
  const onChangeVideoLink = (event) => {
    setVideoLink(event.target.value)
  }
  const onChangeCMCLink = (event) => {
    setCMCLink(event.target.value)
  }
  const onChangeContractAddr = (event) => {
    setContractAddr(event.target.value)
  }
  const onChangeDiscordLink = (event) => {
    setDiscordlink(event.target.value)
  }
  const onChangeContactEmail = (event) => {
    setContactEmail(event.target.value)
  }

  const onChangePresale = (event) => {
    if (event.target.value === "Yes") {
      setPresaleFlag(true)
    } else {
      setPresaleFlag(false)
    }
  }

  const onChangeTermsAndConditions = (event) => {
    setChecked(event.target.checked)
  }

  const validateFunc = () => {
    console.log(name, symbol, network, websitelink, telegramlink, contractAddr, "debug")
    if (name === "") return false
    if (symbol === "") return false
    if (network === "") return false
    if (websitelink === "") return false
    if (telegramlink === "") return false
    if (contractAddr === "") return false

    return true
  }

  const backBtnClicked = () => {
    console.log(process.env.REACT_APP_SERVER_URL)
    navigate(-1, { replace: true })
  }

  const submitListingInfo = () => {
    if (validateFunc() === false) {
      NotificationManager.error("You must fill the all * empty blanks.")
      return
    }
    if (checked === false) {
      NotificationManager.error("You have to agree with Terms and Conditions.")
      return
    }

    if (logoImg === openFolderImg) {
      NotificationManager.error("You have to upload logo image before submit.")
      return
    }

    let chartlink_check = false
    if (chartlink !== "" && chartlink.includes("https://poocoin.app/", 0) === true)
      chartlink_check = true
    if (chartlink !== "" && chartlink.includes("https://dextools.io/", 0) === true)
      chartlink_check = true

    if (chartlink_check === false) {
      NotificationManager.error("You have to insert only Poocoin or Dextool Url for chart link.")
      return
    }

    let buffer = {
      name: name,
      symbol: symbol,
      network: network,
      description: description,
      chartlink: chartlink,
      swaplink: swaplink,
      websitelink: websitelink,
      telegramlink: telegramlink,
      twitterlink: twitterlink,
      discordlink: discordlink,
      contactemail: contactemail,
      presale: presaleflag,
      logo: logoImg,
      kyc: kyc,
      audit: audit,
      cmclink: cmclink,
      contractAddr: contractAddr,
      videolink: videolink,

      launch: Number(Math.floor(new Date(startDate).getTime() / 1000), "epoch"),
      listed: Number(Math.floor(Date.now() / 1000)),

      voteCount: 0,

      dailyStart: 0,
      dailyCount: 0,
      weeklyStart: 0,
      weeklyCount: 0,

      watchlist: "",
      promoted: 0,
    }
    // setSubmitClicked(true);
    setListingInfo(buffer)
    navigate("/tiers/", { state: { info: buffer, id: "" } })
    // pushToDb();
  }
  const imgUploadInput = (e) => {
    var reader = new FileReader()
    reader.onload = function (evt) {
      setLogoImg(evt.target.result)
      console.log(logoImg)
    }
    reader.readAsDataURL(e.target.files[0])
  }

  useEffect(() => {}, [logoImg])

  return (
    <div className="listCoinDiv">
      {/* {!submitClicked?( */}
      <header className="listHeader">
        <p className="nxPrompt">$ ls ./list</p>
        <h1 className="nxTitle">List a token</h1>
        <p className="nxLede">Submit a public listing. The form continues to the tier step.</p>
      </header>
      <div className="listCoinDivWrap">
        <div className="uploadImgDivWrap">
          <div className="openFolderImg">
            <span className="titleInput">
              Logo Upload*
              <br />
              (.jpg .png .svg)
            </span>
            <label htmlFor="uploadFileInput">
              <input
                type="file"
                id="uploadFileInput"
                className="uploadFile"
                style={{ display: "none" }}
                onChange={imgUploadInput}
              />
              <img src={logoImg} alt="" />
            </label>
          </div>
          <div className="getListedCoin">
            <img src={getListedCoin} alt=""></img>
          </div>
        </div>
        <div className="listingNormalDiv">
          <span className="titleInput">Name*</span>
          <input className="listingInput" onChange={onChangeName} />
        </div>
        <div className="listingNormalDiv">
          <span className="titleInput">Symbol*</span>
          <input className="listingInput" onChange={onChangeSymbol} />
        </div>
        {/* <div className="listingNormalDiv">
                    <span className='titleInput'>Network/Chain*</span>
                    <input className="listingInput" onChange={onChangeNetwork}/>
                </div> */}
        <div className="listingNormalDiv">
          <span className="titleInput">Network/Chain*</span>
          <div className="radioDiv">
            <input
              type="radio"
              id="BSC"
              name="checkNetworkRadio"
              value="BSC"
              checked
              onChange={onChangeNetwork}
            />
            <label>&nbsp;</label>
            <img src={bscImg} alt=""></img>
            <label htmlFor="BSC">&nbsp;BSC&nbsp;&nbsp;</label>

            <input
              type="radio"
              id="ETH"
              name="checkNetworkRadio"
              value="ETH"
              onChange={onChangeNetwork}
            />
            <label>&nbsp;</label>
            <img src={ethImg} alt=""></img>
            <label htmlFor="ETH">&nbsp;ETH&nbsp;&nbsp;</label>
          </div>
        </div>
        <div className="listingNormalDiv">
          <span className="titleInput">Contract Address*</span>
          <input className="listingInput" onChange={onChangeContractAddr} />
        </div>

        <div className="listingNormalDiv">
          <span className="titleInput">Project in presale phase?*</span>
          <div className="radioDiv">
            <input
              type="radio"
              id="no"
              name="checkPresaleRadio"
              value="No"
              checked
              onChange={onChangePresale}
            />
            <label htmlFor="no">No</label>
            <input
              type="radio"
              id="yes"
              name="checkPresaleRadio"
              value="Yes"
              onChange={onChangePresale}
            />
            <label htmlFor="yes">Yes</label>
          </div>
        </div>

        <div className="listingNormalDiv">
          <span className="titleInput">Launch Date*</span>
          <input
            className="listingInput"
            type="date"
            value={startDate.toISOString().slice(0, 10)}
            onChange={(event) => setStartDate(new Date(event.target.value || Date.now()))}
          />
        </div>
        <div className="listingNormalDiv">
          <span className="titleInput">Description</span>
          <textarea className="listingInputDescription" onChange={onChangeDescription} />
        </div>
        <div className="listingNormalDiv">
          <span className="titleInput">Custom chart link</span>
          <input className="listingInput" onChange={onChangeChartlink} />
        </div>
        <div className="listingNormalDiv">
          <span className="titleInput">Custom swap link</span>
          <input className="listingInput" onChange={onChangeSwaplink} />
        </div>

        <div className="listingNormalDiv">
          <span className="titleInput">Website link*</span>
          <input className="listingInput" onChange={onChangeWebsitelink} />
        </div>
        <div className="listingNormalDiv">
          <span className="titleInput">KYC</span>
          <input className="listingInput" onChange={onChangeKYC} />
        </div>
        <div className="listingNormalDiv">
          <span className="titleInput">Audit</span>
          <input className="listingInput" onChange={onChangeAudit} />
        </div>
        <div className="listingNormalDiv">
          <span className="titleInput">Youtube Link</span>
          <input className="listingInput" onChange={onChangeVideoLink} />
        </div>
        <div className="listingNormalDiv">
          <span className="titleInput">Coinmarketcap Link</span>
          <input className="listingInput" onChange={onChangeCMCLink} />
        </div>
        <div className="listingNormalDiv">
          <span className="titleInput">Telegram link*</span>
          <input className="listingInput" onChange={onChangeTelegramlink} />
        </div>

        <div className="listingNormalDiv">
          <span className="titleInput">Twitter</span>
          <input className="listingInput" onChange={onChangeTwitterlink} />
        </div>

        <div className="listingNormalDiv">
          <span className="titleInput">Discord</span>
          <input className="listingInput" onChange={onChangeDiscordLink} />
        </div>

        <div className="listingNormalDiv">
          <span className="titleInput">Contact Email</span>
          <input className="listingInput" onChange={onChangeContactEmail} />
        </div>

        <div className="listingCheckboxDiv">
          <input type="checkbox" onChange={onChangeTermsAndConditions} />
          <span className="whiteSpan">&nbsp;&nbsp;I agree to the&nbsp;&nbsp;</span>
          <span className="redSpan"> Terms and Conditions</span>
        </div>

        <div className="listingBtnDiv">
          <button id="backBtn" onClick={backBtnClicked}>
            Back
          </button>
          <button id="submitBtn" type="submit" onClick={submitListingInfo}>
            Submit
          </button>
        </div>
      </div>
      {/* ):(<Tiers info={listingInfo}/>)}  */}
    </div>
  )
}

export default Listcoin
