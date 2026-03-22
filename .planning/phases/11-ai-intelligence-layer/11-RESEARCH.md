# Phase 11: AI Intelligence Layer - Research

**Researched:** 2026-03-23
**Domain:** React Native / TypeScript — candlestick pattern detection, Drizzle ORM SQLite schema, Zustand store, MiniMax API integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Pattern card presentation
- Hide the card entirely when no recognizable pattern is detected — no placeholder row, no wasted space
- When multiple patterns detected in the same timeframe: show only the strongest/most recent pattern (one clear signal)
- Position in detail screen scroll order: directly below volume bars, above the price alert section
- Trigger: auto-run pattern detection whenever chartStore delivers fresh candle data (on page open and on every timeframe switch)

#### Pattern detection approach
- Pure TypeScript algorithmic rules on OHLCV data — no MiniMax API call for detection
- Supported patterns (6-8 simple, 1-2 candle): 錘子, 倒錘子, 吞噬多頭, 吞噬空頭, 恆星線, 十字星, 早晨之星, 黃昏之星
- Chinese explanations: hard-coded static strings per pattern (fast, offline, no API cost)
- Bullish/neutral/bearish signal: derived from pattern type (encoded in the static pattern definition)

#### Portfolio screen layout
- 5th PagerView page (position 4, after SummaryScreen at position 3)
- Share quantity input: inline number input field on each stock row — user edits directly in the list without opening a modal
- Quantity unit: lots/shares toggle — user can switch between entering lots (1 lot = 1000 shares) or individual shares; displayed consistently throughout the screen
- Sector determination: AI-inferred from stock names/codes — send stock names to MiniMax and let it classify sectors (e.g. 台積電 → Semiconductor)
- Health score display: large score card (e.g. 72/100 with color grade) at the top of the page; sector concentration and correlation cluster info as a written AI paragraph below, scrollable
- Consistent with Phase 6 AnalysisCard visual language: cyberpunk tokens, score badges

#### AI-enriched notifications
- Wait up to 5 seconds for MiniMax response before firing notification; fall back to plain notification on timeout or error
- Prompt data: stock name + current price + alert threshold + direction only — minimal, fast, low token use
- Tone: factual market context, no financial advice (e.g. 「近日半導體主導上漲，法人連續買超」)
- Sentence length: one concise sentence in Traditional Chinese
- Fallback plain notification format unchanged from Phase 9 (name + crossed direction + current price)

#### Graceful degradation (all three features)
- Pattern card: if chartStore candles are unavailable, card simply doesn't render
- Portfolio health score: show "需要 API 金鑰才能分析" prompt (same pattern as Phase 6 NoApiKeyPrompt) when key missing; show error card with retry if AI call fails
- AI notification: if AI call fails or times out, fire plain notification — user always receives the price alert

#### User note (from /gsd:plan-phase injection)
- Settings page must have a toggle: AI-enriched notifications vs plain price notifications only (no API call)
- Toggle persists via settingsStore — add `aiNotificationsEnabled: boolean` field and `setAiNotificationsEnabled` action
- alertMonitor.ts checks this flag before attempting the MiniMax call

### Claude's Discretion
- Exact OHLCV threshold values for each pattern rule (body size ratios, shadow ratios)
- Pattern confidence ranking algorithm (to pick strongest when multiple detected)
- SQLite holdings table schema (column names, types, migration)
- holdingsStore Zustand structure and persistence logic
- Portfolio AI prompt engineering (how to frame sector + correlation + health score request)
- Lots/shares toggle state management (persisted preference or session-only)
- PatternCard component styling within cyberpunk design system

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-11 | Chart pattern recognition — detect candlestick patterns (錘子, 倒錘子, 吞噬多頭, 吞噬空頭, 恆星線, 十字星, 早晨之星, 黃昏之星) from OHLCV data and display pattern name, plain-Chinese explanation, and bullish/neutral/bearish signal below the chart; updates per timeframe | `OHLCVPoint` type confirmed in `src/features/charts/types.ts`; `chartStore.getCandles()` confirmed available; detail screen integration point confirmed in `src/app/detail/[symbol].tsx` between VolumeBar and AlertStatusBar |
| AI-12 | Portfolio health — user inputs share quantities per watchlist stock; app calculates total invested value, sector concentration (%), AI analyses correlation clusters and writes an overall portfolio health score and outlook; holdings persist in SQLite | Drizzle schema pattern confirmed from `price_alerts` table; Zustand store pattern confirmed from `analysisStore`; `useWatchlistStore` and `useQuoteStore` availability confirmed; PagerView slot 4 confirmed empty; `callSummaryMiniMax` pattern confirmed for plain-text AI response |
| AI-13 | AI-enriched push alerts — when a price alert fires, alertMonitor calls MiniMax to generate a one-sentence market context and includes it in the notification body; falls back to plain notification if AI unavailable; user can toggle AI-enriched vs plain in Settings | `fireAlertNotification` function confirmed in `alertMonitor.ts` (lines 11–29); `settingsStore` confirmed extensible with new boolean field; `callSummaryMiniMax` fetch pattern (AbortController + 5s timeout) reusable for the alert context call |
</phase_requirements>

