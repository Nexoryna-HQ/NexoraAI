import React, { useContext } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { AppContext } from "../../context"

/**
 * Redirects to home until the user has connected a wallet (address in context).
 */
export function RequireWallet({ children }) {
  const { walletAddress } = useContext(AppContext)
  const location = useLocation()

  if (!walletAddress) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return children
}

export default RequireWallet
