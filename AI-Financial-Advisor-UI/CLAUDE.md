# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```
npm install       # install dependencies
npm run stage     # run CRA dev server on http://localhost:3033 (hot reload; port comes from PORT=3033 in .env, CRA reads it automatically)
npm run build     # production build into /build
npm start          # serve the production build via server.js (Express), used in deployment
npm test           # CRA/Jest interactive test runner (react-scripts test)
```

To run a single test file: `npm test -- src/App.test.js` (CRA's Jest watcher accepts a path/name filter as an additional arg).

There is no lint script; ESLint runs implicitly through `react-scripts` (config: `react-app` / `react-app/jest` in `package.json`).

## Architecture

This is a Create React App frontend only — there is no backend code in this repo. `server.js` just serves the built `/build` folder via Express (`app.use(express.static(...))` + catch-all route to `index.html`) and exists solely so the app can run as a single Heroku dyno (`Procfile`: `web: node server.js`). `static.json` is present for alternate static-host deployment.

**All real backend logic lives in separate services this repo talks to over the network, with base URLs hardcoded directly in the page components (no central API client/config):**
- `https://advisor-be-fb43f8bbbcbd.herokuapp.com` — the main backend (separate repo/service), hit directly from `Account.js`, `Portfolio.js`, `StockDetails.js`, `LoginPage.js`, `SignUpPage.js`, `TopBar.js`, `AddToPortfolioDialog.js`. Handles auth (`/login`, `/signup`), user details (`/user-details/:email`), portfolio CRUD, and stock data (`/stocks/quote`, `/stocks/overview`, `/stocks/income_statement`, `/stocks/news`, `/stocks/insider_transactions`, `/stocks/top_movers`).
- `http://20.96.194.91:5001/chat` — a separate AI chat/advisor microservice, called directly from `MainContainer.js` and `Portfolio.js` for the conversational Q&A feature.
- `https://www.alphavantage.co/query` — called directly from the frontend (in `MainContainer.js`, `Portfolio.js`, `TopBar.js`) for price time-series and symbol search, with the Alpha Vantage API key hardcoded inline (`API_KEY` const) rather than via env var.

When changing any of these integrations, check every file above — URLs and API shapes are duplicated per-component rather than centralized.

`src/webpages/cosmosClient.js` (Azure Cosmos DB client) is dead code: it is not imported anywhere, `@azure/cosmos` is not a listed dependency, and it contains leftover Python-template strings (`"os.environ.get(...)"`) instead of real config — don't treat it as a working integration.

**Auth** is client-only and not token-based: `AuthContext` (`src/AuthContext.js`) just holds an `isAuthenticated` boolean mirrored to/from `localStorage`. Page components separately stash `email` / `userDetails` in `localStorage` after login and read them back directly (e.g. `Account.js`, `MainContainer.js`, `TopBar.js`) — there's no shared user/session object or auth token attached to requests.

**Routing** (`src/App.js`) gates protected routes purely on `AuthContext.isAuthenticated`: `/`, `/login`, `/signup` are public (redirecting to `/advisor` if already authenticated), while `/advisor`, `/stocks/:symbol`, `/portfolio`, `/dashboard`, `/account` redirect to `/login` when not authenticated. `Sidebar`/`TopBar` chrome only renders when authenticated.

**Pages** live in `src/webpages/` (routed screens: LandingPage, LoginPage, SignUpPage, MainContainer [advisor/chat home], StockDetails, Portfolio, Dashboard, Account), each pairing a `.js` with a same-named `.css` file. Shared chrome/widgets live in `src/components/` (Sidebar, TopBar, SearchBar, AddToPortfolioDialog, and `components/ui/` for generic primitives like Card/Select).

Charts use `lightweight-charts` (`createChart`) for the price chart in `MainContainer.js`/`Portfolio.js`, and `recharts`/`react-circular-progressbar` elsewhere — check which library a page already uses before adding a new charting dependency.
