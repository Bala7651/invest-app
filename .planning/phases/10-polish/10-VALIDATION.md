---
phase: 10
slug: polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7.0 with jest-expo preset |
| **Config file** | `package.json` (jest.preset = "jest-expo") |
| **Quick run command** | `cd /Users/linmini/invest/invest-app && jest --testPathPattern="SparklineChart\|quoteStore\|StockCard" --no-coverage` |
| **Full suite command** | `cd /Users/linmini/invest/invest-app && jest --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd /Users/linmini/invest/invest-app && jest --testPathPattern="SparklineChart|quoteStore|StockCard" --no-coverage`
- **After every plan wave:** Run `cd /Users/linmini/invest/invest-app && jest --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | WTCH-06 | unit | `jest --testPathPattern="SparklineChart" -t "returns null"` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | WTCH-06 | unit | `jest --testPathPattern="SparklineChart" -t "points"` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | WTCH-06 | unit | `jest --testPathPattern="quoteStore" -t "tickHistory"` | ❌ W0 | ⬜ pending |
| 10-01-04 | 01 | 1 | WTCH-06 | unit | `jest --testPathPattern="quoteStore" -t "tickHistory reset"` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 1 | WTCH-06 | unit | `jest --testPathPattern="StockCard" -t "glow"` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 1 | UI-03 | unit | `jest --testPathPattern="StockCard" -t "truncat"` | ❌ W0 | ⬜ pending |
| 10-02-03 | 02 | 1 | UI-03 | unit | `jest --testPathPattern="quoteStore" -t "forceRefresh"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/SparklineChart.test.ts` — stubs for WTCH-06 sparkline math and null guard
- [ ] New test cases in `src/__tests__/quoteStore.test.ts` — covers tickHistory accumulation, reset, forceRefresh
- [ ] New test cases in `src/__tests__/StockCard.test.ts` — covers glow trigger logic and text truncation

*Existing jest-expo preset and mock setup are sufficient — no new config needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Responsive layout on 5" and 6.7" screens | UI-03 | Visual layout correctness requires device/emulator | Run on emulators with 1080x1920 and 1080x2400 resolutions, verify no overflow or truncation |
| Cyberpunk neon glow visible on price update | WTCH-06 | Animation visual quality is subjective | Watch price update cycle, verify brief color flash on price text |
| Sparkline renders correctly in watchlist card | WTCH-06 | SVG rendering quality requires visual check | View watchlist with stocks that have tick history, verify line chart appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
