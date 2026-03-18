---
phase: 02-data-layer
plan: 02
subsystem: data
tags: [zustand, polling, react-native, appstate, market-hours]

# Dependency graph
requires:
  - phase: 02-data-layer/02-01
    provides: stockService getQuotes, marketHours isMarketOpen
provides:
  - Zustand quoteStore with startPolling/stopPolling lifecycle
  - _layout.tsx wired with AppState listener for foreground/background polling
  - Unit tests for full polling lifecycle
affects: [03-watchlist-ui, 04-chart-detail, 05-ai-analysis]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zustand v5 store with _intervalId private state for interval management"
    - "Idempotent startPolling: guard with polling boolean to prevent double intervals"
    - "Final-fetch-then-stop pattern when isMarketOpen returns false during tick"
    - "AppState listener in root layout useEffect for background/foreground polling control"

key-files:
  created:
    - invest-app/src/features/market/quoteStore.ts
    - invest-app/src/__tests__/quoteStore.test.ts
  modified:
    - invest-app/src/app/_layout.tsx

key-decisions:
  - "useEffect in _layout.tsx positioned before migration guard returns so cleanup always fires on unmount"
  - "Quotes NOT cleared on stopPolling — cached data remains accessible when market is closed"
  - "startPolling is idempotent via polling boolean guard — safe to call from AppState foreground events"

patterns-established:
  - "AppState polling lifecycle: start on active+market-open, stop on background, cleanup on unmount"
  - "Quote record keyed by symbol for O(1) lookup in UI components"

requirements-completed: [DATA-01, DATA-02, DATA-04]

# Metrics
duration: 15min
completed: 2026-03-19
---

# Phase 2 Plan 02: quoteStore Summary

**Zustand quoteStore with 30s polling lifecycle, market-hours guard, AppState background/foreground handling wired into root layout**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-19T00:00:00Z
- **Completed:** 2026-03-19T00:15:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Zustand quoteStore delivers startPolling/stopPolling with 30-second interval and idempotency guard
- Polling auto-stops on market close with one final fetch before halt; quotes remain cached
- _layout.tsx wired with AppState listener: background pauses polling, foreground resumes if market open
- 50 tests pass across all test suites including full quoteStore lifecycle coverage

## Task Commits

Each task was committed atomically:

1. **Task 1: Create quoteStore with polling lifecycle and unit tests** - `2c88c1d` (feat)
2. **Task 2: Wire quoteStore into _layout.tsx with AppState handling** - `014ccee` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `invest-app/src/features/market/quoteStore.ts` - Zustand store: quotes map, polling state, startPolling/stopPolling with interval and market-hours guard
- `invest-app/src/__tests__/quoteStore.test.ts` - Unit tests: polling start/stop, idempotent start, market-closed final-fetch, quote caching after stop
- `invest-app/src/app/_layout.tsx` - Added useEffect with AppState listener for polling lifecycle management

## Decisions Made

- `useEffect` placed before migration guard returns to ensure cleanup (sub.remove + stopPolling) always fires on unmount regardless of migration state
- Quotes NOT cleared on `stopPolling` — cached data with `fetchedAt` timestamp remains accessible when market is closed (allows displaying stale prices with timestamp)
- `startPolling` is idempotent via `polling` boolean guard — safe to call repeatedly from AppState `active` events without creating duplicate intervals

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- quoteStore is ready to be consumed by WatchlistPage and other UI components via `useQuoteStore(state => state.quotes)`
- AppState polling lifecycle is fully operational; no changes needed in Phase 3
- Cached quotes with `fetchedAt` timestamps available for "last updated" display in UI

---
*Phase: 02-data-layer*
*Completed: 2026-03-19*
