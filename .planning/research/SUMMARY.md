# Project Research Summary

**Project:** Taiwan Stock Investment Android App
**Domain:** Personal-use Android mobile app — Taiwan stock watchlist with cyberpunk UI and AI-powered analysis
**Researched:** 2026-03-18
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a personal-use Android app for tracking Taiwan Stock Exchange (TWSE) listed stocks with a cyberpunk neon aesthetic and MiniMax M2.5-powered investment analysis. Experts build this class of app on Expo SDK 55 (React Native 0.83, New Architecture mandatory) with file-based routing via Expo Router and Zustand for state management. The combination of TWSE OpenAPI for free real-time data, react-native-wagmi-charts for candlestick rendering, and MiniMax's OpenAI-compatible API makes the full feature set achievable without a backend server or paid data subscription.

The recommended approach is a strict layered architecture: screens read only from Zustand stores, stores are populated by typed service modules (StockService, AIService, SummaryService), and external I/O is isolated from the UI entirely. This separation makes the TWSE rate-limit problem manageable (the request queue lives in StockService, not scattered across components) and makes the AI prompt construction testable. The build-order mandate is data layer first, stores second, screens third, charts fourth, AI fifth, background tasks last, visual polish last.

The three highest risks are: (1) TWSE rate-limit IP bans from concurrent requests — prevent with a serial request queue with 2-second spacing built in Phase 1 before any multi-stock testing; (2) AI hallucination of financial figures — prevent by injecting all TWSE-sourced data into every MiniMax prompt and never asking the model to recall prices; (3) chart performance degradation at 240+ candles — prevent by choosing react-native-wagmi-charts (Reanimated-based, not SVG) from the start and never switching libraries mid-project.

## Key Findings

### Recommended Stack

Expo SDK 55 is the unambiguous choice for a new React Native project in 2026. SDK 55 mandates New Architecture (Fabric + JSI), includes React 19.2 and React Native 0.83, and eliminates Gradle/CocoaPods setup via managed workflow. All required native modules (expo-sqlite, expo-linear-gradient, react-native-reanimated, react-native-gesture-handler) have first-party or well-maintained Expo packages. EAS Build with `eas build -p android --profile preview` produces installable APKs on the free tier (30 builds/month). NativeWind v4 stable (Tailwind v3) is the safe styling choice; NativeWind v5 preview (Tailwind v4.1) is available but carries unknown stability risk.

**Core technologies:**
- Expo SDK 55 + React Native 0.83: project scaffold and build tooling — only sane choice for a new personal project in 2026; New Architecture required
- TypeScript 5.8 (strict): type safety throughout — matches user's existing TS skill; scaffolded by default with Expo SDK 55
- Expo Router v4: file-based navigation and swipeable pages — replaces React Navigation boilerplate, URL-first design
- Zustand v5: app-wide state (watchlist, quote cache, AI results, UI) — 2KB, no provider boilerplate, works with React 19
- react-native-wagmi-charts v2.8.3: candlestick + line charts — only actively maintained RN library with native candlestick support, Reanimated-powered
- react-native-gifted-charts v1.4.57: volume bar charts supplementing wagmi-charts — more active development, does not have candlestick support
- expo-sqlite v55: local SQLite for daily summaries — first-party, JSI-based (WAL mode default), auto-purge queries trivial
- NativeWind v4.1 + Tailwind v3: cyberpunk dark theme utilities — enables arbitrary neon color classes; v5 is too early
- react-native-reanimated v3 + react-native-gesture-handler v2: animations and swipe gestures — required peer deps for wagmi-charts; also powers cyberpunk glow pulses
- Native fetch: TWSE OpenAPI polling and MiniMax API calls — no axios needed for low-frequency REST polling
- EAS Build (`eas-cli`): APK generation — free tier sufficient for personal use

### Expected Features

No existing Taiwan stock app combines watchlist tracking, multi-timeframe candlestick charts, and genuine AI analysis (not screener scores) in a gesture-first cyberpunk interface. The AI analysis page is the core differentiator — competitors (Yahoo股市, 三竹股市) have no comparable feature.

