# Phase 4: Charts - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can tap any watchlist stock to see a detailed candlestick chart with volume bars across 5 timeframes (1D, 5D, 1M, 6M, 1Y), rendered smoothly without SVG performance issues. Chart detail page replaces the existing placeholder screen.

</domain>

<decisions>
## Implementation Decisions

### Detail screen layout
- Bloomberg-style header: symbol + name on left, current price + change on right (dense single row, consistent with watchlist cards)
- Back button on left side of header (already exists in placeholder)
- Candlestick chart takes ~65% of available height
- Volume bars stacked below chart (~20% height), clear visual separation
- Timeframe buttons at bottom below volume bars
- Chart-only for now — no stats rows below. AI analysis (Phase 6) and price alerts (Phase 9) add their sections later

### Timeframe selector
- Horizontal row of pill-style buttons: 1D, 5D, 1M, 6M, 1Y
- 1D highlighted by default on screen open
- Sliding highlight animation between selections (Reanimated-based)
- Skeleton/shimmer loading state during data fetch
- Chart crossfades between timeframes (not hard cut)

### Candle interaction
- Press-and-hold shows vertical crosshair line + OHLCV tooltip near touch point
- Header price updates to reflect touched candle's close price while holding
- Release returns header to current/latest price
- No pinch-to-zoom for v1 (v2 ECRT-02 adds interactive crosshair enhancements)

### Data source
- FinMind API as primary source for TWSE historical OHLCV data (free, community-documented, reliable)
- Fallback: direct TWSE endpoints where available
- Cache fetched data in memory only (no SQLite table for historical data)
- Timeframe granularity: 1D uses 5-min intervals, 5D uses 30-min intervals, 1M/6M/1Y use daily candles
- Rate limiting: respect FinMind's limits, use existing request queue pattern from Phase 2

### Claude's Discretion
- Exact chart library configuration and styling (react-native-wagmi-charts)
- Volume bar chart implementation (gifted-charts or custom Skia drawing)
- Shimmer/skeleton animation details
- Crosshair tooltip positioning and styling
- FinMind API endpoint paths and response parsing
- Error states for failed historical data fetches
- Cache invalidation strategy (how long to keep historical data in memory)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/detail/[symbol].tsx`: Placeholder detail screen with back button and symbol param — replace content
- `quoteStore.ts`: Live quote data (current price, change) for header display
- `watchlistStore.ts`: Stock name lookup by symbol
- `stockService.ts`: Request queue pattern with rate limiting — reuse for historical API calls
- `StockCard.tsx`: `formatChange` function for consistent price change formatting

### Established Patterns
- Zustand v5 per-domain stores — new chartStore for historical data caching
- NativeWind v4 with cyberpunk tailwind tokens (bg-surface, text-primary, border-border)
- Reanimated 4 for animations (timeframe selector, crossfade transitions)
- Feature-based directory: `src/features/charts/`

### Integration Points
- `StockCard` tap handler already navigates to `/detail/${symbol}` via expo-router
- `quoteStore` provides live price for header (current price + change)
- Request queue in stockService can be extended or a new historicalService created
- Phase 9 (Price Alerts) will add alert icon to the detail screen header

</code_context>

<specifics>
## Specific Ideas

- Chart should feel like a Bloomberg terminal chart — clean gridlines, no decorative gradients
- Volume bars should use green/red coloring matching the candle direction (up day = green, down day = red)
- Timeframe buttons should feel snappy — instant visual feedback on tap even before data loads
- 240+ candles on 1Y chart must scroll/render smoothly (Skia-based, not SVG)

</specifics>

<deferred>
## Deferred Ideas

- Technical indicator overlays (RSI, MACD, KD) — v2 requirement ECRT-01
- Interactive crosshair with data tooltip — v2 requirement ECRT-02 (basic press-and-hold in v1)
- Sparkline mini chart on watchlist cards — WTCH-06 in Phase 10

</deferred>

---

*Phase: 04-charts*
*Context gathered: 2026-03-19*
