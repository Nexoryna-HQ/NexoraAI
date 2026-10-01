import { ethers } from "ethers"
import { getContractWithSigner } from "./contract"

export const buyNitrogem = async (walletAddress, nitrogemAmount, bnbAmount) => {
  const contract = getContractWithSigner()

  try {
    let txhash = await contract.buyNitrogem(nitrogemAmount, {
      value: ethers.utils.parseUnits(bnbAmount, 18),
      from: walletAddress,
    })
    let res = await txhash.wait()

    if (res.transactionHash) {
      return {
        success: true,
        status: "Successfully bought.",
      }
    } else {
      return {
        success: false,
        status: "Buy Transaction failed.",
      }
    }
  } catch (e) {
    return {
      success: false,
      status: e.message,
    }
  }
}

export const buyRubyTier = async (walletAddress, bnbAmount) => {
  const contract = getContractWithSigner()

  try {
    let txhash = await contract.buyRubyTier({
      value: ethers.utils.parseUnits(bnbAmount, 18),
      from: walletAddress,
    })
    let res = await txhash.wait()

    if (res.transactionHash) {
      return {
        success: true,
        status: "Successfully bought.",
      }
    } else {
      return {
        success: false,
        status: "Buy Transaction failed.",
      }
    }
  } catch (e) {
    return {
      success: false,
      status: e.message,
    }
  }
}

export const buyDiamondTier = async (walletAddress, bnbAmount) => {
  const contract = getContractWithSigner()

  try {
    let txhash = await contract.buyDiamondTier({
      value: ethers.utils.parseUnits(bnbAmount, 18),
      from: walletAddress,
    })
    let res = await txhash.wait()

    if (res.transactionHash) {
      return {
        success: true,
        status: "Successfully bought.",
      }
    } else {
      return {
        success: false,
        status: "Buy Transaction failed.",
      }
    }
  } catch (e) {
    console.log(e, "buy diamond tier")
    return {
      success: false,
      status: e.message,
    }
  }
}

export const voteWithNitrogem = async (walletAddress, nitroAmount) => {
  const contract = getContractWithSigner()

  try {
    let txhash = await contract.voteWithNitrogem(nitroAmount, {
      from: walletAddress,
    })
    let res = await txhash.wait()

    if (res.transactionHash) {
      return {
        success: true,
        status: "Successfully added.",
      }
    } else {
      return {
        success: false,
        status: "Add Transaction failed.",
      }
    }
  } catch (e) {
    return {
      success: false,
      status: e.message,
    }
  }
}
