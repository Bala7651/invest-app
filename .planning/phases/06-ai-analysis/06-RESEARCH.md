# Phase 6: AI Analysis - Research

**Researched:** 2026-03-21
**Domain:** MiniMax API integration, React Native expandable card UI, Reanimated skeleton animation, Zustand TTL cache
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Analysis card layout**: Expandable cards — collapsed shows stock code + name + current price + change + overall score (e.g. 72/100) + Buy/Hold/Sell pill badge. Tap to expand reveals 4 stacked sections: News Sentiment, Technical Analysis, Recommendation, Risk Assessment. Each section has score + text. Real price in card header.
- **News data source**: No external news API — AI uses training knowledge for news/market context.
- **AI grounding**: Real TWSE data injected into prompt (price, change, prevClose, volume from quoteStore). Structured JSON response. One API call per stock (not batched).
- **Loading & refresh**: Auto-trigger on page view. 30-minute cache TTL. Skeleton cards per stock, progressive fill. Error card with retry per stock; others unaffected.
- **No-API-key experience**: Full-page centered prompt with button to Settings (router.push('/settings')). No dimmed/blurred teaser.
- **Disclaimer**: "Not financial advice" as sticky footer, always visible.

### Claude's Discretion
- Exact prompt engineering for MiniMax M2.5 (system prompt, temperature, token limits)
- Skeleton card shimmer animation implementation
- Score color coding thresholds
- Expand/collapse animation style
- Error retry logic (timeout, max retries)

### Deferred Ideas (OUT OF SCOPE)
- RSS/news API integration for real-time headlines
- Historical candle data in prompt (5-day OHLCV)
- Batch analysis mode (all stocks in one API call)
- Analysis history/persistence in SQLite (Phase 8)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | User can swipe left from home page to AI analysis page | PagerView already wired in index.tsx with page 0 (Watchlist) and page 1 (AnalysisPage placeholder) — replace placeholder component |
| AI-02 | AI analysis page shows analysis for all watchlist stocks | Read `useWatchlistStore(s => s.items)`, render one AnalysisCard per item |
| AI-03 | Each stock's AI section includes news sentiment analysis (bullish/bearish score) | JSON response field: `sentimentScore` (0–100) + `sentimentLabel` + `sentimentSummary` |
| AI-04 | Each stock's AI section includes technical analysis summary in plain language | JSON response field: `technicalSummary` (string) |
| AI-05 | Each stock's AI section includes Buy/Hold/Sell recommendation with reasoning | JSON response field: `recommendation` ("Buy"/"Hold"/"Sell") + `recommendationReasoning` |
| AI-06 | Each stock's AI section includes risk assessment score with explanation | JSON response field: `riskScore` (0–100) + `riskExplanation` |
| AI-07 | AI prompts grounded with real TWSE data, no hallucinated figures | Inject `price`, `change`, `changePct`, `prevClose`, `volume` from quoteStore into prompt; display same values in card header |
| AI-08 | AI analysis uses MiniMax M2.5 via OpenAI-compatible API (api.minimax.io/v1) | Endpoint: POST `https://api.minimax.io/v1/text/chatcompletion_v2`, model: `MiniMax-M2.5`, Bearer auth from settingsStore |
| UI-02 | Swipeable horizontal page navigation (home ↔ AI analysis) like phone home screen | PagerView already present with `initialPage={0}` — no new library needed |
</phase_requirements>

---

## Summary

Phase 6 adds AI-powered investment analysis accessible by swiping left from the watchlist. The infrastructure is largely in place: `react-native-pager-view` is already installed and configured with a placeholder `AnalysisPage` at page index 1. The MiniMax API key, model name, and base URL are already stored in `settingsStore` and loaded at app start. The quote data with real TWSE prices is already in `quoteStore`.

