---
phase: 03-watchlist
plan: 02
subsystem: ui
tags: [react-native, expo, nativewind, zustand, reorderable-list, swipeable, watchlist]

# Dependency graph
requires:
  - phase: 03-watchlist
    plan: 01
    provides: watchlistStore (items, addItem, removeItem, reorderItems), searchStocks filterStocks, WatchlistItem type
  - phase: 02-data-layer
    provides: quoteStore (quotes, startPolling/stopPolling), Quote type

provides:
  - StockCard.tsx: Bloomberg-style stock row with price/change display, null-price handling, onLongPress for drag
  - SearchModal.tsx: Full-screen modal with instant filterStocks search and add/checkmark toggle
  - EmptyWatchlist.tsx: Centered empty state CTA component
  - index.tsx: WatchlistPage with ReorderableList, swipe-to-delete, haptic drag-to-reorder, live quotes
  - formatChange: Pure exported function for price change string formatting (testable)

affects: [03-03, 04-detail-page]

# Tech tracking
tech-stack:
  added:
    - react-native-reorderable-list: ^0.18.0 (drag-to-reorder FlatList)
    - expo-haptics: ~55.0.9 (haptic feedback on long-press drag start)
  patterns:
    - TDD: failing test for formatChange first (RED), then implementation (GREEN)
    - ReanimatedSwipeable from react-native-gesture-handler/ReanimatedSwipeable for swipe-to-delete
    - useReorderableDrag hook inside renderItem for per-item drag handler
    - onReorder event uses { from, to } (not fromIndex/toIndex) — actual API vs plan spec
    - Helper functions in test files to avoid TypeScript narrowing-to-never on null literals
    - SwipeableCard sub-component keeps drag/swipe logic co-located, StockCard stays pure

key-files:
  created:
    - invest-app/src/features/watchlist/components/StockCard.tsx
    - invest-app/src/features/watchlist/components/SearchModal.tsx
    - invest-app/src/features/watchlist/components/EmptyWatchlist.tsx
    - invest-app/src/__tests__/StockCard.test.ts
  modified:
    - invest-app/src/app/index.tsx
    - invest-app/package.json

key-decisions:
  - "onReorder event shape is { from, to } not { fromIndex, toIndex } — actual react-native-reorderable-list v0.18 API; watchlistStore.reorderItems(from, to) called directly"
  - "No ReorderableListItem wrapper — react-native-reorderable-list v0.18 renders items via renderItem directly; drag is initiated via useReorderableDrag hook inside renderItem"
  - "SwipeableCard is a local sub-component in index.tsx — keeps drag and swipe logic together while StockCard stays a pure presentational component"
  - "Test helper functions (priceDisplay, changeDisplay) used instead of inline null literal to avoid TypeScript narrowing-to-never type error on const null"

patterns-established:
  - "Local sub-component pattern: complex gesture logic extracted into SwipeableCard; pure display component (StockCard) stays prop-driven and testable"
  - "formatChange exported as named function — pure, testable, reused by component"

requirements-completed: [WTCH-01, WTCH-02, WTCH-03, WTCH-04, WTCH-05]

# Metrics
duration: 4min
completed: 2026-03-19
---

# Phase 3 Plan 02: Watchlist UI Summary

**StockCard, SearchModal, EmptyWatchlist components plus full WatchlistPage rewrite with ReorderableList drag-to-reorder, ReanimatedSwipeable swipe-to-delete, live quote data, and haptic feedback**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T03:52:34Z
- **Completed:** 2026-03-19T03:56:12Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- StockCard: Bloomberg-style dense row — code/name left, price/change right; null price shows — and "Waiting for market open"; `formatChange` named export for testability
- SearchModal: full-screen modal with instant filterStocks local search, + button that changes to ✓ after adding, empty hint text before first query
- EmptyWatchlist: centered CTA with "No stocks yet" text and "Add Stock" button
- WatchlistPage rewrite: ReorderableList with live quoteStore data; SwipeableCard sub-component wraps ReanimatedSwipeable (swipe-to-delete) with drag via useReorderableDrag and haptic feedback on long-press
- Search bar as Pressable trigger (not TextInput) that opens SearchModal
- All 70 tests pass, tsc --noEmit clean

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD RED): failing tests** — `342fa89` (test)
2. **Task 1 (TDD GREEN): components** — `2062130` (feat)
3. **Task 2: WatchlistPage rewrite** — `e58ce74` (feat)

