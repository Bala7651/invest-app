# Phase 10: Polish - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Add sparkline mini charts to watchlist cards for at-a-glance price trends, implement cyberpunk glow animations on price updates, and refine the layout to be responsive across 5"-6.7" Android phones and tablets. No new features — this is visual polish on existing functionality.

</domain>

<decisions>
## Implementation Decisions

### Sparkline design
- Position: inline between stock name (left) and price/change (right) — compact, no card height increase
- Style: simple line chart, no area fill
- Data source: intraday ticks accumulated from quote polling during the session (resets each session)
- Color: matches stock change direction — green (`#00E676`) if up, red (`#FF1744`) if down
- Must not replace or obscure the existing price/delta text

### Glow animation
- Element: price text flash only (not card border or background)
- Trigger: only when price value actually changes from previous tick — no glow on flat ticks
- Duration: ~500ms quick pulse
- Color: green flash for price up, red flash for price down
- Scope: watchlist cards on home screen only — detail/chart screen excluded

### Responsive layout
- Priority: prevent overflow and truncation on all screen sizes (5" to 6.7" phones + tablets)
- SafeArea: apply SafeAreaView to detail screen and any other screens missing it (deferred fix from Phase 4)
- Long stock names: truncate with ellipsis (numberOfLines + ellipsizeMode)
- Orientation: portrait-only lock — no landscape support
- Pull-to-refresh: watchlist home screen only — triggers immediate quote poll
- Tablet support: cards should render with reasonable width on 10" screens (max content width or centered layout)
- Empty state: add cyberpunk-styled empty state graphic with neon aesthetic and "Add stocks to start tracking" message

### Visual tone
- Current palette stays: bg #050508, primary #4D7CFF, secondary #8B5CF6, stock-up #00E676, stock-down #FF1744
- Section headers: add thin neon underline/glow accent under page/section headers
- Loading skeletons: neon shimmer (blue/purple sweep) instead of standard gray pulse
- Spatial reference: Robinhood dark mode — clean, spacious, modern fintech feel (not dense Bloomberg style)

### Claude's Discretion
- Sparkline rendering approach (SVG path, React Native View stacking, or lightweight chart lib)
- Exact glow animation easing and opacity curve
- Empty state illustration implementation (SVG, Reanimated, or static image)
- Neon shimmer implementation details
- Tablet layout breakpoint threshold
- Exact neon underline thickness and glow radius

</decisions>

<specifics>
## Specific Ideas

- "Robinhood dark mode" as spatial/cleanliness reference — clean, not dense
- "Bloomberg Terminal meets neon" for data density with glowing accents (from PROJECT.md)
- Sparkline should feel subtle — informational at a glance, not dominating the card
- Glow should be noticeable but not distracting with 20-30s polling intervals

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `react-native-reanimated` 4.2.1: already used for MarketStatusBar pulse animation — reuse for glow flash and shimmer
- `StockCard.tsx` (src/features/watchlist/components/): current layout is flex-row with left (symbol/name) and right (price/change) — sparkline goes in the middle
- `tailwind.config.js`: cyberpunk color tokens defined (bg, surface, border, primary, secondary, stock-up, stock-down, text, muted)
- NativeWind v4 + Tailwind CSS v3: all styling via className

### Established Patterns
- Volume bars in Phase 4 used plain React Native View layout (Skia was skipped due to npm EFBIG)
- Opacity pulse animation (1.0->0.3) used for MarketStatusBar dot — similar pattern for glow
- `quoteStore` provides real-time quote data with `fetchedAt` timestamps — sparkline data source

### Integration Points
- `StockCard` receives `quote` prop with price/change — add sparkline data (tick history) as additional prop or derive from store
- `quoteStore` tick cycle — hook into price changes to trigger glow animation
- `_layout.tsx` — portrait lock configuration
- SafeAreaView needed in detail screen (currently uses manual pt-12 offset)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-polish*
*Context gathered: 2026-03-22*
