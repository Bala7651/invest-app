# Phase 10: Polish - Research

**Researched:** 2026-03-22
**Domain:** React Native animations (Reanimated 4), SVG sparklines (react-native-svg), responsive layout, pull-to-refresh
**Confidence:** HIGH

## Summary

Phase 10 adds three visual capabilities to the existing app: sparkline mini charts in watchlist cards, a neon glow flash on price updates, and responsive layout fixes across Android screen sizes. All required dependencies are already installed — react-native-svg 15.15.4 (sparklines), react-native-reanimated 4.2.1 (glow flash), and react-native-safe-area-context 5.6.2 (SafeAreaView) are present. No new packages need to be installed.

The sparkline renders as an SVG Polyline directly inside StockCard using raw point-to-SVG coordinate math — no additional chart library needed. The glow animation uses `interpolateColor` + `withSequence` from Reanimated 4 — the same pattern as the existing MarketStatusBar dot pulse but applied to text color. Responsive layout uses `useWindowDimensions` (already imported in detail screen) plus `maxWidth` / `alignSelf: 'center'` for tablet centering. The only architecture change is adding tick history accumulation to `quoteStore`.

**Primary recommendation:** Build all three features using only libraries already installed. Zero new dependencies.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Sparkline design**
- Position: inline between stock name (left) and price/change (right) — compact, no card height increase
- Style: simple line chart, no area fill
- Data source: intraday ticks accumulated from quote polling during the session (resets each session)
- Color: matches stock change direction — green (`#00E676`) if up, red (`#FF1744`) if down
- Must not replace or obscure the existing price/delta text

**Glow animation**
- Element: price text flash only (not card border or background)
- Trigger: only when price value actually changes from previous tick — no glow on flat ticks
- Duration: ~500ms quick pulse
- Color: green flash for price up, red flash for price down
- Scope: watchlist cards on home screen only — detail/chart screen excluded

**Responsive layout**
- Priority: prevent overflow and truncation on all screen sizes (5" to 6.7" phones + tablets)
- SafeArea: apply SafeAreaView to detail screen and any other screens missing it (deferred fix from Phase 4)
- Long stock names: truncate with ellipsis (numberOfLines + ellipsizeMode)
- Orientation: portrait-only lock — no landscape support
- Pull-to-refresh: watchlist home screen only — triggers immediate quote poll
- Tablet support: cards should render with reasonable width on 10" screens (max content width or centered layout)
- Empty state: add cyberpunk-styled empty state graphic with neon aesthetic and "Add stocks to start tracking" message

**Visual tone**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WTCH-06 | Each watchlist card shows a sparkline mini chart of the day's price trend | SVG Polyline via react-native-svg (already installed v15.15.4); tick history in quoteStore; coordinate normalization math |
| UI-03 | Responsive layout for Android devices | useWindowDimensions + maxWidth centering for tablet; SafeAreaView from react-native-safe-area-context (v5.6.2 installed); numberOfLines ellipsis for long names |
</phase_requirements>

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native-svg | 15.15.4 | SVG Polyline for sparkline rendering | Already installed; Fabric/New Architecture compatible since v13; no npm EFBIG risk |
| react-native-reanimated | 4.2.1 | `withSequence` + `interpolateColor` for glow flash; `withRepeat` for shimmer | Already used in MarketStatusBar dot pulse; established pattern in codebase |
| react-native-safe-area-context | 5.6.2 | `useSafeAreaInsets` hook for detail screen top padding | Already installed; no SafeAreaView is the known bug from Phase 4 |
| react-native (built-in) | 0.83.2 | `useWindowDimensions` for tablet breakpoint; `RefreshControl` for pull-to-refresh; `numberOfLines` + `ellipsizeMode` for text truncation | No additional install |

### No New Packages Required

All capabilities needed are available through installed dependencies. The Skia/npm EFBIG blocker from Phase 4 does not apply here — react-native-svg was already installed (it is a peer dep of react-native-wagmi-charts) and is the right tool for lightweight sparklines.

**Installation:** None needed.

---

## Architecture Patterns

### Recommended Project Structure Changes