The three plan areas are: (1) `minimaxApi.ts` service — a typed `fetch` wrapper that sends a structured prompt with injected TWSE data and parses the JSON response; (2) the `AnalysisScreen` React component — expandable cards with skeleton loading, error handling per-stock, and a sticky disclaimer; (3) the `analysisStore` — Zustand store with per-symbol cache, 30-minute TTL, loading/error state, and auto-trigger on page view.

**Primary recommendation:** Model `analysisStore` directly on `chartStore` (cache/loading/errors keyed by symbol), add a `cachedAt` timestamp per symbol for 30-minute TTL, and call a standalone `minimaxApi.ts` service (not inside the store). Use Reanimated `withRepeat`/`withTiming` opacity pulse for skeleton — no external library needed.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native-pager-view | 8.0.0 | Horizontal swipe navigation | Already installed; used at page root in index.tsx |
| zustand | ^5.0.12 | analysisStore (cache, loading, errors, TTL) | Project-standard state management |
| react-native-reanimated | 4.2.1 | Skeleton pulse + expand/collapse animation | Already installed; used throughout charts |
| Native `fetch` | built-in | MiniMax API calls | Project pattern (see ApiKeyInput.handleTest, historicalService) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-router `useRouter` | ~55.0.6 | Navigate to Settings from no-API-key prompt | Already used in SwipeableCard |
| NativeWind v4 | ^4.2.3 | Styling all new components | All UI uses NativeWind tokens |
| AbortSignal.timeout | built-in | Per-request timeout on MiniMax fetch | Same pattern as historicalService.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native Reanimated pulse | react-native-reanimated-skeleton library | Library adds bundle size; Reanimated already installed; pulse is 10 lines |
| Prompt-only JSON parsing | response_format json_schema | `json_schema` is MiniMax-Text-01 only, not documented for M2.5 — prompt engineering is safer |
| One call per stock | Batched analysis | Deferred by user; per-stock error isolation is the priority |

**Installation:** No new packages needed. All dependencies are already present.

---

## Architecture Patterns

### Recommended Project Structure
```
src/features/analysis/
├── store/
│   └── analysisStore.ts        # Zustand store: cache, loading, errors, cachedAt, fetchAnalysis
├── services/
│   └── minimaxApi.ts           # fetch wrapper: buildPrompt(), callMiniMax(), parseResponse()
├── components/
│   ├── AnalysisScreen.tsx      # Page root: watchlist map, sticky footer, no-key gate
│   ├── AnalysisCard.tsx        # Expandable card per stock
│   ├── AnalysisSkeleton.tsx    # Shimmer placeholder during load
│   └── NoApiKeyPrompt.tsx      # Centered CTA when apiKey === ''
└── types.ts                    # AnalysisResult, AnalysisSection types
```

### Pattern 1: analysisStore — TTL-gated fetch (mirrors chartStore)
**What:** Zustand store with `cache: Record<string, AnalysisResult>`, `cachedAt: Record<string, number>`, `loading: Record<string, boolean>`, `errors: Record<string, string | null>`, and `fetchAnalysis(symbol, quoteData, apiCredentials)`.
**When to use:** Called from AnalysisScreen `useEffect` when the PagerView page becomes active.

```typescript
// Source: modelled on src/features/charts/store/chartStore.ts
const TTL_MS = 30 * 60 * 1000; // 30 minutes

async fetchAnalysis(symbol, quote, credentials) {
  const now = Date.now();
  const cachedAt = get().cachedAt[symbol] ?? 0;
  if (get().cache[symbol] && now - cachedAt < TTL_MS) return; // cache hit

  set(s => ({ loading: { ...s.loading, [symbol]: true }, errors: { ...s.errors, [symbol]: null } }));
  try {
    const result = await callMiniMax(symbol, quote, credentials);
    set(s => ({
      cache: { ...s.cache, [symbol]: result },
      cachedAt: { ...s.cachedAt, [symbol]: now },
      loading: { ...s.loading, [symbol]: false },
    }));
  } catch (e) {
    set(s => ({
      loading: { ...s.loading, [symbol]: false },
      errors: { ...s.errors, [symbol]: String(e) },
    }));
  }
},
```

