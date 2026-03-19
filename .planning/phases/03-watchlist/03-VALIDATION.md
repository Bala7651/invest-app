---
phase: 3
slug: watchlist
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest-expo ~29.7 (jest ~29.7) |
| **Config file** | `invest-app/package.json` `jest` key with `jest-expo` preset |
| **Quick run command** | `npx jest --testPathPattern="watchlist" --no-coverage` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern="watchlist|StockCard" --no-coverage`
- **After every plan wave:** Run `npx jest --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | WTCH-01 | unit | `npx jest --testPathPattern="watchlistSearch" --no-coverage` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | WTCH-02 | unit | `npx jest --testPathPattern="watchlistStore" --no-coverage` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | WTCH-03 | unit | `npx jest --testPathPattern="watchlistStore" --no-coverage` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | WTCH-04 | unit | `npx jest --testPathPattern="watchlistStore" --no-coverage` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | WTCH-05 | unit | `npx jest --testPathPattern="StockCard" --no-coverage` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/watchlistStore.test.ts` — stubs for WTCH-02, WTCH-03, WTCH-04
- [ ] `src/__tests__/watchlistSearch.test.ts` — stubs for WTCH-01
- [ ] `src/__tests__/StockCard.test.tsx` — stubs for WTCH-05

*Existing infrastructure: jest-expo preset, transformIgnorePatterns, jest.mock pattern — all established in Phase 2 tests. No framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Swipe-to-delete gesture feel | WTCH-03 | Gesture interaction requires device | Swipe left on a card, verify delete action appears and executes |
| Drag-to-reorder visual feedback | WTCH-04 | Reorder animation requires device | Long-press a card, drag to new position, verify order persists |
| Live price update on cards | WTCH-05 | Requires live TWSE data | Add 2330 to watchlist, wait for poll cycle, verify price updates |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
