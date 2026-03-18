# Feature Research

**Domain:** Taiwan stock investment mobile app (personal use, Android)
**Researched:** 2026-03-18
**Confidence:** MEDIUM — Taiwan app ecosystem surveyed via Play Store listings and competitor analysis; TWSE API data from official Swagger and MCP server docs; AI analysis features from MiniMax official docs and general AI finance tool research.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features any stock tracking app must have. Missing these = the app feels broken or useless.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Stock watchlist (自選股) | Every Taiwan stock app has this; it's the entry point to all other features | LOW | Core home screen; persist to SQLite; drag-to-reorder is common in competitors |
| Real-time / near-real-time quotes | Users open the app to see prices; stale data defeats the purpose | LOW | TWSE OpenAPI provides ~20s delay; polling every 20-30s is sufficient; market hours Mon-Fri 09:00-13:30 |
| Price change display (delta + percent) | Users need to see gain/loss at a glance, not just absolute price | LOW | Show both +/- absolute and +/- % vs previous close |
| Candlestick / line price chart | Visual price history is expected; tap on stock → chart is the universal pattern | MEDIUM | Multiple timeframes: 1D, 5D, 1M, 6M, 1Y; TWSE OpenAPI provides OHLCV data |
| Stock search / add to watchlist | Users need to find stocks by code (e.g. 2330) or name (台積電) | LOW | TWSE OpenAPI has stock listing endpoint; local search over cached list |
| Remove stock from watchlist | Basic CRUD; if you can add, you must be able to remove | LOW | Swipe-to-delete or long-press pattern |
| Market status indicator | Users need to know if market is open or closed | LOW | Derive from Taiwan market hours; show "Open" / "Closed" / "Pre-open" |
| Volume display | Volume is standard in every chart view; traders rely on it | LOW | Available from TWSE OHLCV; show as bar chart below price chart |

### Differentiators (Competitive Advantage)

Features that distinguish this app from the generic Taiwan stock trackers. These align with the core value: "real-time Taiwan stock tracking with AI-powered analysis."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI analysis page (swipe-left gesture) | No mainstream Taiwan stock app has integrated conversational AI analysis; this is the core differentiator | HIGH | MiniMax M2.5 via OpenAI-compatible API; needs prompt engineering for Taiwan market context; requires news + price data as context |
| News sentiment analysis via AI | AI interprets recent news headlines and scores bullish/bearish sentiment — more insight than raw headlines | MEDIUM | Requires a news source (MarketAux, FinMind, or RSS scraping); AI summarizes and scores sentiment |
| Technical analysis summary via AI | AI explains what the chart pattern means in plain language (e.g. "RSI is overbought at 75, approaching resistance") | MEDIUM | AI receives OHLCV data and key indicator values; no need to render all indicators visually — AI explains them |
| Investment recommendation (AI) | Buy/Hold/Sell recommendation with reasoning, adapted to Taiwan market context | HIGH | MiniMax M2.5 has finance domain training; must include strong disclaimers; main value prop of this app |
| Risk assessment (AI) | Quantified risk score with explanation — more useful than raw volatility numbers | MEDIUM | AI synthesizes price trend, volume, sector conditions, news tone into a risk narrative |
| Cyberpunk dark UI with neon accents | Aesthetic differentiation; Bloomberg Terminal meets neon Tokyo; memorable and unique for Taiwan app market | MEDIUM | Pure styling cost; no functional complexity; React Native StyleSheet with custom theme |
| Daily market summary (auto-generated) | One-tap access to AI-generated end-of-day briefing stored locally — offline reference for the day | MEDIUM | SQLite storage; triggered 1 hour before market close (12:30); covers watched stocks + market index |
| Swipeable navigation paradigm | Clean gesture-based UX between watchlist and AI analysis — no tab bars cluttering the screen | LOW | React Native Gesture Handler + Reanimated; simple horizontal swipe between two screens |
| Glanceable price data density | Cyberpunk-styled cards showing price, change, and sparkline at a glance — more informative than plain list rows | MEDIUM | Sparkline chart in watchlist card; custom card component with neon styling |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like natural additions but create maintenance burden, scope explosion, or conflict with the "personal use prototype" nature of this app.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Portfolio tracking / P&L calculation | "I want to know my total profit/loss" | Requires trade entry (buy price, shares, date), cost basis math, realized/unrealized P&L — entire accounting system; explicitly out of scope | Focus on analysis, not accounting; use brokerage app for P&L |
| Push notifications / price alerts | "Alert me when 2330 crosses 1000" | Requires background service, battery drain, Android notification channels, permission handling — significant native complexity for v1 | In-app status indicator; check manually during market hours |
| Real-time WebSocket streaming | "Update prices instantly" | TWSE does not offer WebSocket; any streaming would require a proxy server, breaking the "no server needed" constraint | 20-30s polling via TWSE OpenAPI is imperceptible for personal use |
| Social / sharing features | "Share my AI analysis with friends" | Requires user model, social graph, or external sharing integration — out of scope for single-user tool | Screenshot the screen manually |
| User accounts / authentication | "Sync my watchlist to cloud" | Requires backend server, auth flow, data sync — entirely counter to "local-only personal tool" design | Local SQLite is sufficient; no sync needed for personal use |
| iOS support | "Make it work on iPhone too" | Doubles QA effort, requires Apple dev certificate, different UI guidelines — no stated need | Android APK only; can revisit if there's demand |
| Full technical indicator panel (TradingView-style) | "Show me MACD, RSI, KD, Bollinger all at once" | Charting library configuration complexity, screen real estate constraints on mobile, maintenance overhead — the AI analysis page already interprets these | Let AI narrate indicator values; optionally show 1-2 key indicators on chart only |
| News feed tab | "Show me a full news feed" | Raw news lists have low engagement; AI-interpreted news sentiment is more valuable and already in scope | News is AI input, not a UI destination; show 2-3 headline sources in AI context only |
| Stock screener / filter | "Show me all stocks with PE < 10" | Requires comprehensive fundamental data, filter UI, performance tuning — a separate product | Not in scope for watchlist-focused personal tracker |

