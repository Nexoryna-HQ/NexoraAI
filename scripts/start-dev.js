const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")
const { ensureAssets } = require("./ensure-assets")

const root = path.join(__dirname, "..")
const mode = process.argv[2] === "build" ? "build" : "start"

function fail(message) {
  console.error(message)
  process.exit(1)
}

function versionParts(version) {
  return String(version).replace(/^v/, "").split(".").map((part) => parseInt(part, 10) || 0)
}

function isAtLeast(current, minimum) {
  const left = versionParts(current)
  const right = versionParts(minimum)
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] > right[i]
  }
  return true
}

if (!isAtLeast(process.version, "18.19.0")) {
  fail(`Error: Node.js version must be at least 18.19.0. Current version: ${process.version}`)
}

ensureAssets()

const legacyFlag = "--openssl-legacy-provider"
const existing = process.env.NODE_OPTIONS || ""
if (!existing.includes("openssl-legacy-provider")) {
  process.env.NODE_OPTIONS = `${existing} ${legacyFlag}`.trim()
}

process.env.SKIP_PREFLIGHT_CHECK = "true"
process.env.DISABLE_ESLINT_PLUGIN = "true"
if (mode === "build" && !process.env.GENERATE_SOURCEMAP) {
  process.env.GENERATE_SOURCEMAP = "false"
}

const scriptName = mode === "build" ? "build.js" : "start.js"
const reactScripts = path.join(root, "node_modules", "react-scripts", "scripts", scriptName)

if (!fs.existsSync(reactScripts)) {
  fail("Dependencies are missing. Run npm install, then npm start.")
}

const child = spawn(process.execPath, [reactScripts], {
  stdio: "inherit",
  env: process.env,
  cwd: root,
})

child.on("exit", (code) => {
  process.exit(code == null ? 1 : code)
})
