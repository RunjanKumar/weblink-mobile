# Nexgen Hotels — Android TV app: Google Play tak (Mac handoff)

**Date:** 30 Oct 2026 · **Branch:** `feature/android-tv` (weblink-mobile) · **Kiske liye:** Runjan + Mac pe chalne wala Claude Code

Ye doc Windows laptop pe hui saari research aur planning ka nichod hai, taaki Mac pe dobara R&D na karni pade. Isme kya banana hai, kyun, kis file mein, Mac kaise set karna hai, aur Play Console mein kya bharna hai, sab hai.

> **Mac wale Claude ke liye:** pehle ye poora doc padho. Section 13 ka order follow karo. Commit/push sirf tab karo jab Runjan bole (unka standing rule hai). Runjan ko Hinglish mein, step-by-step aur har step ka "kyun" batate hue samjhao. Paid service kabhi suggest mat karo (zero-spend rule).

---

## 0. Mac pe pehla din (quick start)

1. Ye doc poora padho (~25 min).
2. Section 8 se Mac set karo: Android Studio, emulator, repos, `.env`, keystore.
3. Phir Section 13 ka order follow karo: web code → wrapper → backend/admin → emulator test → Play Console.
4. Mac pe Claude Code ko bolo: "docs/android-tv/ANDROID_TV_PLAY_HANDOFF.md padho aur Section 13 ke step 1 se shuru karo."

---

## 1. Abhi ki sthiti (30 Oct 2026)

| Platform | Status | Code | Note |
|---|---|---|---|
| LG webOS | Seller Lounge mein **"QA Processing"** (submit 27 Oct). Abhi live nahi. | weblink-mobile `feature/lg-webos-qa` @ `1bcfe4f` (30 Oct ko push hua) | App ID `com.wattinventive.nexgenhotels`. LG QA setup: staff `lg.qa@wattinventive.com`, **Room 103**, guest "LG Tester" (2027-04-30 tak). LG QA chalne tak inhe mat chhedna. |
| Samsung Tizen | `.wgt` ready | Worktree `weblink-mobile-samsung` (origin/main) | Install kit: Windows laptop pe `C:\project\hotel\samsung-install-kit` |
| **Android TV** | **Abhi kuch bana nahi.** Ye doc hi plan hai. | `feature/android-tv` (= `1bcfe4f` + ye docs) | Google Play pe nayi listing |

**Google Play account:** pehle se hai, aur uspe home-automation app live hai. Woh alag product hai aur usme TV nahi hai. Hotel room-TV app **nayi, alag listing** banegi, isi account mein.

**Repos (teeno Mac pe chahiye):**

| Repo | GitHub | Kaam |
|---|---|---|
| weblink-mobile | `https://github.com/RunjanKumar/weblink-mobile.git` | TV app (React Native + web build) |
| Hotel-Automation | `https://github.com/Watt-Inventive/Hotel-Automation-2.git` | Backend (Node/Express, Mongo, socket.io) |
| Hotel-web-app | `https://github.com/pawananand234/Hotel-web-app.git` | Admin panel (Vite + React) |

**Backend URLs** (weblink-mobile `.env` se; `.env` git mein **nahi** hai):
- `API_BASE_URL=https://dev-hotel-api.wattinventive.com`
- `SOCKET_URL=https://chat-hotel-automation.wattinventive.com`
- `IMAGE_BASE_URL=https://d36u10gu6pvj0x.cloudfront.net`

---

## 2. Faisle jo ho chuke hain (aur kyun)

| Faisla | Kyun |
|---|---|
| **WebView wrapper APK** (Kotlin), jo wahi TV web-build chalaye jo LG/Samsung mein hai | Teeno TVs ka ek codebase rahega. LG QA ke saare fixes (D-pad focus, Back, pairing, offline card, Chromium 68 support) reuse honge. Wrapper mein native `.so` nahi hai, isliye Play ke 64-bit + 16 KB rules apne aap pass. |
| Purana RN `android/` project (`com.weblinkmobile`, debug keystore) **nahi chhoona** | Woh phone app ka hai. TV ka saara UX kaam web build pe hua hai. RN 0.76 pe 16 KB page-size bhi pakka nahi hai. |
| Package **`com.wattinventive.nexgenhotels`** (LG wala hi), **nayi Play listing** | Live home-automation app alag product hai, toh usse koi jod nahi. |
| Web bundle **APK ke andar** (assets) rahega, server se load nahi hoga | LG `.ipk` / Samsung `.wgt` jaisa hi. Offline boot hota hai, aur Play update se naya bundle aata hai. |
| **Hotel mode pehli release mein hi** (opt-in, admin panel ke per-TV switch se) | Client ko auto-start chahiye. Admin switch ki wajah se guest band nahi kar sakta, aur Google reviewer ke TV pe ye default **off** rahega. |
| "Coming soon" tiles (Netflix, Google Cast, Live TV, Explore Hotel) **hide** | LG jaisa. Reviewer ko adhoore buttons nahi dikhne chahiye. |
| Build/test **Mac** pe | Windows laptop pe kuch download nahi karna (Runjan ka rule). |

---

## 3. Architecture

```
Android TV / Google TV
└── Nexgen Hotels APK  (Kotlin wrapper, applicationId com.wattinventive.nexgenhotels)
    ├── MainActivity ── full-screen WebView
    │     page: https://appassets.androidplatform.net/assets/www/index.html
    │           (WebViewAssetLoader → APK ke assets/www/ = webpack androidtv build)
    ├── window.NexgenTV  (TvBridge: deviceId, deviceModel, rootBack,
    │                     setHotelMode, hotelModeStatus, openHomeChooser, openOverlaySettings)
    ├── HomeAlias  (HOME launcher alias — default DISABLED, Hotel mode on karta hai)
    └── BootReceiver (Hotel mode on ho toh power-on pe app kholta hai)

WebView ke andar ka JS  ──https──▶  dev-hotel-api.wattinventive.com  (REST + socket.io)
                        ──https──▶  checkout.razorpay.com (payment)
```

**Ek baat jo LG/Samsung se alag hai:** LG/Samsung apps `file://` se chalti hain aur koi `Origin` header nahi bhejti, isliye backend CORS unhe kabhi roka hi nahi. Android WebView ka page asli https origin (`https://appassets.androidplatform.net`) pe hota hai, isliye **CORS poori tarah lagu hoga**. Iske liye backend mein do kaam hain (Section 7.3).

---

## 4. Code map: aaj kya kahan hai

### 4.1 weblink-mobile