### Pattern 2: minimaxApi.ts — Typed fetch with prompt injection
**What:** Pure async functions, no React hooks. Builds the system prompt with injected TWSE data, calls the MiniMax endpoint, parses JSON from `choices[0].message.content`.

```typescript
// Source: ApiKeyInput.handleTest pattern + official MiniMax API docs (platform.minimax.io)
const ENDPOINT_PATH = '/text/chatcompletion_v2'; // NOT /chat/completions

export async function callMiniMax(
  symbol: string,
  quote: Quote,
  credentials: { apiKey: string; modelName: string; baseUrl: string }
): Promise<AnalysisResult> {
  const prompt = buildPrompt(symbol, quote);
  const res = await fetch(`${credentials.baseUrl.replace('/v1', '')}/v1/text/chatcompletion_v2`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${credentials.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: credentials.modelName,          // 'MiniMax-M2.5'
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,                     // low for consistent structured output
      max_completion_tokens: 600,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`MiniMax HTTP ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  return parseAnalysisResponse(content);
}
```

### Pattern 3: Structured JSON via prompt engineering (not response_format)
**What:** `response_format` with `json_schema` is documented only for `MiniMax-Text-01`, not M2.5. Instead, instruct the model via system prompt to return a JSON code block and parse it.

```typescript
// Prompt approach — HIGH confidence (avoids unsupported API parameter)
const SYSTEM_PROMPT = `You are a Taiwan stock market analyst.
ALWAYS respond with a single JSON object in a markdown code block. No other text.
Required fields:
- sentimentScore: number 0-100 (100 = extremely bullish)
- sentimentLabel: "Bullish" | "Neutral" | "Bearish"
- sentimentSummary: string (1-2 sentences, market/news context)
- technicalSummary: string (2-3 sentences, plain language)
- recommendation: "Buy" | "Hold" | "Sell"
- recommendationReasoning: string (2-3 sentences)
- riskScore: number 0-100 (100 = highest risk)
- riskExplanation: string (1-2 sentences)
- overallScore: number 0-100`;

function buildPrompt(symbol: string, quote: Quote): string {
  return `Analyze Taiwan stock ${symbol} (${quote.name}).
REAL MARKET DATA (use exactly these figures, do not fabricate):
- Current price: ${quote.price ?? 'unavailable'} TWD
- Price change: ${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)} (${quote.changePct.toFixed(2)}%)
- Previous close: ${quote.prevClose} TWD
- Volume: ${quote.volume ?? 'unavailable'}
Provide your analysis as a JSON object.`;
}

function parseAnalysisResponse(content: string): AnalysisResult {
  // Extract JSON from markdown code block or bare JSON
  const match = content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? content.match(/(\{[\s\S]*\})/);
  if (!match) throw new Error('No JSON found in response');
  return JSON.parse(match[1]) as AnalysisResult;
}
```

### Pattern 4: Skeleton shimmer using Reanimated (no library)
**What:** Opacity pulse using `withRepeat`/`withTiming`. Single `useSharedValue` per skeleton component. Works on UI thread.

```typescript
// Source: Reanimated docs (docs.swmansion.com/react-native-reanimated)
import { useSharedValue, withRepeat, withTiming, useAnimatedStyle, Easing } from 'react-native-reanimated';

function SkeletonBlock({ className }: { className?: string }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,   // infinite
      true  // reverse
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={animStyle} className={`bg-surface rounded ${className}`} />;
}
```

### Pattern 5: Expand/collapse animation
**What:** Animate card height using `useSharedValue` + `withTiming`. Use `overflow: 'hidden'` on the animated container.

```typescript
// Standard Reanimated expand pattern
const height = useSharedValue(0);
const animStyle = useAnimatedStyle(() => ({ height: height.value, overflow: 'hidden' }));

