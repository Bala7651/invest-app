# Architecture Research

**Domain:** Personal Android stock investment app (Taiwan market)
**Researched:** 2026-03-18
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                           │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  HomeScreen     │  │  DetailScreen    │  │  AIScreen      │  │
│  │  (Watchlist)    │  │  (Price Charts)  │  │  (Analysis)    │  │
│  └────────┬────────┘  └────────┬─────────┘  └───────┬────────┘  │
│           │                   │                     │           │
│  ┌────────┴───────────────────┴─────────────────────┴────────┐  │
│  │              PagerView (swipeable container)               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                           ↕ state reads/writes                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                 Zustand State Stores                      │    │
│  │  WatchlistStore  |  QuoteStore  |  AIStore  |  UIStore   │    │
│  └──────────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────────┤
│                      SERVICE LAYER                               │
│                                                                  │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────────┐   │
│  │  StockService  │  │  AIService        │  │  SummaryService│   │
│  │  (polling +    │  │  (MiniMax M2.5    │  │  (daily task   │   │
│  │   cache)       │  │   orchestration)  │  │   + purge)     │   │
│  └───────┬────────┘  └────────┬──────────┘  └───────┬────────┘  │
│          │                   │                      │           │
├──────────┴───────────────────┴──────────────────────┴───────────┤
│                       DATA LAYER                                 │
│                                                                  │
│  ┌──────────────────┐    ┌────────────────┐   ┌──────────────┐  │
│  │  TWSE OpenAPI    │    │  MiniMax API   │   │  SQLite DB   │  │
│  │  (HTTP polling)  │    │  (OpenAI-compat│   │  (summaries) │  │
│  │  ~20s delay      │    │   REST/stream) │   │  2-week TTL  │  │
│  └──────────────────┘    └────────────────┘   └──────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| PagerView container | Swipeable navigation between Home, Detail, AI pages | `react-native-pager-view` with 3 pages |
| HomeScreen | Render watchlist with live quotes; add/remove stocks | FlatList of StockCard components |
| DetailScreen | Show stock header + timeframe selector + price chart | Victory Native XL CandlestickChart or LineChart |
| AIScreen | Display analysis sections: sentiment, technical, advice, risk | ScrollView of AI result sections, loading skeleton |
| SettingsModal | API key input and persistence | Modal triggered from header icon |
| WatchlistStore | Persist user-selected stock codes; source of truth for watched tickers | Zustand + AsyncStorage persistence |
| QuoteStore | In-memory cache of latest quotes + loading/error state; owns polling lifecycle | Zustand with interval-based polling |
| AIStore | Cache last AI analysis per stock, track in-flight request state | Zustand, reset on stock change |
| UIStore | Theme tokens, global loading overlays | Zustand |
| StockService | Abstract TWSE API calls; normalize response shape; handle HTTP errors | Plain TypeScript class / module |
| AIService | Build prompt from stock data + news; call MiniMax API; parse response sections | Plain TypeScript class / module |
| SummaryService | Trigger daily summary generation at 12:30; write to SQLite; purge rows older than 2 weeks | expo-background-task + expo-sqlite |
| SQLite DB | Persistent storage for daily summaries | expo-sqlite v14+ (synchronous API) |

## Recommended Project Structure

```
src/
├── screens/              # One file per full screen
│   ├── HomeScreen.tsx
│   ├── DetailScreen.tsx
│   ├── AIScreen.tsx
│   └── SettingsModal.tsx
├── components/           # Reusable UI pieces
│   ├── StockCard.tsx
│   ├── PriceChart.tsx
│   ├── AISection.tsx
│   └── CyberpunkTheme.ts # NativeWind/StyleSheet tokens
├── stores/               # Zustand state stores
│   ├── watchlistStore.ts
│   ├── quoteStore.ts
│   ├── aiStore.ts
│   └── uiStore.ts
├── services/             # External I/O abstraction
│   ├── twseApi.ts        # TWSE OpenAPI client
│   ├── minimaxApi.ts     # MiniMax M2.5 client
│   └── summaryService.ts # Daily summary logic
├── db/                   # SQLite schema + queries
│   ├── schema.ts         # CREATE TABLE statements
│   └── summaryRepository.ts
├── tasks/                # Background task registration
│   └── dailySummaryTask.ts
├── types/                # Shared TypeScript interfaces
│   ├── stock.ts
│   └── analysis.ts
└── App.tsx               # Root: PagerView + navigation
```

