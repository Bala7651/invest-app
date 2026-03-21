---
phase: 8
slug: daily-summary
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7 + jest-expo ~55.0.10 |
| **Config file** | `package.json` `jest` field |
| **Quick run command** | `cd /Users/linmini/invest/invest-app && npx jest --testPathPattern="summary" --no-coverage` |
| **Full suite command** | `cd /Users/linmini/invest/invest-app && npx jest --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd /Users/linmini/invest/invest-app && npx jest --testPathPattern="summary" --no-coverage`
- **After every plan wave:** Run `cd /Users/linmini/invest/invest-app && npx jest --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | SUMM-01 | unit | `npx jest --testPathPattern="summaryService" -t "isCatchUpNeeded"` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | SUMM-02 | unit | `npx jest --testPathPattern="summaryService" -t "fetchTWIX"` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 1 | SUMM-02 | unit | `npx jest --testPathPattern="summaryService" -t "buildSummaryPrompt"` | ❌ W0 | ⬜ pending |
| 08-01-04 | 01 | 1 | SUMM-03 | unit | `npx jest --testPathPattern="summaryService" -t "upsertSummary"` | ❌ W0 | ⬜ pending |
| 08-01-05 | 01 | 1 | SUMM-04 | unit | `npx jest --testPathPattern="summaryService" -t "purgeOld"` | ❌ W0 | ⬜ pending |
| 08-01-06 | 01 | 1 | SUMM-04 | unit | `npx jest --testPathPattern="summaryService" -t "getCutoffISO"` | ❌ W0 | ⬜ pending |
| 08-01-07 | 01 | 1 | SUMM-01 | unit | `npx jest --testPathPattern="summaryStore" -t "idempotent"` | ❌ W0 | ⬜ pending |
| 08-01-08 | 01 | 1 | SUMM-03 | unit | `npx jest --testPathPattern="summaryStore" -t "loadSummaries"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/summaryService.test.ts` — stubs for SUMM-01, SUMM-02, SUMM-03, SUMM-04 service functions
- [ ] `src/__tests__/summaryStore.test.ts` — stubs for SUMM-01 (idempotent), SUMM-03 (loadSummaries state)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Summary UI renders date-grouped cards | SUMM-03 | React Native rendering | Open summary page, verify cards show newest first |
| Auto catch-up triggers on app open | SUMM-01 | Requires real AppState lifecycle | Background app past 12:30, re-open, verify generation starts |
| Generate Now button triggers generation | SUMM-04 | UI interaction + network | Tap button, verify spinner + stock-by-stock progress |
| PagerView 4th page accessible | SUMM-03 | UI navigation | Swipe left from AI Analysis page |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
