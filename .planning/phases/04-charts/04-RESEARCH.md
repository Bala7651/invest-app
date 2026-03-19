# Phase 4: Charts - Research

**Researched:** 2026-03-19
**Domain:** React Native candlestick charting, Taiwan stock historical data APIs, Skia-based rendering
**Confidence:** MEDIUM-HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Bloomberg-style header: symbol + name on left, current price + change on right (dense single row)
- Back button on left side of header (already exists in placeholder)
- Candlestick chart takes ~65% of available height
- Volume bars stacked below chart (~20% height), clear visual separation
- Timeframe buttons at bottom below volume bars
- No stats rows below chart in this phase (AI analysis Phase 6, price alerts Phase 9 add sections later)
- Horizontal pill-style timeframe buttons: 1D, 5D, 1M, 6M, 1Y
- 1D highlighted by default on screen open
- Sliding highlight animation between timeframe selections (Reanimated-based)
- Skeleton/shimmer loading state during data fetch
- Chart crossfades between timeframes (not hard cut)
- Press-and-hold shows vertical crosshair line + OHLCV tooltip near touch point
- Header price updates to reflect touched candle's close price while holding
- Release returns header to current/latest price
- No pinch-to-zoom for v1
- FinMind API as primary source for TWSE historical OHLCV data
- Fallback: direct TWSE endpoints where available
- Cache fetched data in memory only (no SQLite table for historical data)
- Timeframe granularity: All timeframes use daily candles for v1 (1D shows last trading day, 5D shows last 5 trading days, 1M/6M/1Y show respective periods). Intraday 5-min/30-min intervals deferred to v2 when Fugle API key integration is available.
- Rate limiting: respect FinMind's limits, use existing request queue pattern from Phase 2
- Chart should feel like a Bloomberg terminal chart — clean gridlines, no decorative gradients
- Volume bars use green/red matching candle direction (up day = green, down day = red)
- Timeframe buttons feel snappy — instant visual feedback on tap even before data loads
- 240+ candles on 1Y chart must scroll/render smoothly (Skia-based, not SVG)

### Claude's Discretion

- Exact chart library configuration and styling (react-native-wagmi-charts)
- Volume bar chart implementation (gifted-charts or custom Skia drawing)
- Shimmer/skeleton animation details
- Crosshair tooltip positioning and styling
- FinMind API endpoint paths and response parsing
- Error states for failed historical data fetches
- Cache invalidation strategy (how long to keep historical data in memory)

### Deferred Ideas (OUT OF SCOPE)

- Technical indicator overlays (RSI, MACD, KD) — v2 requirement ECRT-01
- Interactive crosshair with data tooltip — v2 requirement ECRT-02 (basic press-and-hold in v1)
- Sparkline mini chart on watchlist cards — WTCH-06 in Phase 10
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHRT-01 | User can tap a stock to see a detail view with candlestick chart | Detail screen already exists as placeholder at `src/app/detail/[symbol].tsx`; wagmi-charts provides CandlestickChart.Provider + CandlestickChart.Candles |
| CHRT-02 | Chart supports 5 timeframes: 1 Day, 5 Days, 1 Month, 6 Months, 1 Year | FinMind `TaiwanStockPrice` (daily) covers 1M/6M/1Y; intraday coverage requires Fugle or FinMind KBar (see CRITICAL NOTE below) |
| CHRT-03 | Volume bars displayed below the price chart | wagmi-charts has no built-in volume bars; must draw with @shopify/react-native-skia Rect primitives |
| CHRT-04 | Chart renders smoothly (Skia-based, no SVG performance cliff) | wagmi-charts is built on react-native-skia and Reanimated — confirmed Skia path; no SVG involved |
</phase_requirements>

---

## Summary

Phase 4 builds the candlestick chart detail screen replacing the existing placeholder at `src/app/detail/[symbol].tsx`. The stack is well-defined: `react-native-wagmi-charts` v2.9.1 handles the price chart (it is Skia + Reanimated based, not SVG), `@shopify/react-native-skia` Rect primitives handle volume bars (wagmi has no built-in volume component), and either FinMind or Fugle provides historical OHLCV data.

