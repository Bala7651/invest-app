---
phase: 4
slug: charts
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7 + jest-expo preset |
| **Config file** | `invest-app/package.json` `"jest"` section |
| **Quick run command** | `cd invest-app && npm test -- --testPathPattern="chartStore\|historicalService"` |
| **Full suite command** | `cd invest-app && npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd invest-app && npm test -- --testPathPattern="chartStore|historicalService"`
- **After every plan wave:** Run `cd invest-app && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | CHRT-02 | unit | `npm test -- --testPathPattern=historicalService` | Wave 0 | ⬜ pending |
| 04-01-02 | 01 | 1 | CHRT-02 | unit | `npm test -- --testPathPattern=chartStore` | Wave 0 | ⬜ pending |
| 04-02-01 | 02 | 2 | CHRT-01 | unit | `npm test -- --testPathPattern=detail` | Wave 0 | ⬜ pending |
| 04-02-02 | 02 | 2 | CHRT-04 | unit | `npm test -- --testPathPattern=CandleChart` | Wave 0 | ⬜ pending |
| 04-02-03 | 02 | 2 | CHRT-03 | unit | `npm test -- --testPathPattern=VolumeBar` | Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/historicalService.test.ts` — stubs for CHRT-02 endpoint dispatch + ROC date parsing
- [ ] `src/__tests__/chartStore.test.ts` — stubs for CHRT-02 cache behavior
- [ ] `src/__tests__/VolumeBar.test.ts` — stubs for CHRT-03 data length/shape

*No new framework install needed — jest-expo preset already in place.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scrolling 240+ candles smooth at 60fps | CHRT-04 | Performance requires physical device profiling | Open 1Y chart on mid-range Android, scroll through candles, check for jank via Perf Monitor overlay |
| Candlestick chart visually renders correct OHLC shapes | CHRT-01 | Visual rendering validation | Compare rendered chart against known data values for a specific stock/date |
| Crosshair tooltip shows correct price on touch | CHRT-01 | Gesture interaction | Long-press candle, verify tooltip matches data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