function toggleExpand() {
  height.value = withTiming(expanded ? 0 : TARGET_HEIGHT, { duration: 250 });
  setExpanded(e => !e);
}
```

### Pattern 6: Auto-trigger on PagerView page active
**What:** PagerView fires `onPageSelected`. AnalysisScreen receives a prop or context indicating it's active, then fires `fetchAnalysis` for all watchlist items.

```typescript
// In index.tsx — PagerView onPageSelected
function HomeScreen() {
  const [activePage, setActivePage] = useState(0);
  return (
    <HamburgerDrawer>
      <PagerView style={{ flex: 1 }} initialPage={0} onPageSelected={e => setActivePage(e.nativeEvent.position)}>
        <View key="0"><WatchlistPage /></View>
        <View key="1"><AnalysisPage isActive={activePage === 1} /></View>
      </PagerView>
    </HamburgerDrawer>
  );
}
```

### Recommended TypeScript types
```typescript
// src/features/analysis/types.ts
export interface AnalysisResult {
  sentimentScore: number;        // 0-100
  sentimentLabel: 'Bullish' | 'Neutral' | 'Bearish';
  sentimentSummary: string;
  technicalSummary: string;
  recommendation: 'Buy' | 'Hold' | 'Sell';
  recommendationReasoning: string;
  riskScore: number;             // 0-100
  riskExplanation: string;
  overallScore: number;          // 0-100
}
```

### Anti-Patterns to Avoid
- **Using `/v1/chat/completions` endpoint:** The MiniMax native endpoint is `/v1/text/chatcompletion_v2`. The OpenAI-compatible path may work but official docs use the native path — use that.
- **Using `response_format: json_schema`:** Only documented for MiniMax-Text-01, not M2.5. Use system-prompt JSON instruction instead.
- **Calling `fetchAnalysis` inside each AnalysisCard's render:** Triggers N calls simultaneously on mount. Call from AnalysisScreen after page activation; pass results as props.
- **Sharing RequestQueue with stockService or historicalService:** Both use separate queues. MiniMax calls are independent — no queue needed (one call per stock, no rate limit concern from the same endpoint).
- **Storing `cachedAt` inside the result object:** Keep it separate in the store (mirrors chartStore pattern). Makes TTL check clean: `Date.now() - cachedAt[symbol] < TTL_MS`.
- **Animating card height to a hardcoded pixel value:** Use `onLayout` to measure expanded content height before animating, or use `maxHeight` animation instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-request timeout | Custom AbortController timeout wrapper | `AbortSignal.timeout(30_000)` | Already used in historicalService; built-in |
| Skeleton animation | Custom Animated.Value loop | Reanimated `withRepeat`/`withTiming` | UI-thread, no layout jank; already installed |
| Settings navigation | Custom settings panel | `useRouter().push('/settings')` | Expo Router already handles this |
| API key storage | In-memory or AsyncStorage | `settingsStore.apiKey` from SecureStore | Already loaded at app start in `_layout.tsx` |

**Key insight:** Every infrastructure piece is already in place. Phase 6 is primarily UI + a typed fetch service.

---

## Common Pitfalls

### Pitfall 1: Wrong MiniMax endpoint
**What goes wrong:** Calling `/v1/chat/completions` instead of `/v1/text/chatcompletion_v2` may work via the OpenAI-compat layer but is not the officially documented native endpoint for MiniMax-M2.5.
**Why it happens:** ApiKeyInput.handleTest uses `/chat/completions` (OpenAI-compat, works for basic test). The official docs specify `/text/chatcompletion_v2` for production.
**How to avoid:** Use `/text/chatcompletion_v2` in `minimaxApi.ts`. Keep `/chat/completions` only for the API key connectivity test.
**Warning signs:** Getting unexpected `ignore_parameter` notices or missing MiniMax-specific features.

### Pitfall 2: JSON parse failure crashing the stock card
**What goes wrong:** Model returns JSON with extra prose, or inside a markdown code block, or malformed JSON on error — `JSON.parse` throws, unhandled exception propagates.
**Why it happens:** LLMs occasionally deviate from format instructions, especially at low `max_completion_tokens`.
**How to avoid:** Wrap `parseAnalysisResponse` in try/catch; throw a typed error that `fetchAnalysis` catches and stores in `errors[symbol]`. Never let parse failure escape the service boundary.
**Warning signs:** One stock card failing breaks all subsequent renders.

### Pitfall 3: TTL check using wrong timestamp comparison
**What goes wrong:** Cache never expires, or always re-fetches, because `cachedAt` is stored as `undefined` vs `0`.
**Why it happens:** `Record<string, number>` initialized as `{}` — `get().cachedAt[symbol]` is `undefined`, not `0`. `undefined < TTL_MS` evaluates to `false` correctly, but `Date.now() - undefined` is `NaN`.
**How to avoid:** `const cachedAt = get().cachedAt[symbol] ?? 0;` — explicit default. Mirror exactly how chartStore checks for cache existence.

### Pitfall 4: Skeleton blocks not cancelling animation on unmount
**What goes wrong:** `withRepeat` continues on the UI thread even after the component unmounts (page swipe away), causing memory leak warnings.
**Why it happens:** Reanimated shared values tied to unmounted components can log warnings in dev builds.
**How to avoid:** Use `cancelAnimation` in the skeleton's `useEffect` cleanup:
```typescript
useEffect(() => {
  opacity.value = withRepeat(...);
  return () => cancelAnimation(opacity);
}, []);
```

### Pitfall 5: `onPageSelected` infinite loop with programmatic navigation
**What goes wrong:** Setting `activePage` state inside `onPageSelected` triggers re-render → PagerView re-evaluates → additional events.
**Why it happens:** Known `react-native-pager-view` issue with `setPage` and state sync.
**How to avoid:** Only use `onPageSelected` to read `e.nativeEvent.position` and set local state. Do not call `setPage` reactively from the same handler.

### Pitfall 6: baseUrl already includes `/v1`
**What goes wrong:** Constructing `${baseUrl}/text/chatcompletion_v2` results in `https://api.minimax.io/v1/text/chatcompletion_v2` — which is correct. But if user customizes baseUrl to `https://api.minimax.io/v1/` (trailing slash), the URL becomes double-slashed.
**Why it happens:** settingsStore default is `'https://api.minimax.io/v1'` (no trailing slash). Third-party users may add one.
**How to avoid:** Normalize: `baseUrl.replace(/\/$/, '') + '/text/chatcompletion_v2'`.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### MiniMax API call (complete minimal example)
```typescript
// Source: platform.minimax.io/docs/api-reference/text-post + ApiKeyInput.handleTest pattern
const res = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'MiniMax-M2.5',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_completion_tokens: 600,
  }),
  signal: AbortSignal.timeout(30_000),
});
if (!res.ok) throw new Error(`MiniMax HTTP ${res.status}`);
const data = await res.json();
const text: string = data.choices[0].message.content;
```