---

## Summary

Phase 11 adds three advanced AI features on top of a well-established codebase. All integration points have been confirmed by reading actual source files — no guesswork. The existing patterns (Drizzle CRUD, Zustand stores, MiniMax API calls, NativeWind cyberpunk styles) are consistent and repeatable, so all three features follow already-proven templates.

**Feature 1 (AI-11 — Pattern Detection)** is entirely client-side TypeScript with no API dependency. The `OHLCVPoint[]` data flows from `chartStore.getCandles()` directly into a pure detector function. The `detail/[symbol].tsx` screen has a clear insertion point between the VolumeBar block (lines 195–200) and the TimeframeSelector/AlertStatusBar section (lines 207–216). The pattern card hides itself when no pattern is detected — zero wasted space.

**Feature 2 (AI-12 — Portfolio Health)** requires a new Drizzle migration for a `holdings` table, a new `holdingsStore` Zustand store, and a new `PortfolioScreen` component added as the 5th PagerView page (key "4") in `src/app/index.tsx`. The AI call follows the `callSummaryMiniMax` plain-text pattern — send a single prompt describing stock names, quantities, and computed values; receive a paragraph response with health score embedded. The `useWatchlistStore` provides the stock list; `useQuoteStore` provides live prices for invested-value calculation.

**Feature 3 (AI-13 — AI-enriched notifications)** is a targeted modification of the existing `fireAlertNotification` function in `alertMonitor.ts`. The logic: check `settingsStore.aiNotificationsEnabled`; if true, call MiniMax with AbortController(5000ms); on success prepend the sentence to the notification body; on timeout or error fall back to plain format. The Settings screen already has a well-established section pattern (`bg-surface border border-border rounded-lg`) — add the toggle row there.

**Primary recommendation:** Build in order AI-11 → AI-12 → AI-13 since each plan is independently testable and AI-11 has zero API dependency, making it the safest warm-up.

---

## Standard Stack

### Core (all already installed — no new packages needed for AI-11 or AI-13)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | existing (expo driver) | SQLite schema + CRUD for holdings table | All existing tables use this; migration system is drizzle-kit with `expo` driver |
| zustand v5 | existing | holdingsStore + settingsStore extension | Every domain store uses this pattern |
| expo-notifications | existing | scheduleNotificationAsync with AI body | Phase 9 established the TIME_INTERVAL/channelId pattern |
| expo-secure-store | existing | settingsStore persistence | All settings use named exports pattern |
| NativeWind v4 | existing | PatternCard + PortfolioScreen styling | All UI uses cyberpunk tokens |

### No New Packages Required

All three features are implementable with already-installed dependencies. The pattern detector is pure TypeScript. The AI calls reuse the existing `callSummaryMiniMax` fetch shape. Portfolio screen uses the existing Zustand + Drizzle + NativeWind stack.

---

## Architecture Patterns

### Recommended Project Structure for Phase 11

