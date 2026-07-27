# Setup — generating the native shell

This repo contains the **complete JS/TS app plus all Android text config**
(`AndroidManifest.xml`, `build.gradle`, Kotlin `MainActivity`/`MainApplication`,
`gradle.properties`, `gradle-wrapper.properties`, etc.).

A few **binary** files that a text-based generator cannot produce are still
required for the first Android build:

| File                                                       | Why it's needed        |
| ---------------------------------------------------------- | ---------------------- |
| `android/gradle/wrapper/gradle-wrapper.jar`                | Gradle wrapper         |
| `android/gradlew`, `android/gradlew.bat`                   | Gradle launcher        |
| `android/app/debug.keystore`                               | Debug signing          |
| `android/app/src/main/res/mipmap-*/ic_launcher*.png`       | Launcher icons         |
| `android/app/src/main/res/drawable/rn_edit_text_material.xml` | Referenced by `styles.xml` |

## Option A — bootstrap script (recommended, Windows)

```powershell
# from the project root
npm install
powershell -ExecutionPolicy Bypass -File scripts/bootstrap.ps1
```

The script scaffolds a throwaway RN 0.76.6 project in your temp folder and copies
**only** the binary/asset files above into this repo — it never overwrites the
authored source or config.

## Option B — manual

```powershell
# 1. Scaffold a temp project with the SAME name + version
npx @react-native-community/cli@15.0.1 init WeblinkMobile --version 0.76.6 --directory C:\temp\WeblinkMobile --skip-install --skip-git-init

# 2. Copy the binaries into this repo (do NOT copy anything else)
Copy-Item C:\temp\WeblinkMobile\android\gradle\wrapper\gradle-wrapper.jar android\gradle\wrapper\
Copy-Item C:\temp\WeblinkMobile\android\gradlew* android\
Copy-Item C:\temp\WeblinkMobile\android\app\debug.keystore android\app\
Copy-Item C:\temp\WeblinkMobile\android\app\src\main\res\mipmap-* android\app\src\main\res\ -Recurse
Copy-Item C:\temp\WeblinkMobile\android\app\src\main\res\drawable\rn_edit_text_material.xml android\app\src\main\res\drawable\
```

## Then

```powershell
copy .env.example .env
npm run start:reset
npm run android
```

### Requirements

- Node >= 18, JDK 17, Android SDK (compileSdk 35, buildTools 35.0.0), NDK 27.1.12297006.
- An Android emulator, physical device, or **Android TV emulator** (create an
  "Android TV (1080p)" AVD in Android Studio to test D-pad navigation).

### Native modules (Phase 2)

Phase 2 added these native dependencies (already in `package.json`). After
`npm install`, autolinking wires them into the Android build — just rebuild
(`npm run android`). No manual linking is needed for RN 0.76.

| Package | Used by |
| --- | --- |
| `@react-native-community/datetimepicker` | Facilities → reserve (date/time) |
| `@react-native-community/netinfo` | Chat (online/offline detection) |
| `socket.io-client` | Chat (realtime) — pure JS, no native step |
| `react-native-razorpay` | Food → online payment |

`react-native-razorpay` also needs the Razorpay Android SDK (pulled via Gradle
autolinking) and a valid publishable key returned by the backend's
`initiatePayment` — no key is hard-coded in the app.

### Notes

- New Architecture is **off** (`android/gradle.properties → newArchEnabled=false`)
  for maximum native-library stability on this first build. `react-native-mmkv@2`
  supports the old architecture.
- After editing `.env`, restart Metro with `npm run start:reset` (env values are
  inlined at build time by `react-native-dotenv`).
- Vector-icon fonts are bundled via `apply from: fonts.gradle` in `android/app/build.gradle`.
