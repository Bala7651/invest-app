# Phase 8: Daily Summary - Research

**Researched:** 2026-03-21
**Domain:** React Native foreground scheduling, Drizzle ORM SQLite CRUD, TWSE index API, AI prompt design
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Summary Content & Format**
- Per-stock sections, not one combined narrative
- Shorter than AI analysis: 2-3 sentence snapshot per stock (price action, key signal, outlook)
- TWSE index as first section, then individual watchlist stocks
- One AI call per stock (reuses existing callMiniMax pattern from Phase 6)
- Output in Traditional Chinese (consistent with Phase 6)

**Summary Viewing UI**
- New 4th page in PagerView, to the left of AI analysis: Settings <- Home <- AI Analysis <- Daily Summary
- Date list with expandable cards (newest first), tap a date to expand and see all stock summaries
- Empty state: text explaining auto-generation at 12:30 + "Generate Now" button
- "Generate Now" button lives on the summary page (not in Settings)

**Generation Trigger & Timing**
- Auto-generate at 12:30 Taiwan time on market days only (Mon-Fri, no holidays — uses existing marketHours logic)
- Foreground only — no background fetch. Auto-catch-up when app opens if today's summary is missing and it's past 12:30 on a market day
- Generate Now always creates today's summary only (no past dates)
- If summary already exists for today, overwrite it (replace, not duplicate)
- Show loading spinner with stock-by-stock progress: "Generating... 3/8 stocks"

**Error Handling**
- On failure: pop a message with failed reason AND show error on summary page
- Partial results saved: if some stocks succeed and one fails, store the successful ones and mark failed stock with error
- User can retry failed stocks with Generate Now

### Claude's Discretion
- Summary prompt design (shorter than analysis prompt)
- Exact card/list component styling
- Auto-purge implementation (on insert, on app open, or scheduled)
- How to fetch TWSE index data (may need separate API call)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SUMM-01 | App auto-generates daily market summary at 12:30 (1 hour before close) | Foreground timer + marketHours check pattern; AppState.addEventListener for catch-up |
| SUMM-02 | Summary covers all watchlist stocks and overall market index | TWSE openapi.twse.com.tw/v1/exchangeReport/MI_INDEX confirmed for TAIEX; watchlistStore.items for stocks |
| SUMM-03 | Summaries stored in local SQLite database | `daily_summaries` table already exists in schema.ts with symbol/date/content fields |
| SUMM-04 | Summaries older than 2 weeks are auto-purged | Drizzle lt() operator on text date field; purge on insert is simplest and sufficient |
</phase_requirements>

---

## Summary

Phase 8 builds a daily market summary generator that runs in the foreground at 12:30 Taiwan time and persists results to the existing `daily_summaries` SQLite table. The CONTEXT.md decision to use foreground-only (no background tasks) dramatically simplifies implementation — no WorkManager, no expo-background-task, just a time check on `AppState active` events plus a periodic interval while the app is open.

The TWSE index data question is resolved: `https://openapi.twse.com.tw/v1/exchangeReport/MI_INDEX` returns closing index data for the "發行量加權股價指數" (TAIEX) in JSON format with fields for closing index value, point change, and percentage change. This is a different API from the real-time stock quote endpoint and returns the previous day's close (or current day's close after market close). For a 12:30 summary (during trading), the most recent TWSE closing index plus today's live movement is the correct approach.

The `daily_summaries` schema already exists with `symbol`, `date` (text, ISO format), and `content` (text) columns. The purge strategy is: on every insert, delete rows where `date < cutoffDate` (14 days ago). Drizzle's `lt()` operator with a text ISO date string works correctly because ISO date strings sort lexicographically.

**Primary recommendation:** Build `SummaryService` (AI calls + SQLite CRUD + purge) first, then wire it to a `summaryStore` (Zustand, mirrors analysisStore pattern), then build `SummaryScreen` as the 4th PagerView page, then add the catch-up trigger in `_layout.tsx`.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.44.2 | SQLite CRUD for summaries | Already in use, `daily_summaries` table exists |
| expo-sqlite | ~55.0.11 | SQLite database | Already in use, db client ready |
| zustand | ^5.0.12 | Summary state (loading, progress, results) | Already in use, mirrors analysisStore |
| react-native-pager-view | 8.0.0 | 4th page addition | Already in use |
| react-native-reanimated | 4.2.1 | Expandable card animations | Already in use (AnalysisCard pattern) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| MiniMax API (fetch) | n/a | AI summary generation per stock | One call per stock, reuse callMiniMax pattern |
| TWSE openapi | n/a | Market index data (MI_INDEX endpoint) | One fetch per summary generation run |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TWSE openapi MI_INDEX | MIS getStockInfo with index code | MI_INDEX is the official open API; MIS index symbol not documented |
| Purge on insert | Purge on app open | On-insert is simpler, no separate hook needed |
| Foreground timer | expo-background-task | Foreground-only per CONTEXT decision; background task deferred or not needed |