| File | Aaj kya karta hai | Android ke liye |
|---|---|---|
| `webpack.config.js` | Web bundle. `--env target=tizen` → `web-build-tizen/`, warna `web-build/` (webOS). Target `es2018` + babel `chrome 68`, `publicPath: ''` (relative). | `target=androidtv` → `web-build-androidtv/` |
| `web/index.html` | Template. 1920px pe `zoom: 1.5` (ten-foot scale). Tizen pe `webapis.js`. Boot error overlay. | Android ke liye viewport meta `width=1920` (Gotcha G1) |
| `src/utils/responsive.ts` | `IS_WEBOS`, `IS_TIZEN` (UA sniff), `IS_TV`, `IS_WEB_BUILD`, `SHOW_COMING_SOON = !IS_WEBOS` | `IS_ANDROID_TV_APP` add karna |
| `src/services/tvPlatform.web.ts` | `platform()`, `platformLabel()` (pairing pe `model` banke jaata hai), `deviceId()` (sirf Samsung DUID), `launchApp`/`showHdmi` (Tizen-only), diagnostics | `androidtv` platform + bridge |
| `src/services/tvPlatform.ts` | Native mirror, same exports | Type + no-op sync rakhna |
| `src/services/webosRemote.web.ts` | Remote handling: arrows → spatial focus, OK=13, Back (461 webOS / 10009 Tizen) → modal band → screen pop → root pe webOS `platformBack()`, Tizen swallow. `installWebOSRemote()` `index.web.js:58` pe call hota hai. | `handleBack()` refactor + `nexgen:back` event |
| `src/store/TvPresenceContext.tsx` | Zero-login: unpaired → 6-digit code (`startPairing({duid, model, appVersion})`), paired → `getState` (line ~173) → idle/guest. Socket `io(config.apiBaseUrl, {query:{tvToken}})`, `tv:refresh`. | `hotelMode` apply karna |
| `src/api/tv.api.ts` + `src/models/tv.model.ts` | TV API, apna axios client, header **`x-tv-token`** | `TvState.hotelMode?: boolean` |
| `src/screens/Settings/TvSettingsScreen.tsx` | TV settings + diagnostics (`MetaRow`) | Android-only "Hotel mode" section |
| `src/services/storage.service.web.ts` | `localStorage` (device token yahin) | WebView mein DOM storage ON zaroori |
| `src/services/paymentService.web.ts` | Razorpay `checkout.js` on-demand inject | WebView popup handling (G6) |
| `scripts/build-wgt.mjs` | Node build script ka pattern (Mac + Windows) | `scripts/build-aab.mjs` isi style mein |
| `android/` | RN phone app | **Mat chhoona** |
| `CLOUD_BUILD.md` | Purana RN APK cloud-build doc (pairing se pehle ka) | Sirf reference |

### 4.2 Hotel-Automation (backend)

| File | Aaj | Android ke liye |
|---|---|---|
| `app/models/tvDeviceModel.js` | `hotelId, roomId, name, tokenHash, duid, model, appVersion, lastSeenAt…` | `hotelMode` field |
| `app/controllers/tvController.js` | `startPairing`, `confirmPairing` (same `duid` wala purana device replace karta hai, lines ~157/189), `getState` (line ~225), `listDevices`, `unpairDevice`, `toDeviceView` (line ~38) | `hotelMode` in view/state + `setHotelMode` |
| `app/routes/v1/tvRoutes.js` | `DELETE /v1/tv/devices/:id` (permission `GENERAL_PERMISSION.MODIFY_ROOM`, auth `HOTEL_STAFF`) | `PATCH /v1/tv/devices/:id` |
| `app/services/tvService.js` | `notifyRoom(roomId)` → socket `tv:refresh`; `notifyUnpaired` | Reuse |
| `app/utils/corsUtils.js` | `ALLOWED_HEADERS` (isme **`x-tv-token` nahi hai**), `originHandler`: Origin na ho → allow; production mein `CORS_ORIGINS` allowlist | `x-tv-token` add + env |
| `tests/tv/tvController.test.js` | TV tests | Naye tests |

### 4.3 Hotel-web-app (admin)

| File | Aaj | Android ke liye |
|---|---|---|
| `src/pages/tvDevices/index.tsx` | Paired TVs ki list | "Hotel mode" switch column |
| `src/pages/tvDevices/components/cell-action.tsx` | Unpair button (`MODIFY_ROOM` permission) | Pattern reuse |
| `src/store/api/tvDevices/tv-devices.api.ts` | `getTvDevices`, `lookupTvPairing`, `pairTv`, `unpairTv` | `setTvHotelMode` mutation |

---

## 5. Part 1: Web code changes (weblink-mobile)

### 5.1 `webpack.config.js`
```js
// abhi: const tvTarget = env.target === 'tizen' ? 'tizen' : 'webos';
const tvTarget = ['tizen', 'androidtv'].includes(env.target) ? env.target : 'webos';
const outputDir = path.resolve(__dirname, {
  tizen: 'web-build-tizen',
  androidtv: 'web-build-androidtv',
  webos: 'web-build',
}[tvTarget]);
```
Header comment bhi update karna (teen targets).

### 5.2 `web/index.html`: viewport (Gotcha G1)
Android TV WebView ka CSS viewport 1080p TV pe sirf **960px** hota hai (density xhdpi, `devicePixelRatio` 2). LG pe layout 1920px pe hota hai, phir `zoom 1.5`. Same look ke liye Android build mein viewport 1920 fix karo:
```html
<% if (tvTarget === 'androidtv') { %>
<meta name="viewport" content="width=1920, user-scalable=no" />
<% } else { %>
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
<% } %>
```
Saath mein wrapper mein `useWideViewPort = true` + `loadWithOverviewMode = true` (Section 6.5). **Emulator pe verify:** `window.innerWidth === 1920` aur `:root` pe `zoom: 1.5` laga ho.

### 5.3 `src/utils/responsive.ts`
```ts
/**
 * True inside the Android TV wrapper APK (androidtv/). Its WebView appends
 * "NexgenHotelsTV/<version>" to the user agent; nothing else does.
 */
function isAndroidTvApp(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') {
    return false;
  }
  return /NexgenHotelsTV\//.test(navigator.userAgent);
}
export const IS_ANDROID_TV_APP: boolean = isAndroidTvApp();
export const IS_TV: boolean = Platform.isTV === true || IS_WEBOS || IS_TIZEN || IS_ANDROID_TV_APP;
export const SHOW_COMING_SOON: boolean = !IS_WEBOS && !IS_ANDROID_TV_APP;
```
`IS_WEB_BUILD` ka comment "false in every Android .apk" galat ho jayega. Use theek karo: wrapper APK bhi web build hai, sirf RN phone/TV APK native hai.

