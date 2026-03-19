---
phase: 03-watchlist
verified: 2026-03-19T04:30:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
---

# Phase 3: Watchlist Verification Report

**Phase Goal:** Users can build and maintain a personal stock watchlist on the home screen that persists across app restarts and displays live price data on each card
**Verified:** 2026-03-19T04:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from Success Criteria in ROADMAP.md)

| #  | Truth                                                                                                            | Status     | Evidence                                                                                 |
|----|------------------------------------------------------------------------------------------------------------------|------------|------------------------------------------------------------------------------------------|
| 1  | User can type "2330" or "台積電" in the search field and see matching results from TWSE                          | VERIFIED   | `filterStocks('2330')` returns entry; `filterStocks('台積')` returns `台積電` — confirmed in stocks.json (1078 entries, code `2330` name `台積電`)          |
| 2  | User can add a stock from search results and immediately see it appear on the home screen watchlist               | VERIFIED   | `SearchModal.tsx` calls `addItem(code, name)` on `+` press; `useWatchlistStore.addItem` inserts to SQLite via `watchlistService.insertItem` and appends to state |
| 3  | User can remove a stock from the watchlist and it disappears immediately and stays gone after app restart         | VERIFIED   | `SwipeableCard` calls `removeItem(item.id)` on swipe; `watchlistStore.removeItem` calls `watchlistService.deleteItem` (SQLite DELETE + re-index) and updates state |
| 4  | Each watchlist card shows stock name, code, current price, and price change (absolute delta and percent) that updates with each poll | VERIFIED   | `StockCard.tsx` renders symbol, name, `quote.price.toFixed(2)`, and `formatChange(change, changePct)`; live data flows from `useQuoteStore` in `SwipeableCard`    |
| 5  | Watchlist data (selected stocks) survives app close and reopen — the same stocks appear on next launch           | VERIFIED   | `_layout.tsx` calls `loadFromDb()` after migration success; `watchlistStore.loadFromDb` calls `watchlistService.getAll()` (SQLite SELECT ORDER BY sort_order)      |

**Score (Success Criteria):** 5/5 verified

### Plan 01 Must-Have Truths (Data Layer)

| #  | Truth                                                                                              | Status   | Evidence                                                                                                               |
|----|----------------------------------------------------------------------------------------------------|----------|------------------------------------------------------------------------------------------------------------------------|
| 1  | `watchlistStore.addItem` inserts a row into SQLite and updates Zustand state                        | VERIFIED | `watchlistStore.ts` lines 28-36: `insertItem` called, returned item appended to state. Test `watchlistStore.test.ts` line 64-75 passes. |
| 2  | `watchlistStore.removeItem` deletes a row from SQLite and removes it from Zustand state             | VERIFIED | `watchlistStore.ts` lines 38-48: `deleteItem` called, filtered items set. Test line 89-104 passes.                     |
| 3  | On app start, watchlist items are loaded from SQLite ordered by sort_order and hydrate Zustand      | VERIFIED | `_layout.tsx` lines 16-24: `loadFromDb()` called in `useEffect([success])`. `watchlistService.getAll` queries `ORDER BY sort_order ASC`. |
| 4  | Polling restarts with updated symbol list after add or remove                                        | VERIFIED | `watchlistStore.ts` lines 31-35 (add) and 44-48 (remove): `stopPolling()` then `startPolling(symbols)` called after mutations. |
| 5  | Searching stocks.json by code or name returns matching results via substring match                  | VERIFIED | `searchStocks.ts` lines 14-17: `s.code.includes(q) \|\| s.name.includes(q)` with 50-result cap. Tests pass.           |

**Score (Plan 01 Truths):** 5/5 verified

### Plan 02 Must-Have Truths (UI Layer)