### Zustand analysisStore — TTL cache check
```typescript
// Source: modelled on src/features/charts/store/chartStore.ts
const TTL_MS = 30 * 60 * 1000;
async fetchAnalysis(symbol, quote, creds) {
  const cachedAt = get().cachedAt[symbol] ?? 0;
  if (get().cache[symbol] && Date.now() - cachedAt < TTL_MS) return;
  // ... fetch logic
}
```

### AnalysisScreen: trigger all fetches on page active
```typescript
// Pattern: useEffect with isActive prop
useEffect(() => {
  if (!isActive) return;
  const { apiKey, modelName, baseUrl } = useSettingsStore.getState();
  if (!apiKey) return;
  const items = useWatchlistStore.getState().items;
  const quotes = useQuoteStore.getState().quotes;
  const { fetchAnalysis } = useAnalysisStore.getState();
  for (const item of items) {
    fetchAnalysis(item.symbol, quotes[item.symbol], { apiKey, modelName, baseUrl });
  }
}, [isActive]);
```

### Score color coding thresholds (Claude's discretion)
```typescript
// Sentiment / overall score coloring
function scoreColor(score: number): string {
  if (score >= 65) return '#00E676'; // text-stock-up (green)
  if (score >= 40) return '#FFB300'; // amber
  return '#FF1744';                   // text-stock-down (red)
}

// Risk score: inverted (high risk = red)
function riskColor(score: number): string {
  if (score >= 65) return '#FF1744';
  if (score >= 40) return '#FFB300';
  return '#00E676';
}
```