### 5.4 `src/services/tvPlatform.web.ts`
```ts
interface NexgenTvBridge {
  deviceId(): string;
  deviceModel(): string;
  rootBack(): void;
  setHotelMode(on: boolean): void;
  hotelModeStatus(): string;      // JSON: {on, defaultHome, canDrawOverlays}
  openHomeChooser(): void;
  openOverlaySettings(): boolean; // false = TV pe ye settings screen nahi hai
}
const androidTv = (): NexgenTvBridge | undefined =>
  (window as unknown as {NexgenTV?: NexgenTvBridge}).NexgenTV;
```
- `TvPlatformName` mein `'androidtv'` (dono files mein).
- `platform()`: `IS_ANDROID_TV_APP` → `'androidtv'`.
- `platformLabel()`: `Android TV 11 · ONETOUCH 43XYZ`, version UA ke `Android ([\d.]+)` se aur model bridge ke `deviceModel()` se. Wajah: admin TV list mein brand dikhe. Hotel-web-app ka switch isi "Android TV" prefix se pehchanega.
- `deviceId()`: Android pe `androidTv()?.deviceId() || null`. Ye ANDROID_ID hai. Backend ise `duid` ki tarah store karta hai aur re-pair pe purana record hata deta hai.
- Naye exports: `rootBack()`, `setHotelMode(on)`, `hotelModeStatus()`, `openHomeChooser()`, `openOverlaySettings()`. Android ke bahar ye no-op ya safe default rahenge.
- `src/services/tvPlatform.ts` (native) mein bhi same signatures, no-op. Dono files sync rakhni hain, ye file ke header mein likha hai.

### 5.5 `src/services/webosRemote.web.ts`: Back
Abhi Back logic keydown handler ke andar hai (lines ~400-415). Ise function mein nikaalo aur Android event bhi sun lo:
```ts
function handleBack(): void {
  if (closeTopModal() || goBackIfPossible()) {
    return;
  }
  if (IS_ANDROID_TV_APP) {
    rootBack(); // native: normal mode → TV Home (Google rule TV-DB); Hotel mode → kuch nahi
    return;
  }
  if (!IS_TIZEN) {
    platformBack();
  }
}
// keydown: KEY_BACK_WEBOS / KEY_BACK_TIZEN → event.preventDefault(); handleBack();
// installWebOSRemote() ke andar:
window.addEventListener('nexgen:back', handleBack);
```
Android remote ka Back WebView tak keydown ke roop mein nahi pahunchta. Activity use pakad ke `nexgen:back` event bhejti hai (Section 6.5). File ke top comment mein Android TV ki line bhi jodo.

### 5.6 `src/store/TvPresenceContext.tsx` + `tv.model.ts`
- `TvState` mein `hotelMode?: boolean`.
- `getState` ke baad (line ~177, `setRoom` ke paas): `setHotelMode(state.hotelMode === true)`.
- `forgetDevice()` (unpair/revoke) mein: `setHotelMode(false)`.
- Pairing phase shuru hote waqt (koi device token nahi) bhi `setHotelMode(false)`. Wajah: app data clear hone ke baad native flag atka na rahe.

### 5.7 `src/screens/Settings/TvSettingsScreen.tsx`
Sirf `IS_ANDROID_TV_APP` pe ek "Hotel mode" section, existing `MetaRow` style mein:
- Hotel mode: On/Off (admin se aata hai).
- Home app: "Nexgen Hotels ✓" ya "Set nahi". Set nahi ho toh button **"Set as Home app"** → `openHomeChooser()`.
- Display over other apps (sirf Android 10+ fallback ke liye): allowed/nahi. Button → `openOverlaySettings()`. Agar `false` aaye toh text dikhao: `adb shell appops set com.wattinventive.nexgenhotels SYSTEM_ALERT_WINDOW allow`.

### 5.8 Build script `scripts/build-aab.mjs` (+ `package.json` `"aab"`)
`build-wgt.mjs` jaisa, Node mein, Mac + Windows dono pe:
1. `npx webpack --mode production --env target=androidtv` → `web-build-androidtv/`
2. Use `androidtv/app/src/main/assets/www/` mein copy (purana saaf karke).
3. `androidtv/gradlew :app:bundleRelease :app:assembleRelease` (Windows pe `gradlew.bat`).
4. `dist-androidtv/NexgenHotels-<versionName>.aab` + `.apk` mein copy.
5. Flags:
   - `--debug` → `assembleDebug` (sirf APK, `chrome://inspect` ke liye).
   - `--install` → `adb install -r <apk>` + `adb shell am start -n com.wattinventive.nexgenhotels/.MainActivity`.
   - `--device <serial>`.
6. Pehle check karo `ANDROID_HOME` / `adb` mile ya nahi. Na mile toh saaf error do.

`.gitignore` mein: `web-build-androidtv/`, `dist-androidtv/`, `androidtv/app/src/main/assets/www/`, `androidtv/keystore.properties`, `*.jks`, `androidtv/.gradle/`, `androidtv/build/`, `androidtv/app/build/`, `androidtv/local.properties`.

Docs: `ANDROID_TV_BUILD.md` (`WEBOS_BUILD.md` jaisa). Build, install aur release ke steps.

---

## 6. Part 2: Native wrapper `androidtv/`

### 6.1 Project kaise banaye (version ki research bachane ke liye)
Gradle/AGP/Kotlin ke versions khud mat chuno. **Android Studio template** se banao, woh matching versions aur Gradle wrapper (`gradlew` + jar) khud bana deta hai:
1. Android Studio → **New Project** → left mein **Television** → **No Activity** → Next.
2. Name `Nexgen Hotels`, Package `com.wattinventive.nexgenhotels`, Save location **`<weblink-mobile>/androidtv`**, Language Kotlin, Minimum SDK **API 23**, Build config language **Kotlin DSL** → Finish.
3. Phir neeche ke specs ke hisaab se files add/edit karo.

Template banne ke baad agar woh Compose/Leanback ki dependencies daale, toh unhe hata do. Humein sirf `androidx.activity`, `androidx.webkit` aur `androidx.core` chahiye.

### 6.2 File tree
```
androidtv/
├── settings.gradle.kts, build.gradle.kts, gradle.properties, gradlew, gradle/wrapper/…
├── keystore.properties          (git mein NAHI)
└── app/
    ├── build.gradle.kts
    └── src/main/
        ├── AndroidManifest.xml
        ├── assets/www/          (build script bharegi, git mein NAHI)
        ├── java/com/wattinventive/nexgenhotels/
        │   ├── MainActivity.kt
        │   ├── TvBridge.kt
        │   ├── HotelMode.kt
        │   └── BootReceiver.kt
        └── res/
            ├── drawable-xhdpi/banner.png      (320×180, asli design)
            ├── mipmap-*/ic_launcher.png
            └── values/strings.xml, themes.xml
```

