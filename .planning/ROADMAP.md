# Roadmap: TW Stock Invest

## Overview

Build a cyberpunk-styled Android app for Taiwan stock tracking and AI-powered investment analysis. The build order is dictated by data dependencies: a rate-limit-safe TWSE client must exist before any UI consumes it, AI analysis requires both live quote data and a stored API key, and visual polish is applied last to avoid rework. Ten phases take the project from blank scaffold to a signed APK with full AI analysis, background daily summaries, and price alert notifications.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Project scaffold, architecture layers, SQLite schema, NativeWind cyberpunk theme primitives, gitignore (completed 2026-03-18)
- [ ] **Phase 2: Data Layer** - TWSE OpenAPI client with rate-limit queue, market-hours polling guard, quote stores, non-trading-day handling
- [ ] **Phase 3: Watchlist** - Home screen watchlist with stock search, add/remove, persist to SQLite, price cards
- [ ] **Phase 4: Charts** - Stock detail view with candlestick chart, 5 timeframes, volume bars, smooth Skia rendering
- [ ] **Phase 5: Settings** - Settings page with MiniMax API key input, secure storage, AI model name config
- [ ] **Phase 6: AI Analysis** - AI analysis page with 4 sections (sentiment, technical, recommendation, risk), MiniMax M2.5 integration, swipeable navigation
- [ ] **Phase 7: APK Build** - EAS Build signed Android APK, keystore backup, secret audit, real device verification
- [ ] **Phase 8: Daily Summary** - Background task for 12:30 daily summary generation, SQLite storage with 2-week auto-purge
- [ ] **Phase 9: Price Alerts** - Price alert setup from chart detail page, WorkManager background monitoring, push notifications, alert management screen
- [ ] **Phase 10: Polish** - Sparkline mini charts on watchlist cards, cyberpunk glow animations, responsive layout refinement

## Phase Details

### Phase 1: Foundation
**Goal**: Developer can run the project locally with a working Expo scaffold, correct TypeScript config, defined SQLite schema, NativeWind cyberpunk theme tokens, and a gitignore that permanently excludes secrets
**Depends on**: Nothing (first phase)
**Requirements**: UI-01
**Success Criteria** (what must be TRUE):
  1. `npx expo start` runs without errors on the developer's machine
  2. TypeScript strict mode is enforced and `tsc --noEmit` passes with zero errors on a clean scaffold
  3. NativeWind is configured — a test screen renders with a deep-dark background and at least one neon accent color class
  4. SQLite database initializes on app launch with the correct schema (watchlist table, daily_summaries table)
  5. `.gitignore` includes `.env`, `*.keystore`, and `google-services.json`; no secrets appear in `git status`
**Plans**: 2 plans

Plans:
- [x] 01-01: Expo SDK 55 scaffold with TypeScript strict, NativeWind v4, Zustand v5
- [x] 01-02: SQLite schema initialization and gitignore hardening

### Phase 2: Data Layer
**Goal**: The app can fetch live Taiwan stock quotes safely without triggering the TWSE rate limit, pauses polling outside market hours, and handles non-trading days without crashing
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05
**Success Criteria** (what must be TRUE):
  1. Fetching quotes for 5 stocks in rapid succession fires requests with at least 2-second spacing (observable via network log — no burst requests)
  2. The market open/closed status indicator correctly reads "Open" during 09:00-13:30 Mon-Fri and "Closed" at all other times
  3. On a simulated non-trading day (public holiday), the app shows cached last-known prices rather than crashing or showing blank data
  4. `StockService` rejects any code that would bypass the request queue (unit test verifiable)
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — StockService FIFO queue, TWSE client, marketHours pure functions, unit tests
- [ ] 02-02-PLAN.md — QuoteStore polling lifecycle, _layout.tsx AppState wiring, cache fallback
- [ ] 02-03-PLAN.md — MarketStatusBar component with Reanimated pulse, home screen integration