**CRITICAL DATA SOURCE ISSUE (LOW confidence on 1D/5D timeframe):** FinMind's `TaiwanStockKBar` (intraday minute-K data) is a **sponsor-only/paid** dataset. The free tier only provides `TaiwanStockPrice` (daily), `TaiwanStockWeekPrice`, and `TaiwanStockMonthPrice`. This means the 1D (5-min candles) and 5D (30-min candles) timeframes cannot use FinMind free tier. **Fugle's `historical/candles/{symbol}` API** supports 5-min (`5`) and 30-min (`30`) intervals going back 30 days for intraday, and is available on a free tier (register for Fugle membership). This is the recommended path for 1D/5D data. Daily data (1M/6M/1Y) can use TWSE direct endpoint `exchangeReport/STOCK_DAY`.

The Reanimated 4 compatibility concern is **resolved**: wagmi-charts v2.7.2+ added Reanimated v4 compatibility improvements, and the peerDependency is `*` (any version). The project uses Reanimated 4.2.1 which should work.

**Primary recommendation:** Use react-native-wagmi-charts v2.9.1 for the candlestick chart, @shopify/react-native-skia for custom volume bars, Fugle API for 1D/5D intraday candles, and TWSE `exchangeReport/STOCK_DAY` for 1M/6M/1Y daily candles.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native-wagmi-charts | 2.9.1 | Candlestick chart rendering with crosshair/gesture | Skia+Reanimated based (not SVG), already chosen at project init, Feb 2025 release |
| @shopify/react-native-skia | (bundled with wagmi) | Custom volume bar drawing via Rect primitives | wagmi-charts has no built-in volume bars; Skia Rect is simple and fast |
| react-native-reanimated | 4.2.1 (already installed) | Shimmer animation, timeframe selector sliding highlight, crossfade | Already in project, Reanimated 4 compatible with wagmi-charts v2.7.2+ |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand v5 | already installed | chartStore — in-memory cache of fetched OHLCV per symbol+timeframe | New store following existing project pattern |
| NativeWind v4 | already installed | Styling the detail screen layout, header, timeframe buttons | All layout/color styling follows project convention |
| expo-router | already installed | Navigation params — `useLocalSearchParams<{symbol}>()` | Already used in placeholder screen |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| custom Skia volume bars | react-native-gifted-charts (SVG) | gifted-charts uses SVG which violates CHRT-04; Skia Rect is simpler and faster |
| Fugle for 1D/5D intraday | FinMind KBar (paid) | FinMind free tier lacks intraday data; Fugle free tier provides 5/30 min candles for last 30 days |
| TWSE direct for daily | FinMind TaiwanStockPrice | Both work for daily data; TWSE is free with no token required; FinMind free requires token but has broader history |

### Installation

```bash
# react-native-wagmi-charts peer deps - check if react-native-haptic-feedback is needed
npm install react-native-wagmi-charts react-native-haptic-feedback
# @shopify/react-native-skia may already be installed as wagmi-charts dependency
# verify: ls invest-app/node_modules/@shopify/react-native-skia
```

**Note:** `react-native-reanimated` and `react-native-gesture-handler` are already installed. Verify `react-native-haptic-feedback` — if wagmi requires it and it is missing, the chart will fail silently on gesture.

---

## Architecture Patterns

### Recommended Project Structure

```
src/features/charts/
├── components/
│   ├── CandleChart.tsx        # Wraps wagmi CandlestickChart.Provider + Candles + Crosshair
│   ├── VolumeBar.tsx          # Skia Rect-based volume bar chart
│   ├── TimeframeSelector.tsx  # Pill buttons with Reanimated sliding highlight
│   └── ChartSkeleton.tsx      # Shimmer placeholder during fetch
├── store/
│   └── chartStore.ts          # Zustand store: fetched OHLCV keyed by `${symbol}:${timeframe}`
└── services/
    └── historicalService.ts   # Fetches from Fugle (1D/5D) and TWSE (1M/6M/1Y), transforms to CandleData[]

src/app/detail/[symbol].tsx    # Replace placeholder — hosts all chart sub-components
```

