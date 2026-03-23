---
phase: 11-ai-intelligence-layer
verified: 2026-03-23T00:00:00Z
status: passed
score: 19/19 must-haves verified
gaps: []
human_verification:
  - test: "PatternCard renders below volume bars on the actual device"
    expected: "When viewing a stock detail screen with sufficient candle history, the appropriate candlestick pattern name, Chinese explanation, and colored signal pill appear below the volume bars"
    why_human: "Pattern detection requires real OHLCV data in a specific shape; test fixtures confirm the logic is correct but real-market data rendering requires visual inspection"
  - test: "Portfolio 5th swipe page is reachable by swiping from Summary page"
    expected: "Swiping left from the Summary (4th) page reveals the Portfolio (5th) page with 投資組合 header, watchlist rows with TextInput fields, and lots/shares toggle"
    why_human: "PagerView swipe navigation and page layout cannot be verified programmatically"
  - test: "AI-enriched price alert notification contains one-sentence market context"
    expected: "When a configured price alert fires with AI enabled and a valid API key, the notification body contains the plain alert text plus a pipe separator and a Chinese market context sentence"
    why_human: "Live alert firing on device with real MiniMax API call required; not testable statically"
---

# Phase 11: AI Intelligence Layer Verification Report

**Phase Goal:** Three advanced AI features that normal stock apps cannot offer: (1) automatic candlestick pattern recognition with plain-Chinese explanations below the chart; (2) a portfolio health screen where users input their share quantities per stock and the AI delivers sector concentration, money-weighted correlation, and overall risk/outlook analysis; (3) AI-enriched push notifications that include a one-sentence AI market context when a price alert fires.

**Verified:** 2026-03-23T00:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PatternCard appears below volume bars on the stock detail page when a pattern is detected | VERIFIED | `detail/[symbol].tsx:212` renders `<PatternCard candles={candles} />` inside ScrollView after the VolumeBar block |
| 2 | PatternCard is completely hidden when no pattern matches (no placeholder row) | VERIFIED | `PatternCard.tsx:28` — `if (!pattern) return null` — no placeholder rendered |
| 3 | PatternCard re-evaluates and updates when the user switches timeframes | VERIFIED | `detail/[symbol].tsx:32` — `const candles = getCandles(symbol, timeframe)` passed as prop; `PatternCard` uses `useMemo([candles])` so re-runs on timeframe switch |
| 4 | detectPatterns correctly identifies all 8 supported patterns from OHLCV data | VERIFIED | 12/12 tests GREEN; all 8 patterns (錘子, 倒錘子, 吞噬多頭, 吞噬空頭, 恆星線, 十字星, 早晨之星, 黃昏之星) with correct signals |
| 5 | detectPatterns returns the strongest pattern when multiple are detected in the same window | VERIFIED | `patternDetector.ts:285` — `candidates.sort((a, b) => b.confidence - a.confidence)` + test 10 confirms morning star (0.9) wins over hammer (0.5) |
| 6 | detectPatterns returns null and never throws for edge-case candles (body=0, empty array) | VERIFIED | Body-zero guard at line 83; empty array guard at line 260; test 11+12 confirm no throw/NaN |
| 7 | A new 5th PagerView page (Portfolio) is accessible by swiping from the Summary page | VERIFIED | `index.tsx:207-209` — `<View key="4"><PortfolioScreen isActive={activePage === 4} /></View>` |
| 8 | Each watchlist stock has an inline share-quantity input field on the Portfolio page | VERIFIED | `PortfolioScreen.tsx:222-241` — `<TextInput keyboardType="numeric">` per watchlist item |
| 9 | Holdings (quantities) persist across app restarts via SQLite | VERIFIED | `holdingsService.ts` uses Drizzle ORM; `migrations.js` includes m0002 for holdings table; `holdingsStore.loadHoldings()` called on `isActive` |
| 10 | Lots/shares toggle is visible and switches input unit between lots (x1000) and individual shares | VERIFIED | `PortfolioScreen.tsx:139-174` — 張/股 toggle; `getDisplayQuantity` divides by 1000 in lots mode; `handleQuantityChange` multiplies by 1000 when storing |
| 11 | AI health score card appears at the top of the Portfolio page after analysis completes | VERIFIED | `PortfolioScreen.tsx:282-316` — health score card with large score number, `scoreColor()`, and AI paragraph rendered when `analysisResult !== null` |
| 12 | Portfolio page shows 'needs API key' prompt when no key is configured | VERIFIED | `PortfolioScreen.tsx:107-120` — `if (!apiKey) return <NoApiKeyPrompt />`  |
| 13 | Portfolio page degrades gracefully on AI call failure with retry option | VERIFIED | `PortfolioScreen.tsx:271-279` — error card with 重試 Pressable calling `handleAnalyze` |
| 14 | When a price alert fires and aiNotificationsEnabled=true and API key is set, the notification body contains an AI-generated market context sentence | VERIFIED | `alertMonitor.ts:104-107` — conditional `getAlertContext()` call; `fireAlertNotification` appends ` \| {aiContext}` to body; alertMonitor test confirms body contains AI sentence |
| 15 | When the AI call times out (>5s) or errors, the notification fires anyway with plain body | VERIFIED | `getAlertContext()` returns null on any error/abort; `fireAlertNotification` with `undefined` aiContext produces plain body; test confirms body has no pipe separator on AbortError |
| 16 | When aiNotificationsEnabled=false, the AI call is completely skipped and the notification fires immediately with plain body | VERIFIED | `alertMonitor.ts:104` — `if (aiNotificationsEnabled && apiKey !== '')` guard; test confirms `global.fetch` not called |
| 17 | The Settings page (提醒 section) shows a new toggle row for AI-enriched notifications | VERIFIED | `settings.tsx:138-152` — `<View testID="ai-notifications-toggle">` with `Switch` component and label "AI 通知內容" |
| 18 | The aiNotificationsEnabled toggle persists via expo-secure-store across app restarts | VERIFIED | `settingsStore.ts:86-88` — `setAiNotificationsEnabled` calls `setItemAsync('ai_notifications_enabled', String(enabled))`; `loadFromSecureStore` reads it in parallel with other keys |
| 19 | The Settings toggle defaults to ON (true) when never previously set | VERIFIED | `settingsStore.ts:35` — `aiNotificationsEnabled: true` as default state; `loadFromSecureStore` line 57 — `aiNotif !== 'false'` (null from SecureStore on first launch → true) |

