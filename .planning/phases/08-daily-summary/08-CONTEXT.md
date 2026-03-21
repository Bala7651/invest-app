# Phase 8: Daily Summary - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Auto-generate and store a daily AI market summary at 12:30 Taiwan time for all watchlist stocks plus TWSE index. Summaries persist in SQLite with 14-day auto-purge. Manual fallback trigger and catch-up on app open. Viewable on a new PagerView page.

</domain>

<decisions>
## Implementation Decisions

### Summary Content & Format
- Per-stock sections, not one combined narrative
- Shorter than AI analysis: 2-3 sentence snapshot per stock (price action, key signal, outlook)
- TWSE index as first section, then individual watchlist stocks
- One AI call per stock (reuses existing callMiniMax pattern from Phase 6)
- Output in Traditional Chinese (consistent with Phase 6)

### Summary Viewing UI
- New 4th page in PagerView, to the left of AI analysis: Settings <- Home <- AI Analysis <- Daily Summary
- Date list with expandable cards (newest first), tap a date to expand and see all stock summaries
- Empty state: text explaining auto-generation at 12:30 + "Generate Now" button
- "Generate Now" button lives on the summary page (not in Settings)

### Generation Trigger & Timing
- Auto-generate at 12:30 Taiwan time on market days only (Mon-Fri, no holidays — uses existing marketHours logic)
- Foreground only — no background fetch. Auto-catch-up when app opens if today's summary is missing and it's past 12:30 on a market day
- Generate Now always creates today's summary only (no past dates)
- If summary already exists for today, overwrite it (replace, not duplicate)
- Show loading spinner with stock-by-stock progress: "Generating... 3/8 stocks"

### Error Handling
- On failure: pop a message with failed reason AND show error on summary page
- Partial results saved: if some stocks succeed and one fails, store the successful ones and mark failed stock with error
- User can retry failed stocks with Generate Now

### Claude's Discretion
- Summary prompt design (shorter than analysis prompt)
- Exact card/list component styling
- Auto-purge implementation (on insert, on app open, or scheduled)
- How to fetch TWSE index data (may need separate API call)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `minimaxApi.callMiniMax()`: Proven AI service from Phase 6, reuse for per-stock calls
- `daily_summaries` SQLite table: Already exists in `src/db/schema.ts` from Phase 1
- `db` drizzle client: Ready in `src/db/client.ts`
- `marketHours.isHoliday()` and `isMarketOpen()`: Taipei timezone-aware market day checks
- `watchlistStore.items`: User's selected stocks
- `quoteStore.quotes`: Live quote data for all watchlist stocks
- `settingsStore`: API key and model config

### Established Patterns
- Zustand stores with TTL cache (analysisStore pattern)
- Drizzle ORM for SQLite CRUD (watchlistService pattern)
- Expandable cards UI (AnalysisScreen from Phase 6)
- PagerView with isActive prop for lazy loading

### Integration Points
- `_layout.tsx`: Add catch-up check on app open (useEffect after hydration)
- `index.tsx`: Extend PagerView from 3 to 4 pages
- `settingsStore.getState()`: Non-hook access to API credentials for service calls

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-daily-summary*
*Context gathered: 2026-03-21*