### 6.3 `app/build.gradle.kts` (zaroori hisse)
```kotlin
android {
    namespace = "com.wattinventive.nexgenhotels"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.wattinventive.nexgenhotels"
        minSdk = 23
        targetSdk = 35          // TV apps ke liye Play ka minimum 34 (Gotcha G9)
        versionCode = 1         // har Play upload pe +1
        versionName = "1.0.0"
    }
    signingConfigs {
        create("release") {
            val p = java.util.Properties().apply {
                rootProject.file("keystore.properties").takeIf { it.exists() }?.inputStream()?.use { load(it) }
            }
            storeFile = p.getProperty("storeFile")?.let { file(it) }
            storePassword = p.getProperty("storePassword")
            keyAlias = p.getProperty("keyAlias")
            keyPassword = p.getProperty("keyPassword")
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false   // wrapper chhota hai; R8 ki zaroorat nahi
            signingConfig = signingConfigs.getByName("release")
        }
    }
    buildFeatures { buildConfig = true }
}
dependencies {
    implementation("androidx.activity:activity-ktx:<latest>")
    implementation("androidx.webkit:webkit:<latest>")
    implementation("androidx.core:core-ktx:<latest>")
}
```
`<latest>` Android Studio khud suggest karta hai (Project Structure → Suggestions).

### 6.4 `AndroidManifest.xml`
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />

    <!-- TV-only app: Play ise sirf TV pe dikhayega -->
    <uses-feature android:name="android.software.leanback" android:required="true" />
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />

    <!-- Android 11+ package visibility: Home app kaun hai, ye padhne ke liye -->
    <queries>
        <intent>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.HOME" />
        </intent>
    </queries>

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:banner="@drawable/banner"
        android:theme="@style/Theme.NexgenHotels"
        android:allowBackup="false"
        android:supportsRtl="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:screenOrientation="landscape"
            android:configChanges="keyboard|keyboardHidden|navigation|orientation|screenLayout|screenSize|smallestScreenSize|uiMode">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
            <!-- AOSP "smart TV" (bina Leanback launcher, shayad OneTouch) ki app list ke liye -->
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Hotel mode: TV ka Home app. Default DISABLED; HotelMode.kt enable karta hai -->
        <activity-alias
            android:name=".HomeAlias"
            android:targetActivity=".MainActivity"
            android:enabled="false"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.HOME" />
                <category android:name="android.intent.category.DEFAULT" />
            </intent-filter>
        </activity-alias>

        <receiver android:name=".BootReceiver" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
            </intent-filter>
        </receiver>
    </application>
