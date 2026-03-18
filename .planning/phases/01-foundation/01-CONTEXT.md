# Phase 1: Foundation - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffold with working Expo SDK 55 app, TypeScript strict mode, defined SQLite schema, NativeWind cyberpunk theme tokens, and gitignore that excludes secrets. Developer can run `npx expo start` with zero errors and see the cyberpunk theme rendered.

</domain>

<decisions>
## Implementation Decisions

### Project structure
- Feature-based directory layout: `src/features/{watchlist,charts,analysis,settings,alerts,summary}/` each owning components, hooks, stores
- Shared UI components in `src/components/ui/`
- Services in `src/services/`, database in `src/db/`, theme in `src/theme/`, types in `src/types/`
- expo-router for file-based routing in `app/` directory
- PagerView (react-native-pager-view) for home <-> AI analysis swipeable navigation — no tab bar visible
- All route files scaffolded as minimal placeholder screens (home, analysis, detail, settings) to validate full navigation graph early

### Cyberpunk theme tokens
- Background: #050508 (deep black)
- Surface: #0D0D14 (card backgrounds)
- Border: #1A1A2E (subtle borders)
- Primary accent: #4D7CFF (blue — buttons, links, interactive elements, glow)
- Secondary accent: #8B5CF6 (purple — headers, dividers, subtle accents)
- Stock up: #00E676 (green — traditional, non-negotiable)
- Stock down: #FF1744 (red — traditional, non-negotiable)
- Text: #E0E0E0 (light gray)
- Muted text: #6B7280 (dim gray)
- Glow effects: configurable intensity (subtle/medium/heavy) via settings, default to subtle
- Stock green/red colors are always traditional — never replaced by theme accent colors

### SQLite schema
- drizzle-orm with expo-sqlite backend for type-safe schema and queries
- Phase 1 tables: watchlist + daily_summaries only (alerts table added in Phase 9 via migration)
- Watchlist table includes `sort_order` integer column for manual reordering support
- Daily summaries `content` column stores a single JSON blob (flexible, no schema change if AI sections evolve)

### State management
- Zustand v5 with per-domain stores: watchlistStore, settingsStore, quoteStore, aiStore (and more as needed)
- All known stores scaffolded as minimal shells in Phase 1 to establish the pattern
- SQLite sync: load from SQLite on app init, write to SQLite immediately on each mutation (no persist middleware)

### Claude's Discretion
- Exact NativeWind v4 tailwind.config.js setup for custom theme tokens
- expo-router layout structure details
- Drizzle-orm migration strategy and initialization flow
- Exact placeholder screen content
- TypeScript config details beyond strict mode

</decisions>

<specifics>
## Specific Ideas

- Glow intensity should be a user setting (subtle/medium/heavy) accessible from the Settings page — this means settingsStore needs a `glowLevel` field from the start
- The theme is "Bloomberg Terminal meets cyberpunk" — professional data display with neon accents, not arcade game aesthetic
- Stock colors (green up, red down) are sacrosanct — they must never be overridden by theme colors

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — Phase 1 establishes the patterns that all subsequent phases follow

### Integration Points
- NativeWind theme tokens propagate to every screen in Phases 2-10
- SQLite schema is the persistence foundation for Phases 3, 5, 8, 9
- Zustand store shells define the state architecture for all features
- expo-router layout defines the navigation graph for the entire app

</code_context>

<deferred>
## Deferred Ideas

- Glow intensity setting UI — belongs in Phase 5 (Settings), but the store field and theme support are scaffolded here
- Drag-to-reorder watchlist — sort_order column is ready, UI implementation belongs in Phase 3

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-18*
