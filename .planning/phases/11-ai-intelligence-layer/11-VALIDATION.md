---
phase: 11
slug: ai-intelligence-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest (jest-expo preset) |
| **Config file** | `invest-app/package.json` (jest key) |
| **Quick run command** | `npm test -- --testPathPattern=patternDetector` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern=<affected module>`
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-W0 | 01 | 0 | AI-11 | unit | `npm test -- --testPathPattern=patternDetector` | ❌ W0 create | ⬜ pending |
| 11-01-01 | 01 | 1 | AI-11 | unit | `npm test -- --testPathPattern=patternDetector` | ✅ after W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | AI-11 | unit | `npm test -- --testPathPattern=patternDetector` | ✅ after W0 | ⬜ pending |
| 11-01-03 | 01 | 1 | AI-11 | manual | open detail page, check PatternCard renders | N/A | ⬜ pending |
| 11-02-W0 | 02 | 0 | AI-12 | unit | `npm test -- --testPathPattern=holdingsService` | ❌ W0 create | ⬜ pending |
| 11-02-01 | 02 | 1 | AI-12 | unit | `npm test -- --testPathPattern=holdingsService` | ✅ after W0 | ⬜ pending |
| 11-02-02 | 02 | 1 | AI-12 | unit | `npm test -- --testPathPattern=holdingsStore` | ❌ W0 create | ⬜ pending |
| 11-02-03 | 02 | 1 | AI-12 | unit | `npm test -- --testPathPattern=portfolioAiService` | ❌ W0 create | ⬜ pending |
| 11-02-04 | 02 | 2 | AI-12 | manual | open Portfolio page, verify score card renders | N/A | ⬜ pending |
| 11-03-W0 | 03 | 0 | AI-13 | unit | `npm test -- --testPathPattern=alertMonitor` | ❌ update existing | ⬜ pending |
| 11-03-01 | 03 | 1 | AI-13 | unit | `npm test -- --testPathPattern=alertMonitor` | ✅ after W0 | ⬜ pending |
| 11-03-02 | 03 | 1 | AI-13 | unit | `npm test -- --testPathPattern=settings` | ❌ update existing | ⬜ pending |
| 11-03-03 | 03 | 1 | AI-13 | manual | trigger alert, check notification body has AI sentence | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/patternDetector.test.ts` — AI-11: 8 pattern types, null return, strongest selection, NaN guard
- [ ] `src/__tests__/holdingsService.test.ts` — AI-12: upsert/getAll/delete CRUD (mirrors alertService.test.ts mock pattern)
- [ ] `src/__tests__/holdingsStore.test.ts` — AI-12: loadHoldings/setQuantity round-trip (mirrors analysisStore.test.ts)
- [ ] `src/__tests__/portfolioAiService.test.ts` — AI-12: prompt build + SCORE regex extraction
- [ ] Update `src/__tests__/alertMonitor.test.ts` — AI-13: AI context present when enabled, fallback on timeout, skip when disabled
- [ ] Update `src/__tests__/settings.test.ts` — AI-13: `aiNotificationsEnabled` persist/load via SecureStore

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PatternCard appears below volume bars | AI-11 | Requires rendered chart with real candle data | Open detail page for a stock with data, switch timeframes, verify card shows/hides |
| Portfolio page renders as 5th PagerView page | AI-12 | PagerView navigation requires device/emulator | Swipe to page 5, verify share input rows and AI health card |
| AI notification body shown in notification shade | AI-13 | Requires background task to fire on device | Set price alert, trigger threshold, check notification body in shade |
| Settings toggle for AI notifications visible | AI-13 | UI component inspection | Open Settings → 提醒 section, verify toggle row present and functional |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
