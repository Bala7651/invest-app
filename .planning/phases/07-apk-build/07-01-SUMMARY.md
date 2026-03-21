---
phase: 07-apk-build
plan: 01
subsystem: infra
tags: [android, gradle, keystore, apk, signing, security-audit]

# Dependency graph
requires:
  - phase: 06-ai-analysis
    provides: completed app feature set ready for release packaging
provides:
  - Release keystore (PKCS12, RSA 2048-bit, invest-release alias)
  - build.gradle with signingConfigs.release pointing to release.keystore
  - Signed release APK at android/app/build/outputs/apk/release/app-release.apk
  - audit-apk.sh for automated JWT and hardcoded-API-key detection in JS bundle
affects: [08-background-tasks, 09-price-alerts, 10-polish]

# Tech tracking
tech-stack:
  added: [keytool PKCS12 keystore, apksigner v2/v3 signing]
  patterns: [Gradle signingConfigs.release via gradle.properties credentials, APK audit script pattern for CI]

key-files:
  created:
    - invest-app/scripts/audit-apk.sh
  modified:
    - invest-app/android/app/build.gradle
    - invest-app/android/gradle.properties
    - invest-app/android/app/release.keystore (gitignored)

key-decisions:
  - "audit-apk.sh requires ulimit -f unlimited — 97MB APK exceeds default 32MB shell file size limit"
  - "unzip -qo (overwrite flag) required for non-interactive extraction in script context"
  - "APK uses v2/v3 signing (not legacy jar signing) — keytool -printcert -jarfile does not work; use apksigner verify --print-certs"
  - "versionName bumped to 0.7.0 per project memory version format (Phase 7 = v0.7.0)"
  - "Keystore credentials in gradle.properties (gitignored by /android rule) — not in source"

patterns-established:
  - "APK audit: run audit-apk.sh before each release upload to catch accidental secret inclusion"
  - "Signing verification: apksigner verify --print-certs confirms CN=Invest App (not CN=Android Debug)"

requirements-completed: [UI-04]

# Metrics
duration: 4min
completed: 2026-03-21
---

# Phase 7 Plan 1: APK Build Summary

**PKCS12 release keystore generated, Gradle release signingConfig wired, 97MB APK signed with CN=Invest App and passing secret audit**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-21T10:45:52Z
- **Completed:** 2026-03-21T10:49:55Z
- **Tasks:** 2
- **Files modified:** 4 (audit-apk.sh created; build.gradle, gradle.properties, release.keystore modified in gitignored android/)

## Accomplishments
- Generated PKCS12 release keystore with invest-release alias (RSA 2048-bit, 10000-day validity, CN=Invest App)
- Configured Gradle signingConfigs.release with credentials from gradle.properties; switched buildTypes.release from debug signing to release signing
- Built 97MB release APK in 29 seconds; all 148 existing tests pass
- Created invest-app/scripts/audit-apk.sh — scans JS bundle for JWT tokens and hardcoded apiKey assignments; passes with current bundle
- Uploaded APK to GitHub Releases as v0.7.0

## Task Commits

Each task was committed atomically:

1. **Task 1 + 2: Keystore, signing config, APK build, audit script** - `0345c3a` (feat)

**Plan metadata:** TBD (docs commit)

## Files Created/Modified
- `invest-app/scripts/audit-apk.sh` - Automated secret detection: checks JS bundle for JWT tokens and hardcoded apiKey; exits 0 on pass, 1 on fail
- `invest-app/android/app/build.gradle` - Added signingConfigs.release, changed buildTypes.release.signingConfig to release, bumped versionName to 0.7.0 (gitignored)
- `invest-app/android/gradle.properties` - Added INVEST_RELEASE_STORE_PASSWORD and INVEST_RELEASE_KEY_PASSWORD (gitignored)
- `invest-app/android/app/release.keystore` - PKCS12 keystore, invest-release alias (gitignored)

## Decisions Made
- `audit-apk.sh` needs `ulimit -f unlimited` — the 97MB APK exceeds the default 32MB shell file size limit, causing "Filesize limit exceeded" on copy to /tmp
- `unzip -qo` (overwrite flag) required — without `-o`, unzip prompts interactively when re-running the script
- APK uses v2/v3 block signing scheme; `keytool -printcert -jarfile` does not work for v2/v3 — use `apksigner verify --print-certs` to confirm release cert
- Keystore credentials stored in gradle.properties (gitignored by `/android` rule in .gitignore) — never in source or tracked files

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] audit-apk.sh failed with "Filesize limit exceeded" on APK copy**
- **Found during:** Task 2 (audit script execution)
- **Issue:** Default shell `ulimit -f` is 65536 blocks (32MB); 97MB APK causes cp to fail with exit code 153
- **Fix:** Added `ulimit -f unlimited 2>/dev/null || true` at top of script, before the APK copy
- **Files modified:** invest-app/scripts/audit-apk.sh
- **Verification:** Script ran successfully, extracted bundle, output "AUDIT PASSED"
- **Committed in:** 0345c3a (task commit)

**2. [Rule 1 - Bug] audit-apk.sh prompted interactively on unzip**
- **Found during:** Task 2 (second audit run after ulimit fix)
- **Issue:** `unzip -q` prompts "replace file? [y]es/[N]one" when dest files exist from a prior failed run; non-interactive bash treats as EOF and skips extraction
- **Fix:** Changed `unzip -q` to `unzip -qo` (overwrite silently)
- **Files modified:** invest-app/scripts/audit-apk.sh
- **Verification:** Script completed cleanly with "AUDIT PASSED"
- **Committed in:** 0345c3a (task commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bugs in audit script)
**Impact on plan:** Both fixes necessary for script to function correctly. No scope creep.

## Issues Encountered
- `keytool -printcert -jarfile` returns "Not a signed jar file" for modern APKs using v2/v3 signing scheme. Switched to `apksigner verify --print-certs` which correctly shows "CN=Invest App".

## User Setup Required
None - keystore generated locally, credentials in gitignored gradle.properties.

## Next Phase Readiness
- Release APK pipeline established and verified; v0.7.0 uploaded to GitHub Releases
- Audit script can be run before any future release to detect secret leakage
- Ready for Phase 07-02 (plan 02 if it exists) or Phase 08

---
*Phase: 07-apk-build*
*Completed: 2026-03-21*