### Structure Rationale

- **screens/:** One component per full swipeable page — clear 1:1 mapping to UI pages users see.
- **services/:** All network I/O isolated here. Screens never call `fetch()` directly; they go through services. Testable in isolation.
- **stores/:** Zustand stores are the single source of truth between screens. Services write to stores; screens read from stores.
- **db/:** SQLite concerns are isolated. SummaryService imports from db/, nothing else does.
- **tasks/:** Background task registration code is kept separate because it runs outside normal React lifecycle.

## Architectural Patterns

### Pattern 1: Repository / Service Layer

**What:** All external I/O (TWSE API, MiniMax API, SQLite) is accessed through typed service modules. Components never call `fetch()` or database methods directly.

**When to use:** Any time a screen needs data — it reads from a Zustand store; the store is populated by a service.

**Trade-offs:** Small overhead for a personal app, but makes testing and future API changes painless.

**Example:**
```typescript
// services/twseApi.ts
export interface StockQuote {
  code: string
  name: string
  price: number
  change: number
  volume: number
  timestamp: string
}

export async function fetchQuote(code: string): Promise<StockQuote> {
  const res = await fetch(
    `https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY?stockNo=${code}`
  )
  if (!res.ok) throw new Error(`TWSE API ${res.status}`)
  const data = await res.json()
  return normalizeQuote(data)
}
```

### Pattern 2: Polling via Zustand Store + setInterval

**What:** QuoteStore owns the polling lifecycle. On mount it starts a 30-second interval; on unmount it clears it. All screens subscribe to the same store — no duplicate polling.

**When to use:** TWSE has ~20s delay and no WebSocket. Polling every 30s during market hours (09:00-13:30 Mon-Fri) is appropriate.

**Trade-offs:** Simple and predictable. Polling is stopped outside market hours to save battery. No need for react-query for a personal single-screen app.

**Example:**
```typescript
// stores/quoteStore.ts
import { create } from 'zustand'
import { fetchQuote, StockQuote } from '../services/twseApi'

interface QuoteStore {
  quotes: Record<string, StockQuote>
  loading: boolean
  startPolling: (codes: string[]) => void
  stopPolling: () => void
}

export const useQuoteStore = create<QuoteStore>((set, get) => {
  let intervalId: ReturnType<typeof setInterval> | null = null
  return {
    quotes: {},
    loading: false,
    startPolling(codes) {
      if (intervalId) clearInterval(intervalId)
      const refresh = async () => {
        set({ loading: true })
        const results = await Promise.allSettled(codes.map(fetchQuote))
        const quotes: Record<string, StockQuote> = {}
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') quotes[codes[i]] = r.value
        })
        set({ quotes, loading: false })
      }
      refresh()
      intervalId = setInterval(refresh, 30_000)
    },
    stopPolling() {
      if (intervalId) clearInterval(intervalId)
      intervalId = null
    },
  }
})
```

### Pattern 3: AI Prompt Orchestration in Service Layer

**What:** AIService assembles a structured prompt from stock quote data, historical prices, and any available news headlines, then calls the MiniMax API. The service parses the response into typed sections (sentiment, technical, advice, risk) so the AIScreen renders directly without string manipulation.

**When to use:** AI analysis is triggered by user navigation to AIScreen or an explicit refresh tap.

**Trade-offs:** Non-streaming first pass is simpler. If response latency feels slow, add streaming via fetch ReadableStream and update AIStore section-by-section. MiniMax M2.5 has 204,800 token context — no truncation risk for stock data inputs.

## Data Flow

### Request Flow: Live Quote Update

```
QuoteStore.startPolling(watchlist)
    ↓ (every 30s)
twseApi.fetchQuote(code)
    ↓
TWSE OpenAPI (HTTP GET)
    ↓
normalizeQuote(rawData) → StockQuote
    ↓
QuoteStore.quotes updated
    ↓
HomeScreen re-renders (Zustand subscription)
```

### Request Flow: AI Analysis

