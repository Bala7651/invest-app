---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest-expo (Jest preset) + @testing-library/react-native |
| **Config file** | `jest` key in `package.json` |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx jest --passWithNoTests` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx jest --passWithNoTests`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | UI-01 | unit | `npx jest --testPathPattern="theme"` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | UI-01 | unit | `npx jest --testPathPattern="tailwind.config"` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | Foundation | unit | `npx jest --testPathPattern="db"` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | Foundation | static | `npx tsc --noEmit` | N/A | ⬜ pending |
| 01-smoke | - | - | Foundation | smoke | Manual — `npx expo start --no-dev` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/theme.test.ts` — verifies tailwind config contains all 9 color tokens (UI-01)
- [ ] `src/__tests__/db.test.ts` — verifies schema exports watchlist and daily_summaries table definitions
- [ ] `jest` config in `package.json` — preset: "jest-expo"

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npx expo start` runs without error | Foundation SC-1 | Requires Expo dev server and device/emulator | Run `npx expo start --no-dev`, verify no crash |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