### Pattern 1: wagmi-charts CandlestickChart Data Format

**What:** Each data point requires `{ timestamp: number (ms), open: number, high: number, low: number, close: number }`. No volume field in wagmi's type — volume must be tracked separately.

**When to use:** Always pass data via `CandlestickChart.Provider data={candles}`.

**Example:**
```typescript
// Source: https://github.com/coinjar/react-native-wagmi-charts
import { CandlestickChart } from 'react-native-wagmi-charts';

type CandlePoint = {
  timestamp: number; // Unix ms
  open: number;
  high: number;
  low: number;
  close: number;
};

// Usage:
<CandlestickChart.Provider data={candles}>
  <CandlestickChart height={chartHeight}>
    <CandlestickChart.Candles
      positiveColor="#00ff88"   // cyberpunk up color (stock-up token)
      negativeColor="#ff3366"   // cyberpunk down color (stock-down token)
    />
    <CandlestickChart.Crosshair onCurrentXChange={handleHaptic}>
      <CandlestickChart.Tooltip />
    </CandlestickChart.Crosshair>
  </CandlestickChart>
  <CandlestickChart.PriceText
    format={({ value }) => {
      'worklet';
      return value.toFixed(2);
    }}
  />
</CandlestickChart.Provider>
```

### Pattern 2: Header Price Update via useCandleData

**What:** `CandlestickChart.useCandleData()` returns the active candle's `{timestamp, open, high, low, close}` while user presses and holds crosshair. Use this to update the header price display.

**When to use:** Inside a component nested within `CandlestickChart.Provider`.

**Example:**
```typescript
// Source: https://github.com/coinjar/react-native-wagmi-charts
function HeaderPrice({ currentPrice }: { currentPrice: number }) {
  const candle = CandlestickChart.useCandleData();
  // candle is null when not touching (use currentPrice from quoteStore)
  // candle.close when touching (show touched candle's close)
  const displayPrice = candle ? candle.close : currentPrice;
  return <Text>{displayPrice.toFixed(2)}</Text>;
}
```

**Note on `onEnded`/release:** The crosshair component fires `onActivated` when gesture starts and `onEnded` when gesture ends. Use `onEnded` on the Crosshair to restore header to live price.

### Pattern 3: Custom Volume Bars with Skia

**What:** `@shopify/react-native-skia` `<Rect>` primitive for each volume bar. Draw green for up-candles, red for down-candles.

**When to use:** Render below the wagmi chart in a separate `<Canvas>` sized to ~20% of available height.

**Example:**
```typescript
// Source: https://shopify.github.io/react-native-skia/docs/tutorials/
import { Canvas, Rect } from '@shopify/react-native-skia';

function VolumeBar({ candles, volumeData, height, width }: VolumeBarProps) {
  const maxVol = Math.max(...volumeData.map(d => d.volume));
  const barWidth = width / volumeData.length - 1;

  return (
    <Canvas style={{ height, width }}>
      {volumeData.map((d, i) => {
        const barH = (d.volume / maxVol) * height;
        const x = i * (barWidth + 1);
        const y = height - barH;
        const isUp = candles[i]?.close >= candles[i]?.open;
        return (
          <Rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barH}
            color={isUp ? '#00ff88' : '#ff3366'}
          />
        );
      })}
    </Canvas>
  );
}
```

### Pattern 4: Timeframe Selector with Sliding Highlight

**What:** Pill-row with an absolutely-positioned `Animated.View` that slides to the active button using `withTiming()` from Reanimated.

**When to use:** All 5 timeframe buttons share a container; the animated underlay slides on selection.

