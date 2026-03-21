# Requirements: TW Stock Invest

**Defined:** 2026-03-18
**Core Value:** Real-time Taiwan stock tracking with AI-powered investment analysis in a cyberpunk mobile interface

## v1 Requirements

### Watchlist

- [x] **WTCH-01**: User can search Taiwan stocks by code (e.g. 2330) or name (e.g. 台積電)
- [x] **WTCH-02**: User can add a stock to the home page watchlist
- [x] **WTCH-03**: User can remove a stock from the watchlist
- [x] **WTCH-04**: Watchlist persists across app restarts (SQLite)
- [x] **WTCH-05**: Each watchlist card shows stock name, code, current price, price change (delta + percent)
- [ ] **WTCH-06**: Each watchlist card shows a sparkline mini chart of the day's price trend

### Market Data

- [x] **DATA-01**: App polls TWSE OpenAPI for real-time prices (~20s delay, 20-30s interval)
- [x] **DATA-02**: Polling only occurs during Taiwan market hours (Mon-Fri 09:00-13:30)
- [x] **DATA-03**: App shows market open/closed status indicator
- [x] **DATA-04**: App handles non-trading days (holidays) gracefully with cached data
- [x] **DATA-05**: TWSE request queue enforces rate limit (max 3 req/5s) to avoid IP ban

### Charts

- [x] **CHRT-01**: User can tap a stock to see a detail view with candlestick chart
- [x] **CHRT-02**: Chart supports 5 timeframes: 1 Day, 5 Days, 1 Month, 6 Months, 1 Year
- [x] **CHRT-03**: Volume bars displayed below the price chart
- [x] **CHRT-04**: Chart renders smoothly (Skia-based, no SVG performance cliff)

### AI Analysis

- [ ] **AI-01**: User can swipe left from home page to AI analysis page
- [x] **AI-02**: AI analysis page shows analysis for all watchlist stocks
- [x] **AI-03**: Each stock's AI section includes news sentiment analysis (bullish/bearish score)
- [x] **AI-04**: Each stock's AI section includes technical analysis summary in plain language
- [x] **AI-05**: Each stock's AI section includes Buy/Hold/Sell recommendation with reasoning
- [x] **AI-06**: Each stock's AI section includes risk assessment score with explanation
- [x] **AI-07**: AI prompts are grounded with real TWSE data (no hallucinated figures)
- [x] **AI-08**: AI analysis uses MiniMax M2.5 via OpenAI-compatible API (api.minimax.io/v1)

### Price Alerts

- [ ] **ALRT-01**: User can enable price alert from the chart detail page via top-right icon
- [x] **ALRT-02**: User can set a target price (above or below current) to trigger notification
- [ ] **ALRT-03**: When alert is first enabled, app prompts user to disable battery optimization (Android)
- [x] **ALRT-04**: App monitors prices in background and sends push notification when target price is reached
- [x] **ALRT-05**: Background monitoring is battery-efficient (uses Android WorkManager with smart intervals)
- [ ] **ALRT-06**: User can view and manage all active price alerts
- [x] **ALRT-07**: Alert persists in SQLite and survives app restart

### Daily Summary

- [x] **SUMM-01**: App auto-generates daily market summary at 12:30 (1 hour before close)
- [x] **SUMM-02**: Summary covers all watchlist stocks and overall market index
- [x] **SUMM-03**: Summaries stored in local SQLite database
- [x] **SUMM-04**: Summaries older than 2 weeks are auto-purged

### Settings

- [ ] **SETT-01**: User can access settings via top-right icon on home page
- [x] **SETT-02**: User can input/update MiniMax API key
- [x] **SETT-03**: User can configure AI model name (default: MiniMax-M2.5)
- [x] **SETT-04**: API keys stored securely (expo-secure-store, not plaintext)
- [ ] **SETT-05**: Settings page includes all required API configuration fields

### UI/UX

- [x] **UI-01**: Dark cyberpunk theme — deep dark background, neon accent colors, glow effects
- [ ] **UI-02**: Swipeable horizontal page navigation (home <-> AI analysis) like phone home screen
- [ ] **UI-03**: Responsive layout for Android devices
- [x] **UI-04**: App builds as Android APK

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
| WTCH-01 | Phase 3 | Complete |
| WTCH-02 | Phase 3 | Complete |
| WTCH-03 | Phase 3 | Complete |
| WTCH-04 | Phase 3 | Complete |
| WTCH-05 | Phase 3 | Complete |
| WTCH-06 | Phase 10 | Pending |
| DATA-01 | Phase 2 | Complete |
| DATA-02 | Phase 2 | Complete |
| DATA-03 | Phase 2 | Complete |
| DATA-04 | Phase 2 | Complete |
| DATA-05 | Phase 2 | Complete |
| CHRT-01 | Phase 4 | Complete |
| CHRT-02 | Phase 4 | Complete |
| CHRT-03 | Phase 4 | Complete |
| CHRT-04 | Phase 4 | Complete |
| AI-01 | Phase 6 | Pending |
| AI-02 | Phase 6 | Complete |
| AI-03 | Phase 6 | Complete |
| AI-04 | Phase 6 | Complete |
| AI-05 | Phase 6 | Complete |
| AI-06 | Phase 6 | Complete |
| AI-07 | Phase 6 | Complete |
| AI-08 | Phase 6 | Complete |
| ALRT-01 | Phase 9 | Pending |
| ALRT-02 | Phase 9 | Complete |
| ALRT-03 | Phase 9 | Pending |
| ALRT-04 | Phase 9 | Complete |
| ALRT-05 | Phase 9 | Complete |
| ALRT-06 | Phase 9 | Pending |
| ALRT-07 | Phase 9 | Complete |
| SUMM-01 | Phase 8 | Complete |
| SUMM-02 | Phase 8 | Complete |
| SUMM-03 | Phase 8 | Complete |
| SUMM-04 | Phase 8 | Complete |
| SETT-01 | Phase 5 | Pending |
| SETT-02 | Phase 5 | Complete |
| SETT-03 | Phase 5 | Complete |
| SETT-04 | Phase 5 | Complete |
| SETT-05 | Phase 5 | Pending |
| UI-01 | Phase 1 | Complete |
| UI-02 | Phase 6 | Pending |
| UI-03 | Phase 10 | Pending |
| UI-04 | Phase 7 | Complete |

**Coverage:**
- v1 requirements: 43 total
- Mapped to phases: 43
- Unmapped: 0

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after adding Phase 9 Price Alerts (ALRT-01..07)*
