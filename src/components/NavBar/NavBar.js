import "./NavBar.css"

import React, { useEffect, useContext, useState, useCallback } from "react"
import { NavLink, useNavigate } from "react-router-dom"

import logoImg from "../../assets/img/nitrogem.png"

import { connectWallet, getCurrentWalletConnected } from "../../helpers/wallet"
import { getInjectedEthereumProviders } from "../../helpers/injectedWallets"
import { getWeb3Eip1193Provider } from "../../helpers/activeWeb3Provider"
import { NotificationManager } from "../../helpers/notify"
import { AppContext } from "../../context"

export const NavBar = () => {
  const { walletAddress, handleWalletAddress, handleDisconnectWallet } = useContext(AppContext)
  const [hasInjectedWallet, setHasInjectedWallet] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    const initDatas = async () => {
      const installed = getInjectedEthereumProviders().length > 0
      setHasInjectedWallet(installed)
      const { address } = await getCurrentWalletConnected()
      handleWalletAddress(address)
    }
    initDatas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const eth = getWeb3Eip1193Provider()
    if (!eth || !eth.on) return undefined

    const onAccountsChanged = (accounts) => {
      if (accounts.length) {
        handleWalletAddress(accounts[0])
      } else {
        void handleDisconnectWallet()
      }
    }

    const onChainChanged = () => {
      window.location.reload()
    }

    eth.on("accountsChanged", onAccountsChanged)
    eth.on("chainChanged", onChainChanged)

    return () => {
      if (eth.removeListener) {
        eth.removeListener("accountsChanged", onAccountsChanged)
        eth.removeListener("chainChanged", onChainChanged)
      }
    }
  }, [walletAddress, handleWalletAddress, handleDisconnectWallet])

  const onConnectWalletHandler = useCallback(async () => {
    const walletResponse = await connectWallet()
    handleWalletAddress(walletResponse.address)
    if (!walletResponse.address && walletResponse.status) {
      NotificationManager.warning(walletResponse.status)
    }
  }, [handleWalletAddress])

  const onDisconnectWalletHandler = async () => {
    await handleDisconnectWallet()
    setMobileOpen(false)
    navigate("/", { replace: true })
    NotificationManager.info("Wallet disconnected")
  }

  const walletLabel = () => {
    if (!hasInjectedWallet) return "Install Wallet"
    if (walletAddress === "") return "Connect Wallet"
    return walletAddress.substring(0, 6) + "..." + walletAddress.substring(38)
  }

  const walletAction = () => {
    if (!hasInjectedWallet) return () => window.open("https://metamask.io/download.html", "_blank")
    if (walletAddress === "") return onConnectWalletHandler
    return onDisconnectWalletHandler
  }

  return (
    <nav className="navBar">
      <div className="navInner">
        {/* Logo */}
        <div className="navLogo" onClick={() => navigate("/home")}>
          <img src={logoImg} alt="Nexora AI" />
          <span className="navBrandName">Nexora AI</span>
        </div>

        {/* Desktop Links */}
        <div className={`navLinks ${mobileOpen ? "navLinksOpen" : ""}`}>
          <NavLink to="/home" className={({ isActive }) => (isActive ? "navLink navLinkActive" : "navLink")} onClick={() => setMobileOpen(false)}>listings</NavLink>
          <NavLink to="/discover" className={({ isActive }) => (isActive ? "navLink navLinkActive" : "navLink")} onClick={() => setMobileOpen(false)}>discovery</NavLink>
          <NavLink to="/intelligence" className={({ isActive }) => (isActive ? "navLink navLinkActive" : "navLink")} onClick={() => setMobileOpen(false)}>intelligence</NavLink>
          <NavLink to="/treasury" className={({ isActive }) => (isActive ? "navLink navLinkActive" : "navLink")} onClick={() => setMobileOpen(false)}>treasury</NavLink>
          <NavLink to="/promote" className={({ isActive }) => (isActive ? "navLink navLinkActive" : "navLink")} onClick={() => setMobileOpen(false)}>promote</NavLink>
          <NavLink to="/listcoin" className={({ isActive }) => (isActive ? "navLink navLinkActive" : "navLink")} onClick={() => setMobileOpen(false)}>list</NavLink>
        </div>

        {/* Right Actions */}
        <div className="navActions">
          <button className="navWalletBtn" onClick={walletAction()}>
            <span aria-hidden="true">&gt;</span>
            {walletAddress ? walletLabel() : "connect"}
          </button>
          {/* Mobile hamburger */}
          <button className="navHamburger" onClick={() => setMobileOpen(!mobileOpen)}>
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </nav>
  )
}

export default NavBar