### Phase 3: Watchlist
**Goal**: Users can build and maintain a personal stock watchlist on the home screen that persists across app restarts and displays live price data on each card
**Depends on**: Phase 2
**Requirements**: WTCH-01, WTCH-02, WTCH-03, WTCH-04, WTCH-05
**Success Criteria** (what must be TRUE):
  1. User can type "2330" or "台積電" in the search field and see matching results from TWSE
  2. User can add a stock from search results and immediately see it appear on the home screen watchlist
  3. User can remove a stock from the watchlist and it disappears immediately and stays gone after app restart
  4. Each watchlist card shows stock name, code, current price, and price change (absolute delta and percent) that updates with each poll
  5. Watchlist data (selected stocks) survives app close and reopen — the same stocks appear on next launch
**Plans**: TBD

Plans:
- [ ] 03-01: WatchlistStore, SQLite persistence layer, add/remove logic
- [ ] 03-02: HomeScreen with FlatList, StockCard component, search modal

### Phase 4: Charts
**Goal**: Users can tap any watchlist stock to see a detailed candlestick chart with volume bars across 5 timeframes, rendered smoothly without SVG performance issues
**Depends on**: Phase 3
**Requirements**: CHRT-01, CHRT-02, CHRT-03, CHRT-04
**Success Criteria** (what must be TRUE):
  1. Tapping a stock on the watchlist navigates to a detail view showing a candlestick chart for that stock
  2. Tapping each of the 5 timeframe buttons (1D, 5D, 1M, 6M, 1Y) loads and renders the correct historical data
  3. Volume bars are visible below the price chart for all timeframes
  4. Scrolling through 240+ candles on the 1Y chart maintains smooth animation with no visible jank on a mid-range Android device
**Plans**: TBD

Plans:
- [ ] 04-01: TWSE historical data endpoints integration and multi-timeframe data fetch
- [ ] 04-02: DetailScreen with react-native-wagmi-charts candlestick and react-native-gifted-charts volume bars

### Phase 5: Settings
**Goal**: Users can store their MiniMax API key securely so the AI analysis feature can function, with the key never appearing in plaintext in any file or log
**Depends on**: Phase 1
**Requirements**: SETT-01, SETT-02, SETT-03, SETT-04, SETT-05
**Success Criteria** (what must be TRUE):
  1. User can open Settings by tapping the top-right icon on the home screen
  2. User can type a MiniMax API key and save it — the key persists after app restart
  3. User can update the AI model name (default shown as "MiniMax-M2.5")
  4. The stored API key cannot be found in plaintext in the SQLite database or any local file (only in expo-secure-store keychain)
  5. All required API configuration fields are present on the settings screen
**Plans**: TBD

Plans:
- [ ] 05-01: expo-secure-store integration, settings schema, SettingsStore
- [ ] 05-02: SettingsScreen UI with API key input, model name field, save/load logic

### Phase 6: AI Analysis
**Goal**: Users can swipe left from the home screen to see AI-powered investment analysis for all watchlist stocks, grounded in real TWSE data, with no hallucinated figures
**Depends on**: Phase 4, Phase 5
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, AI-08, UI-02
**Success Criteria** (what must be TRUE):
  1. Swiping left from the home screen reveals the AI analysis page; swiping right returns to home — no tab bar visible
  2. The AI analysis page shows one analysis section per watchlist stock
  3. Each stock's analysis section shows a bullish/bearish sentiment score based on news, a plain-language technical summary, a Buy/Hold/Sell recommendation with reasoning, and a risk score with explanation
  4. The analysis for a stock contains the actual current price and price change figures sourced from TWSE (not fabricated by the model) — verifiable by comparing to watchlist card values
  5. A "Not financial advice" disclaimer is visible on the AI analysis page
  6. When no API key is configured, the AI page prompts the user to add a key in Settings rather than showing an error
**Plans**: TBD

Plans:
- [ ] 06-01: AIService (minimaxApi.ts) with structured prompt construction and typed response parsing
- [ ] 06-02: AIScreen layout with four analysis sections per stock, loading skeleton, error handling
- [ ] 06-03: PagerView swipeable navigation container (home <-> AI analysis) and UI-02 gesture setup

### Phase 7: APK Build
**Goal**: A signed, installable Android APK is produced that passes a secret audit — no API keys or credentials are embedded in the bundle
**Depends on**: Phase 6
**Requirements**: UI-04
**Success Criteria** (what must be TRUE):
  1. `eas build -p android --profile preview` completes without errors and produces a downloadable `.apk` file
  2. The APK installs and runs on a real Android device (not just emulator)
  3. A grep of the APK's extracted bundle files finds no MiniMax API key string
  4. The keystore file is backed up outside the repository