---

## Feature Dependencies

```
[Stock Watchlist]
    └──requires──> [TWSE OpenAPI integration]
                       └──requires──> [Stock data cache / SQLite]

[Price Chart (1D/5D/1M/6M/1Y)]
    └──requires──> [TWSE OpenAPI integration]
    └──requires──> [Chart library (react-native-kline-view or wagmi)]

[AI Analysis Page]
    └──requires──> [MiniMax M2.5 API integration]
    └──requires──> [Price/OHLCV data for context]
    └──requires──> [News data source]
    └──requires──> [API key stored in Settings]

[News Sentiment (AI)]
    └──requires──> [News API / data source]
                       └──options──> [MarketAux free tier, FinMind, RSS scrape]

[Daily Market Summary]
    └──requires──> [AI Analysis integration]
    └──requires──> [SQLite local storage]
    └──requires──> [Background scheduler (at 12:30 Taiwan time)]

[Settings Page]
    └──provides──> [MiniMax API key]
                       └──consumed-by──> [AI Analysis Page]
                       └──consumed-by──> [Daily Market Summary]

[Cyberpunk Theme]
    └──enhances──> [All UI components]
    └──requires──> [Global theme context / StyleSheet constants]

[Swipeable Navigation]
    └──wraps──> [Stock Watchlist (home page)]
    └──wraps──> [AI Analysis Page]
```

### Dependency Notes

- **AI Analysis requires Settings:** The MiniMax API key must be configurable before AI features work. Settings page must exist before AI analysis is usable.
- **AI Analysis requires News data:** Sentiment analysis is hollow without actual news headlines. The news source decision (MarketAux vs FinMind vs RSS) is the highest-risk dependency — needs resolution in Phase 1.
- **Daily Summary requires Scheduler:** Android background task scheduling (WorkManager via React Native background fetch) adds native complexity. This is the most complex background feature.
- **Chart library conflicts with custom theme:** Some candlestick chart libraries render via WebView or native canvas — their internal styling may not match the cyberpunk neon aesthetic. Choose a library that accepts custom colors early (react-native-kline-view appears most customizable).

---

## MVP Definition

### Launch With (v1)

Minimum to have a useful, daily-drivable personal tool.

- [x] Stock watchlist with add/remove — without this, nothing else is accessible
- [x] Real-time TWSE prices via polling (20-30s) — core data feed
- [x] Price change display (delta + percent + volume) — bare minimum market data
- [x] Price chart with 1D/5D/1M/6M/1Y timeframes — expected by any stock app user
- [x] Swipeable navigation (home left/right AI page) — the defining UX pattern
- [x] AI analysis page (sentiment + technical + recommendation + risk) — the core differentiator
- [x] Settings page with MiniMax API key input — required for AI features to work
- [x] Cyberpunk dark UI theme with neon accents — the aesthetic is part of the value prop
- [x] Local SQLite for watchlist persistence — watchlist must survive app restarts

### Add After Validation (v1.x)

Add once the core is stable and daily usage confirms the value.

