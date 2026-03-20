---
phase: 04-charts
plan: 02
subsystem: ui
tags: [react-native, wagmi-charts, reanimated, nativewind, candlestick, zustand]

# Dependency graph
requires:
  - phase: 04-charts-01
    provides: chartStore, historicalService, OHLCVPoint types, Timeframe types
  - phase: 03-watchlist
    provides: formatChange helper, StockCard patterns
  - phase: 02-data-layer
    provides: quoteStore with live Quote data
provides:
  - CandleChart component with wagmi-charts Crosshair and Tooltip
  - VolumeBar component (View-based, green/red coloring)
  - TimeframeSelector with Reanimated sliding highlight
  - ChartSkeleton with opacity pulse shimmer
  - Complete detail screen replacing placeholder
affects: [05-search, 06-ai-analysis, 09-price-alerts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useAnimatedReaction + runOnJS for Reanimated-to-React state bridge
    - CandleDataBridge inner component pattern for accessing wagmi useCandleData inside Provider
    - View-based bar charts as Skia alternative when native module install fails

key-files:
  created:
    - invest-app/src/features/charts/components/CandleChart.tsx
    - invest-app/src/features/charts/components/VolumeBar.tsx
    - invest-app/src/features/charts/components/TimeframeSelector.tsx
    - invest-app/src/features/charts/components/ChartSkeleton.tsx
    - invest-app/src/__tests__/VolumeBar.test.ts
    - invest-app/src/__tests__/CandleChart.test.ts
    - invest-app/src/__tests__/detail.test.ts
  modified:
    - invest-app/src/app/detail/[symbol].tsx

key-decisions:
  - "VolumeBar uses React Native View layout instead of Skia Canvas — Skia was skipped in Plan 01 due to npm EFBIG; View-based bars achieve same green/red proportional visualization"
  - "useAnimatedReaction + runOnJS used in CandleDataBridge to bridge wagmi SharedValue crosshair data to React state for header price update"
  - "Animated.View with FadeIn.duration(300) used on chart container for smooth transition when data loads"

patterns-established:
  - "CandleDataBridge: inner component nested inside CandlestickChart.Provider to access useCandleData SharedValue and bridge to React via useAnimatedReaction + runOnJS"
  - "crosshairPrice local state pattern: null = show live price, number = show touched candle close"
  - "isLoading = loading[symbol:timeframe] derived key for per-symbol-per-timeframe loading state"

requirements-completed: [CHRT-01, CHRT-03, CHRT-04]

# Metrics
duration: 4min
completed: 2026-03-20
---

# Phase 4 Plan 02: Chart Detail Screen Summary

**wagmi-charts CandlestickChart with crosshair/OHLCV tooltip, View-based volume bars, Reanimated timeframe selector, and Bloomberg-style header wired to live quoteStore**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-20T01:32:11Z
- **Completed:** 2026-03-20T01:36:29Z
- **Tasks:** 2 of 3 (Task 3 is checkpoint:human-verify)
- **Files modified:** 8

## Accomplishments
- CandleChart wrapping wagmi CandlestickChart.Provider with Crosshair, Tooltip, and useAnimatedReaction bridge for onCandleChange callback
- VolumeBar using React Native Views with proportional height and green/red direction coloring
- TimeframeSelector with Reanimated useSharedValue sliding highlight, onLayout-measured pill widths
- ChartSkeleton with withRepeat opacity pulse animation
- Detail screen: Bloomberg header (symbol, name, live price, change), FadeIn chart, skeleton/error states, retry button

## Task Commits

Each task was committed atomically:

1. **Task 1: Chart sub-components and test stubs** - `df3b1e5` (feat)
2. **Task 2: Wire detail screen with Bloomberg header** - `4745866` (feat)

**Plan metadata:** (pending — after checkpoint approval)

## Files Created/Modified
- `invest-app/src/features/charts/components/CandleChart.tsx` - wagmi CandlestickChart wrapper with CandleDataBridge for crosshair callbacks
- `invest-app/src/features/charts/components/VolumeBar.tsx` - View-based volume bar chart with green/red coloring
- `invest-app/src/features/charts/components/TimeframeSelector.tsx` - Reanimated sliding highlight pill selector
- `invest-app/src/features/charts/components/ChartSkeleton.tsx` - Opacity pulse shimmer placeholder
- `invest-app/src/app/detail/[symbol].tsx` - Complete Bloomberg-style detail screen
- `invest-app/src/__tests__/VolumeBar.test.ts` - 4 tests for bar count, colors, height calculation
- `invest-app/src/__tests__/CandleChart.test.ts` - 4 tests for wagmi format mapping and callback behavior
- `invest-app/src/__tests__/detail.test.ts` - 4 tests for fetchCandles on mount, timeframe change, loading state

## Decisions Made
- VolumeBar uses React Native View layout instead of Skia Canvas — Skia was deferred in Plan 01 due to npm EFBIG; View-based bars produce the same green/red proportional visualization without the native module
- `useAnimatedReaction` + `runOnJS` in a nested `CandleDataBridge` component to read wagmi's `SharedValue<TCandle>` (from `useCandleData()`) and call the React-side `onCandleChange` callback — direct `useEffect` on SharedValue would not trigger reactions
- `crosshairPrice` local state: `null` shows live quote price, a number shows the touched candle's close price

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CandleDataBridge used useEffect on SharedValue — replaced with useAnimatedReaction**
- **Found during:** Task 1 (CandleChart component)
- **Issue:** Initial implementation used `useEffect` to read `candleData.close`, but `useCandleData()` returns `Readonly<SharedValue<TCandle>>`. Accessing `.close` directly on a SharedValue caused TypeScript error TS2339 (property does not exist on SharedValue type)
- **Fix:** Replaced useEffect with `useAnimatedReaction(() => candleData.value, (candle) => runOnJS(cb)(...))` pattern; candle values accessed via `.value` (Reanimated standard)
- **Files modified:** invest-app/src/features/charts/components/CandleChart.tsx
- **Verification:** `npx tsc --noEmit` passes without error
- **Committed in:** df3b1e5 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Fix required for TypeScript correctness and correct Reanimated usage. No scope creep.

## Issues Encountered
- wagmi-charts `useCandleData()` returns `Readonly<SharedValue<TCandle>>` not a plain object — requires Reanimated worklet pattern to bridge to React state. Resolved by discovering actual types in node_modules and using `useAnimatedReaction`.

## Self-Check: PASSED

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Detail screen complete, awaiting visual verification (Task 3 checkpoint)
- Phase 5 (Search) can build on the detail screen navigation pattern established here
- Phase 6 (AI Analysis) and Phase 9 (Price Alerts) will add sections to the detail screen below the chart area

---
*Phase: 04-charts*
*Completed: 2026-03-20*
