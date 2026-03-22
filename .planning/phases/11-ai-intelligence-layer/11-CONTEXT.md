# Phase 11: AI Intelligence Layer - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Three advanced AI features extending the existing app: (1) automatic candlestick pattern recognition with plain-Chinese explanations and bullish/neutral/bearish signal displayed below the chart on the stock detail page; (2) a new Portfolio page (5th PagerView page) where users enter share quantities per watchlist stock and receive AI-driven sector concentration, correlation cluster analysis, and an overall portfolio health score; (3) AI-enriched push notifications that include a one-sentence factual market context sentence when a price alert fires. Holdings persist via SQLite. All three features degrade gracefully when API key is absent or AI call fails.

</domain>

<decisions>
## Implementation Decisions

### Pattern card presentation
- Hide the card entirely when no recognizable pattern is detected — no placeholder row, no wasted space
- When multiple patterns detected in the same timeframe: show only the strongest/most recent pattern (one clear signal)
- Position in detail screen scroll order: directly below volume bars, above the price alert section
- Trigger: auto-run pattern detection whenever chartStore delivers fresh candle data (on page open and on every timeframe switch)

### Pattern detection approach
- Pure TypeScript algorithmic rules on OHLCV data — no MiniMax API call for detection
- Supported patterns (6-8 simple, 1-2 candle): 錘子, 倒錘子, 吞噬多頭, 吞噬空頭, 恆星線, 十字星, 早晨之星, 黃昏之星
- Chinese explanations: hard-coded static strings per pattern (fast, offline, no API cost)
- Bullish/neutral/bearish signal: derived from pattern type (encoded in the static pattern definition)

### Portfolio screen layout
- 5th PagerView page (position 4, after SummaryScreen at position 3)
- Share quantity input: inline number input field on each stock row — user edits directly in the list without opening a modal
- Quantity unit: lots/shares toggle — user can switch between entering lots (1 lot = 1000 shares) or individual shares; displayed consistently throughout the screen
- Sector determination: AI-inferred from stock names/codes — send stock names to MiniMax and let it classify sectors (e.g. 台積電 → Semiconductor)
- Health score display: large score card (e.g. 72/100 with color grade) at the top of the page; sector concentration and correlation cluster info as a written AI paragraph below, scrollable
- Consistent with Phase 6 AnalysisCard visual language: cyberpunk tokens, score badges

### AI-enriched notifications
- Wait up to 5 seconds for MiniMax response before firing notification; fall back to plain notification on timeout or error
- Prompt data: stock name + current price + alert threshold + direction only — minimal, fast, low token use
- Tone: factual market context, no financial advice (e.g. 「近日半導體主導上漲，法人連續買超」)
- Sentence length: one concise sentence in Traditional Chinese
- Fallback plain notification format unchanged from Phase 9 (name + crossed direction + current price)

### Graceful degradation (all three features)
- Pattern card: if chartStore candles are unavailable, card simply doesn't render
- Portfolio health score: show "需要 API 金鑰才能分析" prompt (same pattern as Phase 6 NoApiKeyPrompt) when key missing; show error card with retry if AI call fails
- AI notification: if AI call fails or times out, fire plain notification — user always receives the price alert

### Claude's Discretion
- Exact OHLCV threshold values for each pattern rule (body size ratios, shadow ratios)
- Pattern confidence ranking algorithm (to pick strongest when multiple detected)
- SQLite holdings table schema (column names, types, migration)
- holdingsStore Zustand structure and persistence logic
- Portfolio AI prompt engineering (how to frame sector + correlation + health score request)
- Lots/shares toggle state management (persisted preference or session-only)
- PatternCard component styling within cyberpunk design system

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `chartStore.getCandles(symbol, timeframe)`: Returns `OHLCVPoint[]` — direct input for pattern detector
- `OHLCVPoint` type (`src/features/charts/types.ts`): `{ timestamp, open, high, low, close, volume }` — pattern rules operate on this
- `alertMonitor.ts` `fireAlertNotification()`: Existing function to extend with AI context call + 5s wait logic
- `settingsStore` `apiKey`, `modelName`, `baseUrl`: MiniMax credentials for all AI calls in this phase
- `useWatchlistStore(s => s.items)`: Stock list for Portfolio page holdings rows
- `useQuoteStore(s => s.quotes[symbol])`: Current prices for invested value calculation
- `src/db/schema.ts` + Drizzle ORM: Add `holdings` table here (same pattern as `price_alerts` table)
- `NoApiKeyPrompt` component (`src/features/analysis/components/NoApiKeyPrompt.tsx`): Reuse for Portfolio no-key state
- `minimaxApi` service pattern from Phase 6: Bearer fetch, prompt-based JSON extraction, AbortSignal.timeout

### Established Patterns
- Zustand v5 per-domain stores with cache/loading/error shape (analysisStore, chartStore pattern)
- Drizzle ORM SQLite CRUD — see `watchlistService.ts` and `alertService.ts` for reference
- `isActive` prop on PagerView pages for lazy loading (AnalysisScreen, SummaryScreen pattern)
- NativeWind cyberpunk tokens: `bg-surface`, `text-primary`, `border-border`, `text-muted`, score color thresholds
- One AI call per concern, JSON-extracted structured response (Phase 6 pattern)

### Integration Points
- `src/app/detail/[symbol].tsx`: Add PatternCard component between VolumeBar and alert status section
- `src/app/index.tsx` PagerView: Add PortfolioScreen as page at position 4 (key="4")
- `src/features/alerts/services/alertMonitor.ts`: Modify `fireAlertNotification` to await MiniMax call (5s timeout) before scheduling notification
- `src/db/schema.ts`: Add `holdings` table
- New feature directory: `src/features/portfolio/` (store, services, components)
- New service: `src/features/charts/services/patternDetector.ts` (pure TS, no React dependency)

</code_context>

<specifics>
## Specific Ideas

- Pattern card should feel like a quick scan signal — pattern name prominently, explanation in muted smaller text below, bullish/neutral/bearish as a colored pill (same pill style as Buy/Hold/Sell in AnalysisCard)
- Portfolio health score card at the top mirrors the overall score in Phase 6 AnalysisCard — large number, color-coded (green/yellow/red)
- AI notification sentence should be concise enough to display fully in the notification shade without truncation (aim for ≤40 Chinese characters)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-ai-intelligence-layer*
*Context gathered: 2026-03-23*