**Installation:** No new packages required for this phase.

---

## Architecture Patterns

### Recommended Project Structure

```
src/features/summary/
├── services/
│   └── summaryService.ts     # AI calls + SQLite insert + purge
├── store/
│   └── summaryStore.ts       # Zustand: loading, progress, results, errors
├── components/
│   ├── SummaryScreen.tsx     # 4th PagerView page
│   ├── SummaryCard.tsx       # Expandable date card (Reanimated, mirrors AnalysisCard)
│   └── SummarySkeleton.tsx   # Loading skeleton (mirrors AnalysisSkeleton)
└── types.ts                  # SummaryEntry, DailySummary types
```

### Pattern 1: SummaryService — AI + SQLite + Purge

**What:** A pure service module (no React) that orchestrates: fetch TAIEX index, loop through watchlist calling MiniMax per symbol, insert rows to SQLite, purge old rows.

**When to use:** Called from summaryStore's `generateSummary()` action.

```typescript
// src/features/summary/services/summaryService.ts
import { db } from '../../../db/client';
import { daily_summaries } from '../../../db/schema';
import { eq, lt, and } from 'drizzle-orm';

const CUTOFF_DAYS = 14;

export function getTodayISO(): string {
  // Use Taipei date, not UTC
  const taipei = new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
  const d = new Date(taipei);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getCutoffISO(): string {
  const taipeiNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  taipeiNow.setDate(taipeiNow.getDate() - CUTOFF_DAYS);
  return `${taipeiNow.getFullYear()}-${String(taipeiNow.getMonth() + 1).padStart(2, '0')}-${String(taipeiNow.getDate()).padStart(2, '0')}`;
}

// Upsert: delete existing row for same symbol+date, then insert
export async function upsertSummary(symbol: string, date: string, content: string): Promise<void> {
  await db.delete(daily_summaries)
    .where(and(eq(daily_summaries.symbol, symbol), eq(daily_summaries.date, date)));
  await db.insert(daily_summaries).values({ symbol, date, content });
}

// Purge rows older than 14 days
export async function purgeOldSummaries(): Promise<void> {
  const cutoff = getCutoffISO();
  await db.delete(daily_summaries).where(lt(daily_summaries.date, cutoff));
}
```

### Pattern 2: TWSE MI_INDEX Fetch for TAIEX

**What:** Fetch the official TWSE open API for the market-cap weighted index.

**Verified:** `https://openapi.twse.com.tw/v1/exchangeReport/MI_INDEX` returns an array of index entries. The TAIEX entry has `指數: "發行量加權股價指數"`.

```typescript
// Source: https://openapi.twse.com.tw/v1/swagger.json (verified 2026-03-21)
interface TWIXEntry {
  '日期': string;       // "1150320" (ROC calendar YYYMMDD)
  '指數': string;       // index name
  '收盤指數': string;   // closing value e.g. "33543.88"
  '漲跌': string;       // "+" | "-"
  '漲跌點數': string;   // e.g. "145.80"
  '漲跌百分比': string; // e.g. "-0.43"
}

export async function fetchTWIX(): Promise<{ close: number; change: number; changePct: number } | null> {
  const res = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/MI_INDEX', {
    headers: { 'User-Agent': 'invest-app/1.0' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const data: TWIXEntry[] = await res.json();
  const taiex = data.find(e => e['指數'] === '發行量加權股價指數');
  if (!taiex) return null;
  const sign = taiex['漲跌'] === '+' ? 1 : -1;
  return {
    close: parseFloat(taiex['收盤指數']),
    change: sign * parseFloat(taiex['漲跌點數']),
    changePct: sign * parseFloat(taiex['漲跌百分比']),
  };
}
```

**Note:** This API returns previous trading day's closing data. It is appropriate for the daily summary context where we summarize what happened rather than real-time data.

### Pattern 3: summaryStore — Zustand State

**What:** Mirrors analysisStore — tracks loading, progress, errors, and cached results.