**Must have (table stakes):**
- Stock watchlist with add/remove — entry point to all other features; persist in SQLite
- Real-time TWSE quotes via 20-30s polling — core data feed; market hours Mon-Fri 09:00-13:30
- Price change display (delta + percent) — bare minimum market data
- Price chart with 1D/5D/1M/6M/1Y timeframes — universal expectation for stock apps
- Volume bars below price chart — standard in every chart view
- Stock search (by code or name) — required for watchlist management
- Market open/closed status indicator — users must know if data is live or stale
- Settings page with MiniMax API key input — required before AI features can function

**Should have (differentiators):**
- AI analysis page (swipe-left gesture): sentiment + technical + recommendation + risk — core value proposition, no competitor has this
- News sentiment analysis via AI — higher-value than raw headline lists
- Technical analysis summary via AI (RSI, MACD explained in plain language) — avoids full visual indicator panel complexity
- Investment recommendation with reasoning and disclaimer — the primary reason to build this app
- Cyberpunk dark UI with neon accents — aesthetic differentiation, memorable and unique for Taiwan market
- Daily market summary (auto-generated at 12:30, stored in SQLite) — offline reference value; add at v1.x after core is stable
- Swipeable navigation (home <-> AI analysis, no tab bar) — clean gesture-first UX
- Sparkline miniature chart on watchlist cards — glanceability improvement

**Defer (v2+):**
- Push notifications / price alerts — requires background service, Android notification channels, battery impact
- Additional technical indicator overlays (MACD, RSI visual) — AI narration already covers this
- Portfolio tracking / P&L calculation — separate accounting system, explicitly out of scope
- iOS support — doubles QA, no stated need
- Home screen widget — only justified if manual app-open proves annoying
- Stock screener / filter — separate product category

### Architecture Approach

The architecture is a three-layer design: Presentation (screens + PagerView container), Service (StockService, AIService, SummaryService), and Data (TWSE OpenAPI, MiniMax API, SQLite). Screens never call `fetch()` or database methods directly — they read from Zustand stores, which are populated by service modules. This makes the TWSE rate-limit protection enforceable at a single point (StockService request queue) and makes AI prompt engineering testable without running the app. Background task scheduling (expo-background-task) is isolated in a `tasks/` directory because it runs outside the React lifecycle.

**Major components:**
1. PagerView container — swipeable navigation between HomeScreen, DetailScreen (charts), AIScreen; no React Navigation stack needed for main flow
2. WatchlistStore + QuoteStore (Zustand) — source of truth for watched tickers and live quote cache; QuoteStore owns the polling lifecycle (start/stop on market hours)
3. StockService (twseApi.ts) — abstracts all TWSE HTTP calls; normalizes response shape; enforces 2-second serial request queue; throws typed errors
4. AIService (minimaxApi.ts) — assembles structured prompt from TWSE data + news; calls MiniMax M2.5; parses response into typed sections (sentiment, technical, advice, risk)
5. SummaryService + expo-background-task — daily summary generation at ~12:30 Taiwan time; writes to SQLite; purges rows older than 14 days after each insert
6. SQLite DB (expo-sqlite) — stores daily AI summaries with normalized columns (date, stock_code, summary_text, generated_at); never stores raw API blobs

### Critical Pitfalls

1. **TWSE rate-limit IP ban** — enforce a serial request queue with 2-second minimum spacing in StockService from day one; never fire parallel requests for watchlist stocks; this must be in place before any multi-stock testing in Phase 1
2. **AI hallucinating specific financial figures** — never ask MiniMax to recall prices, P/E, or indicators; always inject TWSE-sourced values in the prompt; calculate RSI/MACD client-side and pass the values; add "not financial advice" disclaimer in UI
3. **Charting performance at 240+ candles** — use react-native-wagmi-charts (Reanimated-based) not an SVG chart library; test on a real mid-range Android device, not the emulator; switching chart libraries after building interactions requires a full component rewrite
4. **TWSE empty/null data on non-trading days** — always null-check `Array.isArray(data) && data.length > 0` before chart rendering; show last-known prices from SQLite cache with "Market closed" badge; Taiwan has ~15-20 non-weekend holidays annually
5. **Hardcoded API key in APK** — MiniMax key must only ever live in user Settings persisted to expo-secure-store; `EXPO_PUBLIC_` env vars are embedded in the bundle and extractable; add `.env` and `*.keystore` to `.gitignore` on day one; no default or fallback key in source

