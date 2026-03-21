---
phase: 09-price-alerts
plan: 02
subsystem: ui
tags: [react-native, expo-notifications, zustand, alerts, modal, background-task, android]

# Dependency graph
requires:
  - phase: 09-01
    provides: alertStore, alertService, alertMonitor.checkAlerts, alertTask, price_alerts SQLite table
  - phase: 04-charts
    provides: detail screen UI surface (chart, timeframe selector) for AlertStatusBar placement
  - phase: 03-watchlist
    provides: home screen (index.tsx) for bell icon placement, swipe-delete pattern (ReanimatedSwipeable)
  - phase: 08-daily-summary
    provides: _layout.tsx lifecycle useEffect patterns for app startup hydration

provides:
  - AlertModal: bottom sheet for creating/editing per-stock upper/lower price alerts with +5%/-5% defaults
  - AlertsListModal: home screen overview of all alerts with active/triggered sections and swipe-delete
  - AlertStatusBar: inline status display below chart on detail screen
  - detail screen bell icon (testID=alert-bell-icon) wired to AlertModal
  - home screen bell icon with active alert badge count wired to AlertsListModal
  - alertStore hydrated from SQLite at app startup via _layout.tsx migration-success useEffect
  - Notification channels price-alerts (HIGH) and monitoring-status (LOW) created at app startup
  - foreground alert checking via checkAlerts called inside quoteStore tick after each successful poll
  - Battery Optimization row in Settings screen linking to Android system settings
  - background task registered at module eval via top-level alertTask import in _layout.tsx