**Example:**
```typescript
// Source: Reanimated 4 patterns (https://docs.swmansion.com/react-native-reanimated/)
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const TIMEFRAMES = ['1D', '5D', '1M', '6M', '1Y'] as const;

function TimeframeSelector({ active, onSelect }: Props) {
  const translateX = useSharedValue(0); // position of sliding highlight

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(translateX.value, { duration: 200 }) }],
  }));

  const handleSelect = (index: number) => {
    translateX.value = index * PILL_WIDTH;
    onSelect(TIMEFRAMES[index]);
  };

  return (
    <View className="flex-row relative bg-surface rounded-full">
      <Animated.View style={[pillStyle, { position: 'absolute', ... }]} className="bg-primary rounded-full" />
      {TIMEFRAMES.map((tf, i) => (
        <Pressable key={tf} onPress={() => handleSelect(i)} className="flex-1 items-center py-2">
          <Text className={active === tf ? 'text-bg font-bold' : 'text-muted'}>{tf}</Text>
        </Pressable>
      ))}
    </View>
  );
}
```

### Pattern 5: chartStore Zustand v5

**What:** In-memory OHLCV cache keyed by `${symbol}:${timeframe}`. Avoids re-fetching when user switches back to a timeframe they already loaded. No persistence (memory only per CONTEXT.md decision).

**Example:**
```typescript
// Follows established quoteStore pattern (Zustand v5)
import { create } from 'zustand';

type Timeframe = '1D' | '5D' | '1M' | '6M' | '1Y';

interface OHLCVPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartState {
  cache: Record<string, OHLCVPoint[]>; // key: `${symbol}:${timeframe}`
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  fetchCandles: (symbol: string, timeframe: Timeframe) => Promise<void>;
  getCandles: (symbol: string, timeframe: Timeframe) => OHLCVPoint[] | undefined;
}

export const useChartStore = create<ChartState>((set, get) => ({
  cache: {},
  loading: {},
  errors: {},
  fetchCandles: async (symbol, timeframe) => {
    const key = `${symbol}:${timeframe}`;
    if (get().cache[key]) return; // cache hit — no refetch
    set(s => ({ loading: { ...s.loading, [key]: true } }));
    try {
      const data = await historicalService.fetch(symbol, timeframe);
      set(s => ({ cache: { ...s.cache, [key]: data }, loading: { ...s.loading, [key]: false } }));
    } catch (e) {
      set(s => ({ errors: { ...s.errors, [key]: String(e) }, loading: { ...s.loading, [key]: false } }));
    }
  },
  getCandles: (symbol, timeframe) => get().cache[`${symbol}:${timeframe}`],
}));
```

### Anti-Patterns to Avoid

- **SVG-based chart library:** Any library using react-native-svg degrades badly past 100 candles on Android mid-range devices. wagmi-charts uses Skia paths — never switch to SVG.
- **Pinch-to-zoom in v1:** CONTEXT.md explicitly defers this. Do not add GestureDetector pinch handling.
- **Polling historical data:** Historical OHLCV does not change intraday (1M/6M/1Y) or changes only for the current day (1D/5D). Fetch once per session (cache hit strategy in chartStore).
- **Fetching all 5 timeframes on screen open:** Only fetch the active timeframe (1D default). Fetch other timeframes lazily on first tab selection.
- **Re-using the existing `RequestQueue` from stockService directly:** Create a separate historicalService with its own rate-limit queue; do not share state with the live-quote queue to avoid blocking each other.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Candlestick rendering | Custom SVG/Canvas path | react-native-wagmi-charts | Handles OHLC layout, wick geometry, touch gesture, crosshair — 1000+ LOC of edge cases |
| Crosshair gesture | Custom PanGestureHandler | wagmi's CandlestickChart.Crosshair | Handles pan, long-press, haptics, snapping to candle boundaries |
| Volume bar normalization | Custom scale math | Simple inline max-normalize before render | Already simple, but use Skia Rect not SVG Rect |
| Shimmer animation | Custom opacity loop | Reanimated withRepeat + withTiming | Single shared value drives all skeleton elements; avoids per-element timers |
| Date formatting for Taiwan calendar | Custom TW→Gregorian conversion | Already handled in parseSentinel; use standard Date.getTime() for timestamps | TWSE returns ROC calendar dates (民國) — must add 1911 to year before constructing Date |