```typescript
// src/features/summary/store/summaryStore.ts
import { create } from 'zustand';

interface SummaryState {
  generating: boolean;
  progress: { done: number; total: number };
  errors: Record<string, string | null>;  // per-symbol errors
  summariesByDate: Record<string, SummaryEntry[]>;  // date ISO -> entries
  loadSummaries: () => Promise<void>;
  generateToday: (credentials: Credentials) => Promise<void>;
}
```

### Pattern 4: Foreground Time-Check Trigger

**What:** On AppState `active`, check if today's summary is missing AND it's past 12:30 Taipei time AND it's a market day. If so, auto-generate.

**Where:** `_layout.tsx` hydration `useEffect` (runs after `success === true`).

```typescript
// Catch-up on app open — add to existing hydration useEffect in _layout.tsx
// Source: existing AppState pattern in _layout.tsx

function isCatchUpNeeded(todayISO: string): boolean {
  const taipeiStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' });
  const taipei = new Date(taipeiStr);
  const day = taipei.getDay();
  if (day === 0 || day === 6) return false;
  if (isHoliday(taipei)) return false;
  const mins = taipei.getHours() * 60 + taipei.getMinutes();
  return mins >= 12 * 60 + 30;  // past 12:30
}
```

### Pattern 5: Expandable Date Card (mirrors AnalysisCard)

**What:** Each date is a card header. Tap to expand — shows per-symbol summary content using `Animated.View` with `maxHeight` transition. Newest date first.

```typescript
// maxHeight expand/collapse pattern (same as AnalysisCard)
// Source: existing invest-app/src/features/analysis/components/AnalysisCard.tsx

const maxHeight = useSharedValue(0);
function toggle() {
  const next = !expanded;
  setExpanded(next);
  maxHeight.value = withTiming(next ? 3000 : 0, { duration: 250 });
}
const animStyle = useAnimatedStyle(() => ({ maxHeight: maxHeight.value, overflow: 'hidden' }));
```

### Pattern 6: Per-Symbol Error Marking

**What:** If a stock's AI call fails, store a special error marker in `content` rather than skipping it entirely.

```typescript
// Mark failed stock with error string so partial results are persisted
const ERROR_PREFIX = '__ERROR__:';
// On render: if content.startsWith(ERROR_PREFIX), show error UI with retry
```

### Anti-Patterns to Avoid

- **Do not call callMiniMax directly from SummaryScreen** — always go through summaryStore.generateToday(), keeps loading/error state centralized.
- **Do not use `date` comparison with timestamp integers for purge** — `daily_summaries.date` is TEXT (ISO string), use `lt(daily_summaries.date, cutoffISO)` which works correctly for lexicographic ISO date comparison.
- **Do not add a 5th PagerView page** — PagerView now has 4 pages (index 0=Settings, 1=Watchlist, 2=AI Analysis, 3=Daily Summary). The Settings gesture (swipe to index 0) already redirects — this pattern must be preserved for index 0.
- **Do not block the hydration useEffect** — catch-up generation should be fire-and-forget, not awaited in layout.
- **Do not use ROC calendar date** — MI_INDEX returns "1150320" format; convert to Gregorian ISO internally.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite upsert (replace same date) | Manual check-then-insert logic | delete-then-insert in same function | Avoids UNIQUE constraint edge cases; daily_summaries has no unique index on (symbol, date) so explicit delete-then-insert is correct |
| Old row purge | Cron job or separate interval | Purge in `upsertSummary` after insert | On-insert purge is atomic with the write, no scheduling needed |
| Market day check | Custom weekday + holiday logic | Existing `isHoliday()` + weekday check from `marketHours.ts` | Already tested, Taipei timezone-aware |
| TAIEX data | Web scraping or third-party | `openapi.twse.com.tw/v1/exchangeReport/MI_INDEX` | Official TWSE open API, no auth, JSON response |
| Progress counter | Complex queue with callbacks | Simple counter in summaryStore incremented after each stock | Per-stock sequential loop with `progress.done++` after each call |

---

## Common Pitfalls

### Pitfall 1: Date in Wrong Timezone
**What goes wrong:** Using `new Date().toISOString().split('T')[0]` returns UTC date — for Taiwan (UTC+8), evening UTC time is the next day in Taipei.
**Why it happens:** JavaScript Date defaults to UTC; Taiwan is UTC+8.
**How to avoid:** Always derive today's ISO date via `toLocaleString('en-US', { timeZone: 'Asia/Taipei' })` then format manually — same pattern as existing `marketHours.ts`.
**Warning signs:** Summary rows appearing on the wrong date after 16:00 UTC (= midnight Taipei).

