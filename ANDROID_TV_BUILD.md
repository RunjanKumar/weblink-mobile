# Build & install on Android TV / Google TV

## Why this exists

The Android TV app is **not** the React Native APK in `android/`. It is a small
Kotlin **WebView wrapper** (`androidtv/`) around the *same* web bundle LG
(`.ipk`) and Samsung (`.wgt`) ship. One TV codebase, three stores, and every
LG QA fix (D-pad focus, Back, pairing, offline card, Chromium 68 support)
applies to Android TV as well.

```
src/ ── webpack --env target=androidtv ── web-build-androidtv/
                                              │ copied into
androidtv/app/src/main/assets/www/  ◄─────────┘
   └── MainActivity: full-screen WebView
         https://appassets.androidplatform.net/assets/www/index.html
         window.NexgenTV  (TvBridge.kt)
```

The plan, Play Console steps and Hotel mode design are in
[docs/android-tv/ANDROID_TV_PLAY_HANDOFF.md](docs/android-tv/ANDROID_TV_PLAY_HANDOFF.md).

---

## Build

| Command | What it does |
| --- | --- |
| `npm run aab:install` | Debug APK → install + launch on the connected emulator/TV |
| `npm run aab` | Release: `dist-androidtv/NexgenHotels-<version>.aab` (Play) + `.apk` |
| `npm run aab -- --debug` | Debug APK only, no install |
| `npm run aab -- --dev` | Webpack development bundle (source maps) |
| `npm run aab -- --install --device emulator-5556` | Pick a device when several are connected |
| `npm run web:androidtv` | Dev server with the Android TV `index.html` (viewport 1920) |

`scripts/build-aab.mjs` runs webpack, copies the bundle into the wrapper's
assets, runs Gradle in `androidtv/` and copies the outputs to `dist-androidtv/`.
It runs Gradle on **Android Studio's bundled JDK (JBR, Java 21)** — the project
requires Java 21 and a system `JAVA_HOME` may be older.

**Before a Play upload:** bump `versionCode` (+1, every upload) and
`versionName` in `androidtv/app/build.gradle.kts`, and make sure `.env` has no
`DEV_LOGIN_*` (the script warns).

---

## First-time setup on a new machine

1. Android Studio (bundles SDK, emulator, JBR). SDK Platform **36.1** installs
   on first sync.
2. `ANDROID_HOME` = the SDK folder; `platform-tools` and `emulator` on `PATH`.
3. TV emulators (Device Manager → TV → Television 1080p):
   - **Google TV API 34** — Play Store, Google TV's launcher limits.
   - **Android TV API 28** (Android 9) — Home app / Hotel mode boot path.
     Ships **WebView 66**, older than the bundle needs (68+), so the app shows
     its "Please update Android System WebView" message there until a newer
     WebView APK is installed.
   - Intel Mac/PC: use `x86` images. Apple silicon: `arm64-v8a`.
4. Open `androidtv/` in Android Studio once and let it sync.
5. Upload key (release builds only):
   - Keystore at `~/keys/nexgenhotels-upload.jks`, alias `upload`.
   - `androidtv/keystore.properties` (**not in git**):
     ```
     storeFile=C:/Users/<you>/keys/nexgenhotels-upload.jks
     storePassword=…
     keyAlias=upload
     keyPassword=…
     ```
     Forward slashes — a backslash is an escape character in `.properties`.
   - **Back up the `.jks` and its password in two places.** Play App Signing
     keeps the real signing key; a lost upload key can be reset from Play
     Console, but no update can ship until it is.
   - Upload certificate SHA-256 (to recognise it):
     `5F:E5:F9:F5:2D:EC:6B:0A:65:BE:30:28:26:5D:54:AE:36:FC:E3:76:29:86:51:C2:D3:D9:C7:22:89:C7:C6:AD`

---

## Install on a TV without Play

Give hotels the **Play-signed universal APK** (Play Console → App bundle
explorer → Downloads), never the upload-key `.apk` from `dist-androidtv/`:
ANDROID_ID changes with the signing key, so a TV that moves between the two
pairs as a new device, and one cannot be installed over the other.

