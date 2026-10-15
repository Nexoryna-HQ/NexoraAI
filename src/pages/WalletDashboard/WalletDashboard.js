import "./WalletDashboard.css"

import React, { useCallback, useContext, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import logoImg from "../../assets/img/nitrogem.png"
import { AppContext } from "../../context"
import { connectWithProvider } from "../../helpers/wallet"
import { describeInjectedWallets } from "../../helpers/injectedWallets"
import { NotificationManager } from "../../helpers/notify"
import WalletBrandIcon from "../../components/WalletBrandIcon/WalletBrandIcon"

const INSTALL_WALLETS = [
  { name: "MetaMask", href: "https://metamask.io/download/" },
  { name: "Rabby", href: "https://rabby.io/" },
  { name: "Phantom", href: "https://phantom.app/download" },
]

export const WalletDashboard = () => {
  const navigate = useNavigate()
  const { handleWalletAddress } = useContext(AppContext)
  const [wallets, setWallets] = useState([])
  const [connectingName, setConnectingName] = useState("")
  const [walletOpen, setWalletOpen] = useState(false)

  const refreshWallets = useCallback(() => {
    setWallets(describeInjectedWallets())
  }, [])

  useEffect(() => {
    refreshWallets()
    const onFocus = () => refreshWallets()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refreshWallets])

  useEffect(() => {
    if (!walletOpen) return undefined
    const onKey = (event) => {
      if (event.key === "Escape") setWalletOpen(false)
    }
    document.addEventListener("keydown", onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [walletOpen])

  const openWalletModal = () => {
    refreshWallets()
    setWalletOpen(true)
  }

  const onPickWallet = async (provider, name) => {
    setConnectingName(name)
    try {
      const res = await connectWithProvider(provider)
      handleWalletAddress(res.address)
      if (!res.address) {
        NotificationManager.warning(res.status || "Could not connect wallet.")
      } else {
        NotificationManager.success(`Connected with ${name}`)
        navigate("/home", { replace: true })
      }
    } catch (e) {
      NotificationManager.error(e?.message || "Connection error")
    } finally {
      setConnectingName("")
    }
  }

  return (
    <div className="walletDashboardPage">
      <div className="walletDashboardBg" aria-hidden="true" />

      <header className="walletTop">
        <div className="walletWordmark">
          <img src={logoImg} alt="" />
          <span>Nexora AI</span>
        </div>
      </header>

      <div className="walletStage">
        <div className="walletLayout">
          <section className="walletOverview" aria-labelledby="wallet-overview-title">
            <p className="walletBadge">
              <i aria-hidden="true" />
              Web3 · Token intelligence
            </p>
            <h1 id="wallet-overview-title" className="walletIntro">
              Meet <span className="walletAccent">Nexora AI</span>, an intelligent platform built to simplify Web3 token discovery.
            </h1>
            <p className="walletBody">
              By bringing together market data, community sentiment, token activity, and on-chain signals, <span className="walletName">Nexora AI</span> transforms complex information into clear and meaningful insights. It gives users a more efficient way to explore emerging projects, understand market activity, and compare token momentum.
            </p>
            <button type="button" className="walletConnectBtn" onClick={openWalletModal}>
              <span className="walletConnectArrow" aria-hidden="true">&gt;</span>
              Connect wallet
            </button>
            <ul className="walletStats">
              <li>
                <strong>Public</strong>
                <span>listings</span>
              </li>
              <li>
                <strong>Votes</strong>
                <span>on-chain</span>
              </li>
              <li>
                <strong>AI</strong>
                <span>read-only</span>
              </li>
            </ul>
          </section>

          <figure className="walletTerm" aria-label="Nexora AI signal readout">
            <div className="termBar">
              <span className="termDots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="termPath">nexora@ai: ~/discovery</span>
            </div>
            <div className="termBody">
              <p><span className="termPrompt">nexora:~$</span> <span className="termCmd">nexora --status</span></p>
              <p className="termOut">Nexora AI · Web3 token intelligence</p>
              <p><span className="termPrompt">nexora:~$</span> <span className="termCmd">cat signals.txt</span></p>
              <p className="termOut">Market data, community sentiment, on-chain activity.</p>
              <p><span className="termPrompt">nexora:~$</span> <span className="termCmd">ls ./insights</span></p>
              <p className="termGreen">listings&nbsp;&nbsp;momentum&nbsp;&nbsp;votes&nbsp;&nbsp;discovery</p>
              <p><span className="termPrompt">nexora:~$</span> <span className="termCmd">nexora --mode</span></p>
              <p className="termGreen"><i aria-hidden="true" /> read-only · not financial advice</p>
              <p><span className="termPrompt">nexora:~$</span> <span className="termCursor" aria-hidden="true" /></p>
            </div>
          </figure>
        </div>
      </div>

      {walletOpen ? (
        <div className="walletModalBackdrop" onClick={() => setWalletOpen(false)}>
          <div
            className="walletDashboardPanel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="walletDashboardPanelGlow" aria-hidden="true" />
            <div className="walletDashboardPanelHeader">
              <div className="walletDashboardTitleIcon">
                <img src={logoImg} alt="Nexora AI" />
              </div>
              <button type="button" className="walletModalClose" onClick={() => setWalletOpen(false)} aria-label="Close">
                ×
              </button>
              <h2 id="wallet-modal-title" className="walletDashboardPanelTitle">Connect a wallet</h2>
              <p className="walletDashboardPanelLead">Choose a wallet to open the catalog.</p>
            </div>
            <div className="walletDashboardDivider" />
            {wallets.length > 0 ? (
              <>
                <p className="walletDashboardSectionLabel">Select wallet</p>
                <div className="walletDashboardOptionGrid">
                  {wallets.map(({ provider, name }, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="walletDashboardOptionBtn"
                      disabled={Boolean(connectingName)}
                      onClick={() => onPickWallet(provider, name)}
                    >
                      <WalletBrandIcon name={name} />
                      <span className="walletDashboardOptionText">
                        <span className="walletDashboardOptionName">
                          {connectingName === name ? "Connecting…" : name}
                        </span>
                        <span className="walletDashboardOptionHint">
                          {connectingName === name ? "Approve in your wallet" : "Click to connect"}
                        </span>
                      </span>
                      <span className="walletDashboardOptionArrow" aria-hidden="true">›</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="walletDashboardSectionLabel">Install a wallet</p>
                <p className="walletDashboardHint">
                  No Ethereum wallet detected. Install one below, then refresh this page.
                </p>
                <div className="walletDashboardOptionGrid">
                  {INSTALL_WALLETS.map(({ name, href }) => (
                    <a
                      key={name}
                      className="walletDashboardOptionBtn walletDashboardInstallBtn"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <WalletBrandIcon name={name} />
                      <span className="walletDashboardOptionText">
                        <span className="walletDashboardOptionName">Get {name}</span>
                        <span className="walletDashboardOptionHint">Install extension</span>
                      </span>
                      <span className="walletDashboardOptionArrow" aria-hidden="true">›</span>
                    </a>
                  ))}
                </div>
              </>
            )}
            <div className="walletDashboardPanelFooter">
              <span>Intelligence · Discovery · On-chain votes</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default WalletDashboard