```
src/
├── features/
│   └── watchlist/
│       ├── components/
│       │   ├── StockCard.tsx          # Add sparkline + glow animation
│       │   ├── SparklineChart.tsx     # NEW: SVG Polyline sparkline component
│       │   └── EmptyWatchlist.tsx     # Update: cyberpunk-styled empty state
│   └── market/
│       └── quoteStore.ts              # Add tickHistory: Record<string, number[]>
├── app/
│   ├── index.tsx                      # Add RefreshControl + pull-to-refresh
│   └── detail/[symbol].tsx            # Replace pt-48 with SafeAreaView
```

### Pattern 1: Tick History Accumulation in quoteStore

**What:** Add a `tickHistory` field to `quoteStore` that appends each price tick per symbol (session-only, resets on polling stop or app restart).
**When to use:** Data source for sparkline; accumulated during the trading session from real TWSE polling ticks.

```typescript
// quoteStore addition — append to existing tick block
interface QuoteState {
  // ... existing fields
  tickHistory: Record<string, number[]>; // symbol -> price ticks (session-only)
}

// Inside the tick() function, after computing quotes:
const tickHistory = { ...get().tickHistory };
for (const q of raw) {
  if (q.price !== null) {
    const prev = tickHistory[q.symbol] ?? [];
    tickHistory[q.symbol] = [...prev, q.price];
  }
}
set({ quotes: { ...get().quotes, ...quotes }, tickHistory });

// In stopPolling, reset tickHistory:
set({ polling: false, _intervalId: null, tickHistory: {} });
```

**Key insight:** tickHistory is ephemeral — intentionally session-scoped. No SQLite persistence needed.

### Pattern 2: SVG Polyline Sparkline

**What:** A pure SVG `<Polyline>` component that normalizes price data to SVG viewport coordinates.
**When to use:** Rendering sparkline inline in StockCard between name and price columns.

```typescript
// Source: react-native-svg v15 + coordinate normalization
import Svg, { Polyline } from 'react-native-svg';

interface SparklineProps {
  data: number[];       // price ticks
  width: number;        // fixed width, e.g. 60
  height: number;       // fixed height, e.g. 28
  color: string;        // '#00E676' or '#FF1744'
}

export function SparklineChart({ data, width, height, color }: SparklineProps) {
  if (data.length < 2) return null; // need at least 2 points

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // avoid div-by-zero for flat lines

  const points = data.map((price, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((price - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  );
}
```

**Critical:** react-native-svg's `Polyline` does NOT support NativeWind `className` — use inline `stroke` prop directly (SVG props, not style). `cssInterop` is NOT needed since we use native SVG attributes, not Tailwind classes.

### Pattern 3: Glow Flash Animation (price text color)

**What:** `interpolateColor` + `withSequence` to flash price text color on change.
**When to use:** When `quote.price` changes from the previous value in StockCard.

```typescript
// Source: Reanimated 4 docs — interpolateColor + withSequence
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

// Inside StockCard component:
const glowProgress = useSharedValue(0); // 0 = normal, 1 = flash peak
const prevPriceRef = useRef<number | null>(null);

useEffect(() => {
  if (quote?.price != null && prevPriceRef.current !== null) {
    if (quote.price !== prevPriceRef.current) {
      // Trigger 500ms flash: ramp to 1, then back to 0
      glowProgress.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 350 }),
      );
    }
  }
  prevPriceRef.current = quote?.price ?? null;
}, [quote?.price]);

const flashColor = quote?.change >= 0 ? '#00E676' : '#FF1744';

const priceStyle = useAnimatedStyle(() => ({
  color: interpolateColor(
    glowProgress.value,
    [0, 1],
    ['#E0E0E0', flashColor],  // text color -> neon color
  ),
}));

// Replace <Text> with <Animated.Text style={priceStyle}>
```

**Key constraint:** Flash only triggers when `quote.price !== prevPriceRef.current`. Flat ticks (same price) do NOT trigger a flash. This matches the locked decision.

### Pattern 4: Responsive Layout — Tablet Centering

**What:** `useWindowDimensions` to detect tablet width; apply `maxWidth` + `alignSelf: 'center'` to content containers.
**When to use:** Screens that render cards in a column (WatchlistPage, AnalysisScreen).

