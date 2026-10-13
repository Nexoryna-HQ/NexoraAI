const { spawn } = require("child_process")
const path = require("path")
const { ensureAssets } = require("./ensure-assets")

const root = path.join(__dirname, "..")
ensureAssets()

const children = []

function run(command, args, name) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  })
  child.on("exit", (code, signal) => {
    if (signal) return
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`)
      shutdown(code)
    }
  })
  children.push(child)
  return child
}

function shutdown(code) {
  for (const child of children) {
    if (!child.killed) child.kill()
  }
  process.exit(code)
}

process.on("SIGINT", () => shutdown(0))
process.on("SIGTERM", () => shutdown(0))

run("node", ["app/index.js"], "server")
run("npx", ["vite"], "frontend")