```powershell
adb connect <TV-IP>:5555        # Developer options → Network debugging on
adb install -r NexgenHotels.apk  # -r keeps data, so the TV stays paired
adb shell am start -n com.wattinventive.nexgenhotels/.MainActivity
```

---

## Debugging

Debug builds make the WebView inspectable:

- Chrome → `chrome://inspect` → the WebView appears under the emulator/TV.
- Or from a script: `adb shell cat /proc/net/unix | grep webview_devtools_remote`,
  then `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>` and use
  the DevTools protocol on `http://localhost:9222/json`.
- App logs: `adb logcat -s NexgenHotels`.

Quick health check from DevTools: `innerWidth` must be **1920** (not 960) and
`getComputedStyle(document.documentElement).zoom` **1.5**; `navigator.userAgent`
ends with `NexgenHotelsTV/<version>`; `typeof NexgenTV` is `"object"`.

---

## Version pins and why

| Item | Version | Why |
| --- | --- | --- |
| AGP / Gradle | 9.3.3 / 9.5.0 | From the Android Studio 2026.1 template — do not hand-pick |
| compileSdk / targetSdk / minSdk | 36.1 / 36 / 23 | Play wants the latest target (TV apps ≥ 34); 23 keeps Android 6 TVs |
| androidx.core | 1.18.0 | 1.19+ requires compileSdk 37 |
| androidx.webkit | 1.15.0 | 1.16+ requires minSdk 24 |
| androidx.activity | 1.13.0 | Pulls core 1.18.0 — fine |

Raise them together with compileSdk / minSdk, never one at a time. Check a
library's limits in its AAR: `minSdkVersion` in `AndroidManifest.xml`,
`minCompileSdk` in `META-INF/com/android/build/gradle/aar-metadata.properties`.

---

## Gotchas

- **Gradle can't download itself on the Windows laptop.** Java reaches Google
  Maven, Maven Central and the Gradle plugin portal, but times out on GitHub's
  release-asset host, where Gradle distributions now live (`curl` gets
  through). Download the zip named in
  `androidtv/gradle/wrapper/gradle-wrapper.properties` with `curl`, check it
  against `distributionSha256Sum`, and put it in
  `~/.gradle/wrapper/dists/gradle-<v>-bin/<hash>/` (the folder the failed
  attempt created) — the wrapper unpacks it on the next run.
- **CORS.** The WebView has a real origin (`https://appassets.androidplatform.net`),
  unlike LG/Samsung's `file://`. The backend must allow that origin
  (`CORS_ORIGINS`) and the `x-tv-token` header, or the TV sits on "Connecting
  to the hotel…" (handoff doc 7.3).
- **Viewport.** Android TV's WebView is DPR 2 on a 1080p panel (960 CSS px).
  `web/index.html` pins `width=1920` for this target and the wrapper turns on
  `useWideViewPort` + `loadWithOverviewMode`.
- **Back** never reaches the page as a keydown; `MainActivity` forwards it as a
  `nexgen:back` event. At the root, `rootBack()` finishes the app (TV Home —
  Google's rule TV-DB) unless Hotel mode is on.
- **OK** (DPAD_CENTER) is re-sent as Enter, so the page always sees keyCode 13,
  as on LG/Samsung.
- **Razorpay** `window.open` opens an overlay WebView; Back or `window.close()`
  closes it. `upi://` / `intent://` are blocked — a TV has no UPI apps.
- **No native code.** The wrapper has no `.so`, so Play's 64-bit and 16 KB
  page-size rules pass by construction. Keep it that way.
- **No backup / device transfer** of app data: the pairing token must stay on
  the TV it belongs to.

---

## Not yet done

- Backend: `hotelMode` + `PATCH /v1/tv/devices/:id`, CORS (handoff doc 7.2–7.3).
- Admin panel Hotel mode switch (7.4).
- Emulator checklist (handoff doc 11), incl. Hotel mode on the API 28 TV
  (needs a newer WebView there first).
- Play Console listing assets: 1280×720 TV banner, 1920×1080 screenshots.