## Implications for Roadmap

Based on combined research, the build-order is dictated by two constraints: (1) all later features depend on the TWSE data layer being stable and rate-limit-safe; (2) AI features depend on both quote data (for context injection) and Settings (for API key). Seven phases are suggested.

### Phase 1: Foundation and API Integration

**Rationale:** Everything else depends on a working, rate-limit-safe TWSE client and secure API key storage. These must be correct before any UI or multi-stock testing. Architecture mandates data layer first.
**Delivers:** Expo project scaffold, TypeScript config, TWSE OpenAPI client with serial request queue, expo-secure-store integration for MiniMax key, SQLite schema, Zustand WatchlistStore + QuoteStore wired to TWSE service, `.gitignore` with `.env` and `*.keystore` excluded.
**Addresses:** Stock search, add/remove stock, real-time quote polling (core data feed), SQLite persistence.
**Avoids:** TWSE rate-limit IP ban (request queue built first); hardcoded API key (secure storage from day one); null data on non-trading days (defensive null-checks in service layer).

### Phase 2: Watchlist Home Screen (Core Loop)

**Rationale:** HomeScreen is the primary daily-driver value. With data layer ready, building the watchlist UI completes the core user loop. Market-hours polling logic and background polling pause also live here.
**Delivers:** HomeScreen with live-updating watchlist, StockCard components with price/delta/percent display, market open/closed status indicator, OTC vs TWSE stock routing (TPEx API for 3xxx/6xxx codes), background polling pause on app-background event.
**Uses:** QuoteStore, WatchlistStore, NativeWind cyberpunk theme, react-native-reanimated for card glow.
**Avoids:** Battery drain from unconditional polling (market-hours guard + background pause); OTC stock misrouting (TPEx endpoint detection in StockService).

### Phase 3: Chart Detail View

**Rationale:** Chart view is the second most expected feature. Must be implemented after Phase 2 confirms quote data shape. Chart library choice is architectural — changing it after this phase requires a full component rewrite.
**Delivers:** DetailScreen with multi-timeframe candlestick + volume chart (1D/5D/1M/6M/1Y), lazy timeframe loading, ex-dividend annotations on chart, memoized chart data to prevent re-render on parent state changes.
**Uses:** react-native-wagmi-charts (candlestick), react-native-gifted-charts (volume bars), react-native-svg, expo-linear-gradient for area fills.
**Avoids:** SVG chart performance cliff at 240+ candles (wagmi-charts is Reanimated-based); ex-dividend price confusion (chart annotations + ex-date context prepared for Phase 4 AI prompts).

### Phase 4: AI Analysis Page

**Rationale:** AI features depend on stable quote data (Phase 1-2) and require the Settings page for API key. The core differentiator of the app — implement only after data foundation is solid so AI receives accurate context.
**Delivers:** AIScreen with four sections (news sentiment, technical summary, recommendation, risk assessment), AIService prompt construction with grounded TWSE data injection, client-side RSI/MACD calculation passed as values to AI, loading skeleton/animation, graceful fallback for API errors, Settings page with MiniMax API key (expo-secure-store), first-launch API key prompt.
**Implements:** AIStore, AIService (minimaxApi.ts), SettingsModal.
**Avoids:** AI hallucinating prices (all figures injected from TWSE); missing API key UX (first-launch detection); concurrent AI requests (button disabled during fetch).

### Phase 5: APK Build and Security Hardening

**Rationale:** Before the app is used for real investment decisions, security must be verified and a signed APK must be produced. This is also the right time to verify TWSE rate-limit behavior under real multi-stock usage.
**Delivers:** Signed release APK via `eas build -p android --profile preview`, keystore backup documented in password manager, security audit (`grep` source for secrets, `apktool` APK inspection), end-to-end test on a real mid-range Android device (chart FPS, polling behavior, non-trading-day simulation).
**Avoids:** Keystore loss (backup immediately after creation); API key exposure in APK (final verification); chart performance issues discovered only in production.