```
src/
├── features/
│   ├── charts/
│   │   └── services/
│   │       └── patternDetector.ts    # NEW — pure TS, no React deps
│   │   └── components/
│   │       └── PatternCard.tsx       # NEW — renders below VolumeBar
│   ├── portfolio/                    # NEW feature directory
│   │   ├── store/
│   │   │   └── holdingsStore.ts      # NEW — Zustand, persists via Drizzle
│   │   ├── services/
│   │   │   └── holdingsService.ts    # NEW — Drizzle CRUD for holdings table
│   │   │   └── portfolioAiService.ts # NEW — MiniMax prompt for portfolio health
│   │   └── components/
│   │       └── PortfolioScreen.tsx   # NEW — 5th PagerView page
│   ├── alerts/
│   │   └── services/
│   │       └── alertMonitor.ts       # MODIFY — add AI call in fireAlertNotification
│   └── settings/
│       └── store/
│           └── settingsStore.ts      # MODIFY — add aiNotificationsEnabled bool
└── db/
    └── schema.ts                     # MODIFY — add holdings table
```

### Pattern 1: Pure TS Pattern Detector (AI-11)

**What:** Stateless function that takes `OHLCVPoint[]` and returns the strongest detected pattern or `null`.
**When to use:** Called from a `useMemo` inside `PatternCard` or from a `useEffect` that watches `candles`.

```typescript
// src/features/charts/services/patternDetector.ts
export type PatternSignal = 'bullish' | 'neutral' | 'bearish';

export interface PatternResult {
  name: string;           // e.g. '錘子'
  explanation: string;    // hard-coded Traditional Chinese
  signal: PatternSignal;
  confidence: number;     // 0-1, used to pick strongest when multiple detected
}

const PATTERN_DEFS: Record<string, Omit<PatternResult, 'confidence'>> = {
  hammer: {
    name: '錘子',
    explanation: '下影線長度是實體的兩倍以上，顯示強力支撐，看漲訊號。',
    signal: 'bullish',
  },
  inverted_hammer: {
    name: '倒錘子',
    explanation: '上影線長度是實體的兩倍以上，潛在反轉訊號，需次日確認。',
    signal: 'bullish',
  },
  bullish_engulfing: {
    name: '吞噬多頭',
    explanation: '陽線完全吞噬前一根陰線，買盤強勁，看漲反轉訊號。',
    signal: 'bullish',
  },
  bearish_engulfing: {
    name: '吞噬空頭',
    explanation: '陰線完全吞噬前一根陽線，賣壓湧現，看跌反轉訊號。',
    signal: 'bearish',
  },
  shooting_star: {
    name: '恆星線',
    explanation: '上影線極長、實體極小，頂部反轉形態，看跌訊號。',
    signal: 'bearish',
  },
  doji: {
    name: '十字星',
    explanation: '開盤與收盤幾乎相同，市場猶豫不決，需觀察後續走向。',
    signal: 'neutral',
  },
  morning_star: {
    name: '早晨之星',
    explanation: '三根K線底部反轉：大陰線、小實體、大陽線，強烈看漲訊號。',
    signal: 'bullish',
  },
  evening_star: {
    name: '黃昏之星',
    explanation: '三根K線頂部反轉：大陽線、小實體、大陰線，強烈看跌訊號。',
    signal: 'bearish',
  },
};

export function detectPatterns(candles: OHLCVPoint[]): PatternResult | null {
  // ... rule implementations using OHLCV ratios
  // Returns the highest-confidence match or null
}
```

### Pattern 2: Drizzle Holdings Table Migration (AI-12)

**What:** Add `holdings` table to `src/db/schema.ts` using the same column conventions as `price_alerts`.
**When to use:** Phase 12 plan Wave 0 — schema first, then migrate, then service layer.

```typescript
// src/db/schema.ts — ADD to existing exports
export const holdings = sqliteTable('holdings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  symbol: text('symbol').notNull(),
  name: text('name').notNull(),
  quantity: real('quantity').notNull().default(0),   // in shares (lots*1000 or direct)
  created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updated_at: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
},
(t) => [uniqueIndex('holdings_symbol_unique').on(t.symbol)]
);
```

Migration SQL (drizzle-kit generate output pattern):
```sql
CREATE TABLE `holdings` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `symbol` text NOT NULL,
  `name` text NOT NULL,
  `quantity` real NOT NULL DEFAULT 0,
  `created_at` integer,
  `updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `holdings_symbol_unique` ON `holdings` (`symbol`);