```
User navigates to AIScreen (swipe left)
    ↓
AIScreen.useEffect → AIStore.analyze(stockCode)
    ↓
AIService.buildPrompt(quote, history, news)
    ↓
minimaxApi.chat(prompt) → MiniMax M2.5
    ↓
parseAnalysisSections(rawText) → AnalysisResult
    ↓
AIStore.result updated
    ↓
AIScreen sections render (sentiment / technical / advice / risk)
```

### Request Flow: Daily Summary (Background)

```
expo-background-task fires (approx 12:30 Mon-Fri)
    ↓
dailySummaryTask runs
    ↓
SummaryService.generate()
    ↓  fetches all watchlist stocks
twseApi.fetchQuote(each code)
    ↓
AIService.buildDailySummary(allQuotes)
    ↓
minimaxApi.chat(summaryPrompt)
    ↓
summaryRepository.insert(date, text)
    ↓
summaryRepository.purgeOlderThan(14 days)
```

### State Management

```
Zustand Stores (WatchlistStore, QuoteStore, AIStore, UIStore)
    ↓ (subscribe — reactive)
Screens read state directly via hooks
    ↑
Services write to stores via set()
    ↑
User actions (add stock, tap analyze, swipe) trigger service calls
```

### Key Data Flows

1. **Watchlist persistence:** WatchlistStore writes to AsyncStorage on every mutation. On app launch, the store rehydrates from AsyncStorage before first render.
2. **Quote freshness:** QuoteStore polls only when `isMarketHours()` returns true (Mon-Fri 09:00-13:30 Taiwan time). Outside hours, it shows last known price with a "市場已關閉" indicator.
3. **Daily summary trigger:** expo-background-task cannot schedule at an exact time; it uses a minimum interval. Use a 15-minute interval with an in-task check: `if (currentTime is between 12:25 and 12:35 and isWeekday) → generate`. This is a known limitation.
4. **SQLite purge:** Purge runs after every new summary insert. Rows older than 14 days are deleted. No separate cron needed.

## Scaling Considerations

This is a personal-use single-device app. Scaling is not a concern. The table below captures relevant device-level limits:

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 device, 10-50 stocks | Current architecture is sufficient — polling 50 stocks in parallel is fine |
| If watchlist grows to 100+ stocks | Batch TWSE API calls; add in-memory LRU cache in QuoteStore |
| If AI calls become expensive | Cache AIStore result per stock per day; skip re-fetch if analysis < 6 hours old |

### Scaling Priorities

1. **First bottleneck:** TWSE API rate limits — batch requests and add exponential backoff if 429s appear.
2. **Second bottleneck:** MiniMax API cost — cache analysis results in SQLite alongside daily summaries so the same stock is not analyzed twice in one session.

## Anti-Patterns

### Anti-Pattern 1: Fetching in Components

**What people do:** Call `fetch()` directly inside a `useEffect` in a screen component.

**Why it's wrong:** Duplicates requests across components, no shared cache, untestable, leaks on unmount.

**Do this instead:** All fetches go through service modules; screens read from Zustand stores.

### Anti-Pattern 2: Global Navigation State for Page Switching

**What people do:** Use React Navigation stack navigator for the home/AI swipe, treating each page as a full navigation route.

**Why it's wrong:** React Navigation adds gesture conflicts with PagerView and is overpowered for a 3-page horizontal swipe layout.

**Do this instead:** Use `react-native-pager-view` directly for the main swipe. React Navigation (if needed at all) is only for the Settings modal overlay.

### Anti-Pattern 3: Background Task for Exact-Time Scheduling

**What people do:** Rely on `expo-background-task` with `minimumInterval: 60` expecting it will fire at exactly 12:30.

**Why it's wrong:** Android WorkManager and iOS BGTaskScheduler are deferrable — the OS fires tasks when convenient for battery, not at exact times. On iOS this is especially unpredictable.

**Do this instead:** Schedule the task with a 15-minute interval. Inside the task, check `Date.now()` and only generate the summary if the current time falls in the 12:25-13:00 window on a weekday. Also provide a manual "Generate Summary" button so the user can trigger it immediately.

### Anti-Pattern 4: Storing Raw API Responses in SQLite

