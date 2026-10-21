# Nexora AI

Nexora AI is an AI-powered Web3 intelligence platform that makes token discovery faster, smarter, and more transparent.

It brings together community voting, market data, token activity, and on-chain information to generate meaningful insights about emerging tokens. Rather than leaving users to piece together fragmented data by hand, Nexora AI turns complex blockchain and market signals into clear token summaries, community sentiment, trend analysis, and intelligent discovery recommendations.

The platform helps users surface emerging projects, understand community activity, compare token momentum, and make more informed decisions through an intuitive, AI-assisted experience. AI provides analysis and context; users stay fully in control of their wallet actions, votes, purchases, and transactions.

Under the hood, the project is a single repository with three parts that run independently:

- A **React frontend** for browsing, voting, and viewing token analysis.
- An **Express backend** that serves listing data and the AI analysis API.
- A set of **Solidity contracts** (Hardhat) for on-chain credits, tiers, and voting.

---

## Architecture

```
Browser (React 17)
      │  REST
      ▼
Express API ──► AI analysis service ──► OpenAI-compatible provider
      │                 │
      │                 └─► in-memory cache + insight index
      ▼
Firebase Realtime Database (token catalog)

Wallet (MetaMask / Phantom / Rabby) ──► Smart contracts (credits, tiers, voting)
```

The frontend talks to two data sources: the Express API for AI insights and server-side data, and the blockchain directly (via ethers.js) for wallet actions. Token catalog data lives in Firebase Realtime Database.

| Layer | Technology |
|---|---|
| Frontend | React 17, React Router v6, Vite |
| Backend | Express.js, Firebase Realtime Database |
| AI | OpenAI-compatible provider, deterministic caching |
| Blockchain | Solidity 0.8.20, Hardhat, OpenZeppelin, ethers.js v5 |
| Wallets | MetaMask, Phantom, Rabby |
| Networks | Ethereum, BSC (EVM); Solana (configurable) |

---

## Getting started

### Install
```sh
npm install
```

App dependencies are intentionally lean (Vite instead of CRA). Measured install time is typically under 10 seconds with a warm npm cache.

For Solidity tooling only:
```sh
npm run install:contracts
```

### Configure
Copy the example environment file and fill in your values:
```sh
cp .env.example .env
```

Two groups of variables matter:

- **Backend / AI** (no `REACT_APP_` prefix): `AI_PROVIDER`, `OPENAI_KEY`, `OPENAI_MODEL`, `AI_TIMEOUT_MS`, `AI_CACHE_TTL_MS`, `AI_RATE_LIMIT_TOKEN`.
- **Firebase RTDB** (`REACT_APP_FIREBASE_DATABASE_URL` required; other `REACT_APP_FIREBASE_*` keys optional): Realtime Database REST access from the frontend.

Contract addresses and fee settings live in `src/helpers/configurations/index.js`.

### Run app (API + frontend)
```sh
npm start
```
Starts Express on port `8080` and Vite on `http://localhost:3000`.

### Run only the backend
```sh
npm run server
```

---

## Backend API

The Express app mounts each route group defensively — a group that fails to load is skipped and logged rather than crashing the server.

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Liveness check. |
| GET | `/tokens/list` | List tokens. |
| POST | `/tokens/add` | Add a token. |
| POST | `/tokens/del` | Remove a token. |
| GET | `/ai/insights` | Recent cached insight summaries. |
| GET | `/ai/metrics` | AI service metrics. |
| POST | `/ai/discover` | Run a discovery query over listings. |
| GET/POST | `/ai/token/:id` | Analyze a single token. |

---

## Smart contracts

### Compile and test
```sh
npm run compile
npm run test:contracts
```

### Build and sync ABIs to the frontend
```sh
npm run build:contracts
```
Compiles contracts and copies ABIs to `src/helpers/abis/`.

### Deploy
```sh
npm run deploy:local     # local Hardhat network
npm run deploy:sepolia   # Sepolia testnet
npm run deploy:mainnet   # Ethereum mainnet
```
Deployment records are written to `deployments/<network>.json`. Fill in network URLs and accounts in `hardhat.config.js` before deploying to a public network.

### Contract overview
- **NexoraAI.sol** — credit system: `buyCredits()`, `spendCredits(amount, reason)`, `buyRubyTier()`, `buyDiamondTier()`, `withdraw()`, `pause()` / `unpause()`.
- **VotingManager.sol** — on-chain voting: `vote(coinId)`, `votesRemainingToday(address)`, `getVotes(coinId)`, with fees forwarded to the treasury on each vote.

Both contracts use OpenZeppelin's `Ownable`, `ReentrancyGuard`, and `Pausable`.

---

## Project structure
```
contracts/           Solidity contracts (NexoraAI, VotingManager)
test/                Hardhat tests
scripts/             Deploy, ABI sync, dev-server helpers
src/                 React frontend
  pages/             Page components
  components/        Shared UI
  helpers/           Wallet, contract, Firebase, config utilities
    abis/            Contract ABIs (synced from Hardhat)
app/                 Express backend
  routes/            API routes
  controllers/       Request handlers
  services/ai/       AI analysis, caching, provider, logging
hardhat.config.js    Hardhat configuration
```

---

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start the React dev server. |
| `npm run server` | Start the Express API. |
| `npm run build` | Production frontend build. |
| `npm run compile` | Compile Solidity contracts. |
| `npm run test:contracts` | Run contract tests. |
| `npm run build:contracts` | Compile contracts and sync ABIs. |
| `npm run deploy:local` / `:sepolia` / `:mainnet` | Deploy contracts. |
| `npm run sync-abi` | Copy compiled ABIs to the frontend. |
| `npm test` | Run frontend unit tests. |

---

## License

MIT