**Score:** 19/19 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `invest-app/src/__tests__/patternDetector.test.ts` | 12 test cases for all 8 patterns, null, strongest, NaN guard, empty array | VERIFIED | 12 tests, all GREEN |
| `invest-app/src/features/charts/services/patternDetector.ts` | Pure TS detector exporting detectPatterns, PatternResult, PatternSignal | VERIFIED | All 3 exports present; pure TS, no React imports; 288 lines of substantive logic |
| `invest-app/src/features/charts/components/PatternCard.tsx` | UI card: name, Chinese explanation, signal pill; null when no pattern | VERIFIED | 44 lines; `useMemo` compute; conditional `return null`; name/explanation/pill rendered |
| `invest-app/src/app/detail/[symbol].tsx` | PatternCard inserted between VolumeBar block and TimeframeSelector | VERIFIED | Line 212 — `<PatternCard candles={candles} />` inside ScrollView after VolumeBar |
| `invest-app/src/__tests__/holdingsService.test.ts` | CRUD tests: upsert insert, upsert update, getAll, deleteHolding | VERIFIED | 4 tests present, substantive with correct mock chains, all GREEN |
| `invest-app/src/__tests__/holdingsStore.test.ts` | Store round-trip: loadHoldings, setQuantity upsert, setQuantity delete | VERIFIED | 4 tests, all GREEN |
| `invest-app/src/__tests__/portfolioAiService.test.ts` | buildPortfolioPrompt, 15-stock cap, extractHealthScore, callPortfolioMiniMax | VERIFIED | 12 tests, all GREEN |
| `invest-app/src/db/schema.ts` | holdings table with symbol, name, quantity, unique index | VERIFIED | Lines 44-59 — exact schema with uniqueIndex('holdings_symbol_unique') |
| `invest-app/drizzle/migrations.js` | m0002 import for holdings migration | VERIFIED | Line 6 — `import m0002 from './0002_stormy_lionheart.sql'`; included in migrations object |
| `invest-app/src/features/portfolio/services/holdingsService.ts` | Drizzle CRUD: upsertHolding, getAllHoldings, deleteHolding | VERIFIED | All 3 exports; delete-then-insert upsert pattern; 27 lines, substantive |
| `invest-app/src/features/portfolio/store/holdingsStore.ts` | Zustand store: holdings map, loadHoldings, setQuantity, clearHoldings | VERIFIED | All 4 exported; quantity=0 path calls deleteHolding and removes key; 65 lines |
| `invest-app/src/features/portfolio/services/portfolioAiService.ts` | buildPortfolioPrompt (15-stock cap), callPortfolioMiniMax (30s timeout) | VERIFIED | MAX_STOCKS=15; AbortController+setTimeout(30_000); SCORE:XX/100 regex extraction |
| `invest-app/src/features/portfolio/components/PortfolioScreen.tsx` | 5th PagerView page: holdings list, lots toggle, AI health card | VERIFIED | 320 lines; isActive lazy-load; lots/shares toggle; AI card; error+retry; NoApiKeyPrompt |
| `invest-app/src/app/index.tsx` | PortfolioScreen at PagerView key='4' with isActive={activePage === 4} | VERIFIED | Lines 207-209 confirmed |
| `invest-app/src/__tests__/alertMonitor.test.ts` | 5 new AI-enriched/fallback/toggle-off cases + 9 existing | VERIFIED | 14 total tests in alertMonitor describe; all GREEN; AI describe block lines 202-334 |
| `invest-app/src/__tests__/settings.test.ts` | 4 new aiNotificationsEnabled persist/load cases | VERIFIED | 'AI Notifications toggle' describe block lines 57-94; all 4 GREEN |
| `invest-app/src/features/settings/store/settingsStore.ts` | aiNotificationsEnabled field, setAiNotificationsEnabled action, loadFromSecureStore updated | VERIFIED | Line 18, 26, 50, 57, 85-88 |
| `invest-app/src/features/alerts/services/alertMonitor.ts` | getAlertContext (5s timeout), fireAlertNotification with optional aiContext, checkAlerts reads store | VERIFIED | Lines 18-59 (getAlertContext); line 66 (aiContext param); line 102-107 (conditional AI call) |
| `invest-app/src/app/settings.tsx` | AI toggle row with testID="ai-notifications-toggle", Switch bound to aiNotificationsEnabled | VERIFIED | Lines 73-74 (selectors); line 138 (testID); lines 143-147 (Switch bound to store) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `detail/[symbol].tsx` | `PatternCard.tsx` | `import PatternCard; render between VolumeBar and TimeframeSelector` | WIRED | Line 10 import; line 212 render with `candles={candles}` prop |
| `PatternCard.tsx` | `patternDetector.ts` | `useMemo(() => detectPatterns(candles), [candles])` | WIRED | Lines 23-26; `detectPatterns` called inside `useMemo` |
| `PatternCard.tsx` | `chartStore.ts` | `candles` prop flows from `getCandles(symbol, timeframe)` in parent | WIRED | `detail/[symbol].tsx:32` — `const candles = getCandles(symbol, timeframe)` passed to PatternCard |
| `index.tsx` | `PortfolioScreen.tsx` | PagerView key='4' with isActive={activePage === 4} | WIRED | Lines 207-209 confirmed |
| `PortfolioScreen.tsx` | `holdingsStore.ts` | `useHoldingsStore` — loadHoldings on isActive, setQuantity on input change | WIRED | Line 14 (hook), line 52 (loadHoldings), line 72 (setQuantity) |
| `holdingsStore.ts` | `holdingsService.ts` | `holdingsService.upsertHolding / getAllHoldings` | WIRED | Lines 26, 39, 55 — all three service functions called |
| `PortfolioScreen.tsx` | `portfolioAiService.ts` | `callPortfolioMiniMax` triggered by 'Analyze' button | WIRED | Line 16-17 (import); line 94 (called in handleAnalyze) |
| `alertMonitor.ts` | `settingsStore.ts` | `useSettingsStore.getState()` reads aiNotificationsEnabled, apiKey at call time | WIRED | Line 4 (import); lines 102, 116 (getState() called inside checkAlerts body) |
| `settings.tsx` | `settingsStore.ts` | `useSettingsStore(s => s.aiNotificationsEnabled)` + `setAiNotificationsEnabled` | WIRED | Lines 73-74 (selectors); line 145 (onValueChange calls setter) |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AI-11 | 11-01-PLAN.md | Candlestick pattern recognition from OHLCV data; plain-Chinese explanation; bullish/neutral/bearish signal below chart; updates per timeframe | SATISFIED | `patternDetector.ts` detects 8 patterns offline; `PatternCard.tsx` renders below VolumeBar; candles prop from `getCandles(symbol, timeframe)` causes re-evaluation per timeframe; 12/12 tests GREEN |
| AI-12 | 11-02-PLAN.md | Portfolio health screen; user inputs share quantities; SQLite persistence; AI sector concentration + correlation analysis + health score | SATISFIED | `PortfolioScreen.tsx` as 5th PagerView page; `holdingsService.ts` + `holdingsStore.ts` + SQLite m0002 migration; `portfolioAiService.ts` with SCORE:XX/100 extraction; all 20 new tests GREEN |
| AI-13 | 11-03-PLAN.md | AI-enriched push alerts; one-sentence market context in notification body; fallback to plain notification if AI unavailable | SATISFIED | `alertMonitor.getAlertContext()` with 5s AbortController timeout; `fireAlertNotification` appends AI context; `aiNotificationsEnabled` toggle in settings with SecureStore persistence; 5 new alertMonitor tests + 4 settings tests GREEN |