```

The `migrations.js` file must be regenerated and will add `m0002` import after `drizzle-kit generate`.

### Pattern 3: alertMonitor.ts AI Enrichment (AI-13)

**What:** Wrap the existing `fireAlertNotification` with a conditional MiniMax call that has a hard 5s timeout.
**When to use:** Inside `checkAlerts` after `markTriggered`, before `fireAlertNotification`.

```typescript
// Illustrative shape — exact implementation is Claude's discretion
async function getAlertContext(
  name: string,
  direction: 'upper' | 'lower',
  targetPrice: number,
  currentPrice: number,
  credentials: { apiKey: string; modelName: string; baseUrl: string }
): Promise<string | null> {
  const dirLabel = direction === 'upper' ? '向上突破' : '向下跌破';
  const prompt = `${name}股價${dirLabel}${targetPrice}元（現價${currentPrice.toFixed(2)}元）。
請用一句話（不超過40個中文字）說明當前市場背景，語氣客觀，禁止投資建議。`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const res = await fetch(`${credentials.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${credentials.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: credentials.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 80,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.choices?.[0]?.message?.content ?? '').trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
```

The `checkAlerts` loop reads `useSettingsStore.getState()` to get both `aiNotificationsEnabled` and credentials. If `aiNotificationsEnabled === false` or `apiKey === ''`, skip the AI call entirely.

### Pattern 4: settingsStore Extension (AI-13)

**What:** Add one boolean field + one async setter following the existing pattern.

```typescript
// Extension to SettingsState interface
aiNotificationsEnabled: boolean;
setAiNotificationsEnabled: (enabled: boolean) => Promise<void>;

// In the store body:
aiNotificationsEnabled: true,   // default ON

setAiNotificationsEnabled: async (enabled) => {
  await setItemAsync('ai_notifications_enabled', String(enabled));
  set({ aiNotificationsEnabled: enabled });
},
```

In `loadFromSecureStore`, add:
```typescript
const aiNotif = await getItemAsync('ai_notifications_enabled');
// ...
aiNotificationsEnabled: aiNotif !== 'false',   // default true if never set
```

### Pattern 5: PortfolioScreen isActive Lazy Load (AI-12)

**What:** Follows SummaryScreen and AnalysisScreen pattern exactly — `useRef(false)` + `isActive` prop.

```typescript
export function PortfolioScreen({ isActive }: { isActive: boolean }) {
  const hasLoaded = useRef(false);
  useEffect(() => {
    if (isActive && !hasLoaded.current) {
      hasLoaded.current = true;
      useHoldingsStore.getState().loadHoldings();
    }
  }, [isActive]);
  // ...
}
```

PagerView addition in `src/app/index.tsx`:
```typescript
<View key="4" style={{ flex: 1 }}>
  <PortfolioScreen isActive={activePage === 4} />
</View>
```

### Anti-Patterns to Avoid

- **Calling MiniMax in pattern detection:** Pattern logic is pure TS with static strings. Never add an API call for AI-11.
- **Sharing the quote polling queue for holdings/portfolio:** Keep all new background fetches isolated — don't touch `stockService`'s RequestQueue.
- **AbortSignal.timeout() for alert context call:** Use `AbortController` + `setTimeout` (same as summaryService.ts) for broader React Native compatibility. `AbortSignal.timeout()` is Node 17.3+ only and may not be available in Hermes.
- **Storing API key in SQLite holdings table:** Never persist credentials in SQLite — always go through SecureStore via settingsStore.
- **alertMonitor importing settingsStore at module top-level:** The background task runs in an isolated JS context — pass credentials as a parameter or read from `useSettingsStore.getState()` carefully. Read at call time, not import time.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite CRUD for holdings | Custom raw SQL | Drizzle ORM (already installed) | Schema migration, type safety, consistent with all other tables |
| AbortController timeout logic | Custom Promise.race | `AbortController` + `setTimeout(..., 5000)` (exact summaryService.ts pattern) | Already proven; avoids Hermes compat issues with AbortSignal.timeout |
| AI response JSON parsing | Custom regex | `parseAnalysisResponse()` from minimaxApi.ts | Already handles `<think>` stripping, code block variants, bare JSON |
| Settings toggle persistence | AsyncStorage directly | `setItemAsync` / `getItemAsync` from expo-secure-store | Consistent with all other settings; SecureStore named-import pattern required for Jest mock compat |
| Portfolio price calculation | External lib | Inline arithmetic with `useQuoteStore.getState().quotes[symbol].price` | Data already in store; no external dependency needed |

**Key insight:** Every mechanical problem (persistence, API calls, timeout, parsing) is already solved in the codebase. This phase is about wiring new domain logic into existing infrastructure, not inventing new infrastructure.

---

## Common Pitfalls

### Pitfall 1: Drizzle migration out of sync with migrations.js
**What goes wrong:** `schema.ts` is updated but `drizzle-kit generate` is not run, so the `holdings` table is never created at app start.
**Why it happens:** The Expo SQLite migrator reads `drizzle/migrations.js`, which must be regenerated after every schema change.
**How to avoid:** Run `npx drizzle-kit generate` after adding the `holdings` table to `schema.ts`, then manually update `drizzle/migrations.js` to import the new `m0002` migration file.
**Warning signs:** App crashes on startup with "no such table: holdings" SQLite error.

### Pitfall 2: alertMonitor reading stale settingsStore state
**What goes wrong:** `aiNotificationsEnabled` is `true` in memory but the store hydration from SecureStore hasn't completed when the background task fires immediately at startup.
**Why it happens:** `loadFromSecureStore` is async and fires in `_layout.tsx`'s hydration useEffect — it may not finish before the first `checkAlerts` tick.
**How to avoid:** Default `aiNotificationsEnabled: true` in the store. The real risk is missing a credential (`apiKey === ''`) — the existing guard `if (!apiKey)` already handles graceful skip; replicate this pattern.
**Warning signs:** AI call fires but gets 401 because apiKey is still `''` on first tick.

### Pitfall 3: OHLCVPoint body size = 0 (gap-up/gap-down candles)
**What goes wrong:** Division by `(open - close)` in pattern body-ratio calculations causes NaN or Infinity for doji / flat candles.
**Why it happens:** TWSE sometimes returns candles where open === close (suspended stock, data error).
**How to avoid:** In every pattern rule where body size is in the denominator, guard with `const body = Math.abs(c.close - c.open); if (body < 0.01) { /* classify as doji */ }`.
**Warning signs:** PatternCard shows `NaN/100` or a false pattern fires on flat days.

### Pitfall 4: Portfolio AI prompt token overrun
**What goes wrong:** Sending a full watchlist of 20 stocks with prices and quantities bloats the prompt, causing MiniMax to truncate or return an incomplete JSON.
**Why it happens:** No upper-bound on watchlist size; each stock entry contributes ~40 tokens.
**How to avoid:** Cap AI prompt at 15 stocks max (display warning if watchlist exceeds this). Keep `max_tokens: 400` for portfolio response — enough for a paragraph + embedded score.
**Warning signs:** Truncated response, `parseAnalysisResponse` throws "No JSON found", or health score is missing from the paragraph.

### Pitfall 5: PagerView handlePageSelected not updated for 5th page
**What goes wrong:** Swiping to page 4 causes `activePage` to stick at 3, so `PortfolioScreen` never receives `isActive={true}`.
**Why it happens:** The `handlePageSelected` function in `index.tsx` currently routes `page === 0` to settings and passes everything else through. Since it uses `setActivePage(page)` for all other pages, adding `key="4"` is sufficient — no logic change needed.
**How to avoid:** Verify `isActive` prop computation: `isActive={activePage === 4}`. The existing `setActivePage(page)` call in `handlePageSelected` handles this automatically.
**Warning signs:** PortfolioScreen's `loadHoldings` useEffect never fires on first swipe.

### Pitfall 6: PatternCard causing re-render storm on candle updates
**What goes wrong:** Pattern detection re-runs on every render if triggered inside the component body directly.
**Why it happens:** `candles` array reference changes on every chartStore update even if content is identical.
**How to avoid:** Run detection in a `useMemo(() => detectPatterns(candles), [candles])`. The `candles` reference from `getCandles(symbol, timeframe)` only changes when the cache key updates (on fetch), so this is safe and cheap.
**Warning signs:** Noticeable jank when timeframe selector is tapped rapidly.

---

## Code Examples

Verified patterns from project source:

### Drizzle Table Definition Pattern (from schema.ts)
```typescript
// Source: src/db/schema.ts (price_alerts table — exact pattern to replicate for holdings)
export const price_alerts = sqliteTable(
  'price_alerts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    symbol: text('symbol').notNull(),
    name: text('name').notNull(),
    upper_price: real('upper_price'),
    // ...
    created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex('price_alerts_symbol_unique').on(t.symbol)]
);
```

### MiniMax Fetch with 5s Timeout (from summaryService.ts)
```typescript
// Source: src/features/summary/services/summaryService.ts (timeoutSignal pattern)
function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}
// Usage: signal: timeoutSignal(5_000)
```

### Zustand Store Cache/Loading/Error Shape (from analysisStore.ts)
```typescript
// Source: src/features/analysis/store/analysisStore.ts
interface AnalysisState {
  cache: Record<string, AnalysisResult>;
  cachedAt: Record<string, number>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
}
```

### Score Color Thresholds (from AnalysisCard.tsx)
```typescript
// Source: src/features/analysis/components/AnalysisCard.tsx
function scoreColor(score: number): string {
  if (score >= 65) return '#00E676';   // green
  if (score >= 40) return '#FFB300';   // amber
  return '#FF1744';                     // red
}
```

### Jest Mock Pattern for db/client (from alertService.test.ts)
```typescript
// Source: src/features/alerts/services/alertService.test.ts
jest.mock('../db/client', () => ({
  db: { delete: jest.fn(), insert: jest.fn(), select: jest.fn(), update: jest.fn() },
}));
jest.mock('../db/schema', () => ({ price_alerts: { id: 'id', symbol: 'symbol', /* ... */ } }));
jest.mock('drizzle-orm', () => ({ eq: jest.fn((col, val) => ({ col, val, op: 'eq' })) }));
```

### Notification Trigger Shape (from alertMonitor.ts)
```typescript
// Source: src/features/alerts/services/alertMonitor.ts
await Notifications.scheduleNotificationAsync({
  content: { title: `${name} price alert`, body: `...` },
  trigger: {
    type: SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: 1,
    channelId: 'price-alerts',
  },
});
```

### isActive Lazy Load Pattern (from SummaryScreen.tsx)
```typescript
// Source: src/features/summary/components/SummaryScreen.tsx
const hasLoaded = useRef(false);
useEffect(() => {
  if (isActive && !hasLoaded.current) {
    hasLoaded.current = true;
    useSummaryStore.getState().loadSummaries();
  }
}, [isActive]);
```

---

## OHLCV Pattern Rule Reference (Claude's Discretion — Recommended Thresholds)

These are research-backed standard ratios used in technical analysis literature. Confidence: MEDIUM (textbook standard, not codebase-verified).

| Pattern | Min Candles | Detection Rule |
|---------|-------------|----------------|
| 錘子 (Hammer) | 1 | body in upper 1/3 of range; lower shadow >= 2x body; upper shadow <= 0.1x range; bearish prior trend (last 3 closes descending) |
| 倒錘子 (Inverted Hammer) | 1 | body in lower 1/3 of range; upper shadow >= 2x body; lower shadow <= 0.1x range |
| 吞噬多頭 (Bullish Engulfing) | 2 | candle[-2] is bearish (close < open); candle[-1] is bullish (close > open); candle[-1].open < candle[-2].close AND candle[-1].close > candle[-2].open |
| 吞噬空頭 (Bearish Engulfing) | 2 | candle[-2] is bullish; candle[-1] is bearish; candle[-1].open > candle[-2].close AND candle[-1].close < candle[-2].open |
| 恆星線 (Shooting Star) | 1 | upper shadow >= 2x body; lower shadow <= 0.1x range; body near bottom of range; bullish prior trend |
| 十字星 (Doji) | 1 | body <= 0.05 * (high - low); i.e. open ≈ close |
| 早晨之星 (Morning Star) | 3 | candle[-3] bearish and large body (>0.6x range); candle[-2] small body (doji or near-doji); candle[-1] bullish and closes above midpoint of candle[-3] body |
| 黃昏之星 (Evening Star) | 3 | inverse of morning star |

Confidence ranking for "strongest" selection: 3-candle patterns (早晨之星, 黃昏之星) > 2-candle patterns (吞噬) > 1-candle patterns (錘子, 恆星線) > 十字星. Within same group, pick the most recent (last candle index).

---

## Validation Architecture

nyquist_validation is enabled in `.planning/config.json`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (jest-expo preset) |
| Config file | `package.json` (jest key) |
| Quick run command | `npm test -- --testPathPattern=patternDetector` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-11 | `detectPatterns` returns correct pattern for each of 8 pattern types | unit | `npm test -- --testPathPattern=patternDetector` | Wave 0 |
| AI-11 | `detectPatterns` returns `null` when no pattern matches | unit | `npm test -- --testPathPattern=patternDetector` | Wave 0 |
| AI-11 | `detectPatterns` returns strongest pattern when multiple detected | unit | `npm test -- --testPathPattern=patternDetector` | Wave 0 |
| AI-11 | `detectPatterns` handles body=0 candles without NaN | unit | `npm test -- --testPathPattern=patternDetector` | Wave 0 |
| AI-12 | `holdingsService` upsert/getAll/delete CRUD | unit | `npm test -- --testPathPattern=holdingsService` | Wave 0 |
| AI-12 | `holdingsStore` loadHoldings/setQuantity round-trip | unit | `npm test -- --testPathPattern=holdingsStore` | Wave 0 |
| AI-12 | Portfolio AI prompt contains stock names + quantities | unit | `npm test -- --testPathPattern=portfolioAiService` | Wave 0 |
| AI-13 | `checkAlerts` includes AI context in notification body when `aiNotificationsEnabled=true` | unit | `npm test -- --testPathPattern=alertMonitor` | ❌ update existing |
| AI-13 | `checkAlerts` falls back to plain notification when AI call times out | unit | `npm test -- --testPathPattern=alertMonitor` | ❌ update existing |
| AI-13 | `checkAlerts` skips AI call when `aiNotificationsEnabled=false` | unit | `npm test -- --testPathPattern=alertMonitor` | ❌ update existing |
| AI-13 | `settingsStore` persists `aiNotificationsEnabled` via SecureStore | unit | `npm test -- --testPathPattern=settings` | ❌ update existing |

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern=<affected module>`
- **Per wave merge:** `npm test` (full suite, all 241+ tests)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/patternDetector.test.ts` — covers AI-11 (pure logic, no mocks needed)
- [ ] `src/__tests__/holdingsService.test.ts` — covers AI-12 CRUD (follows `alertService.test.ts` mock pattern)
- [ ] `src/__tests__/holdingsStore.test.ts` — covers AI-12 store (follows `analysisStore.test.ts` pattern)
- [ ] `src/__tests__/portfolioAiService.test.ts` — covers AI-12 prompt building + parse
- Update `src/__tests__/alertMonitor.test.ts` — add AI-enriched + fallback + toggle cases
- Update `src/__tests__/settings.test.ts` — add `aiNotificationsEnabled` persist/load cases

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `/text/chatcompletion_v2` (MiniMax native) | `/chat/completions` (OpenAI-compat) | Phase 6 decision | All new AI calls use `/chat/completions` — confirmed in `minimaxApi.ts` line 49 and `summaryService.ts` line 163 |
| AbortSignal.timeout() | AbortController + setTimeout | Phase 8 pattern | Hermes-safe timeout; use same shape everywhere |
| Prompt-based JSON | response_format json_schema | N/A — MiniMax M2.5 does not support json_schema | Always extract JSON via `parseAnalysisResponse()` or regex from plain-text response |

---

## Open Questions

1. **Lots/shares toggle persistence (Claude's Discretion)**
   - What we know: Users switch between "張" (lots = 1000 shares) and "股" (individual shares)
   - What's unclear: Whether this preference should survive app restart or reset per session
   - Recommendation: Session-only (useState) is simpler and avoids an additional SecureStore key; users likely remember their preferred unit. If the planner feels strongly, add a `lotUnit: 'lot' | 'share'` field to `settingsStore` following the existing pattern.

2. **Portfolio AI structured response format**
   - What we know: `callSummaryMiniMax` returns plain text; `callMiniMax` (analysis) returns JSON embedded in code block
   - What's unclear: Whether to embed the health score (0-100 integer) in the AI paragraph response or compute it client-side
   - Recommendation: Embed score in AI response with a tight prompt instruction: "Include SCORE:XX/100 at the end of your response where XX is a number." Then extract with regex `SCORE:(\d+)/100`. Avoids two separate API calls (one for score, one for paragraph).

3. **Detail screen scroll wrapping for PatternCard**
   - What we know: `detail/[symbol].tsx` currently uses a `View` with a nested `View className="flex-1 px-4"` — no ScrollView
   - What's unclear: As more elements are added below VolumeBar (PatternCard + TimeframeSelector + AlertStatusBar), the content may overflow on small screens
   - Recommendation: The planner should consider wrapping the chart area `View className="flex-1 px-4"` in a `ScrollView` in the same plan that adds PatternCard, to future-proof the layout.

---

## Sources

### Primary (HIGH confidence)
- `/Users/linmini/invest/invest-app/src/features/alerts/services/alertMonitor.ts` — confirmed `fireAlertNotification` signature and notification body format
- `/Users/linmini/invest/invest-app/src/features/settings/store/settingsStore.ts` — confirmed store shape, SecureStore key pattern, `loadFromSecureStore` structure
- `/Users/linmini/invest/invest-app/src/db/schema.ts` — confirmed all three existing tables; holdings table design follows `price_alerts` pattern
- `/Users/linmini/invest/invest-app/src/app/index.tsx` — confirmed PagerView keys 0–3; slot 4 available
- `/Users/linmini/invest/invest-app/src/app/detail/[symbol].tsx` — confirmed insertion point between VolumeBar (line 195) and TimeframeSelector (line 207)
- `/Users/linmini/invest/invest-app/src/features/analysis/services/minimaxApi.ts` — confirmed API endpoint `/chat/completions`, AbortController pattern, JSON parse approach
- `/Users/linmini/invest/invest-app/src/features/summary/services/summaryService.ts` — confirmed `timeoutSignal(5_000)` pattern for short AI calls; plain-text response pattern
- `/Users/linmini/invest/invest-app/src/features/analysis/store/analysisStore.ts` — confirmed Zustand cache/loading/error shape
- `/Users/linmini/invest/invest-app/src/features/analysis/components/AnalysisCard.tsx` — confirmed `scoreColor` thresholds, badge style, cyberpunk tokens
- `/Users/linmini/invest/invest-app/src/features/analysis/components/NoApiKeyPrompt.tsx` — confirmed component location and router-push pattern
- `/Users/linmini/invest/invest-app/drizzle/migrations.js` — confirmed migration file naming convention (m0000, m0001); m0002 needed for holdings
- `/Users/linmini/invest/invest-app/src/__tests__/alertMonitor.test.ts` — confirmed Jest mock patterns for expo-notifications and alertService
- `/Users/linmini/invest/invest-app/src/__tests__/alertService.test.ts` — confirmed Drizzle mock chain pattern for new holdingsService tests
- `/Users/linmini/invest/invest-app/package.json` — confirmed Jest preset (jest-expo), test command (`npm test`)

### Secondary (MEDIUM confidence)
- Standard candlestick pattern OHLCV thresholds — widely cited in technical analysis literature (body ratio >= 2x shadow, doji body < 5% of range); cross-referenced with multiple academic/practitioner sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified in node_modules and existing imports
- Architecture: HIGH — all integration points confirmed by reading actual source files
- Pitfalls: HIGH — derived from reading existing test patterns, known Phase 9 decisions, and React Native/Hermes constraints documented in STATE.md
- OHLCV thresholds: MEDIUM — standard textbook values, not verified against a specific authoritative source

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable codebase, no fast-moving dependencies)
