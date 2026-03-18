# Phase 2: Data Layer - Research

**Researched:** 2026-03-18
**Domain:** TWSE OpenAPI client, serial request queue, Zustand polling lifecycle, market-hours guard, holiday detection, status indicator
**Confidence:** HIGH (core patterns), MEDIUM (exact TWSE API field responses), LOW (undocumented rate limits)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Rate limit queue**
- FIFO queue — requests wait in line with 2s spacing, no dropping
- Retry once after 5s on failure (network error, 429, timeout), then skip that stock this cycle
- Batch fetch preferred — use TWSE bulk endpoint (e.g. /exchangeReport/STOCK_DAY_ALL) when available, fall back to individual requests
- Simple async API surface: `getQuotes(symbols)` hides queue, rate limiting, and retries internally
- StockService must reject any code that bypasses the request queue (unit test verifiable per success criteria)

**Polling lifecycle**
- 30-second poll interval during market hours
- Auto-start polling on app launch if market is open (data ready before user sees watchlist)
- At market close (13:30), do one final fetch for closing prices, then stop polling entirely
- Outside market hours: show cached last-fetched prices with "As of HH:MM" timestamp, no TWSE requests

**Non-trading day handling**
- Hardcoded Taiwan public holiday list for the current year, updated annually
- On holidays: display previous trading day's closing prices with "Market Closed" label
- Cache stored in Zustand quoteStore only (no SQLite cache table)
- Cold start on non-trading day with empty quoteStore: show empty state with "No price data yet — prices will load when market opens" message

**Market status indicator**
- Placement: home screen header bar, small and always visible
- Style: green glowing dot + "Open" text when open, dim gray dot + "Closed" when closed
- Includes relative countdown: "Open · 2h 15m to close" / "Closed · opens 09:00"
- Uses cyberpunk theme colors: #00E676 green dot (with glow), #6B7280 dim gray for closed

### Claude's Discretion
- Exact TWSE API endpoint paths and response parsing
- Queue implementation details (setTimeout vs setInterval vs custom scheduler)
- quoteStore internal structure and update strategy
- Market status countdown update frequency (every second vs every minute)
- Error state UI for failed fetches

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | App polls TWSE OpenAPI for real-time prices (~20s delay, 20-30s interval) | TWSE bulk endpoint `/v1/exchangeReport/STOCK_DAY_ALL` confirmed; 30s interval chosen per CONTEXT.md |
| DATA-02 | Polling only occurs during Taiwan market hours (Mon-Fri 09:00-13:30) | Market hours confirmed 09:00-13:30 Asia/Taipei; AppState API handles foreground/background |
| DATA-03 | App shows market open/closed status indicator | Reanimated 4 withRepeat/withTiming for glow pulse; Zustand-driven status string computed every minute |
| DATA-04 | App handles non-trading days (holidays) gracefully with cached data | 2026 holiday list compiled; Zustand-only cache confirmed; cold-start empty state pattern documented |
| DATA-05 | TWSE request queue enforces rate limit (max 3 req/5s) to avoid IP ban | Custom FIFO async queue with 2s minimum spacing; batch endpoint reduces individual calls; unit-testable via queue bypass rejection |
</phase_requirements>

---

## Summary

Phase 2 builds the data layer: a typed TWSE OpenAPI client, a FIFO serial request queue, a Zustand quoteStore with polling lifecycle, market-hours and holiday guards, and a market status indicator component.

The TWSE provides two relevant endpoints. For intraday real-time quotes the primary source is `https://mis.twse.com.tw/stock/api/getStockInfo.jsp` — a free, no-key endpoint supporting up to ~20 stocks in one pipe-delimited request. This is the **correct primary endpoint for live polling** because it returns current-day prices including the latest trade price (`z` field). The `openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL` bulk endpoint returns **daily summary data** (closing prices after 16:30) and is NOT suitable for intraday use; it is useful for fetching previous-day prices on non-trading days. The distinction between these two is critical.