**Key insight:** The chart library handles ~80% of the visible complexity. The planner's effort should go into data fetching/transformation, not rendering.

---

## Common Pitfalls

### Pitfall 1: FinMind Intraday Data is Paid

**What goes wrong:** Developer plans to use `TaiwanStockKBar` for 1D/5D views. Free tier returns HTTP 402 or empty response.

**Why it happens:** `TaiwanStockKBar` is marked sponsor-only in FinMind's DataList. CONTEXT.md mentions FinMind as primary source without distinguishing free vs paid datasets.

**How to avoid:** Use Fugle `historical/candles/{symbol}?resolution=5` for 1D (5-min candles) and `resolution=30` for 5D (30-min candles). Both are available on Fugle free tier. FinMind is fine for daily data (1M/6M/1Y) via `TaiwanStockPrice`.

**Warning signs:** Empty `data` array or 403/402 response from FinMind KBar endpoint.

### Pitfall 2: Taiwan ROC Calendar Dates from TWSE

**What goes wrong:** TWSE `exchangeReport/STOCK_DAY` returns dates as `"113/01/15"` (ROC year/month/day). Passing directly to `new Date()` produces wrong or NaN result.

**Why it happens:** Taiwan uses ROC calendar (民國). Year 113 = 2024 (1911 + 113).

**How to avoid:** Parse TWSE date strings by splitting on `/`, adding 1911 to the year, then constructing a JS Date.

```typescript
function twseDateToTimestamp(twseDate: string): number {
  const [rocYear, month, day] = twseDate.split('/').map(Number);
  return new Date(rocYear + 1911, month - 1, day).getTime();
}
```

**Warning signs:** Candles appearing at year 0114 or 1970 epoch.

### Pitfall 3: Fugle Intraday Returns Only Last 30 Days

**What goes wrong:** 5D timeframe tries to show 5 trading days of intraday data from months ago. Fugle intraday endpoint says "回傳近 30 日資料" (returns recent 30 days only, date range not configurable for intraday).

**Why it happens:** Fugle's intraday candle endpoint doesn't accept `from`/`to` date parameters for minute-resolution data.

**How to avoid:** 5D (30-min candles) and 1D (5-min candles) always reflect recent data only, which is appropriate for a watchlist app. Document this as "shows last N trading days" not "arbitrary date range".

**Warning signs:** 30 days of data returned when only 5 days expected — just slice to last 5 trading days' worth.

### Pitfall 4: wagmi-charts Crosshair on Android

**What goes wrong:** Crosshair gesture doesn't trigger on Android device/emulator.

