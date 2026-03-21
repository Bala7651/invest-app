---
phase: 09-price-alerts
plan: 01
subsystem: database
tags: [sqlite, drizzle, expo-notifications, expo-background-task, expo-task-manager, zustand]

# Dependency graph
requires:
  - phase: 02-data-layer
    provides: stockService.getQuotes for background price checks, marketHours.isMarketOpen for task gate
  - phase: 03-watchlist
    provides: drizzle ORM SQLite patterns (watchlistService, watchlistStore)
  - phase: 08-daily-summary
    provides: expo-background-task infrastructure pattern
provides:
  - price_alerts SQLite table with uniqueIndex on symbol
  - alertService: upsertAlert, getAll, deleteAlert, markTriggered, reEnableDirection, getActiveSymbols
  - alertMonitor.checkAlerts: evaluates quote prices against thresholds, fires TIME_INTERVAL notifications
  - alertTask: PRICE_ALERT_CHECK WorkManager task defined at module top level with market hours gate
  - alertStore: Zustand CRUD with background task lifecycle management
affects: [09-02-ui, 10-polish]

# Tech tracking
tech-stack:
  added: [expo-notifications, expo-background-task, expo-task-manager, expo-intent-launcher]
  patterns:
    - delete-then-insert upsert for price_alerts (same as daily_summaries)
    - TIME_INTERVAL seconds:1 trigger for background notification reliability (avoids trigger:null bug #21267)
    - TaskManager.defineTask at module top level (not inside function) for WorkManager compatibility
    - alertStore manages both background task registration and persistent monitoring notification lifecycle

key-files:
  created:
    - invest-app/src/features/alerts/services/alertService.ts
    - invest-app/src/features/alerts/services/alertMonitor.ts
    - invest-app/src/features/alerts/services/alertTask.ts
    - invest-app/src/features/alerts/store/alertStore.ts
    - invest-app/drizzle/0001_volatile_captain_midlands.sql
    - invest-app/src/__tests__/alertService.test.ts
    - invest-app/src/__tests__/alertMonitor.test.ts
    - invest-app/src/__tests__/alertStore.test.ts
  modified:
    - invest-app/src/db/schema.ts
    - invest-app/drizzle/migrations.js
    - invest-app/drizzle/meta/_journal.json
    - invest-app/package.json

key-decisions:
  - "TIME_INTERVAL trigger with seconds:1 used for notifications from background task — trigger:null is unreliable from WorkManager context (expo-notifications GitHub issue #21267)"
  - "alertTask.defineTask called at module top level — WorkManager requires task registration before any async initialization"
  - "delete-then-insert upsert pattern for price_alerts (consistent with daily_summaries pattern, uniqueIndex handles idempotency)"
  - "alertStore manages monitoring notification lifecycle inline — no separate notification service needed"
  - "Background task calls getQuotes directly from stockService, not quoteStore — background JS context has no shared in-memory state"

patterns-established:
  - "Feature module structure: src/features/{name}/services/ + store/"
  - "alertService pattern: stateless CRUD functions importing db and schema directly"
  - "alertStore pattern: Zustand store with side effects (background task + notification) on mutations"

requirements-completed: [ALRT-02, ALRT-04, ALRT-05, ALRT-07]

# Metrics
duration: 20min
completed: 2026-03-21
---

# Phase 9 Plan 01: Price Alerts Data Layer Summary

**SQLite price_alerts table, alertService CRUD, alertMonitor notification firing with TIME_INTERVAL workaround, WorkManager task at module top level, and Zustand alertStore with background task lifecycle management**

## Performance

- **Duration:** 20 min
- **Started:** 2026-03-21T15:30:00Z
- **Completed:** 2026-03-21T15:54:35Z
- **Tasks:** 2 completed
- **Files modified:** 12

## Accomplishments

- price_alerts SQLite table with per-direction status columns and uniqueIndex on symbol; migration generated via drizzle-kit
- alertService exports 6 CRUD functions following existing watchlistService/summaryService patterns
- alertMonitor.checkAlerts evaluates both upper/lower thresholds with TIME_INTERVAL trigger (background-safe)
- alertTask defines PRICE_ALERT_CHECK WorkManager task at module top level, gates on isMarketOpen()
- alertStore wraps all CRUD with Zustand state, manages registerAlertTask/unregisterAlertTask and monitoring notification on every mutation
- 43 tests pass across alertService, alertMonitor, alertStore

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema, migration, alertService CRUD, and alertMonitor** - `270d131` (feat)
2. **Task 2: Background task definition and alertStore with tests** - `3d584b2` (feat)

**Plan metadata:** `(pending)` (docs: complete plan)

## Files Created/Modified

- `invest-app/src/db/schema.ts` - Added price_alerts table with real columns and uniqueIndex
- `invest-app/drizzle/0001_volatile_captain_midlands.sql` - Migration: CREATE TABLE price_alerts + unique index
- `invest-app/drizzle/migrations.js` - Updated to include m0001 migration import
- `invest-app/src/features/alerts/services/alertService.ts` - SQLite CRUD: upsertAlert, getAll, deleteAlert, markTriggered, reEnableDirection, getActiveSymbols
- `invest-app/src/features/alerts/services/alertMonitor.ts` - checkAlerts evaluating thresholds + TIME_INTERVAL notification firing
- `invest-app/src/features/alerts/services/alertTask.ts` - PRICE_ALERT_CHECK WorkManager task with market hours gate
- `invest-app/src/features/alerts/store/alertStore.ts` - Zustand CRUD wrapping alertService with task + notification lifecycle
- `invest-app/src/__tests__/alertService.test.ts` - 15 tests for all CRUD functions
- `invest-app/src/__tests__/alertMonitor.test.ts` - 8 tests: condition checking, null guard, call ordering, trigger type
- `invest-app/src/__tests__/alertStore.test.ts` - 20 tests: mutations, task registration, notification lifecycle

## Decisions Made

- TIME_INTERVAL trigger with `seconds: 1` for background notifications — `trigger: null` is unreliable from WorkManager context per expo-notifications GitHub issue #21267
- `TaskManager.defineTask` must be called at module top level, not inside a function or component, for WorkManager to pick up task registration
- Background task calls `getQuotes` directly from stockService rather than reading from quoteStore — background JS context is isolated with no shared in-memory Zustand state
- Monitoring notification uses `trigger: null` (foreground persistent, safe) while alert notifications use TIME_INTERVAL (background-safe)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. expo-notifications and expo-background-task were installed via `npx expo install`.

## Next Phase Readiness

- All alert data layer files exist with correct exports
- alertTask.ts is importable at `_layout.tsx` top level (Plan 02 requirement)
- alertStore exports `useAlertStore` ready for UI consumption
- Plan 02 can wire the bell icon, AlertsModal, and detail screen bottom sheet

---
*Phase: 09-price-alerts*
*Completed: 2026-03-21*
