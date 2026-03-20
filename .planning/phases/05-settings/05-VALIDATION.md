---
phase: 5
slug: settings
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7 + jest-expo ~55.0.10 |
| **Config file** | `package.json` (`jest` key, preset: `jest-expo`) |
| **Quick run command** | `jest --testPathPattern=settingsStore` |
| **Full suite command** | `jest` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `jest --testPathPattern=settingsStore`
- **After every plan wave:** Run `jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | SETT-02 | unit | `jest --testPathPattern=settingsStore` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | SETT-03 | unit | `jest --testPathPattern=settingsStore` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | SETT-04 | unit | `jest --testPathPattern=settingsStore` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | SETT-01 | manual | — | manual | ⬜ pending |
| 05-02-02 | 02 | 2 | SETT-05 | manual | — | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/settingsStore.test.ts` — stubs for SETT-02, SETT-03, SETT-04 (mock `expo-secure-store`)
- [ ] Add `expo-secure-store` to `jest transformIgnorePatterns` if module resolution errors appear

*Existing infrastructure covers test framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hamburger icon opens drawer | SETT-01 | Gesture/animation requires device interaction | Tap hamburger icon on home screen, verify drawer slides open |
| Settings screen shows all API config fields | SETT-05 | Visual layout verification | Open settings, verify API key input, model name input, base URL input visible |
| API key persists after restart | SETT-02 | Requires app restart cycle | Save key, force-close app, reopen, verify masked key appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
