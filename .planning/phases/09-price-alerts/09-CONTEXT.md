# Phase 9: Price Alerts - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can set a target price on any stock from its chart detail page and receive a push notification when that price is crossed, with all active alerts persisted and manageable. Background monitoring via WorkManager, battery optimization prompt in Settings, bell icon on home for all-alerts overview.

</domain>

<decisions>
## Implementation Decisions

### Alert Trigger Rules
- Users can set both upper AND lower target prices per stock (price band)
- One upper + one lower alert max per stock (setting new replaces old)
- Each direction is independently optional (upper only, lower only, or both)
- After triggering: alert stays in list marked as "triggered" (not auto-deleted)
- Triggered alerts can be re-enabled via a "Re-enable" button
- Notification content: stock name + price + direction (e.g. "台積電 crossed above 980 — current: 985.00")

### Background Monitoring
- Check every 15 minutes via Android WorkManager
- Market hours only (Mon-Fri 09:00-13:30) — skip checks outside trading hours, uses existing marketHours logic
- When app is in foreground: check alert conditions on every regular quote poll (~30s) for near-instant alerts
- Subtle persistent notification while monitoring is active: "Monitoring 3 alerts"

### Alert Management UI
- Per-stock alerts managed on the detail screen (below the chart section)
- Alert status always visible below chart when alerts exist: "↑980 Active • ↓920 Active" — tapping opens edit modal
- Home screen: bell icon in header with number badge showing total active alerts
- Bell icon tap opens modal listing all alerts across all stocks
- Each alert row: "台積電 ↑980 • Active" or "台積電 ↓920 • Triggered" with swipe-to-delete
- Modal shows both active and triggered alerts, separated: active on top, triggered dimmed below
- Triggered alerts show "Re-enable" button

### Alert Creation UX
- Bell icon in detail screen header opens bottom sheet modal
- Modal has upper and lower price input fields (each independently optional)
- Pre-fill: upper at current price +5%, lower at -5% (user can adjust)
- If alerts already exist for stock: modal pre-fills with existing values for editing
- Smart validation: upper must be > current price, lower must be < current price
- Battery optimization prompt lives in Settings screen (not in alert creation flow)

### Claude's Discretion
- WorkManager configuration and scheduling details
- Notification channel setup and Android API specifics
- SQLite alerts table schema design
- Alert service architecture (integration with existing stockService queue)
- Exact bottom sheet modal styling and animation
- How to deep-link to Android battery optimization settings from Settings screen

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `stockService.ts`: TWSE quote fetching with rate-limit queue — reuse for background price checks
- `marketHours.isMarketOpen()` / `isHoliday()`: Taipei timezone-aware trading day checks — gate background monitoring
- `quoteStore.quotes`: Live quote data for foreground alert checking
- `watchlistStore.items`: User's stock list — alerts reference these symbols
- Drizzle ORM (`src/db/schema.ts`, `src/db/client.ts`): Add alerts table here
- Detail screen (`src/app/detail/[symbol].tsx`): Alert icon + status section goes here

### Established Patterns
- Zustand stores with persistence (watchlistStore, settingsStore, analysisStore)
- Drizzle ORM for SQLite CRUD (watchlistService pattern)
- Bottom sheet / modal patterns (SearchModal from Phase 3)
- PagerView with isActive prop for lazy loading
- Header icons (Settings gear on home screen)

### Integration Points
- `src/app/detail/[symbol].tsx`: Add bell icon to header, alert status section below chart, bottom sheet modal
- `src/app/index.tsx`: Add bell icon with badge to home screen header
- `src/db/schema.ts`: Add alerts table
- `_layout.tsx`: Initialize alert monitoring on app start
- Settings screen: Add battery optimization prompt/link

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

*Phase: 09-price-alerts*
*Context gathered: 2026-03-21*