| #  | Truth                                                                                                                | Status   | Evidence                                                                                           |
|----|----------------------------------------------------------------------------------------------------------------------|----------|----------------------------------------------------------------------------------------------------|
| 1  | User can see a search bar on the home screen and tap it to open the search modal                                     | VERIFIED | `index.tsx` lines 81-87: `Pressable` styled as search bar calls `setSearchVisible(true)`.          |
| 2  | User can type a stock code or name and see matching results instantly                                                 | VERIFIED | `SearchModal.tsx` lines 34-37: `handleQueryChange` calls `filterStocks(text)` synchronously on each keystroke. |
| 3  | User can tap '+' on a search result to add it; the button changes to a checkmark                                     | VERIFIED | `SearchModal.tsx` lines 39-41, 52-58: `handleAdd` calls `addItem`, `addedSymbols` state tracks added symbols; renders `✓` vs `+`. |
| 4  | User can swipe left on a watchlist card to reveal a red Delete button and remove the stock                           | VERIFIED | `index.tsx` lines 23-34: `renderRightActions` renders `bg-stock-down` Delete view; `handleSwipeableOpen` calls `removeItem`. |
| 5  | User can long-press a card to drag-reorder it; new order persists                                                    | VERIFIED | `index.tsx` lines 46-51: `onLongPress` triggers haptic + `drag()`; `onReorder` calls `reorderItems(from, to)`; `watchlistService.updateSortOrders` fires async. |
| 6  | Each card shows stock code, name, current price, and price change (delta + percent)                                  | VERIFIED | `StockCard.tsx` lines 45-51: symbol/name left side; price/change right side. `formatChange` produces `+5.00 (+0.85%)` format. |
| 7  | When price is null, card shows dash with 'Waiting for market open'                                                   | VERIFIED | `StockCard.tsx` lines 27-31: `quote?.price != null` guard; `'—'` and `'Waiting for market open'` shown. Test confirms. |
| 8  | Empty watchlist shows centered CTA with Add Stock button                                                             | VERIFIED | `index.tsx` lines 88-90: `items.length === 0` renders `<EmptyWatchlist>`; `EmptyWatchlist.tsx` is a 20-line complete implementation. |
| 9  | Tapping a card navigates to detail/[symbol] page                                                                     | VERIFIED | `index.tsx` line 45: `router.push(\`/detail/\${item.symbol}\`)` in `onPress`. `detail/[symbol].tsx` route exists. |

**Score (Plan 02 Truths):** 9/9 verified

**Overall Score:** 14/14 truths verified

---

## Required Artifacts

| Artifact                                                               | Provides                                             | Exists | Lines | Status     |
|------------------------------------------------------------------------|------------------------------------------------------|--------|-------|------------|
| `invest-app/src/services/watchlistService.ts`                          | drizzle-orm CRUD: getAll, insertItem, deleteItem, updateSortOrders | YES | 65 | VERIFIED   |
| `invest-app/src/features/watchlist/store/watchlistStore.ts`            | Zustand store with SQLite-backed add/remove/reorder/loadFromDb     | YES | 66 | VERIFIED   |
| `invest-app/src/assets/stocks.json`                                    | 1078 TWSE stocks with code and name fields                         | YES | n/a  | VERIFIED   |
| `invest-app/src/features/watchlist/utils/searchStocks.ts`              | `filterStocks` pure function, substring match, cap 50              | YES | 18 | VERIFIED   |
| `invest-app/src/features/watchlist/components/StockCard.tsx`           | Bloomberg-style stock card, null-price handling, formatChange      | YES | 55 | VERIFIED   |
| `invest-app/src/features/watchlist/components/SearchModal.tsx`         | Full-screen search modal with instant filtering                    | YES | 103 | VERIFIED   |
| `invest-app/src/features/watchlist/components/EmptyWatchlist.tsx`      | Empty state CTA component                                          | YES | 20 | VERIFIED   |
| `invest-app/src/app/index.tsx`                                         | WatchlistPage with ReorderableList, swipe-to-delete, haptic drag   | YES | 129 | VERIFIED   |
| `invest-app/src/app/_layout.tsx`                                       | Hydration useEffect after migration success                        | YES | 65 | VERIFIED   |
| `invest-app/src/__tests__/watchlistStore.test.ts`                      | Unit tests for add/remove/load lifecycle                           | YES | 123 | VERIFIED   |
| `invest-app/src/__tests__/watchlistSearch.test.ts`                     | Unit tests for substring search                                    | YES | 36 | VERIFIED   |
| `invest-app/src/__tests__/StockCard.test.ts`                           | Unit tests for formatChange and price display logic                | YES | 45 | VERIFIED   |

---

## Key Link Verification

| From                                     | To                                            | Via                                    | Status  | Evidence                                                         |
|------------------------------------------|-----------------------------------------------|----------------------------------------|---------|------------------------------------------------------------------|
| `watchlistStore.ts`                      | `watchlistService.ts`                         | `import * as watchlistService`         | WIRED   | Line 2: `import * as watchlistService from '../../../services/watchlistService'`; used at lines 29, 39, 52, 62 |
| `_layout.tsx`                            | `watchlistStore.ts`                           | `loadFromDb` after migration success   | WIRED   | Line 10: import; line 18: `loadFromDb()` called in `useEffect([success])` |
| `index.tsx`                              | `watchlistStore.ts`                           | `useWatchlistStore` hook               | WIRED   | Line 16: import; line 58: `useWatchlistStore(s => s.items)`; lines 32, 62: `getState()` calls |
| `index.tsx`                              | `quoteStore.ts`                               | `useQuoteStore` hook for live quotes   | WIRED   | Line 12: import; line 20: `useQuoteStore(s => s.quotes)` in `SwipeableCard` |
| `StockCard.tsx`                          | `quoteStore.ts`                               | Quote data passed as prop              | WIRED   | `quote` prop typed and used for price/change display; `quotes[item.symbol]` passed from parent |
| `SearchModal.tsx`                        | `searchStocks.ts`                             | `filterStocks` function                | WIRED   | Line 11: import; line 36: `setResults(filterStocks(text))` |