### Recommendation badge color
```typescript
const BADGE_COLOR: Record<'Buy' | 'Hold' | 'Sell', string> = {
  Buy: '#00E676',   // stock-up green
  Hold: '#FFB300',  // amber
  Sell: '#FF1744',  // stock-down red
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MiniMax GroupId required in URL | GroupId no longer required for M2.5/M2.7 endpoints | 2025 | Simpler URL — just `Bearer` auth |
| `response_format: json_object` | Prompt-based JSON with code block | M2.5 current | `json_schema` is Text-01 only; prompt engineering is the safe path |
| SVG-based skeleton | Reanimated opacity pulse (UI thread) | 2024+ | No SVG overhead; 60fps on Android |
| chartStore without TTL | analysisStore adds `cachedAt` per key | Phase 6 | Enables 30-min cache without external library |

**Deprecated/outdated:**
- GroupId URL parameter (`?GroupId=xxx`): Required for older MiniMax APIs, not needed for M2.5 via the `/text/chatcompletion_v2` endpoint with Bearer auth.
- `max_tokens` parameter name: MiniMax uses `max_completion_tokens` (not `max_tokens` as in OpenAI).

---

## Open Questions

1. **`/v1/chat/completions` vs `/v1/text/chatcompletion_v2`**
   - What we know: Both endpoints exist. ApiKeyInput uses `/chat/completions` for the test ping; official MiniMax docs document `/text/chatcompletion_v2` as the primary endpoint for M2.5.
   - What's unclear: Whether `/chat/completions` returns `max_completion_tokens` in the same way.
   - Recommendation: Use `/text/chatcompletion_v2` in minimaxApi.ts. If the base URL the user configured points to a third-party proxy that only supports `/chat/completions`, handle via the baseUrl field. Keep ApiKeyInput's test endpoint as-is (it works for connectivity).

2. **Expand animation height measurement**
   - What we know: Animating `height` from 0 to a fixed value is simple but fragile if content varies.
   - What's unclear: How much text variance per stock.
   - Recommendation: Use `maxHeight` animation (0 → 500) with `overflow: hidden` as a pragmatic alternative to onLayout measurement. Simpler to implement, acceptable for this use case.

3. **API rate limits for MiniMax M2.5**
   - What we know: No explicit rate limit documented for M2.5 in the free/paid tiers.
   - What's unclear: Whether sequential per-stock calls (no queue, just sequential `await`) could trigger throttling for large watchlists.
   - Recommendation: Sequential calls (not parallel) from the store's fetchAnalysis — each awaited in the useEffect loop. If throttling occurs, a simple 500ms delay between calls is sufficient.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7 + jest-expo |
| Config file | package.json `"jest": { "preset": "jest-expo" }` |
| Quick run command | `npx jest src/__tests__/analysisStore.test.ts --no-coverage` |
| Full suite command | `npx jest --no-coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-07 | buildPrompt injects exact price/change/prevClose/volume values | unit | `npx jest src/__tests__/minimaxApi.test.ts -t "buildPrompt"` | Wave 0 |
| AI-07 | parseAnalysisResponse handles JSON in code block | unit | `npx jest src/__tests__/minimaxApi.test.ts -t "parseAnalysisResponse"` | Wave 0 |
| AI-07 | parseAnalysisResponse throws on missing JSON | unit | `npx jest src/__tests__/minimaxApi.test.ts -t "throws"` | Wave 0 |
| AI-08 | callMiniMax sends correct endpoint + Bearer header | unit | `npx jest src/__tests__/minimaxApi.test.ts -t "callMiniMax"` | Wave 0 |
| AI-08 | callMiniMax throws on non-ok HTTP response | unit | `npx jest src/__tests__/minimaxApi.test.ts -t "HTTP error"` | Wave 0 |
| AI-02+AI-03-06 | analysisStore.fetchAnalysis stores result in cache | unit | `npx jest src/__tests__/analysisStore.test.ts -t "stores result"` | Wave 0 |
| AI-02 | analysisStore.fetchAnalysis respects 30-min TTL | unit | `npx jest src/__tests__/analysisStore.test.ts -t "TTL"` | Wave 0 |
| AI-02 | analysisStore.fetchAnalysis skips when apiKey empty | unit | `npx jest src/__tests__/analysisStore.test.ts -t "empty apiKey"` | Wave 0 |
| AI-02 | analysisStore error captured per-symbol on failure | unit | `npx jest src/__tests__/analysisStore.test.ts -t "error"` | Wave 0 |
| UI-02 | PagerView page 1 renders AnalysisScreen | manual | Navigate in app; swipe left | N/A |
| AI-01 | Swipe left shows analysis, swipe right returns home | manual | Device/emulator gesture | N/A |