**Why it happens:** Known issue (#54, #67 in wagmi-charts GitHub). GestureHandler setup must be at root level. `GestureHandlerRootView` must wrap the entire app.

**How to avoid:** Verify `GestureHandlerRootView` wraps `src/app/_layout.tsx` root (it should be there from earlier phases using react-native-reorderable-list, but confirm).

**Warning signs:** Crosshair works on iOS Simulator but not Android.

### Pitfall 5: Missing react-native-haptic-feedback Peer Dep

**What goes wrong:** wagmi-charts imports `react-native-haptic-feedback` for `onCurrentXChange` haptics. If not installed, Metro bundler throws module resolution error.

**Why it happens:** wagmi's README lists it as a required peer dependency, but peerDependencies in package.json is `*` without enforcement.

**How to avoid:** `npm install react-native-haptic-feedback` before running the chart screen.

**Warning signs:** "Unable to resolve module react-native-haptic-feedback" at Metro startup.

### Pitfall 6: wagmi-charts Data Must Be Sorted Ascending

**What goes wrong:** Chart renders with candles out of order or crosshair snaps to wrong positions.

**Why it happens:** wagmi-charts assumes data is sorted oldest-first (ascending timestamp). TWSE/FinMind responses may return data in descending order (newest first).

**How to avoid:** Sort candles ascending by timestamp before passing to `CandlestickChart.Provider data={...}`.

```typescript
const sorted = candles.sort((a, b) => a.timestamp - b.timestamp);
```

### Pitfall 7: useCandleData Must Be Inside Provider

**What goes wrong:** `Cannot read properties of undefined` or React context error when calling `CandlestickChart.useCandleData()` in header component.

**Why it happens:** The header displays price from `useCandleData()`, but if the header is rendered outside the `CandlestickChart.Provider` tree, the context is unavailable.

**How to avoid:** Either nest the header inside `Provider` (awkward layout) or use a Zustand shared value / `useSharedValue` passed via prop to communicate crosshair price to the header.

---

## Code Examples

### FinMind Daily OHLCV Fetch (1M/6M/1Y)

```typescript
// Source: https://finmind.github.io/tutor/TaiwanMarket/Technical/
// Dataset: TaiwanStockPrice (free tier)
// Response fields: date, stock_id, Trading_Volume, open, max (high), min (low), close

async function fetchDailyCandles(stockId: string, startDate: string): Promise<OHLCVPoint[]> {
  const url = new URL('https://api.finmindtrade.com/api/v4/data');
  url.searchParams.set('dataset', 'TaiwanStockPrice');
  url.searchParams.set('data_id', stockId);
  url.searchParams.set('start_date', startDate); // 'YYYY-MM-DD'
  // token optional for free tier, but recommended (increases limit to 600/hr)

  const res = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(10_000),
  });
  const json = await res.json();

  return (json.data ?? []).map((row: any): OHLCVPoint => ({
    timestamp: new Date(row.date).getTime(), // FinMind returns YYYY-MM-DD (Gregorian)
    open: parseFloat(row.open),
    high: parseFloat(row.max),
    low: parseFloat(row.min),
    close: parseFloat(row.close),
    volume: parseInt(row.Trading_Volume, 10),
  }));
}
```

### TWSE Direct Daily OHLCV Fetch (Fallback for 1M/6M/1Y)

```typescript
// Source: https://github.com/mlouielu/twstock/blob/master/twstock/stock.py
// Endpoint: https://www.twse.com.tw/exchangeReport/STOCK_DAY
// Returns one month of daily data per request; multiple requests needed for 6M/1Y

function twseDateToTimestamp(twseDate: string): number {
  // TWSE returns ROC calendar: "113/01/15" = 2024-01-15
  const [rocYear, month, day] = twseDate.split('/').map(Number);
  return new Date(rocYear + 1911, month - 1, day).getTime();
}

async function fetchTWSEMonthlyCandles(stockId: string, year: number, month: number): Promise<OHLCVPoint[]> {
  const date = `${year}${String(month).padStart(2, '0')}01`;
  const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${date}&stockNo=${stockId}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const json = await res.json();

  if (json.stat !== 'OK' || !json.data) return [];

  return json.data.map((row: string[]): OHLCVPoint => ({
    timestamp: twseDateToTimestamp(row[0]),
    volume: parseInt(row[1].replace(/,/g, ''), 10),
    open: parseFloat(row[3].replace(/,/g, '')),
    high: parseFloat(row[4].replace(/,/g, '')),
    low: parseFloat(row[5].replace(/,/g, '')),
    close: parseFloat(row[6].replace(/,/g, '')),
  }));
  // Fields: [date, volume, value, open, high, low, close, change, transactions]
}
```

### Fugle Intraday Candle Fetch (1D/5D)

```typescript
// Source: https://developer.fugle.tw/docs/data/http-api/historical/candles
// Requires Fugle API key (free tier: register at developer.fugle.tw)
// resolution: '5' for 1D, '30' for 5D
// WARNING: intraday only returns last 30 days; cannot specify from/to date range

async function fetchFugleIntradayCandles(
  symbol: string,
  resolution: '5' | '30',
  fugleApiKey: string,
): Promise<OHLCVPoint[]> {
  const url = `https://api.fugle.tw/marketdata/v1.0/stock/historical/candles/${symbol}?resolution=${resolution}`;
  const res = await fetch(url, {
    headers: { 'X-API-KEY': fugleApiKey },
    signal: AbortSignal.timeout(10_000),
  });
  const json = await res.json();

  return (json.data ?? []).map((row: any): OHLCVPoint => ({
    timestamp: new Date(row.date).getTime(), // Fugle returns ISO date strings
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
  }));
}
```

### Shimmer Skeleton with Reanimated 4

```typescript
// Source: Reanimated 4 docs (withRepeat + withTiming pattern)
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