**No orphaned requirements found.** All three plan files claim exactly AI-11, AI-12, AI-13 respectively. REQUIREMENTS.md maps all three to Phase 11 with status Complete.

---

### Anti-Patterns Found

No blockers or stubs detected.

| File | Pattern Checked | Result |
|------|----------------|--------|
| `patternDetector.ts` | `return null` occurrences | Legitimate logic (null when no pattern matches or empty input) — not a stub |
| `PatternCard.tsx` | `return null` | Legitimate conditional render when no pattern detected — plan-specified behavior |
| `portfolioAiService.ts` | `return null` | Legitimate error fallback on API failure — not a stub |
| `alertMonitor.ts` | `return null` in getAlertContext | Legitimate catch-all fallback — plan-specified behavior |
| `PortfolioScreen.tsx` | `placeholder` text | TextInput placeholder labels ("張數"/"股數") — not a code stub |
| All phase 11 files | TODO/FIXME/HACK/PLACEHOLDER | None found |
| All phase 11 files | Empty handlers `() => {}` | None found |

---

### Human Verification Required

#### 1. PatternCard rendering on device

**Test:** Open a stock with 5D, 1M, or longer timeframe (so sufficient candles are loaded). Look below the volume bars on the detail screen.
**Expected:** When a pattern is detected, a card appears with the Chinese pattern name, an explanation sentence, and a colored pill (green for bullish, amber for neutral, red for bearish). When no pattern matches, no card appears and no placeholder is shown.
**Why human:** Pattern matching depends on real-market OHLCV data shapes. Test fixtures confirm the logic is correct, but real data may or may not produce patterns on any given day.