```typescript
// Source: React Native official docs — useWindowDimensions
import { useWindowDimensions } from 'react-native';

function WatchlistPage() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const contentStyle = isTablet
    ? { maxWidth: 540, alignSelf: 'center' as const, width: '100%' as const }
    : {};

  return (
    <View className="flex-1 bg-bg px-4 pt-12">
      <View style={contentStyle}>
        {/* header, list */}
      </View>
    </View>
  );
}
```

**Breakpoint:** 600dp. This covers all 5"-6.7" phones as "phone" (<600dp) and 10" tablets as "tablet" (>=600dp). Chosen because standard Android dp widths: 5" ≈ 360dp, 6.7" ≈ 411dp, 10" ≈ 800dp.

### Pattern 5: SafeAreaView in Detail Screen

**What:** Replace manual `paddingTop: 48` with `useSafeAreaInsets` for proper notch/home-indicator handling.
**When to use:** Any screen using raw `View` at the root without SafeAreaView.

```typescript
// Source: react-native-safe-area-context v5 docs
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DetailScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      {/* ... */}
    </View>
  );
}
```

**Note:** `react-native-safe-area-context` is already installed and the `SafeAreaProvider` is already present via Expo Router's root layout. `useSafeAreaInsets()` works immediately.

### Pattern 6: Pull-to-Refresh on ReorderableList

**What:** `RefreshControl` passed as `refreshControl` prop to `ReorderableList`. Gesture conflict handled by toggling `enabled` during drag.
**When to use:** WatchlistPage only.

```typescript
// Source: react-native-reorderable-list v0.18 README
import { RefreshControl } from 'react-native';
const [refreshing, setRefreshing] = useState(false);
const [refreshEnabled, setRefreshEnabled] = useState(true);

async function handleRefresh() {
  setRefreshing(true);
  const symbols = items.map(i => i.symbol);
  if (symbols.length > 0 && isMarketOpen()) {
    await useQuoteStore.getState().forceRefresh(symbols); // new method needed
  }
  setRefreshing(false);
}

<ReorderableList
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      enabled={refreshEnabled}
      colors={['#4D7CFF']}
      tintColor="#4D7CFF"
    />
  }
  onDragStart={() => setRefreshEnabled(false)}
  onDragEnd={() => setRefreshEnabled(true)}
  // ... other props
/>
```

**Caveat:** `quoteStore.startPolling` is idempotent (guard on `polling` boolean). A dedicated `forceRefresh` method is needed that bypasses the guard and fires a single immediate fetch regardless of polling state.

### Pattern 7: Neon Shimmer Skeleton

**What:** Animated shimmer using `interpolate` on an X-position to simulate a sweep effect using a colored overlay. No LinearGradient dependency needed — use opacity toggling with `withRepeat` on a blue-tinted View.
**When to use:** Replace AnalysisSkeleton gray opacity pulse with a blue/purple color sweep feel.

```typescript
// Minimal shimmer: a colored animated Animated.View overlay on skeleton blocks
// Instead of bg-border (gray), use bg-primary/20 or bg-secondary/20 (blue/purple)
// Existing opacity pulse pattern (AnalysisSkeleton) already does this — just change className color
const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
// Change: className="bg-border" → className="bg-primary" with lower base opacity
```

**Decision:** Full linear-gradient shimmer (expo-linear-gradient) is more complex and introduces a new dependency. The existing opacity-pulse pattern with blue/purple colors achieves adequate cyberpunk neon shimmer feel. Recommend this simpler approach.

### Anti-Patterns to Avoid

- **Don't use `interpolateColor` on a plain `<Text>` component** — must be `<Animated.Text>` from Reanimated.
- **Don't pass `className` to SVG elements** — react-native-svg does not support NativeWind className natively; use inline SVG props (`stroke`, `fill`).
- **Don't use `withRepeat` for the glow flash** — the flash is a one-shot trigger, not a loop. `withSequence` is correct.
- **Don't call `startPolling` for pull-to-refresh** — it is idempotent and will no-op if already polling. A separate `forceRefresh` path is needed.
- **Don't apply SafeAreaView to PagerView pages** — SafeAreaView should wrap the outermost layout, not inner pages, to avoid double insets.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG coordinate math | Custom layout stacking with Views | react-native-svg Polyline + normalization formula | Views can't draw diagonal lines; SVG handles sub-pixel path correctly |
| Color animation | setState-based color switching | Reanimated `interpolateColor` + `withSequence` | JS-thread setState causes lag; worklet-side interpolation is 60fps jank-free |
| Safe area padding | Hardcoded `paddingTop: 48` | `useSafeAreaInsets()` | Static offset breaks on notch/foldable/home-indicator devices |
| Responsive breakpoints | Manual `Dimensions.get` calls | `useWindowDimensions` | Auto-updates on orientation or split-screen; Dimensions.get is snapshot |