function ChartSkeleton() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.3, { duration: 800 }), -1, true);
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={animStyle} className="flex-1 bg-surface rounded-lg" />
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SVG-based charts (Victory, react-native-svg-charts) | Skia-based charts (wagmi-charts, Victory Native XL) | 2022-2023 | 10x+ performance on 200+ candle sets |
| react-native-wagmi-charts on Reanimated 2 | Reanimated 4 compatibility added in v2.7.2 | Sep 2024 | Works with Expo SDK 55 / RN 0.83 New Architecture |
| FinMind free intraday data | Intraday KBar moved to sponsor tier | 2023-2024 | Must use Fugle or paid FinMind for 1D/5D minute candles |

**Deprecated/outdated:**
- `Extrapolate` enum (Reanimated): replaced by `Extrapolation` — wagmi-charts v2.8.3 (Oct 2024) already fixed this internally.

---

## Open Questions

1. **Fugle API key storage**
   - What we know: Fugle requires a free API key (register at developer.fugle.tw). The app already stores MiniMax API key in expo-secure-store.
   - What's unclear: Does the CONTEXT.md/Phase 5 Settings screen need a Fugle API key field, or should it be hardcoded/env-var for v1?
   - Recommendation: Add Fugle API key to the in-memory historicalService config; expose in Phase 5 Settings if needed. For v1, a reasonable default is to prompt the user or use a build-time env var.

2. **Fugle intraday response field names**
   - What we know: Fugle historical/candles returns data with OHLCV fields; exact field name casing (e.g., `open` vs `Open`) needs verification during implementation against actual API response.
   - What's unclear: Exact JSON structure of `json.data[]` items.
   - Recommendation: Verify field names with a live Fugle API call in Wave 0 test. Fall back to TWSE daily data if Fugle key not configured.

3. **react-native-haptic-feedback vs expo-haptics**
   - What we know: wagmi-charts uses `react-native-haptic-feedback` in its crosshair `onCurrentXChange` example. The project already has `expo-haptics`.
   - What's unclear: Does wagmi import haptic-feedback directly (requiring it as a dep) or is it optional?
   - Recommendation: Install `react-native-haptic-feedback` defensively to satisfy wagmi's module resolution. If Metro complains about missing module, this is the fix.

4. **@shopify/react-native-skia availability**
   - What we know: wagmi-charts is described as "built on react-native-skia" but the package.json peerDependencies weren't fully visible.
   - What's unclear: Whether `@shopify/react-native-skia` is already installed as a transitive dep of wagmi-charts in node_modules.
   - Recommendation: Run `ls invest-app/node_modules/@shopify/react-native-skia` during Wave 0. If missing, `npm install @shopify/react-native-skia` is needed for the volume bar Canvas.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29.7 + jest-expo preset |
