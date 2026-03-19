---
phase: 03-watchlist
plan: 01
subsystem: database
tags: [drizzle-orm, zustand, sqlite, expo-sqlite, react-native, twse]

# Dependency graph
requires:
  - phase: 02-data-layer
    provides: quoteStore polling (startPolling/stopPolling), marketHours (isMarketOpen), drizzle-orm db/client, watchlist schema
  - phase: 01-foundation
    provides: drizzle-orm migration infrastructure, SQLite setup

provides:
  - watchlistService.ts with getAll, insertItem, deleteItem, updateSortOrders CRUD
  - watchlistStore.ts with async addItem/removeItem/loadFromDb/reorderItems, SQLite sync, polling restart
  - stocks.json bundled TWSE stock list (1078 entries with short names)
  - searchStocks.ts filterStocks pure function for substring search
  - _layout.tsx hydration of watchlist from SQLite on migration success

affects: [03-02-ui, 03-03-search-modal, 04-detail-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - drizzle-orm returning() for INSERT to get inserted row with generated id
    - Zustand store actions as async functions calling service layer then updating state
    - stocks.json fetched from TWSE API at build time, committed as static asset
    - Pure function filterStocks extracted for both test and UI reuse
    - Polling restart pattern: stopPolling then startPolling after watchlist mutation

key-files:
  created:
    - invest-app/src/services/watchlistService.ts
    - invest-app/src/assets/stocks.json
    - invest-app/src/features/watchlist/utils/searchStocks.ts
    - invest-app/src/__tests__/watchlistStore.test.ts
    - invest-app/src/__tests__/watchlistSearch.test.ts
  modified:
    - invest-app/src/features/watchlist/store/watchlistStore.ts
    - invest-app/src/app/_layout.tsx

key-decisions:
  - "stocks.json uses 公司簡稱 (short company name) instead of 公司名稱 (full name) — 台積電 not 台灣積體電路製造股份有限公司 for better search UX"
  - "_layout.tsx splits into two useEffects: hydration (success-triggered) and AppState listener (always-on) — initial polling moved into hydration so symbols are loaded before starting"
  - "Duplicate guard in addItem uses pre-insert check (items.some) not catch-after-insert — matches plan spec and avoids SQLite error handling complexity"
  - "reorderItems fires updateSortOrders fire-and-forget for responsiveness (no await)"

patterns-established:
  - "Service layer pattern: watchlistService abstracts drizzle-orm queries; store calls service, updates state"
  - "TDD: tests written first (RED), then implementation (GREEN), committed separately"

requirements-completed: [WTCH-01, WTCH-02, WTCH-03, WTCH-04]

# Metrics
duration: 3min
completed: 2026-03-19
---

# Phase 3 Plan 01: Watchlist Data Layer Summary

**drizzle-orm CRUD service + Zustand store with SQLite sync, 1078 TWSE stocks bundled as JSON with filterStocks pure function, and app-start hydration wired in _layout.tsx**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T03:46:39Z
- **Completed:** 2026-03-19T03:49:38Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- watchlistService CRUD layer with drizzle-orm: getAll, insertItem (MAX sort_order+1), deleteItem (re-indexes remaining), updateSortOrders
- watchlistStore async actions: addItem with duplicate guard, removeItem with re-index, loadFromDb, reorderItems (fire-and-forget sort persistence); polling restarts after mutations
- 1078 TWSE stocks fetched from API and committed as stocks.json; filterStocks pure function with substring match on code + name, capped at 50 results
- _layout.tsx hydration: loadFromDb called after migration success, then polling started with loaded symbols; AppState listener separated

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD RED): failing tests** - `e18c23f` (test)
2. **Task 1 (TDD GREEN): implementation** - `b83c744` (feat)
3. **Task 2: _layout.tsx hydration** - `d95caa5` (feat)

## Files Created/Modified

- `invest-app/src/services/watchlistService.ts` - drizzle-orm CRUD for watchlist table
- `invest-app/src/features/watchlist/store/watchlistStore.ts` - async Zustand store with SQLite sync and polling restart
- `invest-app/src/assets/stocks.json` - 1078 TWSE stocks (code + short name)
- `invest-app/src/features/watchlist/utils/searchStocks.ts` - pure filterStocks function
- `invest-app/src/__tests__/watchlistStore.test.ts` - unit tests for store lifecycle
- `invest-app/src/__tests__/watchlistSearch.test.ts` - unit tests for substring search
- `invest-app/src/app/_layout.tsx` - wired hydration useEffect after migration success

## Decisions Made

- **stocks.json uses 公司簡稱 (short name):** The full company name field (公司名稱) includes "股份有限公司" suffix making search by abbreviation (e.g. "台積") fail. Short name field (公司簡稱) gives "台積電" which matches common user queries.
- **Two useEffects in _layout.tsx:** Splitting hydration (depends on `success`) and AppState listener (always-on) avoids complexity and ensures polling starts after data is loaded, not before.
- **Duplicate guard before INSERT:** `items.some(i => i.symbol === symbol)` check rather than catching SQLite unique constraint errors — cleaner flow, matches plan spec.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] stocks.json used full company name instead of short name**

- **Found during:** Task 1 (watchlistSearch test - '台積' returned 0 results)
- **Issue:** TWSE API 公司名稱 field contains "台灣積體電路製造股份有限公司" — searching "台積" returns nothing
- **Fix:** Switched to 公司簡稱 (short name field) which has "台積電"; search by common abbreviations now works
- **Files modified:** invest-app/src/assets/stocks.json
- **Verification:** filterStocks('台積') returns 1 result (台積電), all 12 tests pass
- **Committed in:** b83c744 (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in data extraction field choice)
**Impact on plan:** Necessary correction for correct search UX. No scope creep.

## Issues Encountered

None beyond the stocks.json field selection fix above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- watchlistService and watchlistStore fully operational — Phase 3 UI (03-02) can import and use immediately
- filterStocks exported from searchStocks.ts — SearchModal (03-03) can import directly
- _layout.tsx hydration wired — app loads persisted watchlist on first render
- All 62 tests pass, tsc --noEmit clean

---
*Phase: 03-watchlist*
*Completed: 2026-03-19*