The request queue must be a custom hand-rolled FIFO async class (no external library needed for this simple case). Each dequeued request waits at least 2 seconds after the previous one completes. The queue's public API is a single `enqueue(fn)` method that returns a Promise; `getQuotes(symbols)` wraps this. The queue class must not expose a way to bypass it — enforced by marking the internal `_execute` private and testing that `getQuotes` always enqueues.

Taiwan market hours are confirmed 09:00-13:30 Asia/Taipei, Mon-Fri. Polling uses `setInterval` managed inside the Zustand store action (not a React hook), started via a store action callable from `_layout.tsx` on app launch. React Native `AppState` pauses/resumes the timer when the app backgrounds.

**Primary recommendation:** Use `mis.twse.com.tw/stock/api/getStockInfo.jsp` for live intraday polling; use `openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL` only as a fallback for non-trading-day previous-close data. Build the queue as a simple TypeScript class, not a third-party library.

---

## Standard Stack

### Core (no new packages needed for queue/scheduling)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.12 (already installed) | quoteStore state + polling lifecycle actions | Already in project, v5 pattern established |
| react-native-reanimated | 4.2.1 (already installed) | Glowing dot pulse animation on status indicator | Already in project; withRepeat/withTiming API |
| expo-router | ~55.0.6 (already installed) | App launch hook via `_layout.tsx` useEffect | Already in project |

### Supporting (no new installs required)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Native AppState | built-in | Detect app foreground/background to pause polling | Stop interval when app is backgrounded |
| Intl.DateTimeFormat | built-in (JS) | Convert UTC → Asia/Taipei timezone for market-hours checks | No library needed for timezone math |

### No new packages needed
This phase requires zero new `npm install` commands. All required capabilities are covered by already-installed dependencies.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom FIFO queue class | p-limit, p-ratelimit | External libs add bundle weight; the queue is <50 lines and simpler to unit-test without mocks |
| mis.twse.com.tw (intraday) | openapi.twse.com.tw bulk | Bulk only updates post-market; wrong for live polling |
| setInterval in store action | TanStack Query | TanStack Query is overkill for this use case and not installed |

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── services/
│   └── stockService.ts          # TWSE API client + FIFO queue (DATA-01, DATA-05)
├── features/
│   └── market/
│       ├── quoteStore.ts         # Zustand store: quotes, polling lifecycle (DATA-01, DATA-02)
│       ├── marketHours.ts        # Pure functions: isMarketOpen(), isHoliday(), nextOpen() (DATA-02, DATA-04)
│       ├── holidays2026.ts       # Hardcoded 2026 TWSE holiday date strings
│       └── MarketStatusBar.tsx   # Status indicator component (DATA-03)
└── __tests__/
    ├── stockService.test.ts      # Queue bypass rejection test (DATA-05 unit test)
    ├── marketHours.test.ts       # isMarketOpen() edge cases, isHoliday() correctness
    └── quoteStore.test.ts        # Polling start/stop lifecycle
```

### Pattern 1: FIFO Request Queue with 2s Spacing

**What:** A TypeScript class that serialises all TWSE fetch calls, enforcing at least 2 seconds between consecutive requests. Returns a Promise for each queued call.
**When to use:** Every TWSE HTTP request goes through this — never bypass.

```typescript
// src/services/stockService.ts
class RequestQueue {
  private running = false;
  private queue: Array<() => Promise<void>> = [];
  private lastRequestTime = 0;

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        const elapsed = Date.now() - this.lastRequestTime;
        const wait = Math.max(0, 2000 - elapsed);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        try {
          this.lastRequestTime = Date.now();
          resolve(await fn());
        } catch (e) {
          reject(e);
        }
      });
      if (!this.running) this._drain();
    });
  }

  private async _drain() {
    this.running = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
    }
    this.running = false;
  }
}

// Singleton — module-level, not exported directly
const _queue = new RequestQueue();

// Public API only goes through the queue
export async function getQuotes(symbols: string[]): Promise<TWSEQuote[]> {
  return _queue.enqueue(() => _fetchQuotes(symbols));
}

