# Phase 7: APK Build - Research

**Researched:** 2026-03-21
**Domain:** Android APK signing, Gradle release build, security audit
**Confidence:** HIGH

## Summary

Phase 7 has one clear goal: produce a signed, installable Android APK that passes a secret audit. The project already builds working APKs using local Gradle throughout phases 1-6. The current release build uses the debug keystore — this phase upgrades that to a proper release keystore. EAS CLI (v18.0.6) is installed and eas.json has a `preview` profile defined, so `eas build -p android --profile preview` is a valid path, but it runs on Expo's cloud servers and requires an Expo account, project registration, and uploading credentials. An alternative is to stay fully local with Gradle but switch to a proper release keystore — this avoids cloud dependencies and matches the existing build workflow exactly.

The security audit requirement is concrete and testable: grep the extracted bundle for any MiniMax API key string. The architecture already defends against this — API keys are stored exclusively in `expo-secure-store` (Android Keystore-backed), never in source code, environment variables, or build configs. The URL `https://api.minimax.io/v1` appears in source as a default value, which is a URL (not a secret) and is acceptable. The main verification is that no actual key value is present in the JS bundle.

**Primary recommendation:** Use local Gradle release signing (generate a release keystore, configure `build.gradle` `signingConfigs.release`, build with the existing Gradle command). This is faster, avoids Expo account/cloud dependencies, and produces the same APK format. EAS `preview` profile is a viable alternative if cloud builds are preferred, but adds setup overhead.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-04 | App builds as Android APK | Gradle local build already works; this phase upgrades signing from debug to release keystore and verifies security |
</phase_requirements>

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Gradle `assembleRelease` | Gradle 9.0 (current) | Local APK build | Already works, zero new dependencies |
| `keytool` (JDK) | Bundled with JDK | Generate release keystore | Standard Android toolchain |
| EAS CLI | 18.0.6 (installed) | Cloud APK build via `eas build` | Expo's official build service |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `apktool` or `unzip` | any | Extract APK for bundle inspection | Secret audit step |
| `grep` / `strings` | system | Scan bundle for credential strings | Security audit |
| `gh release create` | installed | Upload APK to GitHub Releases | Per project memory: always upload after each phase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local Gradle signing | EAS cloud build | EAS adds Expo account + cloud queue wait time; local is immediate and already works |
| Manual keystore backup | Store in 1Password/Bitwarden | Both valid; project just needs keystore outside the repo |

**Installation:** No new npm packages needed. `keytool` is already available via JDK.

## Architecture Patterns

### Recommended Project Structure
```
invest-app/android/app/
├── debug.keystore          # existing (keep for debug builds)
├── release.keystore        # NEW — generated, backed up outside repo
└── build.gradle            # update signingConfigs.release

~/ (or chosen backup location, outside repo)
└── invest-app-release.keystore  # backup copy
```

### Pattern 1: Release Keystore Generation
**What:** Generate a release keystore with `keytool`, configure `build.gradle` to use it for release builds.
**When to use:** When the debug keystore is currently used for release signing (current state).
**Example:**
```bash
# Source: https://reactnative.dev/docs/signed-apk-android
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore android/app/release.keystore \
  -alias invest-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Then in `build.gradle` `signingConfigs`:
```groovy
// Source: https://reactnative.dev/docs/signed-apk-android
release {
    storeFile file('release.keystore')
    storePassword System.getenv("RELEASE_STORE_PASSWORD") ?: MYAPP_RELEASE_STORE_PASSWORD
    keyAlias 'invest-release'
    keyPassword System.getenv("RELEASE_KEY_PASSWORD") ?: MYAPP_RELEASE_KEY_PASSWORD
}
```

Passwords go in `~/.gradle/gradle.properties` (outside repo) or `android/gradle.properties` (in `.gitignore`).

### Pattern 2: EAS Build (Preview Profile)
**What:** `eas build -p android --profile preview` builds on Expo's cloud servers, downloads the APK.
**When to use:** If cloud builds are preferred or local Gradle has issues.
**Current eas.json preview profile:**
```json
{
  "build": {
    "preview": {
      "distribution": "internal"
    }
  }
}
```
Note: `eas build` with `preview` profile and no `android.buildType` defaults to APK (not AAB) for `distribution: internal`. Confirm with `"android": { "buildType": "apk" }` if needed.

### Pattern 3: APK Secret Audit
**What:** Extract the JS bundle from the APK and grep for secret strings.
**When to use:** Security verification step — run after every release build.
**Example:**
```bash
# Unzip APK (it's a zip file)
mkdir -p /tmp/apk-audit && cp app-release.apk /tmp/apk-audit/
cd /tmp/apk-audit && unzip -q app-release.apk

