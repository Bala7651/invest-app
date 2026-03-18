# Pitfalls Research

**Domain:** Taiwan stock investment Android app (React Native, TWSE OpenAPI, MiniMax AI, SQLite)
**Researched:** 2026-03-18
**Confidence:** MEDIUM — TWSE rate limit specifics confirmed via community library docs; MiniMax limits confirmed via official docs; other pitfalls from React Native ecosystem and financial app post-mortems.

---

## Critical Pitfalls

### Pitfall 1: TWSE Rate Limit IP Ban

**What goes wrong:**
The TWSE OpenAPI enforces a hard limit of 3 requests per 5 seconds. Exceeding this triggers an IP ban — not a 429 response, but a full IP block. During development, a tight polling loop or multiple concurrent fetches (e.g., loading a watchlist of 10 stocks in parallel) instantly exceeds this threshold.

**Why it happens:**
Developers assume "free API with no key" means "no rate limiting." In development, parallel stock fetches for multiple watchlist entries or rapid UI refreshes blow through the limit without any warning before the ban.

**How to avoid:**
- Never fire parallel TWSE requests. Use a queue with 2-second spacing between requests (3 per 5s = ~1.67s minimum gap; use 2s to be safe).
- For bulk watchlist loads, fetch stocks sequentially with `setTimeout` or a request queue.
- During development, test with a single stock first. Only enable multi-stock fetches after confirming sequential logic.
- Cache last-known prices in SQLite so the app works when the API is temporarily unavailable.

**Warning signs:**
- Fetch requests suddenly return no data or connection errors mid-session.
- Works fine on first run, fails after navigating between screens multiple times.
- Errors appear only when watchlist has more than 2-3 stocks.

**Phase to address:** Phase 1 (API integration foundation) — the request queue must be built before any multi-stock feature is tested.

---

### Pitfall 2: TWSE Returns Empty/Null Data on Non-Trading Days

**What goes wrong:**
The TWSE OpenAPI returns empty arrays or null fields on weekends, public holidays, and before 9:00 AM or after 13:30 Taiwan time (Asia/Taipei, UTC+8). The app crashes or shows broken charts if it tries to render or process this empty response without guards.

**Why it happens:**
Developers test during market hours and never see the empty response. The first time a user opens the app on a Saturday morning, the chart component receives `[]` and throws trying to access `data[0].close`.

**How to avoid:**
- Always null-check API responses before passing to chart components.
- Detect market closure: check if current time is outside Mon-Fri 09:00–13:30 (Asia/Taipei), or if today is a Taiwan public holiday.
- On non-trading days, show last known prices (from SQLite cache) with a clear "Market closed" indicator.
- Taiwan has ~15-20 non-standard holidays annually (Lunar New Year, Dragon Boat Festival, etc.) — these are not just weekends. Fetch the TWSE holiday calendar at app startup or hardcode the current year's list.

**Warning signs:**
- Charts render correctly Monday through Friday but crash on weekends.
- "Cannot read property 'close' of undefined" errors in production logs.
- Empty data received even when testing during expected trading hours (may be a national holiday).

**Phase to address:** Phase 1 (API integration) — defensive null-checks must be in place from the first fetch. Holiday calendar handling in Phase 2 (watchlist/home screen).

---

### Pitfall 3: Ex-Dividend / Ex-Rights Day Causes Apparent "Price Crash"

**What goes wrong:**
On ex-dividend or ex-rights dates, TWSE adjusts the reference price downward by the dividend amount. A stock at 100 TWD paying a 5 TWD dividend opens at ~95 TWD reference price. Without this context, the 1D chart shows a steep drop that looks like a crash. The AI analysis will also misread this as bearish momentum.

**Why it happens:**
The TWSE OpenAPI returns the adjusted prices without prominently flagging the ex-date. Developers building naive percentage-change calculations present this as a -5% drop. The AI receives this "crash" data and may generate alarming analysis.

