---
phase: 02-data-layer
verified: 2026-03-19T08:00:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 2: Data Layer Verification Report

**Phase Goal:** The app can fetch live Taiwan stock quotes safely without triggering the TWSE rate limit, pauses polling outside market hours, and handles non-trading days without crashing
**Verified:** 2026-03-19T08:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

Sources: ROADMAP.md success criteria + must_haves from 02-01-PLAN.md, 02-02-PLAN.md, 02-03-PLAN.md.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Fetching quotes for multiple stocks fires requests with >= 2s spacing | VERIFIED | `RequestQueue.enqueue` computes `Math.max(0, 2000 - elapsed)` wait before each request; queue spacing test passes (10s timeout, real-time, 2 calls gap >= 2000ms) |
| 2 | `StockService` rejects bypass of request queue (_fetchQuotes and _queue not exported) | VERIFIED | Both are file-scoped (`async function _fetchQuotes` and `const _queue`); 3 unit tests confirm no underscore exports exist |
| 3 | `getQuotes` formats symbols as `tse_XXXX.tw` pipe-delimited URL string | VERIFIED | `symbols.map(s => 'tse_${s}.tw').join('|')` at line 67 of stockService.ts; URL format test passes |
| 4 | TWSE `z` field `'-'` sentinel is parsed as `null`, not `NaN` | VERIFIED | `parseSentinel` returns `null` for `'-'` and `''`; 2 unit tests confirm this |
| 5 | `isMarketOpen()` returns true only during Mon-Fri 09:00-13:30 Asia/Taipei | VERIFIED | 7 boundary tests pass: 08:59 false, 09:00 true, 13:29 true, 13:30 false, weekend false, holiday false |
| 6 | `isHoliday()` returns true for all 2026 Taiwan public holidays | VERIFIED | 18-entry HOLIDAYS_2026 list; test confirms 2026-02-17 (Lunar New Year) returns true; non-holiday 2026-03-18 returns false |
| 7 | Polling starts automatically on app launch when market is open | VERIFIED | `_layout.tsx` useEffect calls `startPolling(symbols)` if `symbols.length > 0 && isMarketOpen()` |
| 8 | Polling stops when `isMarketOpen()` returns false (auto-stops in tick) | VERIFIED | `tick()` in quoteStore checks `isMarketOpen()` first, calls `stopPolling()` if false; unit test verifies |
| 9 | Final fetch fires before polling stops at market close | VERIFIED | When `!isMarketOpen()` in tick, `getQuotes(symbols)` is awaited before `get().stopPolling()` is called |
| 10 | Cached quotes remain accessible after `stopPolling` (no data clear) | VERIFIED | `stopPolling()` sets `polling=false, _intervalId=null` only; quotes Record<string,Quote> untouched; unit test confirms 2 quotes persist |
| 11 | Market status indicator is visible in home screen header with open/closed label | VERIFIED | `MarketStatusBar` imported and rendered in `WatchlistPage` header (index.tsx line 4, 17); green pulse on open, gray on closed |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `invest-app/src/services/stockService.ts` | TWSE fetch client + FIFO queue | VERIFIED | 94 lines; exports `getQuotes`, `TWSEQuote`, `parseSentinel`; `RequestQueue` class and `_queue` singleton unexported |
| `invest-app/src/features/market/marketHours.ts` | Pure market-hours and holiday detection | VERIFIED | 55 lines; exports `isMarketOpen`, `isHoliday`, `computeStatus`; uses `toLocaleString` for Asia/Taipei conversion |
| `invest-app/src/features/market/holidays2026.ts` | 2026 TWSE holiday list | VERIFIED | 18 dates; source URL comment present |
| `invest-app/src/features/market/quoteStore.ts` | Zustand store with polling lifecycle | VERIFIED | 101 lines; exports `useQuoteStore`; full startPolling/stopPolling/tick implementation |
| `invest-app/src/features/market/MarketStatusBar.tsx` | Market status indicator component | VERIFIED | 39 lines; Reanimated pulse on open, static gray on closed; 60s refresh interval |
| `invest-app/src/app/_layout.tsx` | Root layout with AppState polling wiring | VERIFIED | useEffect wires startPolling on mount (if market open), AppState listener for background pause / foreground resume, cleanup on unmount |
| `invest-app/src/app/index.tsx` | Home screen with MarketStatusBar | VERIFIED | `MarketStatusBar` imported from `../features/market/MarketStatusBar` and rendered below Watchlist title row |
| `invest-app/src/__tests__/stockService.test.ts` | Unit tests for queue bypass and spacing | VERIFIED | 11 tests: export bypass (3), parseSentinel (4), URL format (1), TWSEQuote shape (1), queue spacing (1) + URL format combo |
| `invest-app/src/__tests__/marketHours.test.ts` | Unit tests for isMarketOpen, isHoliday, computeStatus | VERIFIED | 13 tests: all boundary cases, holiday detection, computeStatus open/closed labels |
| `invest-app/src/__tests__/quoteStore.test.ts` | Unit tests for polling lifecycle | VERIFIED | 8 tests: start, stop, idempotency, market-closed guard, final-fetch, quote storage, fetchedAt, change/changePct math |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `stockService.ts` | `https://mis.twse.com.tw/stock/api/getStockInfo.jsp` | `fetch` with `AbortSignal.timeout` | WIRED | Line 68-73: URL construction and fetch call confirmed; `AbortSignal.timeout(10_000)` present |
| `marketHours.ts` | `holidays2026.ts` | `import { HOLIDAYS_2026 }` | WIRED | Line 1 of marketHours.ts: `import { HOLIDAYS_2026 } from './holidays2026'`; used in `isHoliday()` |
| `quoteStore.ts` | `stockService.ts` | `import { getQuotes }` | WIRED | Line 2: `import { getQuotes } from '../../services/stockService'`; called in tick() |
| `quoteStore.ts` | `marketHours.ts` | `import { isMarketOpen }` | WIRED | Line 3: `import { isMarketOpen } from './marketHours'`; called in startPolling guard and tick |
| `_layout.tsx` | `quoteStore.ts` | `useQuoteStore.getState().startPolling` | WIRED | Line 8: import; lines 18, 24: `startPolling`; lines 26, 32: `stopPolling`; AppState listener registered |
| `index.tsx` | `MarketStatusBar.tsx` | `import { MarketStatusBar }` | WIRED | Line 4: import; line 17: `<MarketStatusBar />` in JSX |
| `MarketStatusBar.tsx` | `marketHours.ts` | `import { computeStatus }` | WIRED | Line 9: `import { computeStatus } from './marketHours'`; called in useState initializer and interval callback |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DATA-01 | 02-01, 02-02 | App polls TWSE OpenAPI for real-time prices (~20s delay, 20-30s interval) | SATISFIED | `getQuotes` fetches `mis.twse.com.tw/stock/api/getStockInfo.jsp`; `setInterval(tick, 30_000)` in quoteStore |
| DATA-02 | 02-02 | Polling only occurs during Taiwan market hours (Mon-Fri 09:00-13:30) | SATISFIED | `startPolling` guards on `isMarketOpen()`; tick guards again and calls `stopPolling` if market closed |
| DATA-03 | 02-03 | App shows market open/closed status indicator | SATISFIED | `MarketStatusBar` renders in home screen header; green dot + "Open · Xh Ym to close" / gray dot + "Closed · opens 09:00" |
| DATA-04 | 02-02, 02-03 | App handles non-trading days gracefully with cached data | SATISFIED | On holiday: `isMarketOpen()` returns false, `startPolling` exits without fetching, cached quotes remain in store; `MarketStatusBar` shows "Closed" |
| DATA-05 | 02-01 | TWSE request queue enforces rate limit (max 3 req/5s) to avoid IP ban | SATISFIED | `RequestQueue` enforces minimum 2s spacing between requests (more conservative than 3/5s limit); `_fetchQuotes` and `_queue` are unexported — bypass impossible |