// _fetchQuotes is NOT exported — bypass impossible from outside this module
async function _fetchQuotes(symbols: string[]): Promise<TWSEQuote[]> {
  // ...
}
```

**Unit test for bypass rejection** (DATA-05 success criterion):
```typescript
// __tests__/stockService.test.ts
import * as StockService from '../services/stockService';

it('does not export _fetchQuotes or _queue (bypass impossible)', () => {
  expect((StockService as any)._fetchQuotes).toBeUndefined();
  expect((StockService as any)._queue).toBeUndefined();
});

it('getQuotes is the only export that triggers TWSE fetch', () => {
  const exports = Object.keys(StockService);
  expect(exports).toContain('getQuotes');
  // Verify no raw fetch escape hatch exists
  expect(exports.filter(k => k.startsWith('_'))).toHaveLength(0);
});
```

### Pattern 2: Zustand quoteStore with Polling Lifecycle

**What:** Zustand store holds quotes map and controls `setInterval` lifecycle entirely within store actions — no React hook needed for the interval.
**When to use:** Start on app launch from `_layout.tsx`, stop at 13:30.

```typescript
// src/features/market/quoteStore.ts
import { create } from 'zustand';
import { getQuotes } from '../../services/stockService';
import { isMarketOpen } from './marketHours';

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  fetchedAt: number; // unix ms
}

interface QuoteState {
  quotes: Record<string, Quote>;
  polling: boolean;
  startPolling: (symbols: string[]) => void;
  stopPolling: () => void;
  _intervalId: ReturnType<typeof setInterval> | null;
}

export const useQuoteStore = create<QuoteState>((set, get) => ({
  quotes: {},
  polling: false,
  _intervalId: null,

  startPolling: (symbols) => {
    if (get().polling) return; // already running
    const tick = async () => {
      if (!isMarketOpen()) {
        get().stopPolling();
        return;
      }
      const fresh = await getQuotes(symbols);
      const next: Record<string, Quote> = {};
      fresh.forEach(q => { next[q.symbol] = q; });
      set({ quotes: next });
    };
    tick(); // immediate first fetch
    const id = setInterval(tick, 30_000);
    set({ polling: true, _intervalId: id });
  },

  stopPolling: () => {
    const { _intervalId } = get();
    if (_intervalId) clearInterval(_intervalId);
    set({ polling: false, _intervalId: null });
  },
}));
```

**App launch hook (in `_layout.tsx`):**
```typescript
// src/app/_layout.tsx — add inside useEffect
import { useQuoteStore } from '../features/market/quoteStore';
import { isMarketOpen } from '../features/market/marketHours';
import { useWatchlistStore } from '../features/watchlist/store/watchlistStore';
import AppState from 'react-native/Libraries/Utilities/AppState'; // or import { AppState } from 'react-native'

useEffect(() => {
  const symbols = useWatchlistStore.getState().items.map(i => i.symbol);
  if (isMarketOpen()) {
    useQuoteStore.getState().startPolling(symbols);
  }

  const sub = AppState.addEventListener('change', state => {
    if (state === 'active' && isMarketOpen()) {
      useQuoteStore.getState().startPolling(symbols);
    } else if (state === 'background') {
      useQuoteStore.getState().stopPolling();
    }
  });
  return () => {
    sub.remove();
    useQuoteStore.getState().stopPolling();
  };
}, []);
```

### Pattern 3: Market Hours Pure Functions

**What:** Pure, side-effect-free functions operating on the current Date. Testable without mocks by passing explicit Date arguments.
**When to use:** Called by quoteStore tick guard and by MarketStatusBar.

```typescript
// src/features/market/marketHours.ts
import { HOLIDAYS_2026 } from './holidays2026';

// Returns true if now (or passed Date) is within TWSE market hours
export function isMarketOpen(now = new Date()): boolean {
  const taipei = toTaipeiDate(now);
  const day = taipei.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  if (isHoliday(taipei)) return false;
  const h = taipei.getHours();
  const m = taipei.getMinutes();
  const mins = h * 60 + m;
  return mins >= 9 * 60 && mins < 13 * 60 + 30;
}

