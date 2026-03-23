---
phase: 11-ai-intelligence-layer
plan: "02"
subsystem: portfolio
tags: [portfolio, holdings, sqlite, zustand, ai, minimax, pager-view]
dependency_graph:
  requires: []
  provides:
    - holdings SQLite table (m0002 migration)
    - holdingsService (upsertHolding, getAllHoldings, deleteHolding)
    - useHoldingsStore (loadHoldings, setQuantity, clearHoldings)
    - portfolioAiService (buildPortfolioPrompt, extractHealthScore, callPortfolioMiniMax)
    - PortfolioScreen component
    - PagerView 5th page (key=4)
  affects:
    - invest-app/src/app/index.tsx (new PagerView page)
    - invest-app/drizzle/migrations.js (m0002 added)
tech_stack:
  added:
    - holdings SQLite table via drizzle-kit generate
  patterns:
    - delete-then-insert upsert (same as daily_summaries / price_alerts)
    - isActive lazy-load via useRef flag (same as SummaryScreen)
    - Zustand store with holdings map keyed by symbol
    - AbortController + setTimeout for fetch timeout (Hermes compat)
    - SCORE:XX/100 regex extraction from AI response
key_files:
  created:
    - invest-app/src/__tests__/holdingsService.test.ts
    - invest-app/src/__tests__/holdingsStore.test.ts
    - invest-app/src/__tests__/portfolioAiService.test.ts
    - invest-app/drizzle/0002_stormy_lionheart.sql
    - invest-app/src/features/portfolio/services/holdingsService.ts
    - invest-app/src/features/portfolio/store/holdingsStore.ts
    - invest-app/src/features/portfolio/services/portfolioAiService.ts
    - invest-app/src/features/portfolio/components/PortfolioScreen.tsx
  modified:
    - invest-app/src/db/schema.ts (holdings table added)
    - invest-app/drizzle/migrations.js (m0002 import added)
    - invest-app/src/app/index.tsx (PortfolioScreen import + PagerView key=4)
decisions:
  - delete-then-insert upsert avoids unique constraint conflicts (same pattern as alerts)
  - AbortController + setTimeout(30_000) used instead of AbortSignal.timeout() for Hermes compat
  - isLots state is session-only (useState, not persisted) — resets per page visit
  - extractHealthScore exported for direct unit testing
  - NoApiKeyPrompt reused from analysis feature for consistent UX
  - callPortfolioMiniMax returns null (not throws) on error — caller handles error state
metrics:
  duration: 4 min
  completed: "2026-03-23"
  tasks_completed: 3
  files_created: 9
  files_modified: 3
---

# Phase 11 Plan 02: Portfolio Health Screen Summary

**One-liner:** Portfolio Health screen with SQLite holdings persistence, lots/shares toggle, and MiniMax AI health score (SCORE:XX/100 extraction) as the 5th PagerView page.

## What Was Built

### Holdings Schema (Task 1 — RED + Schema)

Added `holdings` table to `invest-app/src/db/schema.ts` following the exact pattern from `price_alerts`:

```typescript
export const holdings = sqliteTable(
  'holdings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    symbol: text('symbol').notNull(),
    name: text('name').notNull(),
    quantity: real('quantity').notNull().default(0),
    created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex('holdings_symbol_unique').on(t.symbol)]
);
```

Migration `0002_stormy_lionheart.sql` generated via `npx drizzle-kit generate`. `migrations.js` updated with `m0002` import.

### holdingsService (Task 2)

Drizzle CRUD using delete-then-insert upsert pattern (avoids unique index conflicts):

- `upsertHolding(symbol, name, quantity)`: delete existing row for symbol, then insert fresh
- `getAllHoldings()`: returns all rows as `HoldingRow[]`
- `deleteHolding(symbol)`: delete row by symbol using `eq(holdings.symbol, symbol)`

### holdingsStore (Task 2)

Zustand store with `holdings: Record<string, HoldingRow>` map:

