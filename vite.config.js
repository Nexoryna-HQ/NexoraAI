const { defineConfig, loadEnv, transformWithEsbuild } = require("vite")
const react = require("@vitejs/plugin-react")

const REACT_APP_KEYS = [
  "REACT_APP_SERVER_URL",
  "REACT_APP_FIREBASE_API_KEY",
  "REACT_APP_FIREBASE_AUTH_DOMAIN",
  "REACT_APP_FIREBASE_DATABASE_URL",
  "REACT_APP_FIREBASE_PROJECT_ID",
  "REACT_APP_FIREBASE_STORAGE_BUCKET",
  "REACT_APP_FIREBASE_MESSAGING_SENDER_ID",
  "REACT_APP_FIREBASE_APP_ID",
  "REACT_APP_FIREBASE_MEASUREMENT_ID",
]

function jsAsJsx() {
  return {
    name: "nexora-js-as-jsx",
    enforce: "pre",
    async transform(code, id) {
      if (!id.includes("/src/") && !id.includes("\\src\\")) return null
      if (!id.endsWith(".js")) return null
      return transformWithEsbuild(code, id, {
        loader: "jsx",
        jsx: "automatic",
      })
    },
  }
}

module.exports = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const define = {}
  for (const key of REACT_APP_KEYS) {
    define[`process.env.${key}`] = JSON.stringify(env[key] || "")
  }

  return {
    plugins: [
      jsAsJsx(),
      react({
        include: "**/*.{js,jsx,ts,tsx}",
      }),
    ],
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          ".js": "jsx",
        },
      },
    },
    envPrefix: "REACT_APP_",
    define,
    server: {
      port: 3000,
      open: false,
    },
    build: {
      outDir: "build",
      sourcemap: false,
    },
  }
})