export function isHoliday(taipei: Date): boolean {
  const iso = toISODate(taipei); // 'YYYY-MM-DD'
  return HOLIDAYS_2026.includes(iso);
}

// Convert UTC Date → Asia/Taipei Date object
function toTaipeiDate(utc: Date): Date {
  const str = utc.toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
  return new Date(str);
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
```

### Pattern 4: Market Status Indicator Component

**What:** Small header bar component. Reanimated pulse on the green dot. Updates countdown string every minute (not every second — avoids re-renders).
**When to use:** Imported into `WatchlistPage` header row.

```typescript
// src/features/market/MarketStatusBar.tsx
import Animated, { useSharedValue, withRepeat, withTiming, useAnimatedStyle } from 'react-native-reanimated';

export function MarketStatusBar() {
  const [status, setStatus] = useState(() => computeStatus());
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Pulse only when open
    if (status.open) {
      opacity.value = withRepeat(withTiming(0.3, { duration: 800 }), -1, true);
    } else {
      opacity.value = 1;
    }
    // Refresh countdown every minute
    const id = setInterval(() => setStatus(computeStatus()), 60_000);
    return () => clearInterval(id);
  }, [status.open]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View className="flex-row items-center gap-1">
      <Animated.View
        style={dotStyle}
        className={`w-2 h-2 rounded-full ${status.open ? 'bg-stock-up' : 'bg-muted'}`}
      />
      <Text className={`text-xs ${status.open ? 'text-stock-up' : 'text-muted'}`}>
        {status.label}
      </Text>
    </View>
  );
}
```

The `computeStatus()` function (inside `marketHours.ts` or co-located) returns `{ open: boolean, label: string }` where label is e.g. `"Open · 2h 15m to close"` or `"Closed · opens 09:00"`.

### Anti-Patterns to Avoid

- **Direct fetch in component:** Never call `fetch('https://mis.twse.com.tw/...')` inside a component or hook. Always go through `getQuotes()`.
- **setInterval in a React hook for polling:** The interval lives in the Zustand store action so it survives component unmounts (e.g. navigation).
- **Using openapi.twse.com.tw for live intraday:** That bulk endpoint is post-market daily data. The live prices come from `mis.twse.com.tw/stock/api/getStockInfo.jsp`.
- **Using `new Date().getHours()` without timezone conversion:** The device may be in any timezone. Always convert to Asia/Taipei before doing market-hour arithmetic.
- **Storing quotes in SQLite:** Decided against — Zustand-only for quotes (per CONTEXT.md).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone conversion | Custom UTC+8 offset arithmetic | `Intl.DateTimeFormat` / `toLocaleString` with `timeZone: 'Asia/Taipei'` | DST edge cases, correct in all JS environments |
| Animated pulsing dot | CSS or manual Animated.loop | `react-native-reanimated` `withRepeat` + `withTiming` | Already installed; handles New Architecture worklets correctly |
| HTTP fetch with timeout | Custom AbortController wiring every call | Wrap once in a utility inside `stockService.ts` | Consistent timeout behaviour across all TWSE calls |

**Key insight:** The "hard" parts (timezone math, animation engine) are already handled by installed dependencies. The only thing to hand-roll is the 40-line FIFO queue, which is simple and more testable than any npm package.

---

## TWSE API Reference

### Endpoint 1: Intraday Live Quotes (PRIMARY for polling)

**URL:** `https://mis.twse.com.tw/stock/api/getStockInfo.jsp`
**Method:** GET
**Parameters:**
- `ex_ch` — pipe-separated stock identifiers: `tse_2330.tw|tse_2317.tw` (TSE) or `otc_3008.tw` (OTC)
- `json=1` — JSON response
- `delay=0` — no artificial delay

**Response field mapping** (abbreviated single-letter keys):

