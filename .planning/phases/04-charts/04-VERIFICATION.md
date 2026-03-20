---
phase: 04-charts
verified: 2026-03-20T08:00:00Z
status: gaps_found
score: 9/11 must-haves verified
re_verification: false
gaps:
  - truth: "Chart renders smoothly with Skia-based wagmi-charts, not SVG"
    status: failed
    reason: "react-native-wagmi-charts v2.9.1 uses react-native-svg internally (Candles.tsx imports Svg from react-native-svg; Candle.tsx imports Line/Rect from react-native-svg). The RESEARCH.md claim that wagmi-charts is 'Skia-based, not SVG' was incorrect. CHRT-04 as written is not satisfied by the current implementation."
    artifacts:
      - path: "invest-app/src/features/charts/components/CandleChart.tsx"
        issue: "Wraps wagmi CandlestickChart which uses react-native-svg, not Skia, for candle rendering"
      - path: "invest-app/node_modules/react-native-wagmi-charts/src/charts/candle/Candles.tsx"
        issue: "Source uses: import { Svg, SvgProps } from 'react-native-svg'"
    missing:
      - "Evaluate whether SVG performance is acceptable in practice (240+ candles on mid-range Android) and either accept wagmi-charts as the implementation with a revised CHRT-04 interpretation, OR replace with a truly Skia-based alternative"
  - truth: "Press-and-hold shows crosshair line with OHLCV tooltip near touch point, and header price updates to touched candle"
    status: failed
    reason: "User-verified in the checkpoint: 'Tap-and-hold crosshair does not work — The crosshair gesture interaction is not triggering on device.' CandleDataBridge + useAnimatedReaction pattern compiles correctly but the gesture is not registered on device. Crosshair gesture is a known wagmi-charts Android issue (#54, #67)."
    artifacts:
      - path: "invest-app/src/features/charts/components/CandleChart.tsx"
        issue: "CandleDataBridge + useAnimatedReaction pattern present in code but gesture does not fire on device per user verification"
    missing:
      - "Verify GestureHandlerRootView wraps the entire app in _layout.tsx"
      - "Debug why wagmi-charts crosshair gesture is not registering on device (check GestureHandler root, wagmi version compatibility)"
human_verification:
  - test: "Scroll through 1Y chart (240+ candles) on a mid-range Android device"
    expected: "Smooth 60fps rendering with no visible jank during scroll"
    why_human: "Performance can only be measured on real hardware; no automated test can verify frame rate"
  - test: "Tap a stock on watchlist, verify detail screen appears with real chart data"
    expected: "Bloomberg header with symbol/name/price, candlestick chart with green/red candles, volume bars below"
    why_human: "Visual and navigation behavior requires device/emulator verification"
  - test: "Tap each timeframe button (1D, 5D, 1M, 6M, 1Y) sequentially"
    expected: "Sliding highlight animates to selected timeframe, chart reloads with correct data, skeleton shows during load"
    why_human: "Animation quality and data load behavior require visual inspection"
---

# Phase 4: Charts Verification Report