### Phase 6: Daily Summary and Background Task (v1.x)

**Rationale:** Background task scheduling is the most complex remaining feature and depends on the AI service being stable. Deliberately deferred after core app is proven in daily use, as expo-background-task has known timing imprecision on Android.
**Delivers:** SummaryService with daily AI summary generation at ~12:30 Taiwan time, expo-background-task registration with in-task time-window check (12:25-13:00 window check, not exact-time reliance), SQLite insert with immediate 14-day purge, manual "Generate Summary" button as fallback.
**Implements:** SummaryService, summaryRepository, dailySummaryTask.
**Avoids:** Exact-time scheduling assumption (15-minute interval + time-window check); unbounded SQLite growth (purge on every insert).

### Phase 7: Polish and UX Refinements (v1.x)

**Rationale:** Visual polish and UX improvements are applied last — after functional correctness is confirmed. This prevents rework if underlying data or component structure changes.
**Delivers:** Sparkline miniature charts on watchlist cards, cyberpunk neon glow animations on price change (react-native-reanimated), "Market closed — prices as of [datetime]" badge with cached data, refined loading states across all screens, "AI analysis is for reference only. Not financial advice." disclaimer.
**Addresses:** Glanceable price data density (sparklines); non-trading-day UX polish (cache badge); AI disclaimer visibility.

### Phase Ordering Rationale

- Phases 1-2 before everything else: TWSE rate-limit protection and null-data guards are load-bearing. Every later feature calls the TWSE client.
- Phase 3 before Phase 4: AI analysis prompt includes ex-dividend context prepared in chart phase; and stable quote data shape is confirmed by Phase 3.
- Phase 4 (AI) before Phase 5 (build): Security audit covers the AI API key storage, which is implemented in Phase 4.
- Phase 6 (background task) last before polish: Background task depends on both StockService and AIService being stable; failure here does not block daily use.
- Phase 7 (polish) always last: No functional dependency; prevents rework.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** TWSE OpenAPI endpoint selection — 143 endpoints exist but the TWSE MCP server only documents 35; research needed on correct endpoints for OHLCV history by timeframe (1D/5D/1M/6M/1Y) and the ex-dividend endpoint path
- **Phase 4:** News data source decision — MarketAux free tier vs FinMind vs RSS scraping; this is the highest-risk unresolved dependency; AI sentiment analysis is hollow without news headlines
- **Phase 4:** MiniMax M2.5 prompt engineering — structured output format for four analysis sections needs iteration; response parsing strategy needs prototyping
- **Phase 6:** expo-background-task Android reliability — community reports on whether WorkManager fires reliably on Android battery-saver mode need checking before committing to the 12:30 auto-generation feature