| Field | Meaning | Notes |
|-------|---------|-------|
| `c` | Stock code | e.g. "2330" |
| `n` | Company name (short) | e.g. "台積電" |
| `nf` | Company name (full) | |
| `z` | Latest trade price | **This is the current price** |
| `y` | Previous close price | Reference for delta calculation |
| `o` | Opening price | |
| `h` | Daily high | |
| `l` | Daily low | |
| `v` | Accumulated volume | |
| `tv` | Single trade volume | |
| `tlong` | Timestamp (ms) | Unix ms of last update |

**Confidence:** HIGH (verified from twstock/realtime.py source, confirmed by multiple community docs)

**Usage note:** During market hours `z` is the latest matched price (~20s delay). Outside hours `z` may be `-` (dash string) — handle this case.

**Sample call:**
```typescript
const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${ex_ch}&json=1&delay=0`;
const res = await fetch(url, {
  headers: { 'User-Agent': 'invest-app/1.0' },
  signal: AbortSignal.timeout(10_000),
});
const data = await res.json();
// data.msgArray is the array of stock objects
```

### Endpoint 2: Daily Bulk Data (FALLBACK for previous-close)

**URL:** `https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL`
**Method:** GET
**No parameters required** — returns all TWSE stocks for the latest trading day

**Response fields** (Traditional Chinese field names):

| Field | Meaning |
|-------|---------|
| `證券代號` | Stock code |
| `證券名稱` | Name |
| `收盤價` | Closing price |
| `開盤價` | Opening price |
| `最高價` | High |
| `最低價` | Low |
| `漲跌價差` | Price change |
| `成交股數` | Volume |

**When to use:** Non-trading days — fetch once to get the most recent closing prices to populate the cache. Updated by TWSE after ~16:30 on the previous trading day.

**Confidence:** MEDIUM (field names confirmed by multiple search results; exact update timing is ~16:30 per community sources, not officially documented)

---

## 2026 Taiwan Holiday List

**Source:** forexchurch.com (confirmed against taifex.com.tw 2026 PDF reference)
**Confidence:** MEDIUM (multiple sources agree on major holidays; exact make-up day assignments may shift pending official announcement confirmation)

```typescript
// src/features/market/holidays2026.ts
export const HOLIDAYS_2026: string[] = [
  '2026-01-01', // New Year's Day
  '2026-02-12', // LNY (no transactions)
  '2026-02-13', // LNY (no transactions)
  '2026-02-16', // Lunar New Year's Eve
  '2026-02-17', // Lunar New Year 1
  '2026-02-18', // Lunar New Year 2
  '2026-02-19', // Lunar New Year 3
  '2026-02-20', // Additional LNY holiday
  '2026-02-27', // Peace Memorial Day (OBS)
  '2026-04-03', // Children's Day (OBS)
  '2026-04-06', // Qingming Festival
  '2026-05-01', // Labour Day
  '2026-06-19', // Dragon Boat Festival
  '2026-09-25', // Mid-Autumn Festival
  '2026-09-28', // Confucius Birthday / Teacher's Day
  '2026-10-09', // National Day (OBS)
  '2026-10-26', // Restoration and Victory Memorial Day (OBS)
  '2026-12-25', // Constitution Day
];
```

**Note on 2025 holidays:** If Phase 2 is implemented before end of 2025, add a `holidays2025.ts` with the same structure. The `isHoliday()` function should select the correct year's list, or combine both.

---

## Common Pitfalls

### Pitfall 1: Timezone Blindness

**What goes wrong:** `new Date().getHours()` returns local device time, not Taipei time. An Android device in UTC would see 09:00-13:30 UTC as market hours instead of 01:00-05:30 UTC — always wrong.
**Why it happens:** Developers forget mobile devices have arbitrary timezones.
**How to avoid:** Always convert to Asia/Taipei before any market-hours comparison. Use `toLocaleString('en-US', { timeZone: 'Asia/Taipei' })` and parse the result.
**Warning signs:** Market hours seem "off" or tests fail depending on where CI runs.

### Pitfall 2: `z` Field is `-` Outside Trading Hours

**What goes wrong:** `mis.twse.com.tw` returns `"z": "-"` when there is no latest trade (pre-open or closed). Parsing `parseFloat("-")` returns `NaN`.
**Why it happens:** TWSE uses `-` as a sentinel value for unavailable data, not null.
**How to avoid:** Defensive parse: `const price = z === '-' ? null : parseFloat(z)`. Display `y` (previous close) when `z` is null.
**Warning signs:** NaN prices appear on watchlist cards.

### Pitfall 3: Interval Drift Inside React Component

**What goes wrong:** Putting `setInterval` in a `useEffect` inside a component leads to stale closures over `symbols` — when watchlist changes, the old interval still uses the old symbols list.
**Why it happens:** `useEffect` closures capture the values at creation time.
**How to avoid:** The interval lives in the Zustand store action (`startPolling` / `stopPolling`). When the watchlist changes, call `stopPolling()` + `startPolling(newSymbols)`.
**Warning signs:** New stocks added to watchlist don't get price updates until app restart.

### Pitfall 4: Polling Continues After 13:30

**What goes wrong:** If the tick function checks `isMarketOpen()` but market closes between ticks, one extra request may fire.
**Why it happens:** The guard runs at the start of each tick; a tick scheduled at 13:29 runs at 13:30+ after the 30s interval.
**How to avoid:** Check `isMarketOpen()` inside the tick and immediately stop polling + do one final fetch if the interval fires just as market closes. The CONTEXT.md decision explicitly requires a "final fetch at close."
**Warning signs:** Network tab shows TWSE requests at 14:00+.

### Pitfall 5: TWSE Rate Limit (Undocumented)

**What goes wrong:** TWSE doesn't publish an official rate limit, but community consensus is that more than ~3 requests in a 5-second window risks a temporary IP ban or 429 response.
**Why it happens:** TWSE servers enforce an undocumented throttle.
**How to avoid:** The 2s serial queue (DATA-05) ensures max 1 req/2s = 0.5 req/s — well within safe limits. The batch `getStockInfo.jsp` approach fetches ALL watched symbols in one request, further reducing call frequency.
**Warning signs:** HTTP 429 responses, or requests hanging without response.

### Pitfall 6: `AppState` Listener Not Cleaned Up

**What goes wrong:** Memory leak and duplicate interval start if the `_layout.tsx` AppState listener is not removed on unmount.
**Why it happens:** `AppState.addEventListener` returns a subscription object; forgetting to call `subscription.remove()` in cleanup.
**How to avoid:** Always store the subscription and call `sub.remove()` in the useEffect return.

---

## Code Examples

### Fetch with Timeout and Sentinel Handling

```typescript
// Source: mis.twse.com.tw field mapping from twstock/realtime.py + community gist
export interface TWSEQuote {
  symbol: string;  // 'c'
  name: string;    // 'n'
  price: number | null;   // 'z' — null when market closed
  prevClose: number;      // 'y'
  open: number | null;    // 'o'
  high: number | null;    // 'h'
  low: number | null;     // 'l'
  volume: number;         // 'v'
  updatedAt: number;      // 'tlong' (ms)
}

