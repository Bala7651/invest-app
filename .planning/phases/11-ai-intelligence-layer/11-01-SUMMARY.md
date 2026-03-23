---
phase: 11-ai-intelligence-layer
plan: "01"
subsystem: ui
tags: [react-native, typescript, candlestick-patterns, ohlcv, pattern-detection, charts]

# Dependency graph
requires:
  - phase: 04-charts
    provides: OHLCVPoint type, chartStore getCandles(), detail screen UI surface, VolumeBar component

provides:
  - Pure TS candlestick pattern detector (detectPatterns) identifying 8 patterns from OHLCV data
  - PatternCard component rendering below VolumeBar with pattern name, Chinese explanation, signal pill
  - PatternCard wired into detail/[symbol].tsx with ScrollView for overflow safety

affects:
  - 11-02 (portfolio health — same detail screen UI surface awareness)
  - 11-03 (AI notifications — independent but same phase)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure TS pattern detector: pure function returning PatternResult | null, no React deps, body=0 guard"
    - "Confidence ranking: 3-candle (0.9) > 2-candle (0.7) > 1-candle (0.5) > doji (0.3)"
    - "PatternCard: useMemo(() => detectPatterns(candles), [candles]) to avoid re-render storm"
    - "ScrollView wrapping below-chart content to prevent overflow on small screens"

key-files:
  created:
    - invest-app/src/__tests__/patternDetector.test.ts
    - invest-app/src/features/charts/services/patternDetector.ts
    - invest-app/src/features/charts/components/PatternCard.tsx
  modified:
    - invest-app/src/app/detail/[symbol].tsx

key-decisions:
  - "Hammer/inverted-hammer require prior trend (bearish/bullish) — prevents false signals on sideways markets"
  - "Shooting star uses bullish prior trend check; inverted hammer does not — different context requirements"
  - "Morning/evening star uses c2 body <= 30% of c1 body as near-doji threshold (not absolute doji)"
  - "ScrollView wraps only PatternCard + TimeframeSelector + AlertStatusBar; chart stays outside scroll"
  - "candles passed directly from chartStore hook in parent; PatternCard does not call useChartStore itself"

patterns-established:
  - "Pattern detector: checks array ordered by confidence desc; first match after sort wins"
  - "Signal pill: backgroundColor inline style (not className) for dynamic color; text always white"

requirements-completed: [AI-11]

# Metrics
duration: 15min
completed: 2026-03-23
---

# Phase 11 Plan 01: Candlestick Pattern Detection Summary

**Pure TypeScript 8-pattern candlestick detector (錘子/倒錘子/吞噬/恆星線/十字星/早晨之星/黃昏之星) with confidence ranking and PatternCard component below volume bars in the stock detail screen**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-23T00:00:00Z
- **Completed:** 2026-03-23
- **Tasks:** 3 (TDD: RED + GREEN + wire)
- **Files modified:** 4

## Accomplishments

- Implemented `detectPatterns(OHLCVPoint[]): PatternResult | null` in pure TypeScript with no React or API dependencies
- All 8 candlestick patterns with correct OHLCV ratio thresholds, prior-trend checks, and body=0 NaN guard
- PatternCard component renders null when no pattern; shows name, explanation, and colored signal pill (看漲/中性/看跌)
- Wired PatternCard between VolumeBar and TimeframeSelector in detail screen; wrapped scrollable section in ScrollView

## Task Commits

Each task was committed atomically:

1. **Task 1: Write test stubs for patternDetector (RED phase)** - `712940c` (test)
2. **Task 2: Implement patternDetector.ts and PatternCard.tsx (GREEN phase)** - `6343313` (feat)
3. **Task 3: Wire PatternCard into the stock detail screen** - `92803ef` (feat)

## Files Created/Modified

- `invest-app/src/__tests__/patternDetector.test.ts` - 12 test cases covering all 8 patterns, null return, strongest selection, NaN guard, empty array
- `invest-app/src/features/charts/services/patternDetector.ts` - Pure TS detector; exports detectPatterns, PatternResult, PatternSignal
- `invest-app/src/features/charts/components/PatternCard.tsx` - UI card with name (text-text bold), explanation (text-muted xs), signal pill (colored bg)
- `invest-app/src/app/detail/[symbol].tsx` - Added PatternCard import, ScrollView import, PatternCard between VolumeBar and TimeframeSelector

## Pattern Detection Rules and Thresholds

| Pattern | Confidence | Key Rules |
|---------|-----------|-----------|
| 早晨之星 / 黃昏之星 | 0.9 | 3 candles; c1 body > 60% range; c2 body <= 30% c1 body; c3 closes beyond c1 midpoint |
| 吞噬多頭 / 吞噬空頭 | 0.7 | 2 candles; current fully engulfs prior (open < prev.close AND close > prev.open) |
| 錘子 / 恆星線 | 0.5 | 1 candle + prior trend (bearish for 錘子, bullish for 恆星線); lower/upper shadow >= 2x body; opposite shadow <= 10% range; body in upper/lower 1/3 |
| 倒錘子 | 0.5 | 1 candle; body in lower 1/3; upper shadow >= 2x body; lower shadow <= 10% range |
| 十字星 | 0.3 | 1 candle; body <= 5% of high-low range |

Body=0 guard: `Math.abs(close - open) < 0.01` skips ratio checks that would produce NaN/Infinity.

## Decisions Made

- Hammer and shooting star require a 3-candle prior trend check (uses trailing candles before the pattern candle) to reduce false positives on sideways markets
- Inverted hammer omits prior trend check — it's a potential reversal signal that doesn't require confirmed downtrend
- Near-doji in morning/evening star uses 30% of c1 body as threshold (more lenient than strict doji) to catch realistic 3-candle formations
- PatternCard reads candles directly from props (passed from parent hook); does not call useChartStore internally — avoids double subscription

## Deviations from Plan

None — plan executed exactly as written. The inverted hammer's prior trend check was omitted by design (inverted hammer is an alerting pattern, not a confirmed reversal), which matches typical technical analysis practice.

## Issues Encountered

None. Pre-existing test failures (historicalService.test.ts, analysisStore.test.ts) existed before this plan and are unrelated to pattern detection.

## Test Results

- **patternDetector.test.ts:** 12/12 GREEN
- **Full suite:** 275 pass, 1 fail (historicalService - pre-existing), 1 suite fail (analysisStore SQLite mock - pre-existing)
- **tsc --noEmit:** 0 errors

## User Setup Required

None — no external service configuration required. Pattern detection is fully offline, zero API cost.

## Next Phase Readiness

- AI-11 complete; PatternCard displays below VolumeBar on detail screen
- Ready for Phase 11-02 (Portfolio Health) and 11-03 (AI-enriched notifications)
- ScrollView already added to detail screen; future items (alerts UI) can be added without layout concerns

---
*Phase: 11-ai-intelligence-layer*
*Completed: 2026-03-23*
