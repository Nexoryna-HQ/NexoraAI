const hre = require("hardhat")

async function main() {
  const [deployer] = await hre.ethers.getSigners()

  console.log("Deploying contracts with account:", deployer.address)
  console.log("Account balance:", (await deployer.getBalance()).toString())

  // --- Configuration ---
  // Treasury address — update this before deploying to mainnet
  const TREASURY_ADDRESS = deployer.address // defaults to deployer; change for production

  // --- Deploy Nexora AI ---
  console.log("\n--- Deploying Nexora AI ---")
  const NexoraAI = await hre.ethers.getContractFactory("NexoraAI")
  const nitroGem = await NexoraAI.deploy(TREASURY_ADDRESS)
  await nitroGem.deployed()
  console.log("Nexora AI deployed to:", nitroGem.address)

  // --- Deploy VotingManager ---
  console.log("\n--- Deploying VotingManager ---")
  const VotingManager = await hre.ethers.getContractFactory("VotingManager")
  const votingManager = await VotingManager.deploy(TREASURY_ADDRESS)
  await votingManager.deployed()
  console.log("VotingManager deployed to:", votingManager.address)

  // --- Summary ---
  console.log("\n========================================")
  console.log("  Deployment Summary")
  console.log("========================================")
  console.log("  Network:        ", hre.network.name)
  console.log("  Deployer:       ", deployer.address)
  console.log("  Treasury:       ", TREASURY_ADDRESS)
  console.log("  Nexora AI:      ", nitroGem.address)
  console.log("  VotingManager:  ", votingManager.address)
  console.log("========================================\n")

  // --- Write deployment info to file ---
  const fs = require("fs")
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    treasury: TREASURY_ADDRESS,
    contracts: {
      "Nexora AI": nitroGem.address,
      VotingManager: votingManager.address,
    },
    timestamp: new Date().toISOString(),
  }

  const deployDir = "./deployments"
  if (!fs.existsSync(deployDir)) fs.mkdirSync(deployDir, { recursive: true })
  fs.writeFileSync(
    `${deployDir}/${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  )
  console.log(`Deployment info saved to ${deployDir}/${hre.network.name}.json`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