function parseSentinel(val: string): number | null {
  if (val === '-' || val === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

async function _fetchQuotes(symbols: string[]): Promise<TWSEQuote[]> {
  // Format: "tse_2330.tw|tse_2317.tw"
  const ex_ch = symbols
    .map(s => `tse_${s}.tw`)  // TODO: support OTC prefix (otc_) when needed
    .join('|');
  const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${encodeURIComponent(ex_ch)}&json=1&delay=0`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'invest-app/1.0' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`TWSE HTTP ${res.status}`);
  const data = await res.json();
  return (data.msgArray ?? []).map((item: any): TWSEQuote => ({
    symbol: item.c,
    name: item.n,
    price: parseSentinel(item.z),
    prevClose: parseFloat(item.y),
    open: parseSentinel(item.o),
    high: parseSentinel(item.h),
    low: parseSentinel(item.l),
    volume: parseFloat(item.v) || 0,
    updatedAt: parseInt(item.tlong, 10),
  }));
}
```

### Retry-Once Wrapper

```typescript
// Source: CONTEXT.md decision — retry once after 5s on network error / 429 / timeout
async function withRetry<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    await new Promise(r => setTimeout(r, 5_000));
    try {
      return await fn();
    } catch {
      return null; // skip this stock this cycle
    }
  }
}
// Used inside _fetchQuotes wrapping each batch
```

### Market Status Countdown Label

```typescript
// Source: CONTEXT.md — "Open · 2h 15m to close" / "Closed · opens 09:00"
export function computeStatus(now = new Date()): { open: boolean; label: string } {
  const taipei = toTaipeiDate(now);
  const open = isMarketOpen(now);
  if (open) {
    const closeMs = getCloseMs(taipei); // ms until 13:30 Taipei
    const totalMins = Math.floor(closeMs / 60_000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return { open: true, label: `Open · ${h}h ${m}m to close` };
  }
  // Show when market next opens
  const nextOpen = nextMarketOpen(taipei); // returns 'HH:MM' string
  return { open: false, label: `Closed · opens ${nextOpen}` };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TWSE scraping via web HTML | `mis.twse.com.tw` JSON API | ~2015 | Stable, no scraping fragility |
| Zustand v4 `devtools` wrapper required | Zustand v5 ships with devtools built-in | 2024 | Cleaner store definition |
| React Native Animated API | Reanimated 4 worklets (New Architecture) | 2024 (RN 0.74+) | Project already on RN 0.83 — use Reanimated 4 APIs only |

**Deprecated/outdated:**
- `react-native-reanimated` v2/v3 `useAnimatedValue` patterns: project is on v4 (RN 0.83 New Architecture mandatory). Use `useSharedValue` + `withRepeat`/`withTiming`.
- `AppState.addEventListener` static method: The newer subscription pattern (`const sub = AppState.addEventListener(...); sub.remove()`) is correct for RN 0.83.

---

## Open Questions

1. **TSE vs OTC stock prefix**
   - What we know: TSE stocks use `tse_XXXX.tw`, OTC stocks use `otc_XXXX.tw` in `getStockInfo.jsp`
   - What's unclear: The watchlist stores only symbol codes (e.g. "2330"). Which stocks are TSE vs OTC requires a lookup or heuristic.
   - Recommendation: For MVP, default all symbols to `tse_` prefix. If a symbol returns no data, retry with `otc_`. A small hardcoded map for common OTC stocks can be added in a follow-up. This is Claude's Discretion per CONTEXT.md.

2. **`STOCK_DAY_ALL` availability lag on non-trading days**
   - What we know: The bulk endpoint is updated ~16:30 on trading days
   - What's unclear: If the app does a cold start at 08:00 on a trading day, `STOCK_DAY_ALL` has yesterday's data — is that acceptable?
   - Recommendation: Yes, display yesterday's closing price with "As of [date]" label until 09:00 opens. This matches the CONTEXT.md cold-start empty-state decision for non-trading days; for trading day pre-open the last-close is actually informative.

3. **2026 holiday list accuracy**
   - What we know: The list above is sourced from forexchurch.com and corroborated by the Yahoo Finance and taifex.com.tw search results
   - What's unclear: Make-up trading days (補班日) — some holidays that fall on Saturday may have a preceding Friday as a working day. This is not captured in the list above.
   - Recommendation: Comment the holiday list file with a link to the official TWSE page and a note to verify annually. For now the list is complete enough for MVP.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | jest-expo (jest ~29.7.0 preset) |
| Config file | `package.json` `"jest"` key (already configured) |
| Quick run command | `npm test -- --testPathPattern="stockService|marketHours|quoteStore" --passWithNoTests` |
| Full suite command | `npm test` (from `/Users/linmini/invest/invest-app/`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | `getQuotes` returns typed TWSEQuote array | unit (mock fetch) | `npm test -- --testPathPattern="stockService"` | ❌ Wave 0 |
| DATA-02 | `isMarketOpen()` returns false outside 09:00-13:30 Taipei | unit | `npm test -- --testPathPattern="marketHours"` | ❌ Wave 0 |
| DATA-02 | Polling stops when `isMarketOpen()` is false | unit (mock timer) | `npm test -- --testPathPattern="quoteStore"` | ❌ Wave 0 |
| DATA-03 | `computeStatus()` returns correct label string | unit | `npm test -- --testPathPattern="marketHours"` | ❌ Wave 0 |
| DATA-04 | `isHoliday()` returns true for 2026-02-17 | unit | `npm test -- --testPathPattern="marketHours"` | ❌ Wave 0 |
| DATA-05 | `_fetchQuotes` and `_queue` are NOT exported from stockService | unit | `npm test -- --testPathPattern="stockService"` | ❌ Wave 0 |
| DATA-05 | Two consecutive `getQuotes` calls are spaced ≥2s apart | unit (mock Date.now) | `npm test -- --testPathPattern="stockService"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- --testPathPattern="stockService|marketHours" --passWithNoTests`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/stockService.test.ts` — covers DATA-01, DATA-05
- [ ] `src/__tests__/marketHours.test.ts` — covers DATA-02, DATA-03, DATA-04
- [ ] `src/__tests__/quoteStore.test.ts` — covers DATA-02 polling lifecycle
- [ ] No new framework install needed — jest-expo already configured in package.json

---

## Sources

### Primary (HIGH confidence)

- `https://github.com/mlouielu/twstock/blob/master/twstock/realtime.py` — complete field mapping for `mis.twse.com.tw/stock/api/getStockInfo.jsp` response (`z`, `y`, `o`, `h`, `l`, `v`, `tv`, `c`, `n`, `tlong`)
- `https://hackmd.io/@aaronlife/python-ex-stock-by-api` — confirmed endpoint URL and parameter format
- `https://stock-exchange-hours.com/en/markets/twse-taipei` — market hours confirmed 09:00-13:30
- `https://github.com/twjackysu/TWSEMCPServer CLAUDE.md` — confirmed `openapi.twse.com.tw/v1` as base URL and `exchangeReport/STOCK_DAY_ALL` endpoint existence
- Project `package.json`, `watchlistStore.ts`, `schema.ts`, `tailwind.config.js` — existing code patterns read directly

### Secondary (MEDIUM confidence)

- `https://www.forexchurch.com/stock-market-holidays/taiwan-stock-exchange` — 2026 holiday list (corroborated by search results from taifex.com.tw, stockfeel.com.tw)
- `https://docs.swmansion.com/react-native-reanimated/docs/animations/withRepeat/` — Reanimated 4 withRepeat pattern (via WebSearch summary)
- React Native AppState API — confirmed subscription pattern from reactnative.dev (via WebSearch summary)

### Tertiary (LOW confidence)

- TWSE rate limit "3 req/5s" from requirements (DATA-05) — no official TWSE documentation found; the 2s queue spacing is conservative and safe regardless
- `STOCK_DAY_ALL` update time of ~16:30 — community consensus, not officially documented

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all required dependencies already installed; no new packages
- TWSE intraday endpoint (`mis.twse.com.tw`): HIGH — field mapping verified from twstock open source
- TWSE bulk endpoint (`openapi.twse.com.tw/v1`): MEDIUM — confirmed endpoint exists, field names from search results
- Market hours: HIGH — 09:00-13:30 confirmed by multiple sources including stock-exchange-hours.com
- 2026 holiday list: MEDIUM — sourced from forexchurch.com, corroborated by Yahoo Finance article; verify against official TWSE announcement before shipping
- Architecture patterns: HIGH — Zustand v5 store-action interval pattern is established; queue pattern is straightforward TypeScript
- Pitfalls: HIGH — timezone issue, sentinel `-` field, and stale interval closure are all known React Native patterns

**Research date:** 2026-03-18
**Valid until:** 2026-09-18 (stable stack; holiday list valid for 2026 calendar year only)