| Config file | `invest-app/package.json` `"jest"` section |
| Quick run command | `cd invest-app && npm test -- --testPathPattern=chartStore` |
| Full suite command | `cd invest-app && npm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHRT-01 | Detail screen renders with symbol from route params | unit | `npm test -- --testPathPattern=detail` | Wave 0 |
| CHRT-02 | historicalService fetches correct endpoint per timeframe | unit | `npm test -- --testPathPattern=historicalService` | Wave 0 |
| CHRT-02 | chartStore caches data; fetchCandles skips re-fetch on cache hit | unit | `npm test -- --testPathPattern=chartStore` | Wave 0 |
| CHRT-02 | twseDateToTimestamp converts ROC year correctly | unit | `npm test -- --testPathPattern=historicalService` | Wave 0 |
| CHRT-03 | Volume bar receives correct data array (length match with candles) | unit | `npm test -- --testPathPattern=VolumeBar` | Wave 0 |
| CHRT-04 | Chart component uses CandlestickChart (wagmi) not SVG | unit (import check) | `npm test -- --testPathPattern=CandleChart` | Wave 0 |

### Sampling Rate

- **Per task commit:** `cd invest-app && npm test -- --testPathPattern="chartStore|historicalService"`
- **Per wave merge:** `cd invest-app && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/chartStore.test.ts` — covers CHRT-02 cache behavior
- [ ] `src/__tests__/historicalService.test.ts` — covers CHRT-02 endpoint dispatch + ROC date parsing
- [ ] `src/__tests__/VolumeBar.test.ts` — covers CHRT-03 data length/shape

*(No new framework install needed — jest-expo preset already in place)*

---

## Sources

### Primary (HIGH confidence)

- [react-native-wagmi-charts GitHub](https://github.com/coinjar/react-native-wagmi-charts) — API surface, data format, crosshair components, Reanimated 4 compat (v2.7.2+), latest release v2.9.1 (Feb 4 2025)
- [react-native-wagmi-charts Releases](https://github.com/coinjar/react-native-wagmi-charts/releases) — version history, Reanimated 4 compat confirmed in v2.7.2 changelog
- [FinMind DataList](https://finmind.github.io/tutor/TaiwanMarket/DataList/) — dataset tier classification (TaiwanStockKBar = sponsor-only, TaiwanStockPrice = free)
- [FinMind Technical Docs](https://finmind.github.io/tutor/TaiwanMarket/Technical/) — API endpoint, parameters, response field names for TaiwanStockPrice and TaiwanStockKBar
- [Fugle Historical Candles API](https://developer.fugle.tw/docs/data/http-api/historical/candles) — resolution parameter options (1/3/5/10/15/30/60/D/W/M), intraday 30-day limit, date range for daily
- [twstock stock.py](https://github.com/mlouielu/twstock/blob/master/twstock/stock.py) — TWSE STOCK_DAY endpoint, ROC date format, response field indices

### Secondary (MEDIUM confidence)

- [Fugle Pricing page](https://developer.fugle.tw/docs/pricing) — free tier available via Fugle membership registration; historical data 60 calls/min
- [react-native-wagmi-charts Issue #54](https://github.com/coinjar/react-native-wagmi-charts/issues/54) — crosshair Android issue; fix: ensure GestureHandlerRootView at app root
- [TWSE STOCK_DAY endpoint community docs](https://openapi.twse.com.tw/) — OpenAPI confirms `/exchangeReport/STOCK_DAY_ALL` and `/exchangeReport/STOCK_DAY` exist; parameter format confirmed by multiple community projects

### Tertiary (LOW confidence)

- FinMind free tier rate limit: 300 req/hr anonymous, 600 req/hr with token — from WebSearch community sources, not official docs page
- Fugle intraday field names (`open`, `high`, `low`, `close`, `volume`) — inferred from Fugle MCP docs article, not verified against live API response
- react-native-haptic-feedback requirement — described as peer dep in wagmi README, but not enforced; actual module resolution needs live verification

---

## Metadata

**Confidence breakdown:**
- Standard stack (wagmi-charts, Skia, Reanimated): HIGH — confirmed active library, Feb 2025 release, Reanimated 4 compat verified in changelog
- Data architecture (FinMind daily, Fugle intraday): MEDIUM — FinMind tier restriction confirmed from official DataList; Fugle API structure confirmed from official docs; exact field names need live verification
- TWSE date parsing: HIGH — ROC calendar behavior confirmed by multiple community implementations
- Volume bar approach (Skia Rect): MEDIUM — wagmi has no built-in volume bars confirmed; Skia Rect approach standard but not verified with a full working example against wagmi
- Pitfalls: MEDIUM-HIGH — most from official issues tracker or confirmed data source docs

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (30 days — wagmi-charts is stable; FinMind/Fugle tier policies may shift)
