# Deferred Items — Phase 02-data-layer

## Pre-existing Issues Discovered During 02-03 Execution

### quoteStore.test.ts: `realSetTimeout` not defined
- **Discovered during:** Task 2 verification (npm test)
- **File:** `invest-app/src/__tests__/quoteStore.test.ts` (untracked, pre-existing)
- **Issue:** Line 132 references `realSetTimeout` which is never declared in the test file. The variable was likely used in an earlier version that saved real setTimeout before `jest.useFakeTimers()` but the variable assignment was removed.
- **Impact:** 1 test failure in quoteStore suite. Does not affect 02-03 functionality.
- **Fix:** In `quoteStore.test.ts`, add `const realSetTimeout = setTimeout;` before `jest.useFakeTimers()` in the relevant test, or replace `realSetTimeout` with `jest.getRealSystemTime` or just use `await Promise.resolve()` instead.
- **Status:** Out of scope for 02-03. To be fixed in 02-02 plan completion.