**Key insight:** All three features (sparkline, glow, safe area) are 5-20 line solutions using existing installed libraries. The risk is not capability — it is getting the integration details right (SVG viewBox, Animated.Text vs Text, insets provider already present).

---

## Common Pitfalls

### Pitfall 1: Sparkline on Single-Point Data
**What goes wrong:** `data.length < 2` causes Polyline to render a dot or error — invisible or crashes.
**Why it happens:** During market open, the first poll only gives 1 tick. A Polyline needs at least 2 points.
**How to avoid:** Early return `null` from SparklineChart when `data.length < 2`. Show nothing until 2+ ticks accumulated.
**Warning signs:** Blank card middle section on first load after market opens.

### Pitfall 2: Glow Flash on Stale Quote (Same Price)
**What goes wrong:** Component re-renders on unrelated store changes; `useEffect` fires but price hasn't changed — glow triggers incorrectly.
**Why it happens:** `useEffect([quote?.price])` is fine, but `quote` object reference changes every tick even when price is identical.
**How to avoid:** Use `useEffect([quote?.price])` with dependency on the scalar `quote?.price`, not the full `quote` object. The `prevPriceRef` comparison is the safety net.
**Warning signs:** Glow flashing on every poll tick even when price is flat.

### Pitfall 3: SVG Does Not Fill Card Width Correctly
**What goes wrong:** SparklineChart renders too wide or too narrow, squeezing the price column off-screen.
**Why it happens:** Fixed width constants don't adapt to card width on different screen sizes.
**How to avoid:** Pass a fixed small width (e.g., 60dp) — the sparkline is intentionally compact. Keep it fixed, not flex-1. The card uses `flex-row` with left `flex-1` and right `items-end`; middle sparkline should have a fixed width.
**Warning signs:** Price/change text truncated or pushed off screen.

### Pitfall 4: interpolateColor on Text Crashes
**What goes wrong:** `interpolateColor` applied to `<Text style={{color: interpolateColor(...)}}` — does not work from JS thread.
**Why it happens:** `interpolateColor` must be called inside `useAnimatedStyle` worklet, applied to `Animated.Text`.
**How to avoid:** Always use `Animated.Text` (not `Text`) and `useAnimatedStyle` wrapping the `interpolateColor` call.
**Warning signs:** "Cannot use shared value in non-worklet function" error, or no animation at all.

### Pitfall 5: RefreshControl Gesture Conflict on Android
**What goes wrong:** Pull-to-refresh triggers while user is long-pressing to drag a card; both gestures fire simultaneously.
**Why it happens:** ReorderableList gesture and RefreshControl compete on Android.
**How to avoid:** Toggle `enabled={refreshEnabled}` on RefreshControl; set `refreshEnabled = false` in `onDragStart`, restore in `onDragEnd`. Both callbacks run on the JS thread so `runOnJS` is NOT required (they are already RN event handlers, not worklets).
**Warning signs:** RefreshControl animation starts while dragging a card.

### Pitfall 6: Detail Screen Double Insets
**What goes wrong:** Detail screen appears with too much top padding after replacing manual `paddingTop: 48` with `useSafeAreaInsets`.
**Why it happens:** If both the Stack navigator and the screen apply top insets, they compound.
**How to avoid:** Expo Router's Stack with `headerShown: false` does NOT add insets — so applying `insets.top` in the screen is correct and won't double. Verify by testing on a device with notch.
**Warning signs:** Too much whitespace above the "Back" button.

---

## Code Examples

Verified patterns from official sources and installed library versions:

### SparklineChart — Core Coordinate Math
```typescript
// react-native-svg v15 Polyline — coordinate normalization
// points string format: "x1,y1 x2,y2 ..."
const min = Math.min(...data);
const max = Math.max(...data);
const range = max - min || 1;
const points = data.map((p, i) => {
  const x = (i / (data.length - 1)) * width;
  const y = height - ((p - min) / range) * height;
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}).join(' ');
// Result: "0.0,28.0 15.0,14.0 30.0,0.0 45.0,21.0 60.0,28.0"
```

### Glow Flash — One-Shot withSequence
```typescript
// Reanimated 4 — withSequence for 500ms total flash
glowProgress.value = withSequence(
  withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }),
  withTiming(0, { duration: 350, easing: Easing.in(Easing.quad) }),
);
// useAnimatedStyle:
color: interpolateColor(glowProgress.value, [0, 1], ['#E0E0E0', flashColor])
```

### Safe Area — useSafeAreaInsets
```typescript
// react-native-safe-area-context v5
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const insets = useSafeAreaInsets();
// Apply: style={{ paddingTop: insets.top }}
// SafeAreaProvider is already present via expo-router root
```

### Text Truncation — Long Stock Names
```typescript
// React Native built-in
<Text numberOfLines={1} ellipsizeMode="tail" className="text-muted text-sm mt-0.5">
  {item.name}
</Text>
```

### quoteStore — forceRefresh Method Addition
```typescript
// New method to bypass polling guard for pull-to-refresh
async forceRefresh(symbols: string[]) {
  try {
    const raw = await getQuotes(symbols);
    const fetchedAt = Date.now();
    const quotes: Record<string, Quote> = {};
    const tickHistory = { ...get().tickHistory };
    for (const q of raw) {
      const change = q.price !== null ? q.price - q.prevClose : 0;
      const changePct = q.price !== null ? (change / q.prevClose) * 100 : 0;
      quotes[q.symbol] = { symbol: q.symbol, name: q.name, price: q.price,
        prevClose: q.prevClose, change, changePct, fetchedAt };
      if (q.price !== null) {
        tickHistory[q.symbol] = [...(tickHistory[q.symbol] ?? []), q.price];
      }
    }
    set({ quotes: { ...get().quotes, ...quotes }, tickHistory });
  } catch (e) {
    set({ lastError: String(e) });
  }
},
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Hardcoded `paddingTop: 48` | `useSafeAreaInsets().top` | Correct on all Android devices including notch/foldable |
| `Dimensions.get('window')` snapshot | `useWindowDimensions()` hook | Auto-updates on orientation/split-screen change |
| Gray opacity shimmer for skeletons | Blue/purple tinted opacity pulse | Matches cyberpunk palette without additional library |
| Plain `<Text>` for animated colors | `<Animated.Text>` + `useAnimatedStyle` | Required for worklet-side color interpolation in Reanimated 4 |

**Deprecated/outdated:**
- `StyleSheet.flatten` for conditional colors: replaced by `interpolateColor` in Reanimated 4
- `Platform.OS === 'ios'` manual inset offsets: replaced by `useSafeAreaInsets` universally

---

## Open Questions

1. **Neon header underline implementation**
   - What we know: Tailwind border utilities work (e.g., `border-b border-primary`); glow effect requires React Native shadow props or a thin colored View below the header text
   - What's unclear: React Native's `shadowColor`/`shadowRadius` on Android renders differently than iOS — shadow may not appear as "glow" on Android without `elevation`
   - Recommendation: Use a thin `View` with `height: 1, backgroundColor: '#4D7CFF', opacity: 0.8` below header text — more predictable than Android shadow. Keep it simple.

2. **Shimmer sweep vs opacity pulse**
   - What we know: True linear-gradient shimmer (expo-linear-gradient or react-native-linear-gradient) is not installed; installing it risks npm EFBIG pattern from Phase 4
   - What's unclear: Whether `expo-linear-gradient` triggers npm EFBIG (it's an Expo package with native module, likely fine)
   - Recommendation: Use the existing opacity-pulse pattern with blue/purple colors (`bg-primary/20`) for skeletons — achieves adequate neon shimmer without new dependency. If user wants true sweep, note it as LOW effort addition.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 with jest-expo preset |
| Config file | `package.json` (jest.preset = "jest-expo") |
| Quick run command | `cd /Users/linmini/invest/invest-app && jest --testPathPattern="SparklineChart\|quoteStore\|StockCard" --no-coverage` |
| Full suite command | `cd /Users/linmini/invest/invest-app && jest --no-coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WTCH-06 | SparklineChart returns null for <2 data points | unit | `jest --testPathPattern="SparklineChart" -t "returns null"` | ❌ Wave 0 |
| WTCH-06 | SparklineChart generates correct SVG points string | unit | `jest --testPathPattern="SparklineChart" -t "points"` | ❌ Wave 0 |
| WTCH-06 | quoteStore tickHistory accumulates price ticks | unit | `jest --testPathPattern="quoteStore" -t "tickHistory"` | ❌ Wave 0 (add to existing) |
| WTCH-06 | quoteStore tickHistory resets on stopPolling | unit | `jest --testPathPattern="quoteStore" -t "tickHistory reset"` | ❌ Wave 0 (add to existing) |
| WTCH-06 | glow flash triggers only on price change, not flat ticks | unit | `jest --testPathPattern="StockCard" -t "glow"` | ❌ Wave 0 |
| UI-03 | text truncation with numberOfLines=1 | unit | `jest --testPathPattern="StockCard" -t "truncat"` | ❌ Wave 0 |
| UI-03 | forceRefresh fetches quotes and updates tickHistory | unit | `jest --testPathPattern="quoteStore" -t "forceRefresh"` | ❌ Wave 0 (add to existing) |