- [ ] Daily market summary (auto-generated at 12:30) — adds long-term value but complex to schedule reliably; add after core AI page proves useful
- [ ] SQLite auto-purge (2-week retention) — add alongside daily summary; no value without summary data
- [ ] Sparkline miniature chart on watchlist cards — improves glanceability; add once list is stable
- [ ] Market open/closed status indicator — nice polish, easy to add after core works

### Future Consideration (v2+)

Defer until v1 is in daily use and specific pain points justify the effort.

- [ ] Push notifications / price alerts — substantial native complexity; only justified if manual checking proves annoying
- [ ] Additional technical indicator overlays on chart (MACD, RSI) — only if AI analysis proves insufficient for technical decisions
- [ ] Offline mode / data caching strategies — only if market-hours-only use proves limiting
- [ ] Home screen widget — only if glancing at the watchlist from outside the app becomes a real need

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Stock watchlist | HIGH | LOW | P1 |
| Real-time TWSE quotes | HIGH | LOW | P1 |
| Price change display | HIGH | LOW | P1 |
| Price chart (multi-timeframe) | HIGH | MEDIUM | P1 |
| Swipeable navigation | HIGH | LOW | P1 |
| AI analysis page | HIGH | HIGH | P1 |
| Settings (API key) | HIGH | LOW | P1 |
| Cyberpunk theme | MEDIUM | MEDIUM | P1 |
| SQLite watchlist persistence | HIGH | LOW | P1 |
| Daily market summary | MEDIUM | HIGH | P2 |
| Sparkline on watchlist cards | MEDIUM | MEDIUM | P2 |
| Market open/closed indicator | LOW | LOW | P2 |
| SQLite auto-purge | LOW | LOW | P2 |
| Push price alerts | MEDIUM | HIGH | P3 |
| Technical indicator overlays | LOW | HIGH | P3 |
| Home screen widget | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when core is stable
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Yahoo股市 | 三竹股市 | 台股助手 | This App |
|---------|-----------|----------|---------|----------|
| Taiwan stock watchlist | Yes, cloud-synced | Yes | Yes, minimal | Yes, local SQLite |
| Real-time quotes | Yes | Yes | Yes | Yes, ~20s TWSE poll |
| Multi-timeframe charts | Yes | Yes | No | Yes (1D/5D/1M/6M/1Y) |
| Technical indicators (visual) | Yes (many) | Yes (many) | No | Minimal; AI explains instead |
| AI analysis | No | Basic screener only | No | Yes — core differentiator |
| News feed | Yes (2000+/day) | Yes | No | AI-interpreted only (no raw feed) |
| Price alerts | Yes | Yes | Yes (trigger/volume) | v2+ consideration |
| Portfolio tracking | Yes | Yes | No | Explicitly out of scope |
| Dark/cyberpunk theme | No (standard) | No (standard) | No | Yes — unique aesthetic |
| Gesture-based navigation | Standard tabs | Standard tabs | Standard | Swipe-based (no tab bar) |
| Daily AI summary | No | No | No | Yes (v1.x) |

**Key gap this app fills:** No existing Taiwan stock app combines watchlist + price charts with genuine AI analysis (not just screener scores) in a gesture-first, aesthetically distinctive interface.

---

## Sources

- [Yahoo股市 on Google Play](https://play.google.com/store/apps/details?id=com.yahoo.mobile.client.android.TWStock&hl=en_US)
- [三竹股市 on Google Play](https://play.google.com/store/apps/details?id=com.mtk)
- [台股助手 (Stock Price Monitor) on Google Play](https://play.google.com/store/apps/details?id=org.ent365.stockpricemonitor&hl=en_US)
- [TWSE OpenAPI Swagger UI](https://openapi.twse.com.tw/)
- [TWSE MCP Server by twjackysu](https://github.com/twjackysu/TWSEMCPServer) — documents 35/143 endpoints implemented
- [FinMind API documentation](https://finmind.github.io/) — 50+ Taiwan financial datasets, 600 req/hr with token
- [MiniMax M2.5 official announcement](https://www.minimax.io/news/minimax-m25) — 204k context, finance domain training, $0.30/$1.20 per 1M tokens
- [MiniMax API models docs](https://platform.minimax.io/docs/guides/models-intro)
- [react-native-kline-view](https://github.com/hellohublot/react-native-kline-view) — 60fps candlestick chart for React Native
- [MarketAux free news API](https://www.marketaux.com) — 80+ global markets, free tier
- [Best stock watchlist apps 2026](https://www.gainify.io/blog/best-stock-watchlist-app)

---

*Feature research for: Taiwan Stock Investment Android App (personal use)*
*Researched: 2026-03-18*
