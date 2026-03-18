---
phase: 2
slug: data-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest-expo (jest ~29.7.0 preset) |
| **Config file** | `invest-app/package.json` `"jest"` key |
| **Quick run command** | `npm test -- --testPathPattern="stockService\|marketHours\|quoteStore" --passWithNoTests` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern="stockService|marketHours|quoteStore" --passWithNoTests`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DATA-01 | unit (mock fetch) | `npm test -- --testPathPattern="stockService"` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | DATA-05 | unit | `npm test -- --testPathPattern="stockService"` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | DATA-02 | unit | `npm test -- --testPathPattern="marketHours"` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | DATA-02 | unit (mock timer) | `npm test -- --testPathPattern="quoteStore"` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | DATA-03 | unit | `npm test -- --testPathPattern="marketHours"` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | DATA-04 | unit | `npm test -- --testPathPattern="marketHours"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/stockService.test.ts` — stubs for DATA-01, DATA-05
- [ ] `src/__tests__/marketHours.test.ts` — stubs for DATA-02, DATA-03, DATA-04
- [ ] `src/__tests__/quoteStore.test.ts` — stubs for DATA-02 polling lifecycle
- [ ] No new framework install needed — jest-expo already configured

*Existing infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Market status indicator shows glowing dot | DATA-03 | Visual animation | Open app during market hours, verify green dot pulses |
| Network log shows 2s spacing | DATA-05 (SC-1) | Requires network inspector | Add 5 stocks, open Network tab, verify request timestamps |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
