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
   - Play app-signing certificate SHA-256 (what installs from Play, and the
     universal APK below, are signed with):
     `32:DA:B7:8B:A3:FD:2A:7D:A1:D1:4A:3F:44:55:16:32:47:B8:C4:1B:A2:3E:09:A0:ED:F3:95:C8:29:E1:AE:E9`

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
- **Hotel mode: certified TVs never offer a Home chooser.** Google's own TV
  launchers declare HOME at priority 2 — both Google TV
  (`com.google.android.apps.tv.launcherx`) and Android TV
  (`com.google.android.tvlauncher`, checked on Android 9 and 14) — and our
  alias is 0, so Home always opens theirs. `HotelMode.homeChoice()` reports
  this as `locked`; `chooser` / `default` only happen on TVs whose vendor
  launcher has priority 0 (some AOSP sets). Two levels for a hotel:
  1. **Power-on and wake** (no adb): Hotel mode on + "Display over other
     apps" allowed (the Welcome screen card opens that setting, then asks for
     one restart from Settings). The app opens after a boot *and* when the TV
     wakes from standby (see "Auto-launch" below). Home on the remote still
     opens the TV's launcher.
  2. **Full home screen** (adb at install): also disable the stock launcher —
     `adb shell pm disable-user --user 0 com.google.android.tvlauncher`
     (Google TV: `com.google.android.apps.tv.launcherx`). Then Home opens the
     app, Back at the root stays in it, and boot opens it — no permission
     needed (verified on Android TV 14). Undo with `adb shell pm enable <pkg>`.
     Turning Hotel mode off while that launcher is disabled keeps the app as
     Home (`HotelMode.otherHomeAvailable`) instead of leaving Android's black
     FallbackHome; Home goes back to the TV within a minute of re-enabling it.
- **Auto-launch (Hotel mode), how it works.** Tuned on a real Xiaomi
  MiTV-MOOQ1 (Android 10, 1.8 GB, `ro.config.low_ram=true`):
  - Two processes. The main one runs the WebView (~150 MB). `:watch`
    (~20 MB) holds the boot receivers, a `SCREEN_ON` receiver and a 1×1
    transparent overlay window. The overlay makes it perceptible, so it is
    neither frozen in standby nor the low-memory killer's first pick; the
    main process, no longer held by the overlay, can be reclaimed while the
    guest uses YouTube. Hotel mode prefs are `MODE_MULTI_PROCESS` and written
    with `commit`; the main process pokes the watcher with an explicit,
    foreground-queue broadcast (`HotelMode.syncWatcher`).
  - Boot: `EarlyBootReceiver` (direct-boot aware, `LOCKED_BOOT_COMPLETED`)
    fires before `BOOT_COMPLETED`, waits for the storage unlock, adds the
    overlay and opens the app — before the TV's Home shows. `BOOT_COMPLETED`
    goes to every app one at a time (226 on that TV): at default priority the
    app opened ~3 min after power-on, at 999 ~40 s after Home. `BootReceiver`
    stays as the fallback.
  - Wake: the TV launcher reopens its Home ~0.1 s after the app comes up, so
    `HotelMode.bringToFrontAndInsist` re-checks every 1.5 s for 12 s.
  - Update: installing one stops both processes, and Play updates while the
    TV is in standby (on the Xiaomi no process was left after the 1.0.1
    update). `WatchSyncReceiver` also takes `MY_PACKAGE_REPLACED`, so the
    watcher and its overlay are back at once; without it the next wake showed
    the TV's Home until a restart.
  - The overlay grant can be lost to a power cut right after "Allow" on some
    TVs (emulator; the Xiaomi kept it), hence the one-restart card
    (`restartNeeded`, via `Settings.Global.BOOT_COUNT`).
  - Xiaomi has no per-app overlay page: `openOverlaySettings` falls back to
    the all-apps list. That list is a translucent side panel: the app stays
    *paused but visible* behind it, which never fires `visibilitychange`, so
    the setup card kept asking for the permission after it was granted.
    `MainActivity.onPause` now pauses the WebView, which hides the page.
  - The app paints in 5–15 s on a 32-bit ARM TV: the window shows a Nexgen
    splash and the WebView + page stay transparent until the first render.
  - Not handled: a force-stopped app gets no broadcasts until opened by hand
    (TV Manager's Memory boost / Optimise did *not* force-stop it).
- **Testing on a real TV:** Developer options → USB debugging, then
  `adb connect <TV-IP>:5555` (Xiaomi has no separate network-debugging switch)
  and accept the prompt on the TV. `adb exec-out screencap` breaks there; use
  `screencap -p /sdcard/x.png` + `adb pull`.
- **Testing boot with adb:** `adb reboot` is not a clean shutdown, and app-op
  changes (`appops set …`) are written to disk lazily, so a permission granted
  just before is lost. Run `adb shell appops write-settings` first, and reboot
  with `adb shell svc power reboot`.
- **Emulator crashes on this laptop** (qemu access violation; AMD Radeon Pro
  5300M under Boot Camp). Start it with `-gpu swiftshader_indirect` — that
  covers normal screens, but opening Razorpay checkout (and once, the
  on-screen keyboard) still crashes it in every GPU mode tried (host,
  swiftshader, guest, `-feature -Vulkan`). Test payments on a real TV.
- **No keyboard on arrival.** Focus seeding skips text fields, so a screen
  like Help Desk does not open the on-screen keyboard until the guest moves to
  the message box.

---

## Not yet done

- A real Razorpay payment (the emulator crashes on its checkout — see Gotchas).
  Confirm first whether the dev server's Razorpay key is `rzp_test_`.
- The `chooser` / `default` Hotel mode cases on a real TV whose launcher
  allows it (no emulator image has one).
- Play: App content, store settings, trader status, production release.
- Level 2 on the Xiaomi: it also lists `com.duokan.factorytest` (a factory
  test app) as a HOME at priority 0 — with the stock launcher disabled Home
  may offer it, and `otherHomeAvailable` counts it as a launcher.

Verified on a real Xiaomi MiTV-MOOQ1 (Android 10, WebView 157) against the dev
server (2026-11-12), debug build: pairing ("Android TV 10 · Xiaomi
MiTV-MOOQ1"), 1920 layout, overlay grant through the TV's own list, restart
card; app opens before Home on a Settings restart and after pulling the plug;
on wake from standby (from TV Home, over YouTube, after the main process was
killed, after 14 min of standby with YouTube); TV Manager Memory boost +
Optimise keep the watcher and do not force-stop; splash instead of a white
screen.

Verified on emulators against the dev server (2026-11-03/04):
- Google TV 14: pairing, check-in → dashboard, all tiles + Back with focus
  return, D-pad, OK, offline/online card, checkout → Welcome, reinstall
  re-pairs without a duplicate, Hotel mode on/off, locked-TV setup card,
  power-on auto-open.
- Android TV 14: Hotel mode with the stock launcher disabled (Home, Back,
  boot), and Hotel mode off without a launcher.
- Google TV 16 (target 36): power-on auto-open; `window.open` opens an
  overlay WebView that Back closes; `upi://` and off-site navigation blocked.
- Android TV 9 (WebView 66): the "update Android System WebView" message.
- Boot auto-open on Android 9 (no permission needed), 10, 11, 14, 16; wake
  from standby with the overlay on Google TV 14 (30 min), 16 and Android TV 11.
