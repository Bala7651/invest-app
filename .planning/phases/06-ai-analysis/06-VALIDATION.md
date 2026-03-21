---
phase: 6
slug: ai-analysis
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.7 + jest-expo |
| **Config file** | package.json `"jest": { "preset": "jest-expo" }` |
| **Quick run command** | `npx jest src/__tests__/minimaxApi.test.ts src/__tests__/analysisStore.test.ts --no-coverage` |
| **Full suite command** | `npx jest --no-coverage` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest src/__tests__/minimaxApi.test.ts src/__tests__/analysisStore.test.ts --no-coverage`
- **After every plan wave:** Run `npx jest --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | AI-07 | unit | `npx jest src/__tests__/minimaxApi.test.ts -t "buildPrompt"` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | AI-07 | unit | `npx jest src/__tests__/minimaxApi.test.ts -t "parseAnalysisResponse"` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | AI-08 | unit | `npx jest src/__tests__/minimaxApi.test.ts -t "callMiniMax"` | ❌ W0 | ⬜ pending |
| 06-01-04 | 01 | 1 | AI-08 | unit | `npx jest src/__tests__/minimaxApi.test.ts -t "HTTP error"` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | AI-02+AI-03-06 | unit | `npx jest src/__tests__/analysisStore.test.ts -t "stores result"` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | AI-02 | unit | `npx jest src/__tests__/analysisStore.test.ts -t "TTL"` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 1 | AI-02 | unit | `npx jest src/__tests__/analysisStore.test.ts -t "empty apiKey"` | ❌ W0 | ⬜ pending |
| 06-02-04 | 02 | 1 | AI-02 | unit | `npx jest src/__tests__/analysisStore.test.ts -t "error"` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | UI-02 | manual | Navigate in app; swipe left | N/A | ⬜ pending |
| 06-03-02 | 03 | 2 | AI-01 | manual | Device/emulator gesture | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/minimaxApi.test.ts` — stubs for AI-07, AI-08 (buildPrompt, callMiniMax, parseAnalysisResponse)
- [ ] `src/__tests__/analysisStore.test.ts` — stubs for AI-02 through AI-06 (fetchAnalysis, TTL, error state)

*Existing infrastructure covers framework — jest-expo is already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Swipe left shows analysis page | UI-02, AI-01 | PagerView gesture requires device/emulator | Swipe left from home; verify analysis page appears. Swipe right; verify return to home. |
| Analysis cards show real price data | AI-04 | Requires live TWSE data comparison | Compare price/change in analysis card header with watchlist card values |
| No-API-key prompt shown | AI-06 | Requires settings state manipulation | Remove API key in Settings; navigate to analysis page; verify prompt appears |
| Disclaimer sticky footer visible | AI-05 | Visual layout verification | Scroll analysis page; verify "Not financial advice" footer remains visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
