const fs = require("fs")
const path = require("path")

const root = path.join(__dirname, "..")

function ensureAssets() {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  )
  const pngFiles = [
    "src/assets/img/emerald.png",
    "src/assets/img/ruby.png",
    "src/assets/img/diamond.png",
    "src/assets/img/nitrogem.png",
    "src/assets/img/watchlisted.png",
    "src/assets/img/nonwatchlisted.png",
    "src/assets/img/poocoin_icon.png",
    "src/assets/img/flight.png",
    "src/assets/img/bsc.png",
    "src/assets/img/Form/openFolder.png",
    "src/assets/img/Form/getListedCoin.png",
    "public/icon.png",
  ]
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#4EB4C3"/></svg>'
  const svgFiles = ["src/assets/img/dextools_icon.svg", "src/assets/img/twitter.svg"]

  for (const file of pngFiles) {
    const full = path.join(root, file)
    if (fs.existsSync(full)) continue
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, png)
  }
  for (const file of svgFiles) {
    const full = path.join(root, file)
    if (fs.existsSync(full)) continue
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, svg)
  }
}

module.exports = { ensureAssets }

if (require.main === module) ensureAssets()
