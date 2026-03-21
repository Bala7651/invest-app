---
phase: 08-daily-summary
plan: 01
subsystem: database
tags: [zustand, drizzle-orm, sqlite, minimax, twse, taiwan-stock, ai-summary]

# Dependency graph
requires:
  - phase: 06-ai-analysis
    provides: callMiniMax pattern, MiniMax API fetch shape, QuoteData interface
  - phase: 02-data-layer
    provides: db client, daily_summaries schema, marketHours.isHoliday, quoteStore
  - phase: 03-watchlist
    provides: useWatchlistStore.items
  - phase: 05-settings
    provides: useSettingsStore (API credentials)
provides:
  - summaryService: fetchTWIX, upsertSummary, purgeOldSummaries, getTodayISO, getCutoffISO, isCatchUpNeeded, buildSummaryPrompt, buildIndexSummaryPrompt, callSummaryMiniMax, loadAllSummaries, hasSummaryForDate
  - summaryStore: useSummaryStore with generating, progress, errors, summariesByDate, generateToday, loadSummaries
  - SummaryEntry, Credentials, ERROR_PREFIX types
affects: [08-02-ui, _layout.tsx catch-up integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Delete-then-insert upsert pattern for daily_summaries (no unique constraint on symbol+date)"
    - "Taipei timezone ISO date via toLocaleString('en-US', { timeZone: 'Asia/Taipei' }) — never toISOString()"
    - "callSummaryMiniMax returns plain string (not parsed JSON) — max_tokens 300, temperature 0.3"
    - "ERROR_PREFIX constant marks failed per-stock entries so partial results are persisted"
    - "summaryStore.generateToday is idempotent: guard on get().generating"
    - "purgeOldSummaries uses drizzle lt() on text ISO date (lexicographic comparison correct for ISO)"

key-files:
  created:
    - invest-app/src/features/summary/types.ts
    - invest-app/src/features/summary/services/summaryService.ts
    - invest-app/src/features/summary/store/summaryStore.ts
    - invest-app/src/__tests__/summaryService.test.ts
  modified: []

key-decisions:
  - "callSummaryMiniMax built separately from callMiniMax — needs plain text response (not JSON AnalysisResult), max_tokens 300 vs 600"
  - "isCatchUpNeeded checks Taipei time >= 12:30 + weekday + not holiday; exported for _layout.tsx use in Plan 02"
  - "hasSummaryForDate exported for catch-up guard in _layout.tsx (Plan 02)"
  - "buildSummaryPrompt takes SummaryQuoteData (subset of QuoteData) — avoids importing QuoteData cross-feature"

patterns-established:
  - "SummaryStore pattern: generating boolean guard + progress { done, total } counter + per-symbol errors map"
  - "Sequential AI loop: await each stock individually to avoid rate limits; increment progress.done after each"
  - "Two-step upsert: db.delete where (symbol AND date), then db.insert — prevents duplicate rows on re-generate"

requirements-completed: [SUMM-01, SUMM-02, SUMM-03, SUMM-04]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 8 Plan 01: Daily Summary Service and Store Summary

**TWSE index fetch + per-stock AI summary service with SQLite upsert/purge and Zustand progress store — 27 unit tests all green**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-21T14:08:44Z
- **Completed:** 2026-03-21T14:11:05Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- summaryService.ts: full service layer — TWSE MI_INDEX fetch, Taipei-aware date helpers, Traditional Chinese prompts, plain-text MiniMax call, delete-then-insert upsert, 14-day purge, query helpers
- summaryStore.ts: Zustand store with idempotent generateToday orchestrating TWIX + per-stock loop + purge + reload; ERROR_PREFIX for partial failure persistence
- 27 unit tests covering date helpers, fetchTWIX, prompt builders, upsert/purge with mocked db — all green

## Task Commits

1. **Task 1: Create types and summaryService** - `b2691c4` (feat)
2. **Task 2: Create summaryStore and unit tests** - `dce7634` (feat + TDD)

## Files Created/Modified

- `invest-app/src/features/summary/types.ts` - SummaryEntry, Credentials, ERROR_PREFIX
- `invest-app/src/features/summary/services/summaryService.ts` - All service functions (11 exports)
- `invest-app/src/features/summary/store/summaryStore.ts` - useSummaryStore Zustand store
- `invest-app/src/__tests__/summaryService.test.ts` - 27 unit tests for service layer

## Decisions Made

- `callSummaryMiniMax` built separately from `callMiniMax` — needs plain text string response (not AnalysisResult JSON), `max_tokens: 300` (shorter summary vs 600 for analysis), same fetch pattern/URL
- `buildSummaryPrompt` accepts a local `SummaryQuoteData` interface rather than importing `QuoteData` from minimaxApi — avoids cross-feature dependency, only needs price/change/changePct/prevClose
- `isCatchUpNeeded()` exported from service (not store) — Plan 02 will import it directly in `_layout.tsx`
- `hasSummaryForDate()` exported — used by catch-up guard in _layout.tsx to skip generation if today's summary already exists

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- summaryService and summaryStore are complete data/state foundation ready for Plan 02 UI consumption
- Plan 02 needs: SummaryScreen component, SummaryCard expandable card, SummarySkeleton, PagerView 4th page, _layout.tsx catch-up trigger
- No blockers

---
*Phase: 08-daily-summary*
*Completed: 2026-03-21*