**What people do:** INSERT the entire JSON response from TWSE or MiniMax as a blob.

**Why it's wrong:** Makes queries unreadable, wastes space, and breaks when API shape changes.

**Do this instead:** Normalize to typed columns — `date TEXT, stock_code TEXT, summary_text TEXT, generated_at INTEGER`. The MiniMax analysis text is stored as a single column since it is consumed as prose.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| TWSE OpenAPI | HTTP GET polling, no auth, ~20s delay | Base URL: `https://openapi.twse.com.tw/v1/`. Endpoint `exchangeReport/STOCK_DAY` for daily data. No API key required. CORS is open. |
| MiniMax M2.5 | OpenAI-compatible REST, Bearer token | Base URL: `https://api.minimax.io/v1`. Model: `MiniMax-M2.5`. API key stored in app Settings and read from a Zustand UIStore / SecureStore. Never hardcoded. |
| expo-sqlite | Synchronous SQLite via JSI (v14+) | `openDatabaseSync()` for synchronous access inside background tasks. No async await needed in task context. |
| expo-background-task | Periodic background execution | Register task name at module level (outside components). Call `BackgroundTask.registerTaskAsync()` in app startup. |
| AsyncStorage | Key-value persistence for watchlist | Used by Zustand `persist` middleware. Survives app restart. |
| expo-secure-store | Encrypted storage for API key | MiniMax API key must be in SecureStore, not AsyncStorage (plaintext). |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Screen ↔ Store | Zustand hooks (`useWatchlistStore`, `useQuoteStore`, etc.) | Screens are pure consumers — they call store actions, never service functions directly |
| Store ↔ Service | Direct function call from within store action | Services are stateless modules; stores own the state |
| Service ↔ DB | summaryRepository functions called by SummaryService | No other layer touches the DB |
| Task ↔ Service | Background task imports SummaryService directly | Task is the entry point; it delegates all logic to SummaryService |
| Settings ↔ SecureStore | UIStore reads/writes API key via expo-secure-store | API key is injected into AIService at call time, not at import time |

## Build Order Implications

Dependencies between components determine the recommended implementation sequence:

1. **Data Layer first** — TWSE API client and SQLite schema. Everything else depends on data shape.
2. **Stores second** — Zustand stores define the contract between services and UI. Build WatchlistStore and QuoteStore.
3. **Core screens third** — HomeScreen with watchlist + live quotes. This is the app's primary value.
4. **Charts fourth** — DetailScreen with Victory Native XL. Depends on quote data and time-series endpoints being ready.
5. **AI layer fifth** — AIService + AIScreen. Depends on quote data being available as prompt input.
6. **Background task last** — SummaryService + expo-background-task. Depends on both TWSE client and AI service being stable.
7. **Polish last** — Cyberpunk theming, animations, glow effects. Applied after functional correctness is confirmed.

## Sources

- [React Native Architecture Patterns Complete Guide 2025](https://reactnativeexample.com/react-native-app-architecture-patterns-complete-guide-2025/)
- [Clean Architecture in React Native (Medium)](https://medium.com/@ganeshraj020794/clean-architecture-in-react-native-38025e2d7223)
- [expo-background-task official docs](https://docs.expo.dev/versions/latest/sdk/background-task/)
- [Goodbye background-fetch, hello expo-background-task](https://expo.dev/blog/goodbye-background-fetch-hello-expo-background-task)
- [Modern SQLite for React Native apps (Expo blog)](https://expo.dev/blog/modern-sqlite-for-react-native-apps)
- [Victory Native XL GitHub](https://github.com/FormidableLabs/victory-native-xl)
- [react-native-pager-view GitHub](https://github.com/callstack/react-native-pager-view)
- [Zustand React Native Implementation Guide 2025](https://reactnativeexample.com/zustand-react-native-implementation-guide-2025/)
- [Top React Native Chart Libraries 2025 (LogRocket)](https://blog.logrocket.com/top-react-native-chart-libraries/)
- [Build offline-first Android app (Android Developers)](https://developer.android.com/topic/architecture/data-layer/offline-first)

---
*Architecture research for: Taiwan Stock Investment Android App (personal use)*
*Researched: 2026-03-18*