### Pitfall 2: PagerView Page Index Collision
**What goes wrong:** Adding a 4th page changes all page indices; the existing Settings redirect (page 0 -> navigate to `/settings`) must be preserved exactly.
**Why it happens:** Current `handlePageSelected` in `index.tsx` redirects page 0 to Settings. Adding Daily Summary on the right (page 3) doesn't affect page 0. But if placed differently, the redirect breaks.
**How to avoid:** Add Daily Summary as page 3 (rightmost), preserving page 0=redirect, page 1=Watchlist, page 2=AI Analysis, page 3=Daily Summary.
**Warning signs:** Settings navigation stops working after PagerView expansion.

### Pitfall 3: Purge Comparing Text Dates Incorrectly
**What goes wrong:** Using JavaScript Date comparison (subtraction) on the text `date` column instead of string comparison.
**Why it happens:** `daily_summaries.date` is `text('date')` — Drizzle does not automatically convert it. `lt(daily_summaries.date, cutoffISO)` works because ISO format sorts lexicographically.
**How to avoid:** Always pass ISO date strings (e.g., `"2026-03-07"`) to `lt()` operator. Never compare numeric timestamps against this column.
**Warning signs:** Purge deletes nothing or deletes everything.

### Pitfall 4: Duplicate Summary Rows
**What goes wrong:** Generate Now called twice (or catch-up + manual) creates two rows for the same symbol+date.
**Why it happens:** `daily_summaries` has no UNIQUE constraint on `(symbol, date)`.
**How to avoid:** Always delete existing row for `(symbol, date)` before inserting — the upsert pattern in `summaryService.ts`.
**Warning signs:** Multiple summary entries for same stock on same date.

### Pitfall 5: MI_INDEX Returns Empty Array During Trading Hours
**What goes wrong:** `openapi.twse.com.tw/v1/exchangeReport/MI_INDEX` may return empty or previous day data if market hasn't closed.
**Why it happens:** This is a closing-price endpoint — data updates after close (~13:35-14:00).
**How to avoid:** At 12:30 (1 hour before close), MI_INDEX will return yesterday's closing data. This is acceptable for a summary — describe it as "most recent closing index" in the prompt. Do not fail if data is previous day.
**Warning signs:** Missing or stale index data in the 12:30 summary.

### Pitfall 6: callMiniMax URL Pattern
**What goes wrong:** The existing `minimaxApi.ts` constructs the URL as `${baseUrl}/chat/completions` but Phase 6 decisions document that MiniMax native endpoint is `/text/chatcompletion_v2` — the current code already uses `/chat/completions` (OpenAI-compat). Both work; do not change the URL in summaryService.
**Why it happens:** The STATE.md says "Use /text/chatcompletion_v2" but the actual minimaxApi.ts code uses `/chat/completions`. The Phase 6 code is what was actually tested and shipped.
**How to avoid:** Reuse `callMiniMax()` from `minimaxApi.ts` as-is without modifying it.

---

## Code Examples

### Summary Prompt (shorter than analysis prompt)

```typescript
// Source: design decision from CONTEXT.md — 2-3 sentence snapshot
const SUMMARY_SYSTEM_PROMPT = `You are a Taiwan stock market analyst providing brief daily summaries.
ALWAYS respond in Traditional Chinese (繁體中文).
ALWAYS respond with only a plain text paragraph. No JSON, no markdown, no headers.
Keep the summary to 2-3 sentences: mention today's price action, one key technical signal, and short-term outlook.`;

function buildSummaryPrompt(symbol: string, name: string, quote: QuoteData): string {
  return `請為台灣股票 ${symbol}（${name}）生成今日簡短摘要。
今日市場數據（請使用以下實際數據，勿自行編造）：
- 目前價格：${quote.price ?? '無資料'} 元
- 漲跌：${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)}（${quote.changePct.toFixed(2)}%）
- 昨收：${quote.prevClose} 元
請用2-3句話說明今日價格走勢、關鍵技術訊號及短期展望。`;
}