# The JS bundle is at assets/index.android.bundle
# Search for any API key patterns (MiniMax keys start with "eyJ" or similar JWT-like strings)
grep -r "minimax" assets/ --include="*.bundle" -l
strings assets/index.android.bundle | grep -E "[A-Za-z0-9]{32,}" | grep -iv "react\|native\|android\|google\|expo\|minimax\.io" | head -20
```

### Anti-Patterns to Avoid
- **Committing release.keystore to git:** `.gitignore` already lists `*.keystore` — verify it's respected.
- **Hardcoding keystore passwords in build.gradle:** Use `gradle.properties` or environment variables.
- **Using debug keystore for distribution:** Debug keystore is shared across all Android developer machines; anyone with the debug keystore can sign updates to your app.
- **Storing API keys in `app.json` extra fields or build env vars:** Hermes bundles these into the JS bundle, making them extractable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| APK signing | Custom signing script | `keytool` + Gradle signingConfigs | Gradle handles v1/v2/v3 signing schemes correctly |
| Bundle extraction for audit | Custom APK parser | `unzip` (APK is ZIP) | APK format is ZIP; unzip is sufficient |
| Secret detection | Custom regex scanner | `grep` + `strings` on extracted bundle | Simple and reliable for known-secret patterns |

**Key insight:** The Android build system handles all signing complexity. The only task is configuring it correctly and verifying the output.

## Common Pitfalls

### Pitfall 1: Release keystore signed with debug alias
**What goes wrong:** Build succeeds but APK is still signed with debug key if `build.gradle` release `signingConfig` still points to `signingConfigs.debug`.
**Why it happens:** The current `build.gradle` has `release { signingConfig signingConfigs.debug }` — this is the current state and must be changed.
**How to avoid:** After generating release keystore, update `buildTypes.release.signingConfig` to `signingConfigs.release`.
**Warning signs:** `apksigner verify --print-certs app-release.apk` shows "CN=Android Debug" as issuer.

### Pitfall 2: Keystore passwords leak into git
**What goes wrong:** Passwords committed in `build.gradle` or `gradle.properties` inside the repo.
**Why it happens:** Convenience — developers put passwords directly in the file they're editing.
**How to avoid:** Use `~/.gradle/gradle.properties` (global Gradle properties, never in repo) or environment variables. The project's `.gitignore` already excludes `*.keystore` but NOT `gradle.properties` at the android level.
**Warning signs:** `git diff` shows passwords in tracked files.

### Pitfall 3: EAS build uploads keystore to Expo servers
**What goes wrong:** If using EAS, Expo manages the keystore. If using local Gradle, EAS is irrelevant. Mixing the two causes confusion.
**Why it happens:** `eas build` has its own credential management; it expects to either generate or import a keystore.
**How to avoid:** Choose one path: local Gradle OR EAS cloud. Don't mix them.

### Pitfall 4: APK installs but API key is in bundle
**What goes wrong:** A developer hardcodes a key for testing, forgets to remove it, and it ends up in the shipped bundle.
**Why it happens:** Test credentials committed to source.
**How to avoid:** All API key access goes through `expo-secure-store`. Verify with bundle grep. Current codebase looks clean — `minimaxApi.ts` receives `credentials.apiKey` as a parameter, never hardcodes.
**Warning signs:** `grep -r "eyJ" assets/index.android.bundle` returns hits with non-test-looking strings.

### Pitfall 5: `ulimit -f unlimited` not applied when Gradle is spawned differently
**What goes wrong:** NDK linker fails with "File too large" on `libreanimated.so`.
**Why it happens:** Default macOS file size limit is too small for LTO-compiled native libraries.
**How to avoid:** Always use the established build command: `ulimit -f unlimited && ./gradlew assembleRelease --no-daemon ...`
**Warning signs:** Build fails during native compilation phase with "File too large" error.

### Pitfall 6: gradle.properties has all 4 ABI architectures but build.gradle `abiFilters` only has 2
**What goes wrong:** Build takes longer and may include architectures not needed; or ABI mismatch causes confusion.
**Current state:** `gradle.properties` has `reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64` but `build.gradle` `abiFilters` has only `"arm64-v8a", "x86_64"`. The `build.gradle` `abiFilters` wins for the APK.
**How to avoid:** For a release APK targeting real devices, `arm64-v8a` alone is sufficient for modern Android (2016+). `armeabi-v7a` adds ~15MB for old 32-bit devices. Keep current filters unless size is a concern.

## Code Examples

Verified patterns from official sources:

### Generating a Release Keystore
```bash
# Source: https://reactnative.dev/docs/signed-apk-android
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore invest-app/android/app/release.keystore \
  -alias invest-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### Configuring Gradle for Release Signing
