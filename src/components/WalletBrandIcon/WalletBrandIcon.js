import React from "react"

import metamaskIcon from "../../assets/img/wallets/metamask.svg"
import rabbyIcon from "../../assets/img/wallets/rabby.svg"
import phantomIcon from "../../assets/img/wallets/phantom.svg"
import coinbaseIcon from "../../assets/img/wallets/coinbase.svg"
import braveIcon from "../../assets/img/wallets/brave.svg"
import trustIcon from "../../assets/img/wallets/trust.svg"
import defaultIcon from "../../assets/img/wallets/default.svg"

import "./WalletBrandIcon.css"

const WALLET_ICONS = {
  MetaMask: metamaskIcon,
  Rabby: rabbyIcon,
  Phantom: phantomIcon,
  "Coinbase Wallet": coinbaseIcon,
  "Brave Wallet": braveIcon,
  "Trust Wallet": trustIcon,
  "Browser wallet": defaultIcon,
}

export const getWalletIcon = (name) => WALLET_ICONS[name] || defaultIcon

export const WalletBrandIcon = ({ name, className = "" }) => (
  <span className={`walletBrandIcon ${className}`.trim()}>
    <img src={getWalletIcon(name)} alt="" aria-hidden="true" />
  </span>
)

export default WalletBrandIcon