**How to avoid:**
- Query the TWSE ex-rights/ex-dividend announcement endpoints (`/exchangeReport/TWTB4U` or equivalent) alongside price data.
- When an ex-date is detected, annotate the chart with an "Ex-Div" marker at that point.
- Pass ex-date context to the AI prompt: "Note: this stock went ex-dividend on [date], reference price was adjusted by -[amount] TWD."
- Do not calculate raw percentage change across ex-dates without adjustment.

**Warning signs:**
- Chart shows sudden large gap-down that doesn't match news.
- AI analysis flags "significant downward momentum" on a stock that is actually healthy.
- Users report the app showing incorrect loss percentages.

**Phase to address:** Phase 3 (charting detail view) — ex-date markers needed before AI analysis is connected, or AI will receive misleading data.

---

### Pitfall 4: AI Hallucinating Specific Price Data

**What goes wrong:**
MiniMax M2.5 (and LLMs generally) hallucinate financial facts with high confidence. The model may invent a stock's current price, P/E ratio, earnings date, or news event when these aren't explicitly provided in the prompt. The hallucination rate for financial tasks ranges from 7–30% depending on the model and task complexity.

**Why it happens:**
MiniMax M2.5 has a training cutoff. When the prompt asks for "current analysis" without providing actual current data, the model fills gaps with statistically plausible but fabricated information. A 204,800-token context window does not prevent hallucination — it only means more data can be injected to prevent it.

**How to avoid:**
- Never ask the AI to retrieve or recall specific prices, ratios, or figures — always inject them from TWSE API data in the prompt.
- Structure the prompt as: "Given the following data: [TWSE price data, technical indicators, recent news snippets] — analyze..."
- Do not ask "What is the current P/E of 2330?" — instead provide the P/E in the context.
- Add a visible UI disclaimer: "AI analysis is for reference only, not financial advice."
- For technical indicators (RSI, MACD), calculate them client-side from TWSE data and pass the values to the AI, rather than asking the AI to compute them.

**Warning signs:**
- AI output references prices or dates that differ from what the app shows.
- AI mentions company events not found in any fetched news source.
- AI output is confidently specific about figures you didn't provide.

**Phase to address:** Phase 4 (AI analysis page) — prompt engineering must enforce grounded data from day one.

---

### Pitfall 5: Charting Performance Degradation with Historical Data

**What goes wrong:**
Rendering a 1-year candlestick chart (approximately 240+ candles) using SVG-based chart libraries causes the UI thread to stall on Android. Frame rate drops below 30 FPS, pan/zoom interactions feel laggy, and the screen becomes unresponsive for 1-3 seconds on mid-range Android devices.

**Why it happens:**
SVG-based React Native chart libraries create one SVG element per data point. At 240+ elements with interaction listeners, the React Native JS-to-native bridge becomes the bottleneck. Libraries like `react-native-svg` weren't designed for high-frequency dynamic updates.

**How to avoid:**
- Use `react-native-wagmi-charts` (built for financial candlestick charts) or charts built on React Native Skia.
- Skia bypasses the bridge entirely, drawing directly to the GPU — essential for smooth pan/zoom on financial charts.
- For 1Y/6M views, consider downsampling to weekly candles rather than showing all 240+ daily candles.
- Memoize chart data transforms — never recalculate OHLC arrays on every render.
- Test on a mid-range Android device (not just a flagship), as performance differences are dramatic.

**Warning signs:**
- Chart interactions feel smooth in the Expo Go dev client (which has different JS engine behavior) but stutter on release APK.
- Frame drops visible with React Native's FPS monitor when panning the chart.
- `[Warning] Unable to run animations in frame` messages in the console.

**Phase to address:** Phase 3 (charting detail view) — library choice is architectural; changing it later requires full chart component rewrite.

---

### Pitfall 6: Hardcoded API Key in APK

**What goes wrong:**
The MiniMax API key is stored in JavaScript source code or a `.env` file that gets bundled into the APK. Anyone who downloads the APK and unpacks it (trivial with `apktool`) can extract the key and use it at the developer's expense.