```groovy
// invest-app/android/app/build.gradle
// Source: https://reactnative.dev/docs/signed-apk-android

android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file('release.keystore')
            storePassword INVEST_RELEASE_STORE_PASSWORD   // from gradle.properties
            keyAlias 'invest-release'
            keyPassword INVEST_RELEASE_KEY_PASSWORD       // from gradle.properties
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release   // was: signingConfigs.debug
            // ... rest unchanged
        }
    }
}
```

### Gradle Properties for Passwords (global, outside repo)
```properties
# ~/.gradle/gradle.properties  (never commit this file)
INVEST_RELEASE_STORE_PASSWORD=<password>
INVEST_RELEASE_KEY_PASSWORD=<password>
```

### Full Build Command (unchanged from existing workflow)
```bash
cd invest-app/android && ulimit -f unlimited && \
./gradlew assembleRelease --no-daemon \
  -x lint \
  -x lintVitalAnalyzeRelease \
  -x lintVitalReportRelease \
  -x lintVitalRelease \
  -x :react-native-worklets:bundleReleaseLocalLintAar
```

### APK Secret Audit
```bash
# Extract APK bundle
mkdir -p /tmp/apk-audit
cp invest-app/android/app/build/outputs/apk/release/app-release.apk /tmp/apk-audit/
cd /tmp/apk-audit && unzip -q app-release.apk

# Check for MiniMax API key (keys are long alphanumeric strings, not the URL)
# The URL api.minimax.io is acceptable (not a secret)
# Actual keys would be ~40+ char random strings in Authorization header context
strings assets/index.android.bundle | grep -iE "eyJ[a-zA-Z0-9_-]{30,}"
# Should return: no output (no JWT-format API keys)

# Also check for any explicit key variable names with values
grep -ao "apiKey[\"']?\s*[:=]\s*[\"'][^\"']{10,}[\"']" assets/index.android.bundle
# Should return: no output
```

### Verify Signing Certificate
```bash
# Source: Android apksigner documentation
apksigner verify --print-certs \
  invest-app/android/app/build/outputs/apk/release/app-release.apk
# Should show your release certificate, NOT "CN=Android Debug, OU=Android, O=Unknown, L=Unknown"
```