## Files Created/Modified

- `invest-app/src/features/watchlist/components/StockCard.tsx` — Bloomberg-row component, formatChange export
- `invest-app/src/features/watchlist/components/SearchModal.tsx` — full-screen search with add/checkmark toggle
- `invest-app/src/features/watchlist/components/EmptyWatchlist.tsx` — centered CTA
- `invest-app/src/__tests__/StockCard.test.ts` — 8 tests for formatChange and price display logic
- `invest-app/src/app/index.tsx` — WatchlistPage rewritten, AnalysisPage preserved
- `invest-app/package.json` — added react-native-reorderable-list, expo-haptics

## Decisions Made

- **`onReorder` uses `{ from, to }` not `{ fromIndex, toIndex }`:** The actual react-native-reorderable-list v0.18 API differs from the plan spec. Event object is `ReorderableListReorderEvent { from: number; to: number }`. watchlistStore.reorderItems called directly.
- **No `ReorderableListItem` wrapper:** The package in v0.18 does not export `ReorderableListItem`. Drag is initialized inside `renderItem` via `useReorderableDrag()` hook.
- **SwipeableCard sub-component:** Keeping gesture logic (swipe + drag) co-located in index.tsx while keeping StockCard as a pure props-driven component reduces coupling and keeps StockCard testable.
- **Test helper functions for null narrowing:** TypeScript strict mode narrows `const x: number | null = null` then reports accessing `.toFixed` on type `never`. Using helper functions as type boundaries avoids this.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] react-native-reorderable-list API mismatch — `fromIndex/toIndex` vs `from/to`**

- **Found during:** Task 2 — writing index.tsx onReorder handler
- **Issue:** Plan spec shows `onReorder={({ fromIndex, toIndex }) => ...}` but actual `ReorderableListReorderEvent` is `{ from: number; to: number }` per the package types
- **Fix:** Used `{ from, to }` as per actual API; called `useWatchlistStore.getState().reorderItems(from, to)` which matches `reorderItems(fromIndex: number, toIndex: number)` signature
- **Files modified:** invest-app/src/app/index.tsx
- **Commit:** e58ce74

**2. [Rule 1 - Bug] No `ReorderableListItem` export in package**

- **Found during:** Task 2 — attempting to import ReorderableListItem
- **Issue:** The plan spec references `ReorderableListItem` wrapper but v0.18 doesn't export it — items render via `renderItem` prop, drag via `useReorderableDrag` hook inside renderItem
- **Fix:** Removed ReorderableListItem wrapper; used `useReorderableDrag()` inside `SwipeableCard` rendered via `renderItem`
- **Files modified:** invest-app/src/app/index.tsx
- **Commit:** e58ce74

**3. [Rule 1 - Bug] TypeScript `never` type narrowing on null literal in tests**

- **Found during:** Task 2 verification — `npx tsc --noEmit` reported error on StockCard.test.ts line 30
- **Issue:** `const price: number | null = null` — TypeScript strict mode narrows `price` to `null` (not `number | null`) despite explicit annotation; `price != null` guard branch becomes `never`
- **Fix:** Extracted logic into standalone helper functions (`priceDisplay`, `changeDisplay`) with explicit parameter types, removing the problematic inline narrowing
- **Files modified:** invest-app/src/__tests__/StockCard.test.ts
- **Commit:** e58ce74

---

**Total deviations:** 3 auto-fixed (Rule 1 - actual library API differed from plan spec; TypeScript strict narrowing in tests)
**Impact on plan:** All behavior requirements met. Functional parity is identical; only implementation detail (wrapper component vs renderItem pattern) differs.

## Issues Encountered

None beyond the library API differences documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- StockCard, SearchModal, EmptyWatchlist fully operational — ready for use in any future list view
- WatchlistPage shows live quotes from quoteStore and persists via watchlistStore
- Navigation to /detail/[symbol] wired — Phase 4 (detail page) can be built independently
- All 70 tests pass, tsc --noEmit clean

---
*Phase: 03-watchlist*
*Completed: 2026-03-19*
