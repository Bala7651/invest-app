---
phase: 04-charts
plan: 01
subsystem: api
tags: [ohlcv, twse, finmind, zustand, request-queue, historical-data, typescript]

# Dependency graph
requires:
  - phase: 02-data-layer
    provides: RequestQueue pattern with rate limiting from stockService.ts
provides:
  - OHLCVPoint and Timeframe types in types.ts
  - fetchCandles with FinMind primary + TWSE fallback in historicalService.ts
  - twseDateToTimestamp for ROC date conversion
  - Zustand v5 chartStore with in-memory OHLCV cache
  - react-native-wagmi-charts installed for Plan 02
affects:
  - 04-charts-02 (chart UI rendering uses fetchCandles via chartStore)
  - 09-price-alerts (historical context for alert threshold)

# Tech tracking
tech-stack:
  added:
    - react-native-wagmi-charts@^2.9.1 (candlestick chart rendering for Plan 02)
  patterns:
    - Separate RequestQueue instance per service (3s spacing for historical endpoints)
    - FinMind-primary / TWSE-fallback multi-source data fetching
    - ROC year conversion: parseInt(rocYear) + 1911
    - Zustand v5 store with cache/loading/errors shape for async data

key-files:
  created:
    - invest-app/src/features/charts/types.ts
    - invest-app/src/features/charts/services/historicalService.ts
    - invest-app/src/features/charts/store/chartStore.ts
    - invest-app/src/__tests__/historicalService.test.ts
    - invest-app/src/__tests__/chartStore.test.ts
  modified:
    - invest-app/package.json (react-native-wagmi-charts added)

key-decisions:
  - "All timeframes (1D/5D/1M/6M/1Y) use daily candles for v1 — intraday deferred to v2"
  - "FinMind TaiwanStockPrice is primary for 1M/6M/1Y; TWSE STOCK_DAY is fallback and primary for 1D/5D"
  - "@shopify/react-native-skia skipped (npm EFBIG — package too large for cache); Plan 02 will handle volume bar approach without Skia dependency"
  - "Tests use jest.useFakeTimers + jest.runAllTimersAsync to bypass the 3s RequestQueue delay"

patterns-established:
  - "Separate RequestQueue per service: historicalService has its own queue, never shares with stockService queue"
  - "TWSE STOCK_DAY monthly fetch: iterate months from startDate to now, merge, filter by date"
  - "Cache key format: symbol:timeframe (e.g. '2330:1M')"

requirements-completed: [CHRT-02, CHRT-04]

# Metrics
duration: 15min
completed: 2026-03-20
---

# Phase 4 Plan 01: Historical Data Service and Chart Store Summary

**FinMind + TWSE dual-source OHLCV service with Zustand v5 in-memory cache, ROC date parsing, and 19 passing unit tests**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-20T07:22:17Z
- **Completed:** 2026-03-20T07:37:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- historicalService.fetchCandles returns correctly-shaped OHLCVPoint[] for all 5 timeframes with FinMind primary + TWSE daily fallback
- twseDateToTimestamp converts ROC calendar dates (year+1911) to Unix milliseconds; confirmed with 2024/2026 test cases
- chartStore caches by symbol:timeframe key and skips re-fetch on cache hit; clearCache supports per-symbol or full clear
- All 89 tests pass (19 new + 70 existing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Types and historicalService with unit tests** - `96f27eb` (feat)
2. **Task 2: chartStore with unit tests** - `0b2fc0a` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `invest-app/src/features/charts/types.ts` - OHLCVPoint, Timeframe, TIMEFRAMES
- `invest-app/src/features/charts/services/historicalService.ts` - fetchCandles, twseDateToTimestamp, getDateRange, RequestQueue (3s spacing)
- `invest-app/src/features/charts/store/chartStore.ts` - useChartStore with cache/loading/errors + fetchCandles/getCandles/clearCache
- `invest-app/src/__tests__/historicalService.test.ts` - 11 tests: date parsing, date range, FinMind fetch, TWSE fallback, ROC number parsing
- `invest-app/src/__tests__/chartStore.test.ts` - 8 tests: cache storage, cache hit skip, getCandles, loading toggle, error capture, clearCache
- `invest-app/package.json` - react-native-wagmi-charts@^2.9.1 added

## Decisions Made
- All timeframes use daily candles for v1; intraday intervals deferred to v2 when Fugle API is available
- FinMind is primary for longer timeframes (1M/6M/1Y); TWSE STOCK_DAY used directly for 1D/5D and as FinMind fallback
- Tests use `jest.useFakeTimers` + `jest.runAllTimersAsync()` to advance the queue's `setTimeout` delays without real waiting
- `@shopify/react-native-skia` could not be installed (npm EFBIG — packument too large for local cache); Plan 02 will select a volume bar approach that doesn't require it

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test timeouts due to RequestQueue 3s delay with fake timers**
- **Found during:** Task 1 (historicalService unit tests)
- **Issue:** Tests using `global.fetch` mock were timing out at 5000ms because the RequestQueue's `setTimeout(r, 3000)` wasn't advancing with `jest.useFakeTimers()` alone
- **Fix:** Added `await jest.runAllTimersAsync()` after calling `fetchCandles` in each test — this advances all pending timers, letting the queue drain without real waiting
- **Files modified:** invest-app/src/__tests__/historicalService.test.ts
- **Verification:** All 11 historicalService tests pass in under 1s
- **Committed in:** 96f27eb (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (bug in test infrastructure)
**Impact on plan:** Fix required for test correctness. No scope creep.

## Issues Encountered
- `@shopify/react-native-skia` npm install failed with `EFBIG: file too large, write` (same class of issue as drizzle-orm in Phase 01-02). Skipped per plan guidance; `react-native-wagmi-charts` installed successfully. Plan 02 will handle volume rendering without requiring Skia.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Data layer complete: Plan 02 (chart UI) can import `useChartStore` and call `fetchCandles(symbol, timeframe)` to get sorted OHLCVPoint[] for rendering
- `react-native-wagmi-charts` is installed and ready for candlestick chart component
- Volume bar approach to be determined in Plan 02 (gifted-charts or custom Reanimated — Skia not available)
- FinMind and TWSE endpoints are not authenticated; no API keys required for data fetching

---
*Phase: 04-charts*
*Completed: 2026-03-20*
