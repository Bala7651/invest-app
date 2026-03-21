---
phase: 9
slug: price-alerts
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7 + jest-expo preset |
| **Config file** | invest-app/package.json `"jest"` key |
| **Quick run command** | `cd invest-app && npx jest --testPathPattern="alertService\|alertMonitor\|alertStore" --no-coverage` |
| **Full suite command** | `cd invest-app && npx jest --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd invest-app && npx jest --testPathPattern="alertService\|alertMonitor\|alertStore\|db" --no-coverage`
- **After every plan wave:** Run `cd invest-app && npx jest --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | ALRT-07 | unit | `npx jest --testPathPattern="db" --no-coverage` | ✅ (extend db.test.ts) | ⬜ pending |
| 09-01-02 | 01 | 1 | ALRT-06 | unit | `npx jest --testPathPattern="alertStore" --no-coverage` | ❌ W0 | ⬜ pending |
| 09-01-03 | 01 | 1 | ALRT-02 | unit | `npx jest --testPathPattern="alertService" --no-coverage` | ❌ W0 | ⬜ pending |
| 09-01-04 | 01 | 1 | ALRT-04 | unit | `npx jest --testPathPattern="alertMonitor" --no-coverage` | ❌ W0 | ⬜ pending |
| 09-01-05 | 01 | 1 | ALRT-05 | unit | `npx jest --testPathPattern="alertMonitor" --no-coverage` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 2 | ALRT-01 | unit | `npx jest --testPathPattern="detail" --no-coverage` | ✅ (extend detail.test.ts) | ⬜ pending |
| 09-02-02 | 02 | 2 | ALRT-03 | unit | `npx jest --testPathPattern="settings" --no-coverage` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/alertService.test.ts` — stubs for ALRT-02 (validation), ALRT-07 (CRUD)
- [ ] `src/__tests__/alertMonitor.test.ts` — stubs for ALRT-04 (condition checks), ALRT-05 (market hours gate)
- [ ] `src/__tests__/alertStore.test.ts` — stubs for ALRT-06 (Zustand store mutations)
- [ ] Extend `src/__tests__/db.test.ts` — add price_alerts schema coverage for ALRT-07
- [ ] Extend `src/__tests__/detail.test.ts` — add bell icon presence check for ALRT-01

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Push notification arrives when app backgrounded | ALRT-04 | Requires real device with app backgrounded | 1. Set alert below current price 2. Background app 3. Wait for WorkManager tick 4. Verify notification appears |
| Battery optimization prompt displays on first alert | ALRT-03 | Requires Android system settings interaction | 1. Fresh install 2. Create first alert 3. Verify prompt appears with settings link |
| Alerts survive app restart | ALRT-06 | Requires full app lifecycle test | 1. Create alerts 2. Force-kill app 3. Reopen 4. Verify alerts present |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
