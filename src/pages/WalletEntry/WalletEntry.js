import React, { useContext, useEffect, useState } from "react"
import { Navigate } from "react-router-dom"

import { AppContext } from "../../context"
import { getCurrentWalletConnected } from "../../helpers/wallet"
import WalletDashboard from "../WalletDashboard/WalletDashboard"

/**
 * Entry route `/`: restore session if possible, then either redirect to `/home` or show wallet-only dashboard.
 */
export const WalletEntry = () => {
  const { walletAddress, handleWalletAddress, allowWalletRestore } = useContext(AppContext)
  const [bootstrapped, setBootstrapped] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (allowWalletRestore) {
        const { address } = await getCurrentWalletConnected()
        if (!alive) return
        handleWalletAddress(address)
      }
      if (!alive) return
      setBootstrapped(true)
    })()
    return () => {
      alive = false
    }
  }, [allowWalletRestore, handleWalletAddress])

  if (!bootstrapped) {
    return (
      <div className="walletConnectBootstrap" aria-busy="true">
        <span className="walletConnectBootstrapText">Loading…</span>
      </div>
    )
  }

  if (walletAddress) {
    return <Navigate to="/home" replace />
  }

  return <WalletDashboard />
}

export default WalletEntry
