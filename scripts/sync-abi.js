/**
 * Copies compiled contract ABIs from Hardhat artifacts to the frontend
 * `src/helpers/abis/` directory so the React app can use them.
 *
 * Usage:  npx hardhat compile && node scripts/sync-abi.js
 */
const fs = require("fs")
const path = require("path")

const CONTRACTS = ["NexoraAI", "VotingManager"]
const ARTIFACTS_DIR = path.join(__dirname, "..", "contracts", "artifacts", "contracts")
const FRONTEND_ABI_DIR = path.join(__dirname, "..", "src", "helpers", "abis")

// Ensure output directory exists
if (!fs.existsSync(FRONTEND_ABI_DIR)) {
  fs.mkdirSync(FRONTEND_ABI_DIR, { recursive: true })
}

for (const name of CONTRACTS) {
  const artifactPath = path.join(ARTIFACTS_DIR, `${name}.sol`, `${name}.json`)

  if (!fs.existsSync(artifactPath)) {
    console.error(`[!] Artifact not found: ${artifactPath}`)
    console.error(`    Run 'npx hardhat compile' first.`)
    process.exit(1)
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"))
  const abi = artifact.abi

  const outPath = path.join(FRONTEND_ABI_DIR, `${name}.json`)
  fs.writeFileSync(outPath, JSON.stringify(abi, null, 2))
  console.log(`[+] ${name} ABI → ${outPath} (${abi.length} entries)`)
}

console.log("\nABI sync complete.")
