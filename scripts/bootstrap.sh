#!/usr/bin/env bash
#
# Generates the two binary files the repo cannot store as text:
#   1. android/app/debug.keystore   (debug signing)
#   2. android/gradlew + gradle/wrapper/gradle-wrapper.jar  (Gradle wrapper)
#
# The launcher/TV icons are already committed as XML vectors, so nothing else is
# needed. Requires: a JDK (provides keytool) + curl + unzip. Safe to re-run.
#
# Usage:  bash scripts/bootstrap.sh
set -euo pipefail

GRADLE_VERSION="8.10.2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# 1. Debug keystore -----------------------------------------------------------
if [ -f android/app/debug.keystore ]; then
  echo "==> android/app/debug.keystore already exists — skipping"
else
  echo "==> Generating android/app/debug.keystore"
  keytool -genkeypair -v -storetype PKCS12 \
    -keystore android/app/debug.keystore \
    -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass android -keypass android \
    -dname "CN=Android Debug,O=Android,C=US"
fi

# 2. Gradle wrapper -----------------------------------------------------------
if [ -f android/gradle/wrapper/gradle-wrapper.jar ]; then
  echo "==> Gradle wrapper already present — skipping"
else
  echo "==> Generating Gradle wrapper ${GRADLE_VERSION}"
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  curl -fsSL "https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip" -o "$TMP/gradle.zip"
  unzip -q "$TMP/gradle.zip" -d "$TMP"
  ( cd android && "$TMP/gradle-${GRADLE_VERSION}/bin/gradle" wrapper --gradle-version "$GRADLE_VERSION" )
  chmod +x android/gradlew
fi

echo ""
echo "Done ✅  Next:"
echo "  cp .env.example .env"
echo "  npm start          # terminal 1 (Metro)"
echo "  npm run android    # terminal 2 (device/emulator running)"