**Phase Goal:** Users can tap any watchlist stock to see a detailed candlestick chart with volume bars across 5 timeframes, rendered smoothly without SVG performance issues
**Verified:** 2026-03-20T08:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | historicalService fetches daily candles from FinMind TaiwanStockPrice for 1M/6M/1Y timeframes | VERIFIED | `historicalService.ts` lines 140-148: tries FinMind first for 1M/6M/1Y; unit tests confirm FinMind URL pattern |
| 2 | historicalService fetches daily candles from TWSE STOCK_DAY as fallback when FinMind fails | VERIFIED | `historicalService.ts` lines 119-134: fetchTWSERange iterates months calling fetchTWSEMonthly; test confirms fallback on FinMind empty/error |
| 3 | All timeframes use daily candles for v1 | VERIFIED | `historicalService.ts` lines 140-177: all branches use STOCK_DAY or TaiwanStockPrice (both daily). CONTEXT.md decision honored |
| 4 | chartStore caches fetched OHLCV per symbol:timeframe key and skips re-fetch on cache hit | VERIFIED | `chartStore.ts` line 21: `if (get().cache[key] !== undefined) return;`; 8 unit tests pass confirming cache behavior |
| 5 | ROC calendar dates from TWSE are correctly converted (year + 1911) | VERIFIED | `historicalService.ts` line 39: `parseInt(parts[0], 10) + 1911`; twseDateToTimestamp tests confirm conversion |
| 6 | Data is always sorted ascending by timestamp before storage | VERIFIED | `historicalService.ts` line 179: `return points.sort((a, b) => a.timestamp - b.timestamp)` |
| 7 | Selecting a timeframe in the UI triggers fetchCandles which returns data the chart can render | VERIFIED | `detail/[symbol].tsx` lines 30-32: useEffect on [symbol, timeframe] calls fetchCandles; detail.test.ts confirms |
| 8 | Tapping a stock on the watchlist navigates to a detail view showing a candlestick chart | VERIFIED | `index.tsx` line 45: `router.push('/detail/${item.symbol}')` in StockCard onPress; detail screen renders CandleChart |
| 9 | Tapping each timeframe button loads and renders correct historical data | VERIFIED | TimeframeSelector calls onSelect -> setTimeframe -> useEffect triggers fetchCandles; wiring confirmed |
| 10 | Chart renders smoothly with Skia-based wagmi-charts, not SVG | FAILED | wagmi-charts v2.9.1 uses react-native-svg internally (confirmed from node_modules source). RESEARCH.md was incorrect about Skia basis. VolumeBar uses React Native Views, not Skia Canvas |
| 11 | Press-and-hold shows crosshair line with OHLCV tooltip near touch point, and header price updates to touched candle | FAILED | User checkpoint confirmed gesture does not trigger on device. Code structure is correct but runtime behavior fails |

**Score: 9/11 truths verified**

---

### Required Artifacts

#### Plan 01 Artifacts

| Artifact | Min Lines | Actual Lines | Status | Details |
|----------|-----------|--------------|--------|---------|
| `invest-app/src/features/charts/types.ts` | — | 13 | VERIFIED | Exports OHLCVPoint, Timeframe, TIMEFRAMES — all required exports present |
| `invest-app/src/features/charts/services/historicalService.ts` | — | 180 | VERIFIED | Exports fetchCandles, twseDateToTimestamp, getDateRange; full FinMind+TWSE logic |
| `invest-app/src/features/charts/store/chartStore.ts` | — | 56 | VERIFIED | Exports useChartStore with fetchCandles/getCandles/clearCache; Zustand v5 pattern |
| `invest-app/src/__tests__/historicalService.test.ts` | — | 168 | VERIFIED | 11 tests: date parsing, date range, FinMind fetch, TWSE fallback, comma-number parsing |
| `invest-app/src/__tests__/chartStore.test.ts` | — | 130 | VERIFIED | 8 tests: cache storage, cache hit, getCandles, loading toggle, error capture, clearCache |

#### Plan 02 Artifacts

| Artifact | Min Lines | Actual Lines | Status | Details |
|----------|-----------|--------------|--------|---------|
| `invest-app/src/features/charts/components/CandleChart.tsx` | 40 | 62 | VERIFIED | CandlestickChart.Provider with CandleDataBridge, Candles, Crosshair, Tooltip; meets min_lines |
| `invest-app/src/features/charts/components/VolumeBar.tsx` | 25 | 40 | VERIFIED | React Native View-based bars with green/red coloring; meets min_lines |
| `invest-app/src/features/charts/components/TimeframeSelector.tsx` | 30 | 81 | VERIFIED | Reanimated sliding highlight with onLayout-measured pillWidth; meets min_lines |
| `invest-app/src/features/charts/components/ChartSkeleton.tsx` | 10 | 33 | VERIFIED | withRepeat opacity pulse shimmer; meets min_lines |
| `invest-app/src/app/detail/[symbol].tsx` | 60 | 138 | VERIFIED | Bloomberg header, FadeIn chart, skeleton/error/data states, all components wired; meets min_lines |
| `invest-app/src/__tests__/VolumeBar.test.ts` | — | 54 | VERIFIED | 4 tests: empty data, bar count, green/red colors, height calculation |
| `invest-app/src/__tests__/CandleChart.test.ts` | — | 65 | VERIFIED | 4 tests: wagmi format mapping, OHLC fields, callback behavior |
| `invest-app/src/__tests__/detail.test.ts` | — | 78 | VERIFIED | 4 tests: fetchCandles on mount, timeframe change, loading state, undefined before fetch |

