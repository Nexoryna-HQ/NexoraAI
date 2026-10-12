const nodeVersion = process.version.replace(/^v/, "")
const minVersion = "18.19.0"

function parse(version) {
  return version.split(".").map((part) => parseInt(part, 10) || 0)
}

function isAtLeast(current, minimum) {
  const left = parse(current)
  const right = parse(minimum)
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] > right[i]
  }
  return true
}

if (!isAtLeast(nodeVersion, minVersion)) {
  console.error(
    `Error: Node.js version must be at least ${minVersion}. Current version: v${nodeVersion}`
  )
  process.exit(1)
}

console.log("Environment check passed.")
