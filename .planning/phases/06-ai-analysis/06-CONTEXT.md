# Phase 6: AI Analysis - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can swipe left from the home screen to see AI-powered investment analysis for all watchlist stocks, grounded in real TWSE data, with no hallucinated figures. Analysis uses MiniMax M2.5 via OpenAI-compatible API.

</domain>

<decisions>
## Implementation Decisions

### Analysis card layout
- Expandable cards: collapsed shows stock code + name + current price + change + overall score (e.g. 72/100) + Buy/Hold/Sell pill badge
- Tap to expand: reveals 4 stacked sections with headers — News Sentiment, Technical Analysis, Recommendation, Risk Assessment
- Each section has a score + text explanation
- Real price data (current price, change, prev close) shown in card header to satisfy AI-07 grounding requirement

### News data source & AI grounding
- No external news API — AI uses its training knowledge for news/market context
- Real TWSE data injected into prompt: current price, change, prev close, volume from quoteStore
- Structured JSON response format: prompt requests specific fields (sentimentScore, technicalSummary, recommendation, riskScore, etc.) parsed into typed objects
- One API call per stock (not batched) — separate request per watchlist item for reliable parsing and per-stock error handling

### Loading & refresh flow
- Auto-trigger on page view: analysis starts when user swipes to AI page
- 30-minute cache TTL: re-fetches if cached data is older than 30 minutes
- Skeleton cards: shimmer placeholders per stock, each fills in progressively as its API response arrives
- Error card with retry: if a stock's analysis fails, show error in that card with "Retry" button; other stocks unaffected

### No-API-key experience
- Full-page centered prompt: "Add your MiniMax API key to unlock AI analysis" with button that navigates directly to Settings (router.push('/settings'))
- No dimmed/blurred teaser — clean call-to-action

### Disclaimer
- "Not financial advice" as sticky footer on the AI analysis page, always visible

### Claude's Discretion
- Exact prompt engineering for MiniMax M2.5 (system prompt, temperature, token limits)
- Skeleton card shimmer animation implementation
- Score color coding thresholds
- Expand/collapse animation style
- Error retry logic (timeout, max retries)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useQuoteStore(s => s.quotes[symbol])`: Access current price, change, prevClose, volume per stock
- `useSettingsStore`: API key, modelName, baseUrl for MiniMax API calls
- `useWatchlistStore(s => s.items)`: List of watchlist stocks to analyze
- `src/features/analysis/`: Empty directory with .gitkeep — ready for new code
- `AnalysisPage()` in `src/app/index.tsx`: Placeholder component to replace
- ApiKeyInput's `handleTest()`: Proven fetch pattern for MiniMax chat/completions endpoint

### Established Patterns
- Zustand v5 per-domain stores (chartStore has cache+loading+errors pattern — reuse for analysisStore)
- Native `fetch` with Bearer auth and AbortSignal.timeout
- NativeWind v4 cyberpunk tokens (bg-surface, text-primary, border-border, text-muted)
- Feature directory structure: `src/features/analysis/{store,services,components}/`

### Integration Points
- Replace `AnalysisPage()` in `src/app/index.tsx` PagerView page 1
- Read API credentials from settingsStore (apiKey, modelName, baseUrl)
- Read quote data from quoteStore for prompt grounding
- Read watchlist items from watchlistStore for stock list

</code_context>

<specifics>
## Specific Ideas

- Collapsed cards should show enough to scan quickly — score + recommendation badge gives instant signal
- Progressive reveal (skeleton -> filled) feels responsive even with sequential API calls
- Price header in each card makes AI-07 compliance visible to the user (they can verify figures match watchlist)

</specifics>

<deferred>
## Deferred Ideas

- RSS/news API integration for real-time headlines — could enhance sentiment accuracy in future phase
- Historical candle data in prompt (5-day OHLCV) — keep prompt small for now, can add later
- Batch analysis mode (all stocks in one API call) — optimize if API costs become a concern
- Analysis history/persistence in SQLite — Phase 8 Daily Summary will handle storage

</deferred>

---

*Phase: 06-ai-analysis*
*Context gathered: 2026-03-21*