---

## Requirements Coverage

| Requirement | Source Plan   | Description                                               | Status    | Evidence                                                                |
|-------------|---------------|-----------------------------------------------------------|-----------|-------------------------------------------------------------------------|
| WTCH-01     | 03-01, 03-02  | User can search Taiwan stocks by code or name             | SATISFIED | `filterStocks` in `searchStocks.ts`; `SearchModal.tsx` wires it to UI; tests pass |
| WTCH-02     | 03-01, 03-02  | User can add a stock to the home page watchlist           | SATISFIED | `watchlistStore.addItem` (SQLite INSERT + state); SearchModal `handleAdd`; index.tsx renders updated list |
| WTCH-03     | 03-01, 03-02  | User can remove a stock from the watchlist                | SATISFIED | `watchlistStore.removeItem` (SQLite DELETE + re-index); SwipeableCard `handleSwipeableOpen` |
| WTCH-04     | 03-01, 03-02  | Watchlist persists across app restarts (SQLite)           | SATISFIED | `watchlistService.getAll` (SQLite SELECT); `_layout.tsx` hydration useEffect; `watchlistService.insertItem/deleteItem` persist mutations |
| WTCH-05     | 03-02         | Each card shows name, code, current price, price change   | SATISFIED | `StockCard.tsx` renders all four; `formatChange` produces correct format; null-price handled |

**Orphaned requirements check:** REQUIREMENTS.md Traceability table maps WTCH-01 through WTCH-05 to Phase 3. All 5 are claimed by the phase plans and verified. WTCH-06 (sparkline) maps to Phase 10 — correctly out of scope for this phase.

---

## Anti-Patterns Found

| File                              | Line | Pattern                                            | Severity | Impact                                              |
|-----------------------------------|------|----------------------------------------------------|----------|-----------------------------------------------------|
| `invest-app/src/app/detail/[symbol].tsx` | 16 | `"Chart placeholder — 1D/5D/1M/6M/1Y"` placeholder text | INFO | Intentional Phase 4 placeholder; navigation target for this phase is the route existing, not the chart content |

No blockers or warnings. The detail page placeholder is by design (Phase 4 is Charts); Phase 3 only requires that tapping a card navigates to the detail route, which is verified.

---

## Human Verification Required

### 1. Drag-to-reorder UX and haptic feedback

**Test:** Add 3+ stocks to the watchlist. Long-press a card. Confirm the item becomes "draggable" (lifts visually). Drag it to a new position. Release and confirm the order is updated.
**Expected:** Card lifts on long-press, reorders on release, haptic vibration occurs on long-press, order persists after navigating away and back.
**Why human:** Gesture interaction and haptic feedback cannot be verified by static code analysis. The `useReorderableDrag` + `Haptics.impactAsync` wiring is confirmed in code, but physical feel and correct gesture recognition on a real Android device require manual testing.

### 2. Swipe-to-delete gesture threshold

**Test:** Swipe a card left partway (less than 40px). Confirm it springs back without deleting. Swipe fully past threshold. Confirm Delete button appears and stock is removed on full swipe.
**Expected:** Partial swipe reverts; full swipe removes the stock and it does not reappear after app restart.
**Why human:** Swipe threshold (`rightThreshold={40}`, `friction={2}`) behavior depends on gesture handler runtime and physical screen size.

### 3. Live price update cycle on market open

**Test:** Run the app during TWSE market hours (Mon-Fri 09:00-13:30 Taiwan time) with a stock in the watchlist. Confirm price values on cards update every ~20-30 seconds.
**Expected:** Price and change values on cards change over time without needing any user action.
**Why human:** Requires real TWSE API access during market hours and time observation; cannot simulate polling in static analysis.

---

## Gaps Summary

No gaps. All 14 must-have truths are verified. All required artifacts exist with substantive implementations. All key links are confirmed wired. All 5 requirement IDs (WTCH-01 through WTCH-05) are satisfied. Tests pass (70/70) and TypeScript is clean (0 errors).

The one INFO-level item (detail page placeholder) is intentional Phase 4 scope, not a gap for Phase 3.

---

_Verified: 2026-03-19T04:30:00Z_
_Verifier: Claude (gsd-verifier)_