**Why it happens:**
This is a personal-use app with no backend, so the temptation is to just put the key in `config.ts` or use `EXPO_PUBLIC_` variables that get embedded at build time. The project description explicitly says users configure the API key in Settings — but if a default key is hardcoded as a fallback, it will be exposed.

**How to avoid:**
- Store the MiniMax API key exclusively in the app's `Settings` page → persisted in SQLite/AsyncStorage (not bundled at build time).
- Never hardcode any API key in source code, even as a default or fallback.
- The app should show a setup screen on first launch if no API key is configured.
- Do not commit any `.env` files with real keys to the GitHub repo; add `.env` to `.gitignore` from day one.

**Warning signs:**
- Any string matching `eyJ...` (JWT-like) or `sk-...` appears in `grep -r` output of the project source.
- API key is set via `EXPO_PUBLIC_MINIMAX_KEY` environment variable (all `EXPO_PUBLIC_` vars are embedded in the bundle).

**Phase to address:** Phase 1 (project setup) — `.gitignore` and settings-only key storage must be established before writing any API code.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Polling every 5 seconds unconditionally | Simple to implement | IP ban from TWSE if multiple stocks; battery drain from excessive wake locks triggering Google Play quality warnings | Never — use minimum 10s interval with market-hours check |
| `react-native-sqlite-storage` (bridge-based) | Familiar npm package, widely documented | 5x slower than JSI alternatives for any batch write operations | Acceptable for MVP if writes are only daily summaries (low frequency) |
| Raw SVG chart library for candlesticks | Fast to prototype | Performance cliff at 200+ candles; requires rewrite to fix | Never for production charting |
| Asking AI to compute technical indicators | Simpler prompts | Hallucinated RSI/MACD values presented as real analysis | Never — always compute indicators client-side |
| `async/await` without request queuing | Easier to write | Concurrent TWSE requests trigger IP ban | Never — queue from the start |
| Storing last 2 weeks of summaries with no date-aware purge | Simple insert logic | Storage grows unbounded if auto-purge logic has a bug | Never — implement and test purge in the same phase |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| TWSE OpenAPI | Firing parallel requests for all watchlist stocks simultaneously | Serial queue with 2s minimum gap between requests |
| TWSE OpenAPI | Parsing response without checking if the data array is empty | Check `Array.isArray(data) && data.length > 0` before any access |
| TWSE OpenAPI | Using TWSE endpoints for OTC/TPEx stocks | TWSE and TPEx are separate exchanges; OTC stocks (4-digit codes starting with 3xxx or 6xxx often on TPEx) need the TPEx API at `tpex.org.tw/openapi/` |
| TWSE OpenAPI | Assuming the endpoint always returns JSON | Response includes gzip content-encoding; ensure HTTP client decompresses or use a library that handles this |
| MiniMax M2.5 API | Sending price data without explicit ex-dividend context | Always annotate ex-dates in the prompt when they fall within the analysis window |
| MiniMax M2.5 API | Sending prompts without grounding data and trusting the output | Always inject TWSE-sourced figures; never ask the model to recall specific prices or ratios |
| MiniMax M2.5 API | Not handling API errors gracefully in the UI | Show "Analysis unavailable" fallback; never crash when API key is invalid or rate limit exceeded |
| SQLite (React Native) | Using `react-native-sqlite-storage` with synchronous patterns | Use op-sqlite or expo-sqlite with WAL mode for better write performance |
| SQLite (React Native) | Inserting a new row per price tick instead of daily summaries | Store only daily summaries as specified — one row per stock per day |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| SVG candlestick chart with 240+ candles | Janky pan/zoom, >16ms frame times, app freeze | Use Skia-based chart library from the start | At ~100+ candles on mid-range Android |
| Polling all watchlist stocks every N seconds | TWSE IP ban; battery drain flagged by Google Play | Market-hours guard + serial request queue with 2s gap | Immediately with 3+ stocks at 5s interval |
| Re-rendering chart on every state change | Full chart redraw on any parent re-render | Memoize chart data and wrap chart in `React.memo` | When parent component has frequent state updates (e.g., price ticker) |
| Large SQLite queries without pagination | UI freezes when querying 2-weeks of summaries across many stocks | Limit result sets; use async reads; keep summary data minimal | At ~1000+ rows (unlikely for personal use, but design for it) |
| Loading all chart timeframes (1D/5D/1M/6M/1Y) eagerly | Slow initial load, unnecessary TWSE requests | Lazy-load each timeframe only when the tab is selected | At app startup with 5+ stocks in watchlist |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Hardcoding MiniMax API key in source code or `.env` bundled at build time | Key extracted from APK, charged for unauthorized usage | Store key in SQLite/AsyncStorage only, entered by user in Settings, never in code |
| Committing `.env` with real API keys to the GitHub repo | Permanent exposure in git history | Add `.env` and `*.keystore` to `.gitignore` on day one |
| Losing the Android keystore file | Cannot publish updates to any store or sideload signed APKs | Back up keystore and keystore password to a password manager immediately after creation |
| Displaying AI-generated investment recommendations without disclaimer | User makes real financial decisions based on hallucinated data | Add prominent UI label: "AI analysis is for reference only. Not financial advice." |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing a blank/loading screen on non-trading hours without explanation | User thinks the app is broken | Show last-known prices from SQLite cache with a "Market closed — prices as of [datetime]" badge |
| Showing raw percentage change across an ex-dividend date | Stock appears to have "crashed" 3-5%; user is confused or alarmed | Annotate ex-dates on chart; calculate adjusted returns for periods spanning the ex-date |
| AI analysis page loading for 5-10 seconds with no progress indicator | User taps back, retries, generates multiple concurrent API calls | Show a cyberpunk-themed loading animation immediately; disable the AI trigger button during fetch |
| Settings page only accessible from top-right icon with no first-launch prompt | User never configures API key; AI page silently fails | Detect missing API key on app launch and show a one-time setup prompt |
| Polling at fixed interval even when app is in background | Excessive battery drain; potential Android vitals quality warning | Pause all polling when the app moves to background; resume on foreground event |
| Showing TWSE data for an OTC stock entered by the user | Wrong or empty data, no error message | Validate stock code format and detect whether it belongs to TWSE (1xxx, 2xxx) or TPEx (3xxx, 6xxx, etc.) and call the correct API |