#### 2. Portfolio 5th page swipe navigation

**Test:** From the app home, swipe left through Watchlist → Analysis → Alerts → Summary → and swipe once more to reach the 5th page.
**Expected:** Portfolio page appears with "投資組合" header, 張/股 toggle, rows for each watchlist stock with a numeric TextInput, and the "分析投資組合" button.
**Why human:** PagerView swipe layout and visual correctness cannot be verified programmatically.

#### 3. AI-enriched alert notification with live API key

**Test:** Set a price alert on a stock near the current price, ensure AI notifications toggle is ON in Settings, have a valid API key configured. Wait for the alert to fire (or temporarily set the alert to a price the stock has already crossed to trigger immediately).
**Expected:** The notification body reads: "[stock] crossed [above/below] [price] - current: [price] | [one-sentence Chinese market context]"
**Why human:** Requires real MiniMax API call and live alert trigger on device.

---

### Gaps Summary

No gaps. All 19 must-have truths verified across all three sub-plans. All 9 commits exist in git history and are substantive. All test suites are GREEN (59 total tests across 6 test files for phase 11 scope; 12 for AI-11, 20 for AI-12, 14+13 for AI-13). No TODO stubs or empty handlers found. All key links confirmed wired by code inspection.

Three items are flagged for human verification as they require live device testing or real API calls — automated checks passed for all of them.

---

_Verified: 2026-03-23_
_Verifier: Claude (gsd-verifier)_