// TWSE Index prompt (no symbol, uses index data)
function buildIndexSummaryPrompt(indexData: { close: number; change: number; changePct: number }): string {
  const sign = indexData.change >= 0 ? '+' : '';
  return `請為台灣加權指數（大盤）生成今日簡短摘要。
最新指數資料：
- 指數：${indexData.close.toFixed(2)} 點
- 漲跌：${sign}${indexData.change.toFixed(2)} 點（${sign}${indexData.changePct.toFixed(2)}%）
請用2-3句話說明今日大盤表現、關鍵走勢及短期展望。`;
}
```

### summaryStore.generateToday() Sketch

```typescript
async generateToday(credentials) {
  if (get().generating) return;

  const date = getTodayISO();
  const watchlistItems = useWatchlistStore.getState().items;
  const quotes = useQuoteStore.getState().quotes;
  const total = watchlistItems.length + 1; // +1 for TAIEX index

  set({ generating: true, progress: { done: 0, total }, errors: {} });

  // 1. TAIEX index first
  try {
    const indexData = await fetchTWIX();
    const content = indexData
      ? await callSummaryMiniMax('TWSE', buildIndexSummaryPrompt(indexData), credentials)
      : '__ERROR__:無法取得大盤資料';
    await upsertSummary('TWSE', date, content);
  } catch (e) {
    await upsertSummary('TWSE', date, `__ERROR__:${String(e)}`);
    set(s => ({ errors: { ...s.errors, 'TWSE': String(e) } }));
  }
  set(s => ({ progress: { ...s.progress, done: s.progress.done + 1 } }));

  // 2. Per-stock loop
  for (const item of watchlistItems) {
    try {
      const q = quotes[item.symbol];
      const prompt = buildSummaryPrompt(item.symbol, item.name, /* quoteData */);
      const content = await callSummaryMiniMax(item.symbol, prompt, credentials);
      await upsertSummary(item.symbol, date, content);
    } catch (e) {
      await upsertSummary(item.symbol, date, `__ERROR__:${String(e)}`);
      set(s => ({ errors: { ...s.errors, [item.symbol]: String(e) } }));
    }
    set(s => ({ progress: { ...s.progress, done: s.progress.done + 1 } }));
  }

  // 3. Purge old rows (on every insert batch completion)
  await purgeOldSummaries();

  // 4. Reload summaries from SQLite
  await get().loadSummaries();
  set({ generating: false });
}
```

### SQLite Query — Load All Summaries

```typescript
// Source: drizzle-orm docs (verified pattern)
import { desc } from 'drizzle-orm';

// Group by date, newest first
const rows = await db
  .select()
  .from(daily_summaries)
  .orderBy(desc(daily_summaries.date), desc(daily_summaries.created_at));
