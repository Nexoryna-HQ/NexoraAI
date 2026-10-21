import detectEthereumProvider from "@metamask/detect-provider"
import { ENVS } from "./configurations/index"
import {
  getActiveEip1193Provider,
  setActiveEip1193Provider,
} from "./activeWeb3Provider"
import { getInjectedEthereumProviders } from "./injectedWallets"

function chainIdMatches(walletChainId) {
  return parseInt(walletChainId, 16) === parseInt(ENVS.CHAIN_ID, 16)
}

/**
 * Ask the wallet to drop eth_accounts permission so the next connect shows
 * the approval UI again (MetaMask / Rabby often require password unlock).
 */
async function revokeEthAccountsPermission(provider) {
  if (!provider?.request) return
  try {
    await provider.request({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    })
  } catch {
    /* Unsupported or already revoked — app disconnect still proceeds */
  }
}

/** Revokes dApp site permission when possible, then clears the active provider. */
export async function disconnectWallet() {
  const active = getActiveEip1193Provider()
  const fallback =
    typeof window !== "undefined" && window.ethereum ? window.ethereum : null
  const target = active || fallback
  await revokeEthAccountsPermission(target)
  setActiveEip1193Provider(null)
}

export const connectWithProvider = async (provider) => {
  if (!provider || typeof provider.request !== "function") {
    return {
      address: "",
      status: "No wallet found",
    }
  }

  try {
    let chainId = await provider.request({ method: "eth_chainId" })

    if (!chainIdMatches(chainId)) {
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: ENVS.CHAIN_ID }],
        })
        chainId = await provider.request({ method: "eth_chainId" })
      } catch (switchErr) {
        return {
          address: "",
          status:
            switchErr?.message ||
            "Switch to the required network in your wallet and try again.",
        }
      }
    }

    if (!chainIdMatches(chainId)) {
      return {
        address: "",
        status: "Wrong network — switch chain in your wallet and retry.",
      }
    }

    const addressArray = await provider.request({
      method: "eth_requestAccounts",
    })

    if (addressArray.length) {
      setActiveEip1193Provider(provider)
      return {
        address: addressArray[0],
        status: "Connected",
      }
    }

    return {
      address: "",
      status: "No wallet connected",
    }
  } catch (err) {
    return {
      address: "",
      status: err?.message || "Connection failed",
    }
  }
}

export const connectWallet = async () => {
  const preferred = getActiveEip1193Provider()
  if (preferred) {
    return connectWithProvider(preferred)
  }
  const injected = getInjectedEthereumProviders()
  if (injected.length === 1) {
    return connectWithProvider(injected[0])
  }
  const detected = await detectEthereumProvider()
  if (detected) {
    return connectWithProvider(detected)
  }
  if (injected.length > 0) {
    return connectWithProvider(injected[0])
  }
  return {
    address: "",
    status: "Can't find web3 provider",
  }
}

async function tryReadConnected(provider) {
  try {
    const addressArray = await provider.request({ method: "eth_accounts" })
    const walletChainId = await provider.request({ method: "eth_chainId" })
    if (addressArray.length && chainIdMatches(walletChainId)) {
      return {
        address: addressArray[0],
        status: "Connected",
      }
    }
  } catch (_) {
    /* ignore */
  }
  return null
}

export const getCurrentWalletConnected = async () => {
  const ordered = []
  const active = getActiveEip1193Provider()
  if (active) ordered.push(active)
  getInjectedEthereumProviders().forEach((p) => {
    if (p && !ordered.includes(p)) ordered.push(p)
  })

  for (const provider of ordered) {
    const found = await tryReadConnected(provider)
    if (found) {
      setActiveEip1193Provider(provider)
      return found
    }
  }

  return {
    address: "",
    status: "Connect wallet",
  }
}
