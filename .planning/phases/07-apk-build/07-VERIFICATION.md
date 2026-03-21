---
phase: 07-apk-build
verified: 2026-03-21T12:51:16Z
status: passed
score: 7/7 must-haves verified
re_verification: false
---

# Phase 7: APK Build Verification Report

**Phase Goal:** A signed, installable Android APK is produced that passes a secret audit — no API keys or credentials are embedded in the bundle
**Verified:** 2026-03-21T12:51:16Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #   | Truth                                                                  | Status     | Evidence                                                                                         |
| --- | ---------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| 1   | Release keystore exists and is distinct from debug keystore            | VERIFIED   | `release.keystore` (2776 bytes, PKCS12, alias `invest-release`) — separate from `debug.keystore` |
| 2   | APK is signed with the release keystore, not the debug key             | VERIFIED   | `apksigner verify --print-certs` shows `CN=Invest App, OU=Development, O=hopyky` (not CN=Android Debug) |
| 3   | APK builds successfully with local Gradle assembleRelease              | VERIFIED   | `app-release.apk` at expected output path, 101,987,654 bytes (~97MB), produced at 2026-03-21     |
| 4   | Audit script can extract and scan the APK bundle for secrets           | VERIFIED   | `audit-apk.sh` runs end-to-end: extracts APK, locates `assets/index.android.bundle`, checks JWT tokens and hardcoded apiKey assignments, outputs "AUDIT PASSED" with exit 0 |
| 5   | Keystore is backed up outside the repository                           | VERIFIED   | `~/invest-app-release.keystore` (2776 bytes) — identical size to repo copy; `git check-ignore` confirms repo copy is gitignored |
| 6   | APK is uploaded to GitHub Releases as v0.7.0                           | VERIFIED   | `gh release view v0.7.0 --repo Bala7651/invest-app` shows tag v0.7.0 with `invest-app-v0.7.0.apk` asset published 2026-03-21 |
| 7   | Real device can install and run the APK                                | VERIFIED*  | 07-02 SUMMARY documents human checkpoint approved: "APK installs via adb, app launches, home screen loads with watchlist, swipe-left shows AI analysis, swipe-right opens settings drawer, stock tap shows chart detail" |

*Truth #7 was verified by human approval checkpoint in Plan 02 Task 2 (type: `checkpoint:human-verify`, gate: `blocking`).

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact                                                                        | Expected                                      | Status   | Details                                                                    |
| ------------------------------------------------------------------------------- | --------------------------------------------- | -------- | -------------------------------------------------------------------------- |
| `invest-app/android/app/release.keystore`                                       | Release signing keystore                      | VERIFIED | Exists, 2776 bytes, PKCS12 type, alias `invest-release`, RSA SHA-256 cert fingerprint confirmed; gitignored via `*.keystore` rule |
| `invest-app/android/app/build.gradle`                                           | signingConfigs.release pointing to keystore   | VERIFIED | Contains `signingConfigs { release { storeFile file('release.keystore') ... } }` and `buildTypes.release { signingConfig signingConfigs.release }`; `versionName "0.7.0"` |
| `invest-app/scripts/audit-apk.sh`                                               | Automated APK secret audit script             | VERIFIED | Exists, executable (`-rwxr-xr-x`), 1534 bytes, contains `index.android.bundle` reference, JWT check, hardcoded apiKey check; ran live against APK — exited 0 ("AUDIT PASSED") |
| `invest-app/android/app/build/outputs/apk/release/app-release.apk`             | Signed release APK                            | VERIFIED | Exists, ~97MB, signed with `CN=Invest App` (confirmed via `apksigner verify --print-certs`) |
| `~/invest-app-release.keystore`                                                 | Keystore backup outside repo                  | VERIFIED | `/Users/linmini/invest-app-release.keystore` exists (2776 bytes), outside git repo |

---

### Key Link Verification

| From                                          | To                                       | Via                                | Status   | Details                                                                                  |
| --------------------------------------------- | ---------------------------------------- | ---------------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `invest-app/android/app/build.gradle`         | `invest-app/android/app/release.keystore` | `signingConfigs.release.storeFile` | WIRED    | Line 111: `storeFile file('release.keystore')` — pattern `storeFile file.*release.keystore` confirmed |
| `invest-app/android/app/build.gradle`         | `invest-app/android/gradle.properties`   | `INVEST_RELEASE_STORE_PASSWORD` / `INVEST_RELEASE_KEY_PASSWORD` | WIRED | build.gradle references both gradle.properties variables; gradle.properties lines 63-64 define them; file is gitignored |
| `invest-app/android/app/release.keystore`    | `~/invest-app-release.keystore`          | file copy                          | WIRED    | Both files are 2776 bytes; SUMMARY documents `cp` command executed and verified |
| `invest-app/scripts/audit-apk.sh`            | `invest-app/android/app/build/outputs/apk/release/app-release.apk` | script argument | WIRED | Script default path points to APK; live run against APK produces "AUDIT PASSED" |