```

### Catch-Up Trigger in _layout.tsx

```typescript
// Add to hydration useEffect, after watchlist + settings load
.then(async () => {
  // Check catch-up: needs to be after migration success
  const needsCatchUp = isCatchUpNeeded();  // checks Taipei time >= 12:30, is market day
  const todayISO = getTodayISO();
  const hasSummaryToday = await db
    .select({ id: daily_summaries.id })
    .from(daily_summaries)
    .where(eq(daily_summaries.date, todayISO))
    .limit(1);
  if (needsCatchUp && hasSummaryToday.length === 0) {
    const { apiKey, modelName, baseUrl } = useSettingsStore.getState();
    if (apiKey) {
      useSummaryStore.getState().generateToday({ apiKey, modelName, baseUrl });
      // fire-and-forget — not awaited
    }
  }
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Background task scheduling | Foreground-only catch-up on AppState active | Phase 8 decision | Simpler, no WorkManager config |
| Combined narrative summary | Per-stock sections | Phase 8 decision | Matches analysis page structure |
| Manual-only generation | Auto-catch-up + manual fallback | Phase 8 | Requirement coverage without background complexity |

**Deprecated/outdated:**
- `expo-background-task`: Not used — decision is foreground-only. Phase 9 (Price Alerts) will introduce WorkManager; Phase 8 does not.

---

## Open Questions

1. **MI_INDEX at 12:30 returns previous day close**
   - What we know: `openapi.twse.com.tw/v1/exchangeReport/MI_INDEX` updates after market close (~13:35-14:00). At 12:30 it returns yesterday's data.
   - What's unclear: Whether TAIEX live data is available via a different free/open endpoint during trading hours.
   - Recommendation: Use MI_INDEX as-is for closing data; supplement with a note in the summary prompt that it's "most recent closing data." This is acceptable for the daily summary use case. The live quoteStore data for individual stocks is still real-time.

2. **SummaryScreen loading state during catch-up**
   - What we know: Catch-up fires fire-and-forget from `_layout.tsx`. SummaryScreen may render before generation completes.
   - What's unclear: Whether the progress spinner should show automatically if summaryStore.generating === true when the page becomes active.
   - Recommendation: `SummaryScreen` checks `summaryStore.generating` on mount and render — if true, show progress spinner. This mirrors `AnalysisScreen`'s `isActive` + loading pattern.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7 + jest-expo ~55.0.10 |
| Config file | `package.json` `jest` field |
| Quick run command | `cd /Users/linmini/invest/invest-app && npx jest --testPathPattern="summary" --no-coverage` |
| Full suite command | `cd /Users/linmini/invest/invest-app && npx jest --no-coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SUMM-01 | `isCatchUpNeeded()` returns true past 12:30 on market day, false otherwise | unit | `npx jest --testPathPattern="summaryService" -t "isCatchUpNeeded"` | Wave 0 |
| SUMM-01 | `generateToday()` skips if already generating (idempotent guard) | unit | `npx jest --testPathPattern="summaryStore" -t "idempotent"` | Wave 0 |
| SUMM-02 | `fetchTWIX()` returns close/change/changePct on successful response | unit | `npx jest --testPathPattern="summaryService" -t "fetchTWIX"` | Wave 0 |
| SUMM-02 | `buildSummaryPrompt()` embeds real quote data, not placeholders | unit | `npx jest --testPathPattern="summaryService" -t "buildSummaryPrompt"` | Wave 0 |
| SUMM-03 | `upsertSummary()` deletes existing row then inserts new | unit (mock db) | `npx jest --testPathPattern="summaryService" -t "upsertSummary"` | Wave 0 |
| SUMM-03 | `loadSummaries()` returns rows grouped by date, newest first | unit (mock db) | `npx jest --testPathPattern="summaryStore" -t "loadSummaries"` | Wave 0 |
| SUMM-04 | `purgeOldSummaries()` calls delete with correct cutoff date | unit (mock db) | `npx jest --testPathPattern="summaryService" -t "purgeOld"` | Wave 0 |
| SUMM-04 | `getCutoffISO()` returns date 14 days ago in Taipei timezone | unit | `npx jest --testPathPattern="summaryService" -t "getCutoffISO"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd /Users/linmini/invest/invest-app && npx jest --testPathPattern="summary" --no-coverage`
- **Per wave merge:** `cd /Users/linmini/invest/invest-app && npx jest --no-coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/summaryService.test.ts` — covers SUMM-01, SUMM-02, SUMM-03, SUMM-04 service functions
- [ ] `src/__tests__/summaryStore.test.ts` — covers SUMM-01 (idempotent), SUMM-03 (loadSummaries state)

---

## Sources

### Primary (HIGH confidence)
- TWSE openapi.twse.com.tw/v1/swagger.json — confirmed MI_INDEX endpoint exists with correct fields (verified live 2026-03-21)
- openapi.twse.com.tw/v1/exchangeReport/MI_INDEX — live response verified: `指數: "發行量加權股價指數"`, closing index `33543.88`, change `-145.80` (2026-03-20 data)
- Existing codebase: `src/db/schema.ts` — `daily_summaries` table confirmed with symbol/date/content columns
- Existing codebase: `src/features/analysis/services/minimaxApi.ts` — callMiniMax signature confirmed reusable
- Existing codebase: `src/features/market/marketHours.ts` — isHoliday, isMarketOpen confirmed with Taipei timezone handling
- Existing codebase: `src/app/index.tsx` — PagerView with 3 pages confirmed; page 0 redirect pattern documented

### Secondary (MEDIUM confidence)
- drizzle-orm docs (https://orm.drizzle.team/docs/delete) — `lt()` operator for WHERE clause confirmed
- Multiple sources confirm ISO date string lexicographic comparison works correctly in SQLite text columns

### Tertiary (LOW confidence)
- WebSearch results on foreground timer patterns — corroborated with existing project's AppState pattern in `_layout.tsx`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed; no new packages needed
- Architecture: HIGH — patterns directly derived from existing analysisStore/AnalysisCard/watchlistService code
- TWSE MI_INDEX: HIGH — live API response verified
- Pitfalls: HIGH — derived from existing codebase decisions (timezone patterns, PagerView structure)
- Prompt design: MEDIUM — functional but exact wording is Claude's discretion per CONTEXT.md

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable stack; TWSE API endpoint may change if TWSE updates their open API)