---

## "Looks Done But Isn't" Checklist

- [ ] **TWSE request queue:** Fetch for a watchlist of 5 stocks — verify requests are spaced at least 2 seconds apart, not concurrent.
- [ ] **Non-trading day handling:** Set device time to Saturday 10:00 AM Taiwan time — verify app shows cached prices with "Market closed" indicator, does not crash.
- [ ] **Holiday handling:** Test on a known Taiwan public holiday date — verify app does not attempt to fetch and crash on empty response.
- [ ] **Ex-dividend annotation:** Find a stock with a recent ex-date — verify the 1D/1M chart shows a marker and the AI prompt includes the ex-date context.
- [ ] **API key security:** Run `grep -r "minimax\|api_key\|bearer" src/` — confirm no keys are in source. Unpack release APK with `apktool` and search for the key string.
- [ ] **Chart performance:** Open 1Y candlestick view on a mid-range Android device (not emulator) — verify pan/zoom stays above 45 FPS.
- [ ] **Empty AI response handling:** Disable the MiniMax API key — verify the AI page shows a graceful error, not a crash or blank screen.
- [ ] **SQLite auto-purge:** Check that the 2-week purge runs on app startup and actually deletes rows older than 14 days.
- [ ] **Background polling pause:** Put app in background — verify no TWSE requests are fired. Return to foreground — verify polling resumes.
- [ ] **APK keystore backup:** Confirm the `upload-keystore.jks` file and its password are stored outside the repo (e.g., password manager).

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| TWSE IP ban from excessive requests | LOW (ban is temporary ~1-24h) | Wait for ban to lift; immediately implement request queue before re-testing |
| SVG chart library chosen in early phase | HIGH (full chart component rewrite) | Migrate to Skia-based library; expect 2-3 days of work if chart interactions were already built |
| API key leaked in git history | MEDIUM | Immediately rotate the MiniMax API key; use `git filter-repo` to scrub history; force-push if the repo is not yet public |
| Keystore lost before first APK is shared | LOW (personal app, no Play Store) | Generate a new keystore; sideload the new APK; previous APK cannot be "updated" but can be replaced |
| AI analysis hallucinating financial data | LOW (prompt fix) | Restructure prompt to explicitly inject all numerical data from TWSE; add explicit instruction "Do not invent figures not provided in this prompt" |
| App crashes on non-trading days | LOW (null-check fix) | Add `data?.length ? data : cachedData` guard at each TWSE response consumer; add market-hours check before fetch |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| TWSE rate limit IP ban | Phase 1: API foundation | Test 5-stock watchlist fetch — confirm serial execution with timing logs |
| Empty data on non-trading days | Phase 1: API foundation + Phase 2: Watchlist UI | Open app on a Saturday; verify no crash and cached data displays |
| Ex-dividend price confusion | Phase 3: Chart detail view | Find stock with recent ex-date; verify chart annotation and AI context injection |
| AI hallucinating specific prices | Phase 4: AI analysis page | Check AI output against TWSE data; verify no figures appear that weren't in the prompt |
| Chart performance degradation | Phase 3: Chart detail view | 1Y chart pan/zoom on real mid-range Android device |
| Hardcoded API key | Phase 1: Project setup | `grep` source; inspect bundled APK assets |
| Polling battery drain | Phase 2: Watchlist home screen | Background/foreground lifecycle test; Android vitals check |
| OTC vs TWSE stock routing | Phase 2: Watchlist home screen | Enter OTC stock code (e.g., 3008); verify correct TPEx endpoint is called |
| Missing keystore backup | Phase 5: APK build | Confirm backup location documented before distributing APK |
| No API key first-launch UX | Phase 4: AI analysis page | Fresh install with no SQLite data; verify setup prompt appears |

