import { ethers } from "ethers"
import nitroGemABI from "./abis/abi.json"
import { ENVS } from "./configurations/index"
import { getWeb3Eip1193Provider } from "./activeWeb3Provider"

// Contract can be used to write Contract
export const getContractWithSigner = () => {
  const eth = getWeb3Eip1193Provider()
  const provider = new ethers.providers.Web3Provider(eth)
  const signer = provider.getSigner()
  const contract = new ethers.Contract(ENVS.CONTRACT_ADDRESS, nitroGemABI, signer)
  return contract
}

// Contract can be used to read Contract
export const getContractWithoutSigner = () => {
  const eth = getWeb3Eip1193Provider()
  const provider = new ethers.providers.Web3Provider(eth)
  const contract = new ethers.Contract(ENVS.CONTRACT_ADDRESS, nitroGemABI, provider)
  return contract
}

// VotingManager contract (will be used after deployment)
export const getVotingContractWithSigner = () => {
  if (!ENVS.VOTING_CONTRACT_ADDRESS) return null
  const eth = getWeb3Eip1193Provider()
  const provider = new ethers.providers.Web3Provider(eth)
  const signer = provider.getSigner()
  // VotingManager ABI will be at ./abis/VotingManager.json after running `npm run sync-abi`
  try {
    const votingABI = require("./abis/VotingManager.json")
    return new ethers.Contract(ENVS.VOTING_CONTRACT_ADDRESS, votingABI, signer)
  } catch {
    return null
  }
}

export const getNitrogemAmount = async (walletAddress) => {
  const contract = getContractWithoutSigner()
  try {
    let nitroAmount = await contract.getNitrogemAmount(walletAddress)
    return nitroAmount
  } catch (err) {
    return 0
  }
}