All 5 requirements marked complete in REQUIREMENTS.md traceability table. All 5 confirmed by code inspection.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `invest-app/src/app/detail/[symbol].tsx` | 16 | `"Chart placeholder — 1D/5D/1M/6M/1Y"` | Info | Phase 4 file; outside Phase 2 scope |

No anti-patterns found in Phase 2 files. The `return null` instances in `stockService.ts` (lines 14 and 61) are legitimate sentinel and retry-fallback returns, not stub implementations.

---

### Test Suite Results

```
PASS src/__tests__/theme.test.ts
PASS src/__tests__/quoteStore.test.ts
PASS src/__tests__/marketHours.test.ts
PASS src/__tests__/db.test.ts
PASS src/__tests__/stockService.test.ts (6.245 s)

Test Suites: 5 passed, 5 total
Tests:       50 passed, 50 total
```

TypeScript: `npx tsc --noEmit` passes with zero errors.

---

### Human Verification Required

The following behaviors cannot be verified programmatically:

#### 1. Green Pulsing Dot Animation

**Test:** Run the app on device or emulator during market hours (Mon-Fri 09:00-13:30 Taipei time)
**Expected:** The dot to the left of the market status text pulses (opacity fades between 1.0 and 0.3 every 800ms)
**Why human:** Reanimated animation behavior requires a live render environment

