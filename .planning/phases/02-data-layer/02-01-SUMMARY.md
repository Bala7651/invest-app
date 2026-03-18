---
phase: 02-data-layer
plan: 01
subsystem: api
tags: [twse, fetch, queue, rate-limit, market-hours, holidays, jest, tdd]

# Dependency graph
requires:
  - phase: 01-foundation/01-02
    provides: jest-expo test infrastructure configured; src/__tests__/ established
provides:
  - FIFO RequestQueue class with 2s minimum spacing (stockService.ts)
  - getQuotes(symbols) typed TWSE fetch function — only public fetch API
  - TWSEQuote interface: symbol, name, price, prevClose, open, high, low, volume, updatedAt
  - parseSentinel helper: converts '-' and '' to null, NaN to null
  - isMarketOpen(now) pure function: true only Mon-Fri 09:00-13:30 Asia/Taipei, excluding holidays
  - isHoliday(date) pure function: checks against 2026 TWSE holiday list
  - computeStatus(now) pure function: returns open/label with countdown
  - HOLIDAYS_2026 list: 18 Taiwan public holidays for 2026
affects: [02-02, 02-03, 03-watchlist, 04-charts, 08-background, 09-alerts]

# Tech tracking
tech-stack:
  added:
    - 'test script added to package.json (jest invocation via jest-expo preset)'
  patterns:
    - FIFO async queue with private class + module-level singleton (no external library)
    - parseSentinel pattern for TWSE z-field dash sentinel handling
    - toLocaleString timezone conversion for Asia/Taipei (avoids UTC+8 raw offset bugs)
    - Optional 'now' param on all market-hours functions for test-time injection (no Date mocking needed)
    - TDD: RED test file first, then GREEN implementation, all 41 tests passing after each task

key-files:
  created:
    - invest-app/src/services/stockService.ts
    - invest-app/src/features/market/marketHours.ts
    - invest-app/src/features/market/holidays2026.ts
    - invest-app/src/__tests__/stockService.test.ts
    - invest-app/src/__tests__/marketHours.test.ts
  modified:
    - invest-app/package.json (added test script)

key-decisions:
  - "encodeURIComponent applied to pipe-delimited ex_ch param — tests use decodeURIComponent to assert literal pipe character"
  - "parseSentinel exported for direct unit testing — only underscore-free public export alongside getQuotes and TWSEQuote"
  - "computeStatus scans up to 7 days ahead to find next trading day for the opens time label"
  - "isHoliday accepts a pre-converted Taipei Date (not UTC) — callers must convert before passing"

patterns-established:
  - "TWSE fetch pattern: tse_${symbol}.tw pipe-joined, mis.twse.com.tw/stock/api/getStockInfo.jsp, 10s AbortSignal timeout"
  - "Queue singleton: class not exported, module-level const not exported, getQuotes is the only gateway"
  - "Market-hours pattern: always convert to Asia/Taipei via toLocaleString before any time comparison"

requirements-completed: [DATA-01, DATA-05]

# Metrics
duration: 12min
completed: 2026-03-18
---

# Phase 2 Plan 01: TWSE OpenAPI client with FIFO queue and market-hours pure functions Summary

**TWSE intraday client with 2s FIFO queue, sentinel-safe parsing, and Asia/Taipei-aware market hours/holiday detection — 41 unit tests all passing**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-18T12:34:18Z
- **Completed:** 2026-03-18T12:46:00Z
- **Tasks:** 2
- **Files modified:** 5 created, 1 modified

## Accomplishments

- StockService FIFO queue enforces 2s minimum spacing between TWSE requests; _fetchQuotes and _queue are unexported (bypass impossible, unit-test verified)
- parseSentinel correctly converts TWSE dash sentinel ('-', '') to null and NaN strings to null — prevents NaN prices on watchlist
- isMarketOpen uses Intl.DateTimeFormat/toLocaleString for Asia/Taipei conversion covering all edge cases: weekends, holidays, boundary minutes (08:59, 09:00, 13:29, 13:30)
- 18-entry 2026 Taiwan holiday list hardcoded with source URL comment for annual verification
- All 41 tests pass: 15 Phase 1 regression + 11 stockService + 15 marketHours

## Task Commits

Each task was committed atomically:

1. **Task 1: Create StockService with FIFO queue, TWSE fetch, and unit tests** - `b2f6fc0` (feat)
2. **Task 2: Create marketHours pure functions, holidays list, and unit tests** - `d8126de` (feat)

**Plan metadata:** (docs commit follows)

_Note: Both tasks used TDD — tests written first (RED), then implementation (GREEN)_

## Files Created/Modified

- `invest-app/src/services/stockService.ts` - RequestQueue class, _fetchQuotes, getQuotes, TWSEQuote, parseSentinel
- `invest-app/src/features/market/marketHours.ts` - isMarketOpen, isHoliday, computeStatus, toTaipeiDate
- `invest-app/src/features/market/holidays2026.ts` - HOLIDAYS_2026 string array (18 dates)
- `invest-app/src/__tests__/stockService.test.ts` - 11 tests: export bypass, parseSentinel, URL format, queue spacing
- `invest-app/src/__tests__/marketHours.test.ts` - 15 tests: isMarketOpen edge cases, isHoliday, computeStatus labels
- `invest-app/package.json` - Added `"test": "jest"` script (jest-expo preset was already configured)

## Decisions Made

- `parseSentinel` exported for direct unit testing; all other internal functions remain unexported
- URL format test uses `decodeURIComponent` on the captured URL before asserting pipe character — `encodeURIComponent` correctly encodes `|` to `%7C` in the real URL
- `isHoliday` receives an already-converted Taipei Date object; `isMarketOpen` handles the UTC→Taipei conversion internally
- `computeStatus` scans up to 7 days ahead to find next trading day (handles consecutive holiday+weekend gaps)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing `test` script to package.json**
- **Found during:** Task 1 (RED phase test run)
- **Issue:** `npm test` returned "Missing script: test" — jest config existed but script entry was absent
- **Fix:** Added `"test": "jest"` to scripts in package.json
- **Files modified:** invest-app/package.json
- **Verification:** `npm test` runs all 4 test files successfully
- **Committed in:** b2f6fc0 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed URL format test to use decodeURIComponent**
- **Found during:** Task 1 (GREEN phase — 1 test failed)
- **Issue:** Test asserted `calledUrl.toContain('|')` but `encodeURIComponent` encodes `|` as `%7C` — the URL was correct but the test assertion was wrong
- **Fix:** Wrapped the captured URL with `decodeURIComponent()` before assertion
- **Files modified:** invest-app/src/__tests__/stockService.test.ts
- **Verification:** All 11 stockService tests pass
- **Committed in:** b2f6fc0 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 3 blocking, 1 Rule 1 bug)
**Impact on plan:** Both auto-fixes necessary for test infrastructure and correct assertion. No scope creep.

## Issues Encountered

- npm test script missing from package.json (jest-expo preset was configured but not wired to a script) — resolved by adding script entry

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- StockService ready: getQuotes accepts symbol array, returns typed TWSEQuote[], handles TWSE sentinel and retries internally
- marketHours ready: isMarketOpen, isHoliday, computeStatus all unit tested and timezone-correct
- Phase 2 Plan 02 (quoteStore + polling lifecycle) can proceed — depends on both outputs of this plan
- No new packages required — all Phase 2 dependencies were already installed in Phase 1

## Self-Check: PASSED

All created files confirmed present on disk. Both task commits (b2f6fc0, d8126de) confirmed in git log.

---
*Phase: 02-data-layer*
*Completed: 2026-03-18*