- `loadHoldings()`: calls `getAllHoldings()`, populates map keyed by symbol
- `setQuantity(symbol, name, quantity)`: if quantity > 0 → `upsertHolding` + update state; if 0 → `deleteHolding` + remove key
- `clearHoldings()`: resets to `{}`

### portfolioAiService (Task 2)

- `buildPortfolioPrompt(entries)`: slices to 15 max, builds Traditional Chinese prompt with stock name, symbol, quantity, and price. Instructs AI to analyze sector concentration, correlation risk, and end with `SCORE:XX/100`
- `extractHealthScore(response)`: regex `/SCORE:(\d{1,3})\/100/` → number or null
- `callPortfolioMiniMax(entries, credentials)`: fetch with `AbortController + setTimeout(30_000)` for Hermes compat, `max_tokens: 400`, strips `<think>` tags, returns `{ score, paragraph }` or null

### PortfolioScreen (Task 3)

5th PagerView page with:
- **isActive lazy-load**: `useRef(false)` flag prevents redundant DB calls
- **Watchlist stock rows**: each item shows name + symbol + inline `TextInput` (numeric keyboard)
- **Lots/shares toggle**: 張 (lots = ×1000) / 股 (individual shares) — session-only `useState`
- **Quantity conversion**: display value adapts to toggle; stored value always in raw shares
- **Invested value**: `shares × price` shown when both available
- **Analyze button**: disabled when loading or no items; calls `callPortfolioMiniMax`
- **Health score card**: large score number with `scoreColor()` (green ≥65, amber ≥40, red <40)
- **Error card**: shows error message + 重試 retry button
- **NoApiKeyPrompt**: shown when `apiKey` is empty (reuses existing component)

### PagerView Wiring (Task 3)

`index.tsx` updated with:
```tsx
import { PortfolioScreen } from '../features/portfolio/components/PortfolioScreen';
// ...
<View key="4" style={{ flex: 1 }}>
  <PortfolioScreen isActive={activePage === 4} />
</View>
```

`handlePageSelected` required no changes — `setActivePage(page)` already handles page 4.

## Test Results

| Suite | Tests | Result |
|-------|-------|--------|
| holdingsService.test.ts | 4 | PASS |
| holdingsStore.test.ts | 4 | PASS |
| portfolioAiService.test.ts | 12 | PASS |
| **New total** | **20** | **PASS** |
| Full suite | 275 | PASS (2 pre-existing failures unrelated to this plan) |

Pre-existing failures: `historicalService.test.ts` and `analysisStore.test.ts` — both fail due to expo-sqlite not being mockable in Jest; these failures existed before this plan.

TypeScript: `tsc --noEmit` — zero errors.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 (RED + Schema + Migration) | `5f23ad4` | test(11-02): add RED stubs for holdingsService, holdingsStore, portfolioAiService |
| 2 (GREEN implementations) | `522f91a` | feat(11-02): implement holdingsService, holdingsStore, portfolioAiService |
| 3 (PortfolioScreen + wiring) | `012367a` | feat(11-02): PortfolioScreen + PagerView wiring as 5th page |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `invest-app/src/__tests__/holdingsService.test.ts`: FOUND
- `invest-app/src/__tests__/holdingsStore.test.ts`: FOUND
- `invest-app/src/__tests__/portfolioAiService.test.ts`: FOUND
- `invest-app/src/db/schema.ts` contains `holdings`: FOUND
- `invest-app/drizzle/migrations.js` contains `m0002`: FOUND
- `invest-app/src/features/portfolio/services/holdingsService.ts`: FOUND
- `invest-app/src/features/portfolio/store/holdingsStore.ts`: FOUND
- `invest-app/src/features/portfolio/services/portfolioAiService.ts`: FOUND
- `invest-app/src/features/portfolio/components/PortfolioScreen.tsx`: FOUND
- `invest-app/src/app/index.tsx` contains `key="4"` and `PortfolioScreen`: FOUND
- Commits `5f23ad4`, `522f91a`, `012367a`: FOUND
