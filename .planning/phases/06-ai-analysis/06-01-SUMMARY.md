---
phase: 06-ai-analysis
plan: 01
subsystem: api
tags: [minimax, zustand, typescript, fetch, ttl-cache, jest, unit-tests]

# Dependency graph
requires:
  - phase: 05-settings
    provides: settingsStore with apiKey, modelName, baseUrl loaded from SecureStore
  - phase: 02-data-layer
    provides: quoteStore with real TWSE price/change/prevClose/volume data
provides:
  - AnalysisResult interface (types.ts)
  - minimaxApi service (buildPrompt, parseAnalysisResponse, callMiniMax)
  - analysisStore with per-symbol 30-minute TTL cache
  - Unit tests covering AI-07 and AI-08 requirements (30 tests)
affects: [06-02-ui-components]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TTL-gated Zustand store (cache/cachedAt/loading/errors per symbol, mirrors chartStore)
    - Prompt-based JSON extraction via regex (code block or bare JSON)
    - MiniMax native endpoint /text/chatcompletion_v2 with Bearer auth

key-files:
  created:
    - invest-app/src/features/analysis/types.ts
    - invest-app/src/features/analysis/services/minimaxApi.ts
    - invest-app/src/features/analysis/store/analysisStore.ts
    - invest-app/src/__tests__/minimaxApi.test.ts
    - invest-app/src/__tests__/analysisStore.test.ts
  modified: []

key-decisions:
  - "Use /text/chatcompletion_v2 (MiniMax native) not /chat/completions (OpenAI compat) in minimaxApi"
  - "Prompt-based JSON extraction with regex (not response_format json_schema — unsupported by M2.5)"
  - "cachedAt stored separately from AnalysisResult to keep TTL check clean (mirrors chartStore pattern)"
  - "callMiniMax: baseUrl.replace(/\\/$/, '') + '/text/chatcompletion_v2' — handles trailing slash; preserves /v1"

patterns-established:
  - "analysisStore TTL pattern: const cachedAt = get().cachedAt[symbol] ?? 0; if (cache[symbol] && Date.now() - cachedAt < TTL_MS) return"
  - "parseAnalysisResponse: /```(?:json)?\\s*([\\s\\S]*?)```/ OR /(\\{[\\s\\S]*\\})/ — throws 'No JSON found' on miss"
  - "callMiniMax uses AbortSignal.timeout(30_000) — same as historicalService pattern"

requirements-completed: [AI-07, AI-08]

# Metrics
duration: 2min
completed: 2026-03-21
---

# Phase 6 Plan 01: AI Analysis Service Layer Summary

**MiniMax M2.5 typed fetch service with TWSE data injection, JSON parsing, and Zustand TTL cache — 30 unit tests green**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-21T09:17:00Z
- **Completed:** 2026-03-21T09:19:03Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- AnalysisResult TypeScript interface with 9 structured fields (sentimentScore, sentimentLabel, sentimentSummary, technicalSummary, recommendation, recommendationReasoning, riskScore, riskExplanation, overallScore)
- minimaxApi service: buildPrompt injects real TWSE data (price with null safety, change, prevClose, volume); parseAnalysisResponse handles markdown code blocks and bare JSON; callMiniMax POSTs to /v1/text/chatcompletion_v2 with Bearer auth, temperature 0.3, max_completion_tokens 600
- analysisStore: Zustand store with per-symbol 30-minute TTL cache — skips API call when fresh, re-fetches when expired, captures errors per-symbol without throwing, clearAnalysis resets all state

## Task Commits

Each task was committed atomically:

1. **Task 1: Types + minimaxApi service with tests** - `67a5a9c` (feat)
2. **Task 2: analysisStore with TTL cache and tests** - `6372d30` (feat)

**Plan metadata:** (docs commit — pending)

_Note: Both tasks followed TDD flow: failing tests written first, then implementation._

## Files Created/Modified
- `invest-app/src/features/analysis/types.ts` - AnalysisResult interface (9 fields)
- `invest-app/src/features/analysis/services/minimaxApi.ts` - buildPrompt, parseAnalysisResponse, callMiniMax
- `invest-app/src/features/analysis/store/analysisStore.ts` - Zustand store with TTL cache
- `invest-app/src/__tests__/minimaxApi.test.ts` - 19 unit tests (buildPrompt, parseAnalysisResponse, callMiniMax)
- `invest-app/src/__tests__/analysisStore.test.ts` - 11 unit tests (fetchAnalysis TTL, errors, clearAnalysis)

## Decisions Made
- Used `/text/chatcompletion_v2` (MiniMax native endpoint) instead of `/chat/completions` (OpenAI compat) — official docs specify native path for M2.5 production use
- Prompt-based JSON extraction via regex rather than `response_format: json_schema` — json_schema only documented for MiniMax-Text-01, not M2.5
- `cachedAt` stored separately from result in store — mirrors chartStore pattern, keeps TTL check clean
- `baseUrl.replace(/\/$/, '') + '/text/chatcompletion_v2'` — normalizes trailing slash; does NOT strip `/v1` since baseUrl default already includes it

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Service layer complete — Plan 02 (UI components) can import AnalysisResult, callMiniMax, and useAnalysisStore
- analysisStore.fetchAnalysis signature: `(symbol, quote: QuoteData, credentials: { apiKey, modelName, baseUrl })`
- QuoteData interface exported from minimaxApi.ts (compatible with quoteStore Quote shape)
- Remaining blocker from Phase 5: [Phase 6] News data source unresolved — resolved in RESEARCH.md: no external news API needed, AI uses training knowledge

---
*Phase: 06-ai-analysis*
*Completed: 2026-03-21*

## Self-Check: PASSED

All files confirmed on disk:
- invest-app/src/features/analysis/types.ts — FOUND
- invest-app/src/features/analysis/services/minimaxApi.ts — FOUND
- invest-app/src/features/analysis/store/analysisStore.ts — FOUND
- invest-app/src/__tests__/minimaxApi.test.ts — FOUND
- invest-app/src/__tests__/analysisStore.test.ts — FOUND
- .planning/phases/06-ai-analysis/06-01-SUMMARY.md — FOUND

Commits confirmed:
- 67a5a9c — feat(06-01): types + minimaxApi service with unit tests
- 6372d30 — feat(06-01): analysisStore with 30-minute TTL cache and unit tests