---

## Sources

- twstock Python library documentation (confirmed TWSE rate limit: 3 req/5s): https://github.com/mlouielu/twstock
- MiniMax API official rate limits: https://platform.minimax.io/docs/guides/rate-limits
- TWSE holiday schedule: https://www.twse.com.tw/en/trading/holiday.html
- TPEx OpenAPI (for OTC stocks): https://www.tpex.org.tw/openapi/
- React Native financial app production gaps: https://jt.org/the-gap-between-ai-generated-finance-app-prototypes-and-production-ready-react-native-apps/
- AI hallucinations in financial services (BayTech): https://www.baytechconsulting.com/blog/hidden-dangers-of-ai-hallucinations-in-financial-services
- LLM hallucinations in financial institutions (BizTech): https://biztechmagazine.com/article/2025/08/llm-hallucinations-what-are-implications-financial-institutions
- React Native Skia for high-frequency chart rendering: https://medium.com/@expertappdevs/skia-game-changer-for-react-native-in-2026-f23cb9b85841
- React Native chart library comparison: https://blog.logrocket.com/top-react-native-chart-libraries/
- Android APK signing common mistakes: https://reactnative.dev/docs/signed-apk-android
- Android battery / wake lock quality enforcement (2026): https://android-developers.googleblog.com/2026/03/battery-technical-quality-enforcement.html
- React Native SQLite performance (JSI vs bridge): https://ospfranco.com/post/2023/11/09/sqlite-for-react-native,-but-5x-faster-and-5x-less-memory/
- SVG vs Canvas vs WebGL chart performance: https://www.svggenie.com/blog/svg-vs-canvas-vs-webgl-performance-2025

---
*Pitfalls research for: Taiwan stock investment Android app*
*Researched: 2026-03-18*