---

### Key Link Verification

#### Plan 01 Key Links

| From | To | Via | Pattern | Status | Evidence |
|------|----|-----|---------|--------|---------|
| `chartStore.ts` | `historicalService.ts` | fetchCandles import | `import.*fetchCandles.*historicalService` | WIRED | Line 2: `import { fetchCandles as fetchCandlesService } from '../services/historicalService'` |
| `historicalService.ts` | `types.ts` | OHLCVPoint type import | `import.*OHLCVPoint.*types` | WIRED | Line 1: `import { OHLCVPoint, Timeframe } from '../types'` |

#### Plan 02 Key Links

| From | To | Via | Pattern | Status | Evidence |
|------|----|-----|---------|--------|---------|
| `detail/[symbol].tsx` | `chartStore.ts` | useChartStore hook | `useChartStore` | WIRED | Line 9 (import) + Line 20 (usage): `const { fetchCandles, getCandles, loading, errors } = useChartStore()` |
| `detail/[symbol].tsx` | `quoteStore.ts` | useQuoteStore for live price | `useQuoteStore` | WIRED | Line 11 (import) + Line 19 (usage): `const quote = useQuoteStore(s => s.quotes[symbol])` |
| `CandleChart.tsx` | `react-native-wagmi-charts` | CandlestickChart.Provider import | `import.*CandlestickChart.*wagmi` | WIRED | Line 3: `import { CandlestickChart } from 'react-native-wagmi-charts'` |
| `VolumeBar.tsx` | `@shopify/react-native-skia` | Canvas and Rect imports | `import.*Canvas.*Rect.*skia` | NOT_WIRED | VolumeBar uses React Native View/View — Skia was not installed (EFBIG npm error in Plan 01). No Skia imports anywhere in the codebase |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| CHRT-01 | 04-02 | User can tap a stock to see a detail view with candlestick chart | SATISFIED | `index.tsx:45` navigates to `/detail/${symbol}`; CandleChart renders wagmi CandlestickChart in detail screen |
| CHRT-02 | 04-01 | Chart supports 5 timeframes: 1 Day, 5 Days, 1 Month, 6 Months, 1 Year | SATISFIED | TimeframeSelector renders TIMEFRAMES=['1D','5D','1M','6M','1Y']; historicalService handles all 5; chartStore caches per timeframe |
| CHRT-03 | 04-01, 04-02 | Volume bars displayed below the price chart | SATISFIED | VolumeBar renders proportional green/red React Native View bars; wired in detail screen below CandleChart |
| CHRT-04 | 04-02 | Chart renders smoothly (Skia-based, no SVG performance cliff) | BLOCKED | wagmi-charts v2.9.1 uses react-native-svg (confirmed from node_modules source). The "Skia-based" claim in RESEARCH.md was factually incorrect. Smooth rendering on 240+ candles is unverified. VolumeBar switched from planned Skia to View-based (Skia could not be installed) |

**Orphaned requirements check:** REQUIREMENTS.md maps CHRT-01..CHRT-04 to Phase 4. All four appear in plan frontmatter (04-01 claims CHRT-02, CHRT-04; 04-02 claims CHRT-01, CHRT-03, CHRT-04). No orphans.

**Note on CHRT-04 and both plans:** 04-01 claims CHRT-04 (`requirements: [CHRT-02, CHRT-04]`). CHRT-04 is about render technology (Skia vs SVG), which is a Plan 02 concern. The claim in 04-01's requirements field appears to be a planning artifact — the actual library install (wagmi-charts) happened in 04-01 but Skia for VolumeBar was deferred because `@shopify/react-native-skia` could not be installed.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `CandleChart.tsx` | 36 | `return null` | INFO | `CandleDataBridge` returns null intentionally — it is a headless bridge component reading crosshair data. Not a stub; this is correct behavior |