### Backup Keystore Outside Repo
```bash
# Backup to home directory (outside git repo)
cp invest-app/android/app/release.keystore ~/invest-app-release.keystore
# Verify it's gitignored (*.keystore is already in .gitignore)
git check-ignore invest-app/android/app/release.keystore  # should output the path
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `jarsigner` | Gradle `signingConfigs` | Android Gradle Plugin v1+ | Simpler, handles all signing schemes automatically |
| `ant release` | `./gradlew assembleRelease` | Gradle replaced Ant ~2014 | Standard for all RN projects |
| Separate APK per ABI | Fat APK or AAB | ~2019 | AAB is Google Play standard; APK still used for sideloading |

**Deprecated/outdated:**
- `jarsigner` for APK signing: replaced by `apksigner` (v2+ schemes). Gradle handles this automatically.
- `storeType JKS`: PKCS12 is now preferred (JKS is legacy Oracle format). Use `storetype PKCS12` in `keytool`.

## Open Questions

1. **EAS vs local Gradle — which does the success criterion refer to?**
   - What we know: Success criterion says "`eas build -p android --profile preview` completes" — this specifically calls for EAS.
   - What's unclear: EAS requires logging in (`eas login`) and registering the project. The project may or may not be registered with Expo.
   - Recommendation: Plan 07-01 should include EAS project registration check (`eas whoami`, `eas project:info`). If EAS is the required path, add `"android": { "buildType": "apk" }` to the preview profile to guarantee APK (not AAB) output.

2. **Where to back up the keystore?**
   - What we know: Success criterion says "keystore file is backed up outside the repository."
   - What's unclear: Specific backup destination not defined (home directory? external drive? password manager?).
   - Recommendation: `~/invest-app-release.keystore` is sufficient for the phase verification. Note the backup location in the phase summary.

3. **`apksigner` availability on macOS**
   - What we know: `apksigner` is part of Android Build Tools, available at `$ANDROID_HOME/build-tools/<version>/apksigner`.
   - What's unclear: PATH may not include it.
   - Recommendation: Use full path `$ANDROID_HOME/build-tools/35.0.0/apksigner` or verify availability before including in verification steps. Alternative: `keytool -printcert -jarfile app-release.apk`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (installed, used in phases 1-6) |
| Config file | `invest-app/package.json` scripts.test |
| Quick run command | `cd invest-app && npm test` |
| Full suite command | `cd invest-app && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-04 | App builds as Android APK | manual smoke | `adb install app-release.apk && adb shell am start -n com.hopyky.invest/.MainActivity` | N/A — build output |

Note: UI-04 is a build artifact requirement. There is no unit test for "APK exists and installs." The verification is:
1. Build completes without error (manual/CI)
2. APK installs on real device (manual smoke test)
3. Bundle grep finds no secrets (automated shell script)
4. Signing certificate is release cert (automated: `apksigner verify`)

### Sampling Rate
- **Per task commit:** `cd invest-app && npm test` (existing unit tests must stay green)
- **Per wave merge:** Full unit suite + APK build + device install
- **Phase gate:** Build success + device install + secret audit green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `invest-app/scripts/audit-apk.sh` — secret audit shell script (covers UI-04 security requirement)

*(No new unit test files needed — this phase is build infrastructure, not application logic)*

## Sources

### Primary (HIGH confidence)
- React Native official docs: https://reactnative.dev/docs/signed-apk-android — signing keystore setup
- Android developer docs: https://developer.android.com/studio/publish/app-signing — APK signing schemes
- Direct inspection of `invest-app/android/app/build.gradle` — current signing state confirmed

### Secondary (MEDIUM confidence)
- Expo EAS Build docs: https://docs.expo.dev/build/introduction/ — EAS preview profile behavior
- EAS JSON reference: https://docs.expo.dev/eas/json/ — `distribution: internal` produces APK

### Tertiary (LOW confidence)
- Community reports: `eas build` with `distribution: internal` defaults to APK for Android — verify with official docs that `buildType: "apk"` is not required when `distribution: "internal"` is set.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by direct file inspection of existing build setup
- Architecture (signing): HIGH — standard Android Gradle pattern, well-documented
- Security audit approach: HIGH — APK-is-ZIP is stable Android format fact
- EAS vs local Gradle decision: MEDIUM — success criterion explicitly names EAS but local Gradle is the established pattern

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable domain — Android signing APIs don't change often)
