#!/bin/bash
set -euo pipefail

# Remove file size limit — APK can exceed default 32MB limit
ulimit -f unlimited 2>/dev/null || true

APK_PATH="${1:-invest-app/android/app/build/outputs/apk/release/app-release.apk}"
AUDIT_DIR="/tmp/apk-audit-$$"

echo "=== APK Secret Audit ==="
echo "APK: $APK_PATH"

if [ ! -f "$APK_PATH" ]; then
  echo "FAIL: APK not found at $APK_PATH"
  exit 1
fi

# Extract APK
mkdir -p "$AUDIT_DIR"
cp "$APK_PATH" "$AUDIT_DIR/"
cd "$AUDIT_DIR"
unzip -qo "$(basename "$APK_PATH")"

BUNDLE="assets/index.android.bundle"
if [ ! -f "$BUNDLE" ]; then
  echo "FAIL: JS bundle not found in APK"
  rm -rf "$AUDIT_DIR"
  exit 1
fi

FAIL=0

# Check 1: No JWT-format API keys (MiniMax keys look like long base64 strings)
if strings "$BUNDLE" | grep -qE "eyJ[a-zA-Z0-9_-]{30,}"; then
  echo "FAIL: Found JWT-like token in bundle"
  FAIL=1
else
  echo "PASS: No JWT-like tokens found"
fi

# Check 2: No hardcoded apiKey assignments with values
if grep -aoq 'apiKey["\x27]\{0,1\}\s*[:=]\s*["\x27][^"\x27]\{10,\}["\x27]' "$BUNDLE"; then
  echo "FAIL: Found hardcoded apiKey assignment in bundle"
  FAIL=1
else
  echo "PASS: No hardcoded apiKey assignments"
fi

# Check 3: api.minimax.io URL is acceptable (it's a URL, not a secret)
if strings "$BUNDLE" | grep -q "api.minimax.io"; then
  echo "INFO: api.minimax.io URL found (acceptable — not a secret)"
fi

# Cleanup
rm -rf "$AUDIT_DIR"

if [ "$FAIL" -eq 0 ]; then
  echo ""
  echo "=== AUDIT PASSED ==="
  exit 0
else
  echo ""
  echo "=== AUDIT FAILED ==="
  exit 1
fi
