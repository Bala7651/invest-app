# Phase 3: Watchlist - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can build and maintain a personal stock watchlist on the home screen that persists across app restarts and displays live price data on each card. Includes stock search, add/remove, drag-to-reorder, and navigation to detail page.

</domain>

<decisions>
## Implementation Decisions

### Stock card design
- Compact layout: one row per stock showing code, name, current price, price change
- Price change format: delta + percent (e.g. +5.00 (+1.23%))
- Tap card navigates to chart detail page (Phase 4 builds the detail page, Phase 3 sets up the route + placeholder)
- Long-press to drag-reorder (sort_order column already in SQLite schema)
- No limit on number of stocks in watchlist

### Search experience
- Full-screen modal triggered by tapping search bar on home screen
- Data source: local bundled JSON list of all TWSE stock codes + Chinese names (~2000 entries)
- Substring match on both code and name (e.g. '台積' matches '台灣積體電路', '23' matches '2330')
- Results display: simple list with code + name + '+' button per row
- Already-added stocks show checkmark instead of '+' button

### Add/remove interactions
- Add: tap '+' button on search result row, instant add (no confirmation dialog), button changes to checkmark
- Remove: swipe left on watchlist card reveals red 'Delete' button, tap to confirm
- No undo after removal — user can re-add from search
- Reorder: long-press to pick up card, drag to new position, release to drop

### Empty & edge states
- Empty watchlist: centered CTA message with prominent 'Add Stock' button opening search modal
- No cached data (first launch on weekend): show stock code + name, price shows '—' with 'Waiting for market open' subtitle
- Network error: silent — keep showing last known prices, staleness visible via 'As of' timestamp (from Phase 2 quoteStore)
- No maximum stock count — FlatList handles scrolling, FIFO queue handles rate limiting

### Claude's Discretion
- Exact search modal transition animation
- FlatList vs FlashList choice for watchlist rendering
- Card border/shadow styling within cyberpunk theme
- Search bar placeholder text and styling
- Keyboard dismiss behavior in search modal
- Detail page placeholder content (Phase 4 builds the real detail)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `watchlistStore.ts`: Zustand store shell with add/remove/setItems — needs SQLite sync logic added
- `schema.ts`: drizzle-orm watchlist table with symbol, name, sort_order, created_at columns + unique index on symbol
- `quoteStore.ts`: provides live quote data via getQuotes — cards read from this store
- `MarketStatusBar.tsx`: already integrated in home screen header
- `stockService.ts`: getQuotes(symbols) for fetching TWSE data — quoteStore calls this

### Established Patterns
- Zustand v5 per-domain stores (watchlistStore, quoteStore established)
- drizzle-orm for typed SQLite queries (db/client.ts ready)
- NativeWind v4 with cyberpunk tailwind tokens (bg-surface, text-primary, etc.)
- Feature-based directory: src/features/watchlist/

### Integration Points
- index.tsx WatchlistPage: currently has hardcoded placeholder cards — replace with FlatList + real StockCard component
- _layout.tsx: quoteStore polling already wired — startPolling uses watchlistStore.getState().items for symbols
- PagerView in index.tsx: watchlist is page 0, AI analysis is page 1
- expo-router: detail route needs to be created at src/app/detail/[symbol].tsx

</code_context>

<specifics>
## Specific Ideas

- Cards should feel like Bloomberg terminal rows — dense, data-focused, no decorative elements
- The search modal should feel fast — local data means instant results as you type
- Swipe-to-delete interaction should feel native (like iOS Mail or Android Gmail)
- Long-press drag-reorder should have haptic feedback if available

</specifics>

<deferred>
## Deferred Ideas

- Sparkline mini chart on watchlist cards — WTCH-06 is mapped to Phase 10 (Polish)
- Stock sector/industry labels on cards — not in scope

</deferred>

---

*Phase: 03-watchlist*
*Context gathered: 2026-03-19*