</manifest>
```
**Mat daalna:** `QUERY_ALL_PACKAGES`, `REQUEST_INSTALL_PACKAGES`, `FOREGROUND_SERVICE*`. Inke liye Play pe alag declaration bharni padti hai aur rejection ka risk badhta hai.

### 6.5 `MainActivity.kt` (sketch; Mac pe compile karke theek karna)
```kotlin
class MainActivity : ComponentActivity() {
    private var webView: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Hamara bundle Chromium 68+ maangta hai. Purana WebView = black screen, isliye saaf message dikhao.
        val major = WebViewCompat.getCurrentWebViewPackage(this)
            ?.versionName?.substringBefore('.')?.toIntOrNull() ?: 0
        if (major in 1..67) { showMessage(getString(R.string.update_webview)); return }

        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)

        val assets = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        val wv = WebView(this).apply {
            setBackgroundColor(0xFFF5F2EE.toInt())          // index.html ka boot background
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true                 // pairing token localStorage mein
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.useWideViewPort = true                   // viewport width=1920 maano (G1)
            settings.loadWithOverviewMode = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.setSupportMultipleWindows(true)          // Razorpay popups (G6)
            settings.javaScriptCanOpenWindowsAutomatically = true
            settings.userAgentString =
                settings.userAgentString + " NexgenHotelsTV/" + BuildConfig.VERSION_NAME
            addJavascriptInterface(TvBridge(this@MainActivity), "NexgenTV")
            webViewClient = object : WebViewClientCompat() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest) =
                    assets.shouldInterceptRequest(request.url)
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val host = request.url.host ?: return true
                    // main frame sirf apne origin ya Razorpay pe; upi://, intent:// waghera block
                    return !(host == "appassets.androidplatform.net" || host.endsWith("razorpay.com"))
                }
                override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                    (view.parent as? ViewGroup)?.removeView(view); view.destroy()
                    recreate(); return true                   // crash loop ke bajaye fresh start
                }
            }
            webChromeClient = object : WebChromeClient() {
                // Razorpay window.open: ek child WebView overlay mein kholo, onCloseWindow pe hatao (G6)
            }
        }
        webView = wv
        setContentView(wv)

        // Remote ka Back → JS (webosRemote.web.ts ka handleBack)
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                wv.evaluateJavascript("window.dispatchEvent(new Event('nexgen:back'))", null)
            }
        })

        if (savedInstanceState == null) wv.loadUrl("https://appassets.androidplatform.net/assets/www/index.html")
    }

    override fun onDestroy() { webView?.destroy(); super.onDestroy() }
}
```
Notes:
- `onRenderProcessGone` API 26+ pe hi aata hai. minSdk 23 hai, toh override safe hai (purane OS pe call hi nahi hoga).
- D-pad arrows WebView mein keyCode 37–40 aur number keys 48–57 bante hain. **DPAD_CENTER ka keyCode 13 (Enter) aata hai ya nahi, emulator pe verify karo.** Na aaye toh `dispatchKeyEvent` mein `KEYCODE_DPAD_CENTER` ko `KEYCODE_ENTER` mein badal ke WebView ko do.
- Text field focus pe Android TV ka on-screen keyboard aata hai. Back pehle keyboard band karta hai, ye normal hai.

### 6.6 `TvBridge.kt`
```kotlin
class TvBridge(private val activity: MainActivity) {
    @JavascriptInterface fun deviceId(): String =
        Settings.Secure.getString(activity.contentResolver, Settings.Secure.ANDROID_ID) ?: ""
    @JavascriptInterface fun deviceModel(): String = "${Build.MANUFACTURER} ${Build.MODEL}".trim()
    @JavascriptInterface fun rootBack() = activity.runOnUiThread {
        if (!HotelMode.isOn(activity)) activity.finish()   // TV Home (Google rule TV-DB)
    }
    @JavascriptInterface fun setHotelMode(on: Boolean) = activity.runOnUiThread { HotelMode.set(activity, on) }
    @JavascriptInterface fun hotelModeStatus(): String = HotelMode.statusJson(activity)
    @JavascriptInterface fun openHomeChooser() = activity.runOnUiThread {
        activity.startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    @JavascriptInterface fun openOverlaySettings(): Boolean = try {
        activity.startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${activity.packageName}")))
        true
    } catch (e: ActivityNotFoundException) { false }      // kai TVs pe ye screen hoti hi nahi
}
```
JS-interface methods background thread pe chalte hain, isliye UI ka kaam `runOnUiThread` mein karna hai.

### 6.7 `HotelMode.kt`
```kotlin
object HotelMode {
    private const val PREFS = "hotel_mode"; private const val KEY_ON = "on"
    fun isOn(ctx: Context) = ctx.getSharedPreferences(PREFS, 0).getBoolean(KEY_ON, false)
    fun set(ctx: Context, on: Boolean) {
        if (isOn(ctx) == on) return
        ctx.getSharedPreferences(PREFS, 0).edit().putBoolean(KEY_ON, on).apply()
        ctx.packageManager.setComponentEnabledSetting(
            ComponentName(ctx, "${ctx.packageName}.HomeAlias"),
            if (on) PackageManager.COMPONENT_ENABLED_STATE_ENABLED
            else PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
            PackageManager.DONT_KILL_APP)
    }
    fun isDefaultHome(ctx: Context): Boolean = ctx.packageManager.resolveActivity(
        Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME),
        PackageManager.MATCH_DEFAULT_ONLY)?.activityInfo?.packageName == ctx.packageName
    fun statusJson(ctx: Context): String = JSONObject()
        .put("on", isOn(ctx))
        .put("defaultHome", isDefaultHome(ctx))
        .put("canDrawOverlays", Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(ctx))
        .toString()
}
```
Hotel mode on hone pe app **khud Home chooser nahi kholti.** Agar TV pe pehle se koi default Home set hai, toh chooser ki jagah seedha stock launcher khul jata aur guest ke saamne app gayab ho jata. Isliye staff Settings screen se "Set as Home app" dabata hai (Section 5.7).

### 6.8 `BootReceiver.kt`
```kotlin
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (!HotelMode.isOn(context)) return
        context.startActivity(Intent(context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}
```
Android 10+ pe background se activity kholna block hai. Ye tabhi chalega jab:
- "Display over other apps" allowed ho, ya
- app pehle se Home app ho (tab system khud khol deta hai, receiver ki zaroorat hi nahi).

Android 9 aur neeche ye seedha chalta hai.

### 6.9 Resources
- `banner.png` **320×180** (xhdpi), launcher banner. Logo poori jagah bhare (Gotcha G11). LG/Samsung branding se banao.
- `ic_launcher` LG ke 512 icon se (Android Studio → New → Image Asset).
- Theme: `Theme.NexgenHotels` = NoActionBar, fullscreen, `android:windowBackground` `#F5F2EE` (white flash na ho).
- `strings.xml`: `app_name` = "Nexgen Hotels", `update_webview` = "Please update Android System WebView to use Nexgen Hotels."

---

## 7. Part 3: Hotel mode (backend + admin)

### 7.1 Flow
```
Admin panel (TV Devices) ── switch ON ──▶ PATCH /v1/tv/devices/:id {hotelMode:true}
  ▶ tvDevices.hotelMode = true ▶ tvService.notifyRoom(roomId)  (socket "tv:refresh")
  ▶ TV: GET /v1/tv/state ▶ {…, hotelMode:true}
  ▶ JS setHotelMode(true) ▶ NexgenTV.setHotelMode(true) ▶ HomeAlias ENABLED
  ▶ Staff TV pe: Settings → "Set as Home app" → Nexgen Hotels → Always
Ab: power-on / Home button / standby se wake → app;  root pe Back → kuch nahi
Switch OFF ▶ alias DISABLED ▶ TV ka stock Home wapas;  root pe Back → TV Home
Unpair ▶ JS setHotelMode(false)
```
Wajah: guest Hotel mode band nahi kar sakta, staff remote se control karta hai, aur Google reviewer ke paired TV pe ye default **off** rehta hai.

### 7.2 Backend (Hotel-Automation)
- `tvDeviceModel.js`: `hotelMode: { type: Boolean, default: false }`. Header comment "An in-room Samsung (Tizen) TV" → "An in-room TV (Samsung, LG, Android TV)".
- `tvController.js`:
  - `toDeviceView` mein `hotelMode: !!device.hotelMode`.
  - `getState` ke `base` mein `hotelMode: !!device.hotelMode`.
  - Naya `tvController.setHotelMode = async (payload)`: `{id, hotelMode, user}` → `findOneAndUpdate({_id: id, hotelId: user.hotelId, isDeleted: false}, {$set: {hotelMode}})`. Na mile → `TV_DEVICE_NOT_FOUND`. Phir `tvService.notifyRoom(device.roomId)` aur success response (`toDeviceView`).
- `tvRoutes.js`: `DELETE /v1/tv/devices/:id` jaisa hi:
```js
{
  method: 'PATCH',
  path: '/v1/tv/devices/:id',
  joiSchemaForSwagger: {
    headers: { authorization: Joi.string().required().description("Your's JWT token.") },
    params: { id: Joi.string().objectId().required() },
    body: { hotelMode: Joi.boolean().required() },
    group: 'TV',
    description: 'Hotel mode on/off for an Android TV (home app + start on power-on).',
    model: 'TV_DEVICE_HOTEL_MODE',
  },
  permission: [PERMISSION_TYPES.GENERAL, GENERAL_PERMISSION.MODIFY_ROOM],
  auth: AVAILABLE_AUTHS.HOTEL_STAFF,
  handler: tvController.setHotelMode,
},
```
(Success message ke liye `MESSAGES` mein nayi key chahiye ho toh add karo, existing pattern dekh ke.)
- `tests/tv/tvController.test.js`: ye cases:
  - Default false.
  - PATCH true → `getState` mein true + `notifyRoom` call hua.
  - Doosre hotel ka device → not found.
  - Unpaired (isDeleted) device → not found.

### 7.3 CORS: Android ke liye **zaroori** (Gotcha G2)
1. **Code:** `app/utils/corsUtils.js` ke `ALLOWED_HEADERS` mein **`'x-tv-token'`** jodo, ek comment ke saath (Android TV WebView ka origin hota hai, isliye preflight mein ye header allowed hona chahiye). Iske bina Android TV pe pairing ke baad `/v1/tv/state` ka preflight fail hoga aur TV "offline" dikhega.
2. **Env (deploy pe):** server ke `CORS_ORIGINS` mein `https://appassets.androidplatform.net` jodo (comma-separated, purane origins rakhte hue) aur restart karo. API server pe zaroori hai (TV presence ka socket bhi wahi hai, `io(config.apiBaseUrl)`). Chat server (`chat-hotel-automation…`) alag deploy ho toh wahan bhi.
   - Risk nahi hai: auth `Authorization` / `x-tv-token` header mein jaata hai, cookie mein nahi.
   - `originHandler` ke comment mein Android TV ka zikr jod do.
3. Refused origin backend log mein laal "CORS: refused origin …" line se dikhta hai. Debug karte waqt wahi dekhna.

### 7.4 Admin (Hotel-web-app)
- `tv-devices.api.ts`:
```ts
setTvHotelMode: builder.mutation({
  query: ({id, hotelMode}: {id: string; hotelMode: boolean}) => ({
    url: `v1/tv/devices/${id}`,
    method: 'PATCH',
    body: {hotelMode},
  }),
}),
```
- `pages/tvDevices/index.tsx`: "Hotel mode" column mein Switch. Sirf tab dikhe jab `model` "Android TV" se shuru ho, warna "—". Permission `MODIFY_ROOM` (`usePermissions`, `cell-action.tsx` jaisa). Change hone pe `showMessage` + refetch.
- Help text / tooltip: "On karne ke baad TV pe Settings → Set as Home app → Nexgen Hotels → Always. Google TV pe Home app nahi badalta, wahan TV sirf full power-on pe app kholega (Quick start / Instant-on band karein)."

### 7.5 Hotel mode ki limits (docs + help text mein likhna)
- **Google TV** third-party Home app chunne nahi deta. Wahan standby se wake pe app nahi khulega, sirf full boot pe (aur Android 10+ pe "Display over other apps" allowed hona chahiye).
  - Upay 1: TV ki Settings mein **Quick start / Instant-on band** karo, taaki power-on = full boot.
  - Upay 2: vendor ka hotel menu ("power-on app").
- Kuch TVs pe pehle se koi default Home set hota hai. Tab chooser nahi aata. Staff ko Settings → Apps → (stock launcher) → **Clear defaults** karna padega.
- Hotel mode mein guest dusre apps (YouTube waghera) remote ke Netflix/YouTube/Input buttons se khol sakta hai. Home dabane pe hamara app wapas aata hai.

---

## 8. Mac setup (click-by-click)

### 8.1 Basic tools
1. **Git:** Terminal mein `git --version`. Na ho toh macOS khud "Command Line Developer Tools" install karne ko puchega → Install.
2. **Node 20+:** nodejs.org se LTS `.pkg` → install → `node -v`.
3. **Android Studio:** developer.android.com/studio → Mac ke chip ke hisaab se `.dmg` (Apple chip = M1/M2/M3/M4; Intel alag) → Applications mein drag → open → **Standard** setup. Ye SDK, platform-tools, emulator aur JDK sab le aata hai (free).

### 8.2 SDK
Android Studio → **Settings → Languages & Frameworks → Android SDK**:
- **SDK Platforms:** Android 15 (API 35) ✓.
- **SDK Tools:** Android SDK Build-Tools, Platform-Tools, Emulator ✓ → Apply.

### 8.3 Do TV emulators (AVD)
**Device Manager → + → Create Virtual Device → category "TV" → "Television (1080p)" → Next:**
1. **AVD A: Google TV (Play Store wala), API 34.** Play internal-test install aur Google TV ki launcher limit test karne ke liye.
2. **AVD B: Android TV (non-Google TV), sabse purani available.** Purane TV, Home app chunna, aur Android 9/10+ boot path ke liye.
   - Apple-chip Mac pe sirf **arm64-v8a** images chalti hain, jo shayad API 30/31 se shuru ho. Jo sabse purani "Android TV" arm64 image mile woh lo.
   - Intel Mac pe API 28 x86 bhi mil jayegi.

Remote: emulator ke side panel mein D-pad hai, ya keyboard arrows + Enter + Esc (Back).

### 8.4 Terminal env (`~/.zshrc` mein add, phir naya Terminal)
```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```
Check: `adb version`, `java -version`.

### 8.5 Repos + `.env`
```bash
mkdir -p ~/project/hotel && cd ~/project/hotel
git clone https://github.com/RunjanKumar/weblink-mobile.git
git clone https://github.com/Watt-Inventive/Hotel-Automation-2.git Hotel-Automation
git clone https://github.com/pawananand234/Hotel-web-app.git
cd weblink-mobile && git checkout feature/android-tv && npm ci --legacy-peer-deps
```
- `.env` Windows laptop ke `C:\project\hotel\weblink-mobile\.env` se **surakshit tareeke se** copy karo (pendrive ya private chat). Email/public jagah se nahi. Ye git mein nahi hai.
- Hotel-Automation aur Hotel-web-app ki branches unke team ke current workflow ke hisaab se lo (Windows pe abhi `development-07-10-2026` aur `feature/clinical-module-gate` checked out hain).

### 8.6 Upload keystore (sirf ek baar; bahut zaroori)
```bash
mkdir -p ~/keys
keytool -genkeypair -v -keystore ~/keys/nexgenhotels-upload.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```
`androidtv/keystore.properties` (git mein **nahi**):
```
storeFile=/Users/<aap>/keys/nexgenhotels-upload.jks
storePassword=…
keyAlias=upload
keyPassword=…
```
- `.jks` ka **do jagah backup** karo (jaise Google Drive private folder + pendrive). Password password-manager mein rakho.
- Ye **upload key** hai. Play App Signing mein asli app-signing key Google rakhta hai. Upload key kho jaye toh Play Console se reset ho sakti hai (free, kuch din lagte hain), lekin tab tak koi update nahi ja payega.

### 8.7 Pehla build + run
```bash
npm run aab -- --debug --install     # debug APK → emulator → launch
npm run aab                          # release: dist-androidtv/*.aab + *.apk
```
Debug build mein Mac Chrome → `chrome://inspect` → WebView dikhega → console/DOM dekh sakte ho.

---

## 9. Play Console (click-by-click)

**0. Account type check (timeline ke liye zaroori):** Play Console → Settings → Developer account → Account details.
- **Personal** type ho aur **13 Nov 2023 ke baad** bana ho → har nayi app ke liye production se pehle **closed test: kam se kam 12 testers, 14 din lagaatar opted-in**. Matlab ~2 hafte extra.
- Organization account pe ye shart nahi hai.
- Testers ko sirf opt-in link pe join karna hota hai. Kaun log banenge, ye pehle se tay kar lo.

**1. Create app:** All apps → **Create app** → Name "Nexgen Hotels", Default language English, **App**, **Free** → declarations ✓ → Create.

**2. Android TV opt-in:** Setup (Test and release) → **Advanced settings → Form factors → + Add form factor → Android TV**. Iske baad TV review aur TV listing assets maange jayenge.

**3. Store listing** (Grow → Store presence → Main store listing):

| Item | Size/rule |
|---|---|
| App icon | 512×512 PNG |
| Feature graphic | 1024×500 |
| **Android TV banner** | **1280×720**, JPEG ya 24-bit PNG, **transparency nahi** |
| **Android TV screenshots** | 1920×1080 (16:9), app ka asli TV UI. UX Scenario deck aur emulator screenshots se. |
| Phone screenshots | Agar Console zid kare toh wahi 16:9 TV screenshots |
| Short/Full description | LG listing wala English text. Saaf likho ki ye **partner hotels ke room TVs** ke liye hai. |
| Category | Travel & Local |

**4. App content** (Policy → App content), har section:
- **Privacy policy:** URL (LG wala).
- **App access:** "All or some functionality is restricted" → instructions (neeche ka template).
- **Ads:** No.
- **Content rating:** questionnaire bharo (Utility/Productivity type; koi violence/UGC nahi).
- **Target audience:** 18+.
- **Data safety:**
  - Personal info → Name (guest ka naam dikhta hai).
  - Device or other IDs (ANDROID_ID → pairing).
  - App activity / Purchase history (food orders, service requests).
  - Payment Razorpay handle karta hai (card data hum store nahi karte).
  - Data encrypted in transit: Yes.
  - Account creation: app mein nahi (hotel staff guest ko check-in karta hai), isliye deletion URL ki zaroorat nahi.
- **Health:** TV pe My Day (Dincharya) / Clinical data dikhta hai, toh **Health apps declaration** sahi bharo aur Data safety mein Health info bhi declare karo.
- **Financial features:** none. **Government app:** No.
- Payments: food/services physical hain, isliye Razorpay allowed hai. Play Billing sirf digital goods ke liye zaroori hota hai.

**App access instructions (template, LG Route A jaisa):**
1. Ek **alag** staff account banao: `google.qa@wattinventive.com` (sirf view/modify room permission).
2. Ek khaali test room banao (koi IoT device nahi). **Room 201 kabhi nahi:** dev Room 201 office ka asli hardware (DND/MMR/curtain) chalata hai. **Room 103** LG QA ka hai, use bhi nahi.
3. Us room mein ek test guest 6+ mahine ke liye check-in karo.
4. Instructions mein: "App opens with a 6-digit code → open <admin URL> in a browser → login with google.qa… → TV Devices → Pair TV → enter code → choose Room <X> → TV shows the guest dashboard."

Jab tak Google review chal raha hai, ye account/room/guest mat chhedna.

**5. Testing → Internal testing:** Create release → **AAB upload** (`dist-androidtv/*.aab`) → Play App Signing accept → testers list (apna Gmail) → Save → Rollout. Phir AVD A (Google TV, Play Store) mein usi Gmail se login karke opt-in link se install aur test.

**6. Closed testing** (sirf agar step 0 ki shart lagi): 12+ testers, 14 din → phir "Apply for production".

**7. Production:** Create release (Android TV form factor) → release notes → Review → **Start rollout**. TV review mobile se lamba ho sakta hai. Rejection pe mail mein reason aata hai: fix karo → versionCode +1 → resubmit.

---

## 10. Hotel rollout + non-Play TVs (OneTouch)

**Play Store wale TV (certified Android TV / Google TV):**
1. TV pe hotel ka ek Google account login.
2. Play Store → Nexgen Hotels → Install.
3. App pairing code dikhayega → admin panel se room ke saath pair karo.
4. Admin → TV Devices → Hotel mode ON.
5. TV → Settings → **Set as Home app** → Nexgen Hotels → **Always**.
6. Power off/on aur Home button se test karo.

**Non-Play TV (bina Play Store; OneTouch shayad):**
- APK: Play Console → **App bundle explorer → (version) → Downloads → Signed, universal APK**. **Upload-key se sign kiya APK nahi dena.** Uska signature Play se alag hota hai, isliye ANDROID_ID bhi badal jata hai aur baad mein Play/updated APK uske upar install nahi hota.
- Install kit (Samsung kit jaisa): `platform-tools` (adb) + APK + script.
  - TV pe: Settings → About → Build pe 7 baar click → Developer options → USB/Network debugging ON.
  - `adb connect <TV-IP>:5555`
  - `adb install -r NexgenHotels.apk`
  - Android 10+ aur Home app na badle toh: `adb shell appops set com.wattinventive.nexgenhotels SYSTEM_ALERT_WINDOW allow`
  - `adb shell am start -n com.wattinventive.nexgenhotels/.MainActivity`
- Updates: Play nahi hai, toh har version pe yahi kit dobara chalani padegi (`install -r` data rakhta hai, pairing bani rehti hai).

**OneTouch TV pe check (screenshots lo):**
1. Settings → About: Android version, aur "Android TV OS" / "Google TV" / sirf "Android 9/11" (AOSP smart TV). minSdk 23 ki wajah se Android 6+ chahiye.
2. Play Store hai ya nahi.
3. Settings → Apps → Show system apps → **Android System WebView** ka version: **68 ya upar** chahiye.
4. Home app chunne ka option hai ya nahi.
5. Developer options khulte hain ya nahi.
6. Vendor ka hotel/commercial menu ("power-on app"). Dealer se puchho. Factory menu ka code guess mat karna.
7. Remote: Back, Home, OK, number keys, Input/Netflix buttons.

---

## 11. Test checklist

**Code ke baad (Mac):**
- weblink-mobile: `npx tsc --noEmit`, `npx jest`.
- Webpack builds teeno: `npm run ipk`/webOS bundle, `node scripts/build-wgt.mjs` ka webpack step (ya `npx webpack --mode production --env target=tizen`), aur androidtv. Teeno bundles `acorn` (ecmaVersion 2019) se parse karke check karo, taaki LG/Samsung na toote.
- Hotel-Automation: `tests/tv` pass.
- Hotel-web-app: type check + build.

**Emulator (AVD A + B):**
- [ ] Pairing code dikhe → admin se pair → guest ka naam / Welcome aaye.
- [ ] Admin TV list mein model "Android TV 1x · <brand model>" dikhe.
- [ ] `window.innerWidth === 1920`, layout LG jaisa (`chrome://inspect` se dekho).
- [ ] 10 tiles ka tour: har screen khule, Back se dashboard pe aaye.
- [ ] D-pad focus ring, OK (DPAD_CENTER) se activate, number keys.
- [ ] Back: modal band → screen pop → root pe **TV Home** (Hotel mode off).
- [ ] On-screen keyboard se text input.
- [ ] Network off/on (emulator → Settings → Wi-Fi) pe offline card aur "Back online" toast.
- [ ] Razorpay (test mode): QR/UPI dikhe, popup app ko replace na kare.
- [ ] Checkout pe Welcome. Doosre room mein move pe refresh.
- [ ] App update (`install -r`) ke baad pairing bani rahe. Uninstall + reinstall pe naya pair, aur admin mein **duplicate na bane** (same ANDROID_ID).
- [ ] Coming-soon tiles na dikhein.
- [ ] Purani WebView (agar mile) pe "update WebView" message aaye.

**Hotel mode (AVD B; AVD A pe limit verify):**
- [ ] Admin switch ON → TV Settings mein "On", "Set as Home app" → chooser → Always.
- [ ] Home button → app.
- [ ] `adb reboot` → boot ke baad app khud khule.
- [ ] `adb shell input keyevent KEYCODE_SLEEP`, phir `KEYCODE_WAKEUP` → app.
- [ ] Root pe Back → kuch nahi.
- [ ] Admin switch OFF → stock Home wapas, root Back → Home.
- [ ] Unpair → Hotel mode off.
- [ ] AVD A (Google TV): Home app nahi badalta, ye confirm karo aur docs mein likho.

**Play (internal testing):** Play se install hua build bhi upar ke main checks pass kare. Signing alag hai, toh ANDROID_ID bhi alag hoga: ek baar re-pair karna normal hai.

---

## 12. Gotchas (R&D ka nichod)

- **G1: Viewport 960 vs 1920.** Android TV 1080p pe WebView ka CSS width 960 hota hai (DPR 2). Android build mein `meta viewport width=1920` + `useWideViewPort` + `loadWithOverviewMode` lagao, taaki LG wala `zoom 1.5` layout hi bane. `innerWidth` verify karo.
- **G2: CORS.** WebView Origin bhejta hai (`https://appassets.androidplatform.net`). Backend ko `x-tv-token` allowed header aur `CORS_ORIGINS` mein ye origin chahiye. LG/Samsung pe ye kabhi dikkat nahi thi kyunki woh Origin bhejte hi nahi.
- **G3: `file://` nahi, `WebViewAssetLoader`.** Google ka recommended tareeka. File access band rakho, warna Play ki security warning aati hai aur origin "null" ban jata hai.
- **G4: ANDROID_ID signing key ke saath badalta hai** (Android 8+). Upload-key APK, Play-signed APK aur debug APK, teeno ka ID alag hota hai. Hotels ko hamesha **Play-signed universal APK** do.
- **G5: Back rule (Google TV quality TV-DB).** Main screen pe Back = TV Home, aur Back ko confirm-popup se roka nahi ja sakta. Isliye normal mode mein `finish()`. Hotel mode staff-only hai.
- **G6: Razorpay popups.** `setSupportMultipleWindows(true)` + `onCreateWindow` mein child WebView. Warna `window.open` hamara app page hi replace kar deta hai. `upi://` / `intent://` block karo (TV pe UPI apps nahi hote).
- **G7: Remote keys.** Back WebView tak nahi pahunchta (Activity pakadti hai → `nexgen:back`). DPAD_CENTER → 13 verify karna hai.
- **G8: 64-bit + 16 KB page size** (TV apps ke liye 1 Aug 2026 se lagu). Wrapper mein native code nahi hai, toh apne aap pass. Koi native library mat jodna.
- **G9: Target API.** Play ka rule: nayi apps API 36, lekin **Android TV apps ke liye minimum API 34**. Hum 35 target karte hain. Upload ke waqt Play Console jo bole woh final.
- **G10: Personal account** (Nov 2023 ke baad) → har nayi app ke liye 12 testers × 14 din ka closed test.
- **G11: Assets.** In-app banner 320×180 (poori jagah bhare, warna rejection). Play TV banner 1280×720 bina transparency. TV screenshots 16:9.
- **G12: Google TV launcher limit.** Third-party Home app set nahi hota, isliye wahan sirf boot path chalega (Quick start band karo).
- **G13: `.env` git mein nahi hai.** Mac pe surakshit tareeke se copy karo. `API_BASE_URL` build ke waqt bundle mein bake hota hai.
- **G14: Test rooms.** Room 201 (asli office hardware) aur Room 103 (LG QA) ko Google QA ke liye mat use karo.
- **G15: LG branch.** LG ka koi defect aaye toh fix `feature/lg-webos-qa` (`1bcfe4f` line) pe karo, phir `feature/android-tv` ko us pe rebase/merge karo, taaki dono ka TV code ek rahe.
- **G16: Purana WebView.** Hamara bundle Chromium 68+ maangta hai (LG ke liye `es2018` + core-js polyfills). Play TVs pe WebView auto-update hota hai. AOSP TVs pe purana ho sakta hai, isliye version-check message (Section 6.5).

---

## 13. Kaam ka order + checkpoints

1. **Mac setup** (Section 8.1–8.5).
2. **Web code** (Section 5) → `tsc`/`jest`/teeno webpack builds.
3. **Wrapper** (Section 6) → keystore (8.6) → `npm run aab -- --debug --install` → AVD pe app khule.
4. **Backend + admin Hotel mode + CORS** (Section 7) → tests → dev server pe deploy + `CORS_ORIGINS` env. Deploy Runjan ya team karegi.
5. **Emulator test checklist** (Section 11).
6. **Play Console** (Section 9): account type check → create app → listing → app content → internal testing → (closed test) → production.
7. **Rollout** (Section 10): pehla hotel. OneTouch ka check pehle karo.

**Checkpoints:**
- Har commit/push Runjan ke bolne pe hi.
- Backend deploy aur env change Runjan/team karegi.
- Play Console ke submit Runjan khud karenge, Claude har screen pe guide karega.
- Kahin bhi payment maange toh ruk jao (zero-spend).

---

## 14. References
- Distribute to Android TV: https://developer.android.com/training/tv/publishing/distribute
- TV app quality (TV-DB Back rule waghera): https://developer.android.com/docs/quality-guidelines/tv-app-quality
- Create and run a TV app (leanback, banner 320×180): https://developer.android.com/training/tv/start/start
- Form-factor release tracks: https://support.google.com/googleplay/android-developer/answer/13295490
- Target API level requirements: https://support.google.com/googleplay/android-developer/answer/11926878
- Personal account testing requirement: https://support.google.com/googleplay/android-developer/answer/14151465
- WebViewAssetLoader: https://developer.android.com/reference/androidx/webkit/WebViewAssetLoader
- Auto-launch on power-on (boot vs standby): https://www.screenly.io/docs/anywhere/platforms/android/guides/auto-launch-on-power-on/
- Android/Google TV autostart notes: https://easysignage.com/how-to/general-questions/how-to-autostart-easysignage-on-android-google-tv/
- Auto-start on boot/wake (hit-and-miss on wake): https://www.howtogeek.com/308427/how-to-automatically-start-an-app-when-you-boot-or-wake-android-tv
