# TW Stock Invest

## What This Is

A cyberpunk-styled Android investment app for Taiwan stocks. Users add stocks to a swipeable home screen showing real-time prices (via TWSE OpenAPI), tap into detailed charts (1D/5D/1M/6M/1Y), and swipe left to an AI analysis page powered by MiniMax M2.5 that provides news sentiment, technical analysis, investment recommendations, and risk assessment. The app stores daily market summaries locally, auto-clearing every two weeks.

## Core Value

Real-time Taiwan stock tracking with AI-powered investment analysis — all in one swipeable, cyberpunk-styled mobile interface.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Real-time Taiwan stock prices via TWSE OpenAPI
- [ ] User-selected stock watchlist on home page
- [ ] Stock detail view with 1D/5D/1M/6M/1Y price charts
- [ ] Swipeable page navigation (home <-> AI analysis)
- [ ] AI analysis page: news sentiment, technical analysis, investment advice, risk assessment
- [ ] MiniMax M2.5 integration via OpenAI-compatible API
- [ ] Settings page for API key configuration (top-right icon)
- [ ] Daily market summary generated 1 hour before market close (13:30 → summary at 12:30)
- [ ] Local storage for daily summaries (SQLite), auto-purge every 2 weeks
- [ ] Dark cyberpunk UI theme (dark background, neon accents, glow effects)
- [ ] Android APK output

### Out of Scope

- User accounts / authentication — personal tool, no login needed
- Push notifications — v1 keeps it simple
- Real-time WebSocket streaming — TWSE OpenAPI polling is sufficient
- iOS support — Android only for now
- Portfolio tracking / P&L calculation — focus on analysis, not accounting
- Social / sharing features — single user tool

## Context

- **Taiwan Stock Market Hours**: Mon-Fri 09:00-13:30 (TSE/OTC), no extended hours
- **TWSE OpenAPI**: Free, ~20 second delay, no API key required for basic endpoints
- **MiniMax M2.5 API**: OpenAI-compatible endpoint at `https://api.minimax.io/v1`, model name `MiniMax-M2.5`, Bearer token auth, 204,800 token context
- **News source**: To be researched — need Taiwan financial news API for AI analysis input
- **Target**: Android APK, personal use, prototype v0.0.1
- **GitHub**: Will upload to GitHub repo, user will create repo manually

## Constraints

- **AI Model**: MiniMax M2.5 via official platform API — already has key
- **Stock Data**: TWSE OpenAPI (free, delayed ~20s) — acceptable for personal use
- **Platform**: Android APK only
- **Framework**: To be determined during research (React Native recommended given TypeScript background)
- **Budget**: Minimal — free APIs where possible, MiniMax API usage cost only

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TWSE OpenAPI for stock data | Free, official, sufficient for personal use | — Pending |
| MiniMax M2.5 for AI analysis | User already has API key, OpenAI-compatible format | — Pending |
| Local SQLite for daily summaries | No server needed, auto-purge keeps storage clean | — Pending |
| Cyberpunk dark theme | User preference — Bloomberg Terminal meets neon aesthetic | — Pending |
| Framework TBD | Research phase will recommend (likely React Native for TS compatibility) | — Pending |

---
*Last updated: 2026-03-18 after initialization*
