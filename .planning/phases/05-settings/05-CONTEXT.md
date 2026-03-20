# Phase 5: Settings - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can store their MiniMax API key securely so the AI analysis feature can function, with the key never appearing in plaintext in any file or log. Settings accessible via hamburger menu drawer from the home screen.

</domain>

<decisions>
## Implementation Decisions

### Settings entry point
- Hamburger menu icon in top-left of home screen header
- Slide-in drawer from left edge, cyberpunk-styled (bg-surface background)
- Drawer contains: Settings item only (other items can be added in future phases)
- Close via swipe left gesture or tap outside on dimmed overlay
- Tapping Settings navigates to the settings screen (existing `settings.tsx`)

### Settings screen layout
- Two sections: "API Configuration" and "Display"
- API Configuration section: MiniMax API key field, model name field (free text, default "MiniMax-M2.5"), base URL field (default "https://api.minimax.io/v1")
- Display section: Glow intensity with 3 pill buttons (Subtle / Medium / Heavy), similar to timeframe selector style
- Back button in header to return to home

### API key input behavior
- Masked display with reveal toggle: shows "••••••••abcd" (last 4 chars visible), eye icon to temporarily reveal full key
- Auto-save on blur: key saves to expo-secure-store automatically when user taps away, shows brief "Saved" toast
- "Test" button next to API key field: makes lightweight API call to verify key works, shows success/error feedback
- Clear/trash button to delete saved key from secure storage with confirmation prompt
- Model name and base URL fields also auto-save on blur

### Claude's Discretion
- Toast notification styling and duration
- Test connection API call implementation details
- Drawer animation timing and easing
- Keyboard handling for input fields

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/settings.tsx`: Placeholder settings screen with back button and two card sections — enhance, don't recreate
- `src/features/settings/store/settingsStore.ts`: Zustand store with glowLevel state — extend with API key/model/URL state
- `TimeframeSelector.tsx`: Pill button pattern with sliding highlight — reuse pattern for glow intensity selector

### Established Patterns
- Zustand v5 per-domain stores with TypeScript
- NativeWind v4 with cyberpunk tailwind tokens (bg-surface, text-primary, border-border, text-muted)
- Reanimated 4 for animations
- Feature-based directory: `src/features/settings/`

### Integration Points
- Home screen (`src/app/index.tsx`): Add hamburger menu icon to header, drawer overlay
- `expo-secure-store`: New dependency for secure API key storage (SETT-04)
- Phase 6 (AI Analysis): Will read API key, model name, and base URL from settingsStore

</code_context>

<specifics>
## Specific Ideas

- Drawer should feel native — smooth slide animation, dimmed backdrop
- API key field should feel secure — masked by default, intentional action to reveal
- Glow pills should match the cyberpunk aesthetic of the rest of the app
- Test button should give immediate, clear feedback (green checkmark or red X)

</specifics>

<deferred>
## Deferred Ideas

- Additional drawer items (About, Help, Feedback) — future phases
- Fugle API key field for intraday chart data — Phase 4 v2
- Theme/color scheme selector — could be added to Display section later

</deferred>

---

*Phase: 05-settings*
*Context gathered: 2026-03-21*