affects: [10-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bell icon with badge: useAlertStore(s => s.activeCount()) drives badge count on home header bell"
    - "Module-level side-effect import: bare import of alertTask ensures TaskManager.defineTask runs at module evaluation"
    - "Foreground alert check: checkAlerts called after quoteStore poll success path, .catch(() => {}) isolates from poll cycle"
    - "Notification setup at module level: Notifications.setNotificationHandler outside RootLayout function"
    - "Mock chaining fix: quoteStore.test.ts mocks alertMonitor to break SQLite import chain in Jest"

key-files:
  created:
    - invest-app/src/features/alerts/components/AlertModal.tsx
    - invest-app/src/features/alerts/components/AlertsListModal.tsx
    - invest-app/src/features/alerts/components/AlertStatusBar.tsx
    - invest-app/src/__tests__/settings.test.ts
  modified:
    - invest-app/src/app/detail/[symbol].tsx
    - invest-app/src/app/index.tsx
    - invest-app/src/app/_layout.tsx
    - invest-app/src/app/settings.tsx
    - invest-app/src/features/market/quoteStore.ts
    - invest-app/src/__tests__/detail.test.ts
    - invest-app/src/__tests__/quoteStore.test.ts

key-decisions:
  - "checkAlerts wrapped in .catch(() => {}) in quoteStore tick — failed alert check must never break quote polling"
  - "alertTask imported as bare module-level side-effect in _layout.tsx — bare import (not named) ensures defineTask executes without function call"
  - "quoteStore.test.ts mocks alertMonitor module — SQLite is unavailable in Jest, mock breaks import chain"
  - "Notifications.setNotificationHandler placed at _layout.tsx module level (outside component) — foreground handler must register before any notification arrives"

patterns-established:
  - "Alert UI pattern: AlertModal reuses for both create and edit — pre-fills existing values from alertStore.getBySymbol"
  - "Badge count pattern: activeCount() selector drives badge number in real-time via Zustand subscription"

requirements-completed: [ALRT-01, ALRT-03, ALRT-06]

# Metrics
duration: 10min
completed: 2026-03-22
---

# Phase 9 Plan 02: Price Alerts UI Summary

**Alert bell icons on detail/home screens, AlertModal/AlertsListModal/AlertStatusBar components, foreground checkAlerts in quoteStore tick, notification channels at startup, and Battery Optimization in Settings**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-21T15:59:00Z
- **Completed:** 2026-03-22T00:01:29Z
- **Tasks:** 2 completed
- **Files modified:** 11

## Accomplishments

- Three alert UI components created: AlertModal (per-stock create/edit), AlertsListModal (home overview with swipe-delete/re-enable), AlertStatusBar (inline below chart)
- Detail screen header wired with bell icon (testID=alert-bell-icon) opening AlertModal; AlertStatusBar added below timeframe selector
- Home screen header wired with bell icon showing active count badge, opening AlertsListModal
- _layout.tsx wired for app lifecycle: alertTask bare import, alertStore hydration, notification channel setup, foreground handler
- quoteStore.tick() calls checkAlerts after each successful poll for foreground alert monitoring
- Settings screen has Battery Optimization row with testID=battery-optimization-row linking to Android system settings
- 224 tests pass total; ALRT-01 verified by detail.test.ts (6 bell icon tests), ALRT-03 verified by settings.test.ts (4 tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Alert UI components, detail/home screen integration** - `b690017` (feat)
2. **Task 2: App lifecycle wiring, foreground alert checks, battery settings** - `bfaed89` (feat)

**Plan metadata:** `(pending)` (docs: complete plan)

## Files Created/Modified

- `invest-app/src/features/alerts/components/AlertModal.tsx` - Bottom sheet modal for per-stock upper/lower alert creation and editing with +5%/-5% defaults and validation
- `invest-app/src/features/alerts/components/AlertsListModal.tsx` - All-alerts overview modal with active/triggered sections, swipe-to-delete (ReanimatedSwipeable), re-enable per direction
- `invest-app/src/features/alerts/components/AlertStatusBar.tsx` - Inline pressable bar below chart showing current alert state, hidden when no alert set for symbol
- `invest-app/src/app/detail/[symbol].tsx` - Added bell icon (testID=alert-bell-icon) to header, AlertStatusBar below timeframe selector, alertModalVisible state
- `invest-app/src/app/index.tsx` - Added bell icon with activeCount badge to watchlist header, alertsListVisible state, AlertsListModal
- `invest-app/src/app/_layout.tsx` - Bare alertTask import, alertStore hydration, notification channel creation, foreground notification handler at module level
- `invest-app/src/app/settings.tsx` - Battery Optimization row (Android only) with testID=battery-optimization-row in new Alerts section
- `invest-app/src/features/market/quoteStore.ts` - checkAlerts called after each successful poll tick via .catch guard
- `invest-app/src/__tests__/detail.test.ts` - Extended with 6 ALRT-01 bell icon presence tests
- `invest-app/src/__tests__/settings.test.ts` - Created with 4 ALRT-03 battery optimization row tests
- `invest-app/src/__tests__/quoteStore.test.ts` - Added alertMonitor mock to break SQLite import chain

## Decisions Made

- `checkAlerts` call in quoteStore uses `.catch(() => {})` to ensure alert check failures never propagate to the quote polling cycle — poll reliability takes priority
- `alertTask` imported as a bare top-level import in `_layout.tsx` (no named imports) so that `TaskManager.defineTask` executes as a module-level side-effect before any async initialization
- `quoteStore.test.ts` required a new `vi.mock` for `alertMonitor` — Jest cannot traverse the SQLite import chain in test environment
- `Notifications.setNotificationHandler` placed at module level outside the `RootLayout` function to ensure the foreground handler registers before any notifications can arrive

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed quoteStore.test.ts failing due to alertMonitor SQLite import chain**
- **Found during:** Task 2 (quoteStore.ts checkAlerts integration)
- **Issue:** Adding `import { checkAlerts } from '../alerts/services/alertMonitor'` to quoteStore caused quoteStore.test.ts to fail — Jest attempted to traverse the import chain into alertMonitor -> alertService -> db, which requires SQLite unavailable in test environment
- **Fix:** Added `vi.mock('../features/alerts/services/alertMonitor', () => ({ checkAlerts: vi.fn() }))` to quoteStore.test.ts
- **Files modified:** invest-app/src/__tests__/quoteStore.test.ts
- **Verification:** 224 tests pass, quoteStore tests unaffected
- **Committed in:** bfaed89 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Required fix for test suite integrity. No scope creep.

## Issues Encountered

None beyond the quoteStore test mock fix documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Price alerts feature is fully functional end-to-end: create from detail screen, manage from home screen, foreground monitoring active, background task registered
- All three requirements ALRT-01, ALRT-03, ALRT-06 verified by automated tests
- Phase 9 complete — all alert data layer (09-01) and UI integration (09-02) done
- Phase 10 Polish can address deferred UI concerns (SafeArea padding, crosshair gesture)

---
*Phase: 09-price-alerts*
*Completed: 2026-03-22*