Phases with standard patterns (skip additional research):
- **Phase 2:** Watchlist UI patterns are well-documented in React Native FlatList + Zustand examples; no exotic requirements
- **Phase 3:** react-native-wagmi-charts and react-native-gifted-charts have adequate documentation for the required chart types; Reanimated integration is standard
- **Phase 5:** EAS Build APK process is fully documented by Expo; APK signing and keystore management are standard Android patterns
- **Phase 7:** NativeWind utility classes and Reanimated animation patterns are well-documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Expo SDK 55 verified via official changelog (2026-02-25 release); all library versions confirmed via official docs and npm; one caveat: react-native-wagmi-charts has slow maintenance pace (MEDIUM for long-term support) |
| Features | MEDIUM | Competitor analysis based on Play Store listings and public descriptions; TWSE API capabilities confirmed via official Swagger; MiniMax capabilities confirmed via official docs; news source decision (MarketAux vs FinMind) is unresolved |
| Architecture | HIGH | Patterns are standard React Native service/store/screen separation; Zustand polling pattern is well-documented; expo-background-task timing behavior confirmed via official Expo blog post |
| Pitfalls | MEDIUM | TWSE rate limit (3 req/5s) confirmed via twstock Python library docs; MiniMax hallucination rates are industry estimates (7-30%), not app-specific measurements; background task Android reliability is a known issue but exact behavior on target devices is unverified |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **News data source:** MarketAux free tier (80 requests/day), FinMind (600 req/hr with token), and RSS scraping are all viable but unvalidated for Taiwan stock news quality and latency. Must resolve before Phase 4 begins — AI sentiment analysis requires real news input.
- **TWSE historical endpoint paths:** The official Swagger lists 143 endpoints but only a subset are documented by community tools. The exact endpoint for 1-year OHLCV history by stock code needs confirmation during Phase 1 implementation.
- **react-native-wagmi-charts maintenance risk:** Last significant activity in 2025; 58 open issues. If the library becomes unmaintained before the project completes, Victory Native XL (Skia-based) is the fallback, but it lacks candlestick support — requiring a different charting approach.
- **expo-background-task on Android battery-saver:** Background task timing is officially "best effort" — on devices with aggressive battery management (common in Taiwan market, e.g., Xiaomi, OPPO), the 12:30 daily summary may not fire reliably. A manual trigger button is a required fallback, not optional.
- **TPEx OTC stock support:** The PITFALLS research identifies that OTC stocks (TPEx exchange) require `tpex.org.tw/openapi/` instead of TWSE endpoints. Stock code routing logic (TWSE vs TPEx based on code prefix) needs to be designed in Phase 1 but is not yet specified in detail.

## Sources

### Primary (HIGH confidence)
- Expo SDK 55 changelog — https://expo.dev/changelog/sdk-55 — React Native 0.83, New Architecture mandatory, release date 2026-02-25
- Expo SDK reference — https://docs.expo.dev/versions/latest/ — SDK 55, RN 0.83, React 19.2
- Expo APK build docs — https://docs.expo.dev/build-reference/apk/ — EAS JSON config for APK output
- Expo SQLite docs — https://docs.expo.dev/versions/latest/sdk/sqlite/ — Tagged template literal API, JSI, WAL mode
- expo-background-task official docs — https://docs.expo.dev/versions/latest/sdk/background-task/
- Expo blog: goodbye background-fetch — https://expo.dev/blog/goodbye-background-fetch-hello-expo-background-task
- zustand v5 announcement — https://pmnd.rs/blog/announcing-zustand-v5
- TWSE OpenAPI — https://openapi.twse.com.tw/ — Free, no auth, 143 endpoints, ~20s delay

### Secondary (MEDIUM confidence)
- react-native-wagmi-charts GitHub — https://github.com/coinjar/react-native-wagmi-charts — v2.8.3, candlestick support, Reanimated-based
- react-native-gifted-charts npm — v1.4.57, active development through 2025
- NativeWind docs — https://www.nativewind.dev/ — v4 stable (Tailwind v3), v5 preview (Tailwind v4.1)
- MiniMax M2.5 official announcement — https://www.minimax.io/news/minimax-m25 — 204k context, finance training
- MiniMax API models docs — https://platform.minimax.io/docs/guides/models-intro
- TWSE MCP Server by twjackysu — https://github.com/twjackysu/TWSEMCPServer — 35/143 endpoints documented
- FinMind API — https://finmind.github.io/ — 50+ Taiwan financial datasets, 600 req/hr with token
- twstock Python library docs — https://github.com/mlouielu/twstock — TWSE rate limit: 3 req/5s confirmed
- React Native chart library comparison — https://blog.logrocket.com/top-react-native-chart-libraries/
- react-native-pager-view GitHub — https://github.com/callstack/react-native-pager-view

### Tertiary (LOW confidence)
- MarketAux free news API — https://www.marketaux.com — Taiwan stock news coverage unvalidated
- AI hallucination rates in financial services — BayTech/BizTech industry estimates (7-30%) — not app-specific
- Android battery quality enforcement 2026 — https://android-developers.googleblog.com/2026/03/battery-technical-quality-enforcement.html — background task impact on app quality score

---
*Research completed: 2026-03-18*
*Ready for roadmap: yes*
