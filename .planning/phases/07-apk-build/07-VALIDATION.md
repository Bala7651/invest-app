---
phase: 7
slug: apk-build
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing) + shell scripts (new) |
| **Config file** | `invest-app/package.json` |
| **Quick run command** | `cd invest-app && npm test` |
| **Full suite command** | `cd invest-app && npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd invest-app && npm test`
- **After every plan wave:** Run full suite + APK build + device install
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds (unit tests), ~5 min (APK build)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | UI-04 | manual | `keytool -list -keystore release.keystore` | N/A | ⬜ pending |
| 07-01-02 | 01 | 1 | UI-04 | build | `./gradlew assembleRelease` | N/A | ⬜ pending |
| 07-01-03 | 01 | 1 | UI-04 | manual | `adb install app-release.apk` | N/A | ⬜ pending |
| 07-02-01 | 02 | 2 | UI-04 | automated | `bash scripts/audit-apk.sh` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 2 | UI-04 | automated | `apksigner verify --print-certs app-release.apk` | N/A | ⬜ pending |
| 07-02-03 | 02 | 2 | UI-04 | manual | Verify keystore backup exists outside repo | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `invest-app/scripts/audit-apk.sh` — secret audit shell script (covers UI-04 security requirement)

*This phase is build infrastructure, not application logic — no new unit test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| APK installs on real device | UI-04 | Requires physical device | `adb install app-release.apk`, open app, verify home screen loads |
| Keystore backup outside repo | UI-04 | File system check | Verify keystore file exists at backup location and not in git |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
