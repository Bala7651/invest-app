# Phase 2: Data Layer - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

TWSE OpenAPI client that safely fetches live Taiwan stock quotes with rate limiting, pauses polling outside market hours, and handles non-trading days without crashing. Delivers StockService, quoteStore polling lifecycle, market-hours guard, holiday detection, and a market status indicator component.

</domain>

<decisions>
## Implementation Decisions

### Rate limit queue
- FIFO queue — requests wait in line with 2s spacing, no dropping
- Retry once after 5s on failure (network error, 429, timeout), then skip that stock this cycle
- Batch fetch preferred — use TWSE bulk endpoint (e.g. /exchangeReport/STOCK_DAY_ALL) when available, fall back to individual requests
- Simple async API surface: `getQuotes(symbols)` hides queue, rate limiting, and retries internally
- StockService must reject any code that bypasses the request queue (unit test verifiable per success criteria)

### Polling lifecycle
- 30-second poll interval during market hours
- Auto-start polling on app launch if market is open (data ready before user sees watchlist)
- At market close (13:30), do one final fetch for closing prices, then stop polling entirely
- Outside market hours: show cached last-fetched prices with "As of HH:MM" timestamp, no TWSE requests

### Non-trading day handling
- Hardcoded Taiwan public holiday list for the current year, updated annually
- On holidays: display previous trading day's closing prices with "Market Closed" label
- Cache stored in Zustand quoteStore only (no SQLite cache table)
- Cold start on non-trading day with empty quoteStore: show empty state with "No price data yet — prices will load when market opens" message

### Market status indicator
- Placement: home screen header bar, small and always visible
- Style: green glowing dot + "Open" text when open, dim gray dot + "Closed" when closed
- Includes relative countdown: "Open · 2h 15m to close" / "Closed · opens 09:00"
- Uses cyberpunk theme colors: #00E676 green dot (with glow), #6B7280 dim gray for closed

### Claude's Discretion
- Exact TWSE API endpoint paths and response parsing
- Queue implementation details (setTimeout vs setInterval vs custom scheduler)
- quoteStore internal structure and update strategy
- Market status countdown update frequency (every second vs every minute)
- Error state UI for failed fetches

</decisions>

<specifics>
## Specific Ideas

- Market status feels like a Bloomberg terminal status bar — informational, not decorative
- The batch fetch approach should be the primary path; individual fetches are the fallback, not the default
- "As of" timestamp on cached prices is important — user must always know how fresh the data is

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/db/schema.ts`: drizzle-orm schema with watchlist and daily_summaries tables — quoteStore does NOT need a table (Zustand only)
- `src/db/client.ts`: expo-sqlite + drizzle client ready for any future SQLite needs
- `src/constants/theme.ts`: Colors defined but cyberpunk tokens are in NativeWind/tailwind config

### Established Patterns
- Zustand v5 per-domain stores (watchlistStore exists as pattern reference)
- Feature-based directory structure: `src/features/{name}/`
- drizzle-orm for typed SQLite queries

### Integration Points
- StockService will be consumed by quoteStore, which feeds watchlist cards (Phase 3) and charts (Phase 4)
- Market status indicator component will be imported by the home screen layout
- Holiday list will be used by both polling guard and market status indicator
- quoteStore will be read by AI analysis (Phase 6) to ground prompts with real prices

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-data-layer*
*Context gathered: 2026-03-18*
