# Requirements: TW Stock Invest

**Defined:** 2026-03-18
**Core Value:** Real-time Taiwan stock tracking with AI-powered investment analysis in a cyberpunk mobile interface

## v1 Requirements

### Watchlist

- [ ] **WTCH-01**: User can search Taiwan stocks by code (e.g. 2330) or name (e.g. 台積電)
- [ ] **WTCH-02**: User can add a stock to the home page watchlist
- [ ] **WTCH-03**: User can remove a stock from the watchlist
- [ ] **WTCH-04**: Watchlist persists across app restarts (SQLite)
- [ ] **WTCH-05**: Each watchlist card shows stock name, code, current price, price change (delta + percent)
- [ ] **WTCH-06**: Each watchlist card shows a sparkline mini chart of the day's price trend

### Market Data

- [ ] **DATA-01**: App polls TWSE OpenAPI for real-time prices (~20s delay, 20-30s interval)
- [ ] **DATA-02**: Polling only occurs during Taiwan market hours (Mon-Fri 09:00-13:30)
- [ ] **DATA-03**: App shows market open/closed status indicator
- [ ] **DATA-04**: App handles non-trading days (holidays) gracefully with cached data
- [ ] **DATA-05**: TWSE request queue enforces rate limit (max 3 req/5s) to avoid IP ban

### Charts

- [ ] **CHRT-01**: User can tap a stock to see a detail view with candlestick chart
- [ ] **CHRT-02**: Chart supports 5 timeframes: 1 Day, 5 Days, 1 Month, 6 Months, 1 Year
- [ ] **CHRT-03**: Volume bars displayed below the price chart
- [ ] **CHRT-04**: Chart renders smoothly (Skia-based, no SVG performance cliff)

### AI Analysis

- [ ] **AI-01**: User can swipe left from home page to AI analysis page
- [ ] **AI-02**: AI analysis page shows analysis for all watchlist stocks
- [ ] **AI-03**: Each stock's AI section includes news sentiment analysis (bullish/bearish score)
- [ ] **AI-04**: Each stock's AI section includes technical analysis summary in plain language
- [ ] **AI-05**: Each stock's AI section includes Buy/Hold/Sell recommendation with reasoning
- [ ] **AI-06**: Each stock's AI section includes risk assessment score with explanation
- [ ] **AI-07**: AI prompts are grounded with real TWSE data (no hallucinated figures)
- [ ] **AI-08**: AI analysis uses MiniMax M2.5 via OpenAI-compatible API (api.minimax.io/v1)

### Price Alerts

- [ ] **ALRT-01**: User can enable price alert from the chart detail page via top-right icon
- [ ] **ALRT-02**: User can set a target price (above or below current) to trigger notification
- [ ] **ALRT-03**: When alert is first enabled, app prompts user to disable battery optimization (Android)
- [ ] **ALRT-04**: App monitors prices in background and sends push notification when target price is reached
- [ ] **ALRT-05**: Background monitoring is battery-efficient (uses Android WorkManager with smart intervals)
- [ ] **ALRT-06**: User can view and manage all active price alerts
- [ ] **ALRT-07**: Alert persists in SQLite and survives app restart

### Daily Summary

- [ ] **SUMM-01**: App auto-generates daily market summary at 12:30 (1 hour before close)
- [ ] **SUMM-02**: Summary covers all watchlist stocks and overall market index
- [ ] **SUMM-03**: Summaries stored in local SQLite database
- [ ] **SUMM-04**: Summaries older than 2 weeks are auto-purged

### Settings

- [ ] **SETT-01**: User can access settings via top-right icon on home page
- [ ] **SETT-02**: User can input/update MiniMax API key
- [ ] **SETT-03**: User can configure AI model name (default: MiniMax-M2.5)
- [ ] **SETT-04**: API keys stored securely (expo-secure-store, not plaintext)
- [ ] **SETT-05**: Settings page includes all required API configuration fields

### UI/UX

- [ ] **UI-01**: Dark cyberpunk theme — deep dark background, neon accent colors, glow effects
- [ ] **UI-02**: Swipeable horizontal page navigation (home <-> AI analysis) like phone home screen
- [ ] **UI-03**: Responsive layout for Android devices
- [ ] **UI-04**: App builds as Android APK

## v2 Requirements

### Notifications

- **NOTF-01**: Price alert notifications when stock crosses user-defined threshold
- **NOTF-02**: Market open/close notification

### Enhanced Charts

- **ECRT-01**: Technical indicator overlays (RSI, MACD, KD)
- **ECRT-02**: Interactive crosshair on chart with data tooltip

### Platform

- **PLAT-01**: Home screen widget showing top watchlist stocks
- **PLAT-02**: iOS support

## Out of Scope

| Feature | Reason |
|---------|--------|
| Portfolio tracking / P&L | Entire accounting system; use brokerage app instead |
| User accounts / auth | Personal tool, no login needed |
| Social / sharing | Single user tool |
| WebSocket streaming | TWSE doesn't offer it; polling is sufficient |
| Full TradingView indicator panel | AI explains indicators instead |
| News feed tab | News is AI input, not a standalone UI destination |
| Stock screener / filter | Separate product; focus on watchlist |
| iOS support | Android only for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| WTCH-01 | Phase 3 | Pending |
| WTCH-02 | Phase 3 | Pending |
| WTCH-03 | Phase 3 | Pending |
| WTCH-04 | Phase 3 | Pending |
| WTCH-05 | Phase 3 | Pending |
| WTCH-06 | Phase 10 | Pending |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Pending |
| DATA-04 | Phase 2 | Pending |
| DATA-05 | Phase 2 | Pending |
| CHRT-01 | Phase 4 | Pending |
| CHRT-02 | Phase 4 | Pending |
| CHRT-03 | Phase 4 | Pending |
| CHRT-04 | Phase 4 | Pending |
| AI-01 | Phase 6 | Pending |
| AI-02 | Phase 6 | Pending |
| AI-03 | Phase 6 | Pending |
| AI-04 | Phase 6 | Pending |
| AI-05 | Phase 6 | Pending |
| AI-06 | Phase 6 | Pending |
| AI-07 | Phase 6 | Pending |
| AI-08 | Phase 6 | Pending |
| ALRT-01 | Phase 9 | Pending |
| ALRT-02 | Phase 9 | Pending |
| ALRT-03 | Phase 9 | Pending |
| ALRT-04 | Phase 9 | Pending |
| ALRT-05 | Phase 9 | Pending |
| ALRT-06 | Phase 9 | Pending |
| ALRT-07 | Phase 9 | Pending |
| SUMM-01 | Phase 8 | Pending |
| SUMM-02 | Phase 8 | Pending |
| SUMM-03 | Phase 8 | Pending |
| SUMM-04 | Phase 8 | Pending |
| SETT-01 | Phase 5 | Pending |
| SETT-02 | Phase 5 | Pending |
| SETT-03 | Phase 5 | Pending |
| SETT-04 | Phase 5 | Pending |
| SETT-05 | Phase 5 | Pending |
| UI-01 | Phase 1 | Pending |
| UI-02 | Phase 6 | Pending |
| UI-03 | Phase 10 | Pending |
| UI-04 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after adding Phase 9 Price Alerts (ALRT-01..07)*