#### 2. Rate Limit Safety Under Real Network Conditions

**Test:** Add 5+ stocks to watchlist, observe network requests during market hours
**Expected:** Requests fire no faster than one every 2 seconds (observable via network inspector or proxy)
**Why human:** Queue timing relies on `Date.now()` which is real-time; tests use real timers, but production behavior with actual network latency cannot be fully simulated

#### 3. AppState Background Pause Behavior

**Test:** Launch app during market hours, verify polling fires, then background the app; foreground it again
**Expected:** Poll requests stop within one cycle of backgrounding, then resume on return to foreground if market is still open
**Why human:** `AppState` events require a physical device or emulator with real app lifecycle

#### 4. Non-Trading Day Cold Start (Holiday)

**Test:** Simulate a holiday (e.g. manually test with a date of 2026-02-17) or check behavior on an actual Taiwan public holiday
**Expected:** App launches, shows "Closed · opens 09:00" in the MarketStatusBar, no TWSE network request fires, no crash
**Why human:** Requires time-travel or waiting for an actual holiday

---

### Notable Observations

1. **useEffect before migration guard**: The polling `useEffect` in `_layout.tsx` executes before the `success` migration check. This is intentional (documented decision: ensures cleanup fires on unmount). The startup race condition is benign — `useWatchlistStore.getState().items` will be empty on first mount before DB populates, so `startPolling` never fires prematurely.

2. **`isHoliday` receives Taipei-local Date**: `isHoliday` in marketHours.ts extracts the ISO date from a pre-converted Taipei Date. It is called from `isMarketOpen` (which handles the UTC→Taipei conversion) and from tests (which construct Taipei-offset dates explicitly). This is a correct but subtle contract — callers that pass raw UTC dates directly to `isHoliday` would get wrong results. This is documented in the SUMMARY and tests validate the correct usage pattern.

3. **`computeStatus` "opens" label is always `09:00`**: When the market is closed, `computeStatus` returns `"Closed · opens 09:00"` rather than computing the exact next open time with date. This is a known simplification; it is accurate (TWSE always opens at 09:00 when trading) and matches the spec in the PLAN.

---

## Gaps Summary

No gaps. All 11 truths verified, all 9 artifacts are substantive and wired, all 7 key links confirmed present in code, all 5 requirements satisfied with direct code evidence, and all 50 tests pass with zero TypeScript errors.

---

_Verified: 2026-03-19T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