### Sampling Rate
- **Per task commit:** `npx jest src/__tests__/minimaxApi.test.ts src/__tests__/analysisStore.test.ts --no-coverage`
- **Per wave merge:** `npx jest --no-coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/minimaxApi.test.ts` — covers AI-07, AI-08 (buildPrompt, callMiniMax, parseAnalysisResponse)
- [ ] `src/__tests__/analysisStore.test.ts` — covers AI-02 through AI-06 (fetchAnalysis, TTL, error state)

*(No new framework install needed — jest-expo is already configured)*

---

## Sources

### Primary (HIGH confidence)
- [platform.minimax.io/docs/api-reference/text-post](https://platform.minimax.io/docs/api-reference/text-post) — Official endpoint, parameters, response structure, model name list, `max_completion_tokens` param name
- [platform.minimax.io/docs/api-reference/text-openai-api.md](https://platform.minimax.io/docs/api-reference/text-openai-api.md) — Model name `MiniMax-M2.5` confirmed, OpenAI compat notes
- Existing codebase: `chartStore.ts` — cache/loading/errors pattern replicated for analysisStore
- Existing codebase: `ApiKeyInput.tsx` — proven fetch pattern with Bearer auth, `AbortSignal.timeout`
- Existing codebase: `index.tsx` — PagerView already at page root with AnalysisPage placeholder
- Existing codebase: `settingsStore.ts` — apiKey, modelName, baseUrl already stored and loaded

### Secondary (MEDIUM confidence)
- [docs.swmansion.com/react-native-reanimated/docs/animations/withRepeat](https://docs.swmansion.com/react-native-reanimated/docs/animations/withRepeat/) — `withRepeat`/`withTiming` pulse pattern
- [docs.aimlapi.com/api-references/text-models-llm/minimax/m2-5](https://docs.aimlapi.com/api-references/text-models-llm/minimax/m2-5) — confirms `response_format` json_schema available via third-party; validates OpenAI-compat structure

### Tertiary (LOW confidence)
- WebSearch results on MiniMax M2.5 JSON structured output — confirms community uses prompt engineering for JSON extraction, not `response_format` with M2.5

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed; codebase patterns confirmed by reading source
- MiniMax API endpoint/params: HIGH — read from official MiniMax platform docs
- Architecture: HIGH — directly modelled on established chartStore/settingsStore/historicalService patterns in this codebase
- Prompt engineering specifics: MEDIUM — `temperature: 0.3`, `max_completion_tokens: 600` are Claude's discretion; reasonable defaults, not officially prescribed
- Pitfalls: HIGH — endpoint confusion confirmed by official docs; JSON parse failures are universal LLM concern

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (MiniMax API is stable; Reanimated patterns are stable)