**Note on glow animation test:** `interpolateColor` + Reanimated shared values require mock setup. The existing `jest.mock('react-native-reanimated', ...)` pattern in the codebase (from wagmi-charts tests) can be reused. Test the trigger logic (price changed = glow fires) rather than animation internals.

### Sampling Rate
- **Per task commit:** `cd /Users/linmini/invest/invest-app && jest --testPathPattern="SparklineChart|quoteStore|StockCard" --no-coverage`
- **Per wave merge:** `cd /Users/linmini/invest/invest-app && jest --no-coverage`
- **Phase gate:** Full suite green (currently 224 tests) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/SparklineChart.test.ts` — covers WTCH-06 sparkline math and null guard
- [ ] New test cases in `src/__tests__/quoteStore.test.ts` — covers tickHistory accumulation, reset, forceRefresh
- [ ] New test cases in `src/__tests__/StockCard.test.ts` — covers glow trigger logic and text truncation

*(Existing `jest-expo` preset and mock setup are sufficient — no new config needed)*

---

## Sources

### Primary (HIGH confidence)
- react-native-reanimated v4.2.1 installed — `withSequence`, `withTiming`, `interpolateColor` confirmed via `lib/typescript/index.d.ts` and `Colors.d.ts`
- react-native-svg v15.15.4 installed — `Polyline` element confirmed available; Fabric support confirmed since v13.0.0
- react-native-safe-area-context v5.6.2 installed — `useSafeAreaInsets` confirmed available
- [Reanimated withSequence docs](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSequence/) — withSequence API signature verified
- [Reanimated withTiming docs](https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming/) — color value animation confirmed (hex, rgb, rgba, named colors)
- [Reanimated interpolateColor docs](https://docs.swmansion.com/react-native-reanimated/docs/utilities/interpolateColor/) — interpolateColor for useAnimatedStyle confirmed

### Secondary (MEDIUM confidence)
- [react-native-reorderable-list README](https://github.com/omahili/react-native-reorderable-list/blob/master/README.md) — `refreshControl` prop support and gesture conflict mitigation confirmed (v0.18 docs)
- [React Native useWindowDimensions](https://reactnative.dev/docs/usewindowdimensions) — auto-updating hook confirmed
- Portrait lock confirmed via `app.json` `"orientation": "portrait"` — already applied, no Phase 10 work needed

### Tertiary (LOW confidence)
- Neon shadow glow on Android: based on known React Native Android shadow behavior — `shadowColor` unreliable on Android; View underline approach is safer (not officially documented as the standard workaround)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed and version-verified
- Architecture: HIGH — all patterns drawn from existing codebase conventions and installed library APIs
- Pitfalls: HIGH — three pitfalls (SVG className, Animated.Text, RefreshControl conflict) are verified against library docs and known RN issues

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable libraries, 30-day window)