---

### Requirements Coverage

| Requirement | Source Plan | Description              | Status    | Evidence                                                                                 |
| ----------- | ----------- | ------------------------ | --------- | ---------------------------------------------------------------------------------------- |
| UI-04       | 07-01, 07-02 | App builds as Android APK | SATISFIED | Signed APK exists at expected output path; v0.7.0 GitHub Release uploaded; `apksigner verify` confirms release cert; audit passed |

**Orphaned requirements check:** REQUIREMENTS.md maps UI-04 to Phase 7 only. Both plans declare `requirements: [UI-04]`. No orphaned requirements.

---

### Anti-Patterns Found

| File                                  | Line | Pattern         | Severity | Impact  |
| ------------------------------------- | ---- | --------------- | -------- | ------- |
| `.planning/phases/07-apk-build/07-01-PLAN.md` | 79 | `storepass investRelease2026` (credential in planning doc) | INFO | Planning doc only — not source code, not shipped in APK. No functional impact. |
| `.planning/phases/07-apk-build/07-01-SUMMARY.md` | 65 | `investRelease2026` (credential in summary doc) | INFO | Planning doc only — not source code, not shipped in APK. No functional impact. |

Note: The keystore password appears in `.planning/` docs (in task template content) but `git grep` confirms it does NOT appear in any `.ts`, `.tsx`, `.js`, or `.jsx` source file. `gradle.properties` (which contains the live credential) is gitignored and untracked. No blocker anti-patterns found.

**Credential leak investigation — JWT false positive resolved:** A direct `grep -aoE "eyJ..."` on the Hermes bytecode (`index.android.bundle`) returns 0 matches and exits 1. An earlier shell command sequence produced a spurious "JWT FOUND" echo due to `&&` chaining semantics with a zero-output grep (exit 0) — the echo was from the fallback arm. The bundle is Hermes bytecode (format confirmed via `file` command) and the audit script's `strings | grep -qE` pipeline correctly returns no results. Audit result: CLEAN.

---

### Human Verification Required

#### 1. Real Device Smoke Test

**Test:** Install `invest-app-v0.7.0.apk` on a real Android device via `adb install` or sideload
**Expected:** App installs, launches, home screen loads with watchlist, swipe-left shows AI analysis, swipe-right opens settings drawer, stock tap shows chart detail
**Why human:** Requires physical Android device
**Status:** APPROVED — documented in 07-02-SUMMARY.md as human checkpoint passed

No remaining human verification items.

---

### Security Audit Results

| Check                                 | Result | Detail                                                       |
| ------------------------------------- | ------ | ------------------------------------------------------------ |
| JWT-format tokens in JS bundle        | PASS   | `strings bundle | grep -qE "eyJ..."` — 0 matches            |
| Hardcoded apiKey assignments in bundle | PASS  | `grep -aoq 'apiKey...{10,}'` — 0 matches                    |
| MiniMax endpoint URL in bundle        | INFO   | `https://api.minimax.io/v1` present — this is a URL, not a secret; acceptable |
| Keystore tracked in git               | PASS   | `git check-ignore invest-app/android/app/release.keystore` returns path (gitignored, untracked) |
| gradle.properties tracked in git      | PASS   | `git ls-files invest-app/android/gradle.properties` returns empty (untracked) |
| Credentials in source files           | PASS   | `git grep -l "investRelease2026" -- *.ts *.tsx *.js *.jsx` returns no results |
| Signing certificate                   | PASS   | `apksigner verify --print-certs` shows `CN=Invest App, OU=Development, O=hopyky, L=Taichung, ST=Taiwan, C=TW` |

---

### Commits Verified

| Commit   | Description                                               | Status   |
| -------- | --------------------------------------------------------- | -------- |
| `0345c3a` | feat(07-01): release keystore, Gradle signing config, and APK audit script | VERIFIED |
| `188a804` | chore(07-02): back up release keystore and add root .gitignore | VERIFIED |

---

## Summary

Phase 7 goal is fully achieved. The phase produced:

1. A PKCS12 release keystore (`invest-release` alias, RSA 2048-bit) that is gitignored and backed up outside the repository.
2. `build.gradle` configured with `signingConfigs.release` pointing to `release.keystore`, credentials sourced from gitignored `gradle.properties`.
3. A 97MB release APK signed with `CN=Invest App` (not the debug key), present at the expected Gradle output path.
4. An automated audit script (`audit-apk.sh`) that passes against the built APK — no JWT tokens or hardcoded API keys found in the Hermes bytecode bundle.
5. GitHub Release v0.7.0 published with APK attached, per project memory requirements.
6. Human-approved smoke test confirming the APK installs and all screens function on a real device.

No gaps. No blocker anti-patterns. Requirement UI-04 fully satisfied.

---

_Verified: 2026-03-21T12:51:16Z_
_Verifier: Claude (gsd-verifier)_
