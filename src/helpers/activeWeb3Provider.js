/** Active wallet the user connected with (EIP-1193). Used by ethers Web3Provider across the app. */
let activeEip1193Provider = null

export function setActiveEip1193Provider(provider) {
  activeEip1193Provider =
    provider && typeof provider.request === "function" ? provider : null
}

/** Wallet the user chose (null until connect or session restore). */
export function getActiveEip1193Provider() {
  if (
    activeEip1193Provider &&
    typeof activeEip1193Provider.request === "function"
  ) {
    return activeEip1193Provider
  }
  return null
}

/** For ethers / listeners: active wallet, else default browser injection. */
export function getWeb3Eip1193Provider() {
  const active = getActiveEip1193Provider()
  if (active) return active
  if (typeof window !== "undefined" && window.ethereum) {
    return window.ethereum
  }
  return null
}