No TODO/FIXME/placeholder comments found in any phase 04 files. No empty return implementations. No stub API routes. No console.log-only implementations.

---

### Test Results

All 102 tests pass (13 test suites):

```
Tests:       102 passed, 102 total
Test Suites: 13 passed, 13 total
```

Phase 04 specific test breakdown:
- `historicalService.test.ts`: 11 tests PASS
- `chartStore.test.ts`: 8 tests PASS (including clearCache edge cases)
- `VolumeBar.test.ts`: 5 tests PASS
- `CandleChart.test.ts`: 4 tests PASS
- `detail.test.ts`: 4 tests PASS

TypeScript: `npx tsc --noEmit` — output not captured but Plan 01 and 02 summaries both confirm clean compile. All imported types are verified present in actual files.

---

### Human Verification Required

#### 1. Performance: 1Y Chart Scroll Smoothness

**Test:** Open the 1Y timeframe on any stock (e.g. 2330). Scroll through the 240+ candles on a mid-range Android device (e.g. Galaxy A52).
**Expected:** Smooth animation with no visible jank or frame drops during scroll.
**Why human:** Frame rate cannot be measured with automated tests. This is the core concern of CHRT-04 — whether wagmi-charts (even though SVG-based) meets performance requirements in practice.

#### 2. Navigation and Visual Layout

**Test:** Tap a stock on the watchlist. Verify the detail screen appears with (a) Bloomberg-style header showing symbol, name, live price, change color, (b) candlestick chart with green/red candles, (c) volume bars below with matching green/red coloring, (d) back button returns to watchlist.
**Expected:** All elements visible and correctly styled.
**Why human:** Visual layout and navigation require device/emulator inspection.

#### 3. Timeframe Switching Animation

**Test:** Tap each of the 5 timeframe buttons in sequence on the detail screen.
**Expected:** Sliding highlight pill animates smoothly to each selection, skeleton shows while data loads, chart content updates after load.
**Why human:** Animation quality and loading state behavior require visual inspection.

#### 4. Crosshair Gesture (Known Failure)

**Test:** Press and hold on the candlestick chart area.
**Expected (per spec):** Vertical crosshair appears, OHLCV tooltip shows near touch point, header price updates to touched candle's close.
**Expected (current reality):** This does NOT work per user checkpoint approval comment: "Tap-and-hold crosshair does not work."
**Why human:** Gesture debugging requires device-level investigation. Gap should be fixed before considering CHRT-04 and the crosshair truth satisfied.

---

### Gaps Summary

Two gaps block full goal achievement:

**Gap 1 — CHRT-04: SVG vs Skia rendering**

The research document stated wagmi-charts is "built on react-native-skia and Reanimated — confirmed Skia path; no SVG involved." This is factually incorrect. Inspecting `node_modules/react-native-wagmi-charts/src/charts/candle/Candles.tsx` confirms it imports directly from `react-native-svg`.

Additionally, the planned Skia-based VolumeBar was abandoned because `@shopify/react-native-skia` could not be installed (EFBIG npm error). VolumeBar now uses React Native View layout instead.

The requirement "Chart renders smoothly (Skia-based, no SVG performance cliff)" has two possible resolutions:
1. **Accept and re-scope:** If the wagmi-charts SVG renderer performs acceptably on 240+ candles (verify on device), update CHRT-04 wording to reflect the actual implementation.
2. **Replace:** Swap wagmi-charts for a genuinely Skia-based library (e.g., Victory Native XL with Skia renderer, or react-native-skia-charts) to honor the original technical requirement.

**Gap 2 — Crosshair gesture not triggering on device**

The `CandleDataBridge` + `useAnimatedReaction` + `runOnJS` pattern is structurally correct and TypeScript-clean, but the gesture does not register on the test device. The RESEARCH.md identified this as Pitfall 4 (wagmi-charts Issue #54) — requires verifying `GestureHandlerRootView` is properly configured at app root. This affects the crosshair truth and partially affects CHRT-01 (the "tap to see candlestick chart" requirement does work; only the interaction feature fails).

---

*Verified: 2026-03-20T08:00:00Z*
*Verifier: Claude (gsd-verifier)*
