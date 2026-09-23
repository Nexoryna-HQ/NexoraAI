/**
 * Discover EIP-1193 providers injected by browser extensions (MetaMask, Rabby, Phantom, etc.).
 */

function pushUnique(list, provider) {
  if (!provider || typeof provider.request !== "function") return
  if (!list.includes(provider)) list.push(provider)
}

export function getInjectedEthereumProviders() {
  if (typeof window === "undefined") return []

  const list = []

  const eth = window.ethereum
  if (eth) {
    if (Array.isArray(eth.providers) && eth.providers.length > 0) {
      eth.providers.forEach((p) => pushUnique(list, p))
    } else {
      pushUnique(list, eth)
    }
  }

  const phantomEth = window.phantom?.ethereum
  pushUnique(list, phantomEth)

  return list
}

export function getWalletDisplayName(provider) {
  if (!provider) return "Browser wallet"
  if (provider.isRabby) return "Rabby"
  if (provider.isPhantom) return "Phantom"
  if (provider.isBraveWallet) return "Brave Wallet"
  if (provider.isCoinbaseWallet) return "Coinbase Wallet"
  if (provider.isTrust) return "Trust Wallet"
  if (provider.isMetaMask) return "MetaMask"
  return "Browser wallet"
}

export function describeInjectedWallets() {
  return getInjectedEthereumProviders().map((provider) => ({
    provider,
    name: getWalletDisplayName(provider),
  }))
}