**Plans**: TBD

Plans:
- [ ] 07-01: EAS Build config, app signing, APK production and real-device smoke test
- [ ] 07-02: Security audit — source grep for secrets, APK inspection, keystore backup verification

### Phase 8: Daily Summary
**Goal**: The app automatically generates and stores a daily AI market summary at 12:30 Taiwan time, purging entries older than 2 weeks, with a manual fallback trigger
**Depends on**: Phase 6
**Requirements**: SUMM-01, SUMM-02, SUMM-03, SUMM-04
**Success Criteria** (what must be TRUE):
  1. With the app backgrounded during market hours, a new daily summary row appears in the SQLite database for the current date between 12:25 and 13:05 (accounting for Android background task timing imprecision)
  2. The stored summary includes data for all currently watched stocks plus the overall TWSE index
  3. After inserting a summary, any rows older than 14 days are automatically deleted — observable via SQLite inspector
  4. Tapping a "Generate Summary Now" button manually triggers summary generation when automatic scheduling fails
**Plans**: TBD

Plans:
- [ ] 08-01: SummaryService with AI summary generation, SQLite insert, and 14-day auto-purge
- [ ] 08-02: expo-background-task registration with time-window check and manual trigger button

### Phase 9: Price Alerts
**Goal**: Users can set a target price on any stock from its chart detail page and receive a push notification when that price is crossed, with all active alerts persisted and manageable
**Depends on**: Phase 4, Phase 8
**Requirements**: ALRT-01, ALRT-02, ALRT-03, ALRT-04, ALRT-05, ALRT-06, ALRT-07
**Success Criteria** (what must be TRUE):
  1. User can tap the alert icon on the chart detail page, enter a target price, and confirm — the alert appears immediately in the active alerts list
  2. When the app is backgrounded and a watched stock crosses the target price, a push notification arrives on the device (observable on a real device with the app in background)
  3. On first alert creation, the app shows a prompt asking the user to disable Android battery optimization, linking to system settings
  4. Alerts for all watched stocks survive app restart — after reopening, the same alerts are present and continue monitoring
  5. From the alert management screen, user can view all active alerts and delete any one of them; deleted alerts stop triggering notifications
**Plans**: TBD

Plans:
- [ ] 09-01: AlertStore, SQLite alerts table, CRUD operations, AlertService with WorkManager-backed background price check
- [ ] 09-02: Alert icon + setup modal on DetailScreen, battery optimization prompt, AlertsScreen (management list)

### Phase 10: Polish
**Goal**: The watchlist home screen gains sparkline mini charts for at-a-glance price trends, and the overall UI is refined to be responsive across different Android screen sizes
**Depends on**: Phase 9
**Requirements**: WTCH-06, UI-03
**Success Criteria** (what must be TRUE):
  1. Each watchlist card displays a small sparkline chart showing the current day's price trend without replacing the price/delta text
  2. The app layout displays correctly without overflow or truncation on a 5-inch phone screen (e.g. 1080x1920) and a 6.7-inch phone screen (e.g. 1080x2400)
  3. Cyberpunk neon glow animations pulse on price updates (observable as a brief color flash on the price value)
**Plans**: TBD

Plans:
- [ ] 10-01: Sparkline mini chart component integrated into StockCard
- [ ] 10-02: Responsive layout audit, neon glow animation on price update, final visual polish pass

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10

Note: Phase 5 (Settings) depends only on Phase 1 and can be built in parallel with Phases 2-4 if desired. Phase 6 (AI) requires both Phase 4 and Phase 5 to be complete. Phase 9 (Price Alerts) requires both Phase 4 (chart detail page) and Phase 8 (background task infrastructure).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete   | 2026-03-18 |
| 2. Data Layer | 0/3 | Not started | - |
| 3. Watchlist | 0/2 | Not started | - |
| 4. Charts | 0/2 | Not started | - |
| 5. Settings | 0/2 | Not started | - |
| 6. AI Analysis | 0/3 | Not started | - |
| 7. APK Build | 0/2 | Not started | - |
| 8. Daily Summary | 0/2 | Not started | - |
| 9. Price Alerts | 0/2 | Not started | - |
| 10. Polish | 0/2 | Not started | - |
