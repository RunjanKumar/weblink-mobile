# Weblink Mobile — Handoff Summary (for the next session)

## What this is
- A **new React Native app (Android + Android TV)** at `D:\project of documents\hotel\weblink-mobile`,
  ported from the existing React web app at `D:\project of documents\hotel\weblink` — **do NOT modify the web app.**
- Backend: `D:\project of documents\hotel\Hotel-Automation` (Node). API base `https://dev-hotel-api.wattinventive.com`,
  Socket.IO `https://chat-hotel-automation.wattinventive.com`.
- GitHub target: `https://github.com/RunjanKumar/weblink-mobile.git` (may or may not be pushed yet).

## Tech stack & core decisions
- RN **0.76.6**, TypeScript, **NativeWind v4** (Tailwind), React Navigation v7, TanStack **React Query v5**,
  React Hook Form + Zod, Axios, **react-native-keychain** (auth token), **react-native-mmkv v2** (cache), Ionicons.
- Auth token sent as a **RAW `authorization` header (NO "Bearer")** — matches backend.
- **MVVM**: Screen → ViewModel → Repository → API. Shared state in `src/store/` (Auth, Socket, ServiceRequest cart, FoodOrder cart).
- **New Architecture OFF** (`android/gradle.properties → newArchEnabled=false`) — required for MMKV v2.
- Dark theme default; light theme defined but not wired.
- **TV = standard RN + Leanback manifest** (NOT the react-native-tvos fork). D-pad focus via `Pressable focusable` +
  amber focus rings; `IS_TV = Platform.isTV` drives TV sizing.

## DONE
- **Phase 1** — scaffold, MVVM, navigation, axios + interceptors, theme, auth: email/password login
  (`POST /v1/customer/login/email` → `data.token`), auto-login on restart, logout, Forgot-Password screen
  wired to a **PLANNED** `POST /v1/customer/forgot-password` (backend endpoint does NOT exist yet — degrades gracefully).
- **Phase 2 (full web-route parity)** — Dashboard, Room Scenes + Lights/Fans (real API, optimistic + 400ms fan debounce),
  Climate/AC (**LOCAL mock, no backend**), Quick Calls (tel), Quick Actions; Services (catalog→review→add-details→history);
  Feedback (stars); Laundry (rate-list basket + orders + cancel); Facilities (tabs→detail→reserve→bookings);
  Chat (Socket.IO + NetInfo, optimistic send + tempId reconciliation, offline queue, read receipts);
  Food (menu→detail→cart→coupons/BOGO→Razorpay→order-history 30s poll); Coupon Detail + "Special Offers" slider; Reception.
- **Phase 3** — TV-scaled controls (IS_TV: bigger targets + thicker focus rings), TV overscan padding on navigators,
  initial D-pad focus (Login button, first dashboard tile), responsive 2-col(phone)/3-col(tablet+TV) dashboard.
- **Build validated** on a Windows box **without Android SDK**: `tsc --noEmit` = **0 errors**, `eslint` = **0 errors**,
  Metro Android **JS bundle builds (11MB)**. `package-lock.json` committed → use **`npm ci`**.
- **Cloud build ready** — made `android/` fully text-buildable: XML vector icons (`res/drawable/ic_launcher.xml`,
  `tv_banner.xml`), manifest uses `@drawable` not `@mipmap`, removed `rn_edit_text_material` from styles.xml.
  `.github/workflows/android-build.yml` builds a **RELEASE** apk (JS bundled → runs on TV without Metro; signed with a
  generated debug keystore for sideloading). Local bootstrap: `scripts/bootstrap.ps1` (Win) + `scripts/bootstrap.sh` (Mac/Linux).

## ⚠️ CRITICAL PINS / GOTCHAS (do NOT let these float back to carets)
- `react-native-reanimated` pinned **3.16.7** — 3.19+ splits its babel plugin into `react-native-worklets` → **build fails**.
- `nativewind` pinned **4.1.23** — 4.2.x `react-native-css-interop` babel needs `react-native-worklets` → **build fails**.
- `react-native-screens` pinned **4.4.0** — 4.26 Fabric SearchBar codegen breaks RN 0.76.
- `react-native-svg` pinned **15.8.0** — added 2026-07-27 to render the web app's exact icon paths
  (`src/components/WebIcon`). Native module → autolinked, so a JS-only rebuild is not enough after adding it.
- **LIGHT theme is the DEFAULT** (client decision 2026-07-28, seen on the hotel TV). The first light attempt
  showed black cards on white because `tailwind.config.js` hard-coded dark hexes — the tokens are now CSS
  VARIABLES set per scheme by ThemeProvider via NativeWind `vars()`, with `src/theme/colors.ts` as the single
  source of truth. Light values are TV-contrast-checked (off-white #f2f3f5 canvas, amber-700 #a16207 brand,
  near-black focus ring, 700-weight status colors via `useStatusTones()`). Scheme persists in storage
  (`ui.colorScheme`); dark stays available from Settings. Do NOT add raw hex colors to screens — use theme
  tokens or scheme-keyed maps (see `useWebIconAccents`, `SCENE_TINTS`).
- **The target TV is LG webOS, NOT Android TV** (established 2026-07-28). webOS cannot install an APK at all.
  The app therefore also builds for the browser via **react-native-web + webpack** and packages as an `.ipk`
  (`npm run ipk`). Same `src/`, two outputs. Full details + the webOS gotchas: **`WEBOS_BUILD.md`**.
  `ajv` pinned to **8** at the root purely so `ajv-keywords@5` (via babel-loader) resolves.
- **Never trust a documented API list shape.** `/v1/foodCategory` actually returns `data.data`, not the
  `data: Category[]` PHASE2_SPEC claimed; `.map` on that object was a hard crash, not a blank screen.
  `food.repository.toArray()` now coerces either shape and logs anything unexpected.
- **API image fields are RELATIVE CDN paths, not URLs** (verified against live dev API 2026-07-28:
  `imageURL: "<hotelId>/food/x.jfif"`). Prefix = CloudFront `https://d36u10gu6pvj0x.cloudfront.net`
  (in front of the `nexgen-hotel` S3 bucket), configured as `IMAGE_BASE_URL` in `.env` and inlined at
  BUILD time. Resolution lives in `utils/imageUrl.ts` + the `<AppImage>` component (RN port of the
  admin panel's AppImage.jsx — CDN prefix + error fallback). Repos also normalize (food, facilities).
  Debug tip: the TV app can be interrogated live via `ares-inspect` + CDP — that is how the real
  payload shapes above were captured (no backend source needed on this machine).
- Native binaries (`gradle-wrapper.jar`, `debug.keystore`) are **NOT in the repo** — generated by the bootstrap scripts / CI
  (`keytool` + `gradle wrapper --gradle-version 8.10.2`). Launcher icons ARE committed (XML vectors).
- `.env` is gitignored; copy from `.env.example`. react-native-dotenv inlines env at BUILD time → after editing `.env`,
  restart Metro with `--reset-cache`.
- Adversarial reviews across phases found + fixed **8 real defects** (e.g. missing `ENDPOINTS.LAUNDRY_ORDER`,
  BOGO cart line-total doubling, master-toggle rollback clobbering individual lights, `hotel` missing on AuthContext).

## Food module rework (2026-07-28, matches production web-link)
- **Reference:** `C:\dev\web-link` production branch — menu/cart/checkout ported 1:1 in structure &
  behavior (colors via theme tokens). Full reference specs live in the two explorer reports from that session.
- **`Alert.alert` is BANNED** — it is an empty stub in react-native-web (buttons never fire on the TV;
  this was the "cannot place order" bug). Use `toast.*` (src/components/Toast) for feedback and
  `dialog.*` / `useDialog()` (src/components/AppDialog) for confirmations. Modals register in
  `src/services/modalRegistry.ts` so the TV Back key closes them first and spatial nav stays inside
  (`nativeID` root + webosRemote scoping).
- **TV is cash-only**: PaymentSheet shows only COD on `IS_TV` (Razorpay's iframe cannot be driven by a
  remote); OrderHistory hides Pay/Retry + pending banner on TV.
- Menu: sticky CategoryTabs + scroll-spy (`useScrollSpy`, reference thresholds 72/+20/900ms),
  FoodCard `row` (phone) / `grid` (TV 3-col), AddButton inline stepper (BOGO +2/−1), FoodCartButton
  bottom bar, search mode. Unavailable = dim + grayscale(web) + scrim + "Unavailable" chip, still tappable.
- **Coupon state lives in FoodOrderContext** (`appliedCoupon`); EVERY cart mutation invalidates it
  atomically (viewmodels are per-screen — never move it back there). Cart persists via storage
  (`cache.foodCart`), cleared on logout; coupon is never persisted.
- Dev login autofill: `DEV_LOGIN_EMAIL/PASSWORD` in `.env` (quote values containing `#`!). Build
  scripts FAIL a production build that still carries them and warn on dev builds.
- Verified end-to-end: real COD order `#8389E4` placed against dev backend from the web build.

## Full-app parity audit vs web-link production (2026-07-29)
All modules were audited against `C:\dev\web-link` (production branch) and rebuilt to match 1:1
(structure/behavior/copy; colors via theme tokens):
- **Navigation**: reference 5-tab bottom bar (Home, Reception, Food, Facilities, Services) as separate
  stacks sharing `HomeStackParamList`; Profile/Settings moved into the dashboard kebab `dialog.show`;
  reference LogoutModal copy. Cross-tab jumps via the `rootNavigate` cast helper; tab roots hide the back chevron.
- **Dashboard**: API icons via AppImage (quick calls `item.icon`, scenes `device.deviceicon`), reference
  tile order/subtitles/↗ chrome, single round door-lock button, partial-failure header (profile error
  doesn't kill the page), `foodCategoryId` deep link into the Food tab.
- **Facilities**: the reported "date picker not work" bug is FIXED — the web DateTimePicker shim now
  resyncs its draft on `mode` change and supports `datetime` (single `datetime-local` input on web);
  native chains date→time via `key` remount. Booking payload is a NAIVE local `YYYY-MM-DDTHH:mm` string
  (web reads the hour by string-split — never `toISOString()`). List/detail/reserve/bookings all match
  reference (hero, Show More, stacked info sections, "Upcoming events" + "New Booking" CTA,
  APPROVED → "Booking Confirm", PENDING tone = danger).
- **Services**: 56px AppImage icon tile per subcategory; `Boolean(category.isAvailable)` (undefined ⇒
  DISABLED, reference semantics); unavailable rows dim 0.4; "Review Request" CTA (no count); review rows
  show description + ₹price + italic "Details :" + bordered Add/Edit Details pill; submit → `replace('ServiceBooked')`;
  history = "Service Request" title, tone-colored group headings, timestamp-top/badge-bottom cards
  (finished dim 0.5), persistent "Add New Request" CTA.
- **Laundry**: stepper replaces trash (min 0 removes), selected-rate "₹x per unit" subtitle, "Remove"
  text link, fully-tappable express card ('Ask housekeeping to prioritise this order'), reference sticky
  bar (pieces/tax/"Estimated total"), success toast 'Your laundry pickup has been requested.'.
  Orders: 5-segment progress track over `LAUNDRY_ORDER_FLOW` (hidden when CANCELLED), `Total (incl. tax)`,
  `.toFixed(2)` amounts, '· Express' inline, INSTANT cancel (no confirm — reference) + toast
  `Order {n} cancelled.`, persistent "Request Pickup" CTA.
- **Feedback**: reference copy ('Rate Your Stay – We Value Your Opinion!'), WHITE textarea in both
  schemes (deliberate reference look; hairline border for light), 'Submit', 0-star allowed, success stays
  on page + resets + toasts; errors toast (no banner).
- **Chat**: date dividers (Today/Yesterday), smart auto-scroll (only follows when at bottom),
  scroll-to-bottom FAB, auto load-more at scroll-top + button, Show more >400 chars, severity-styled
  ConnectionBanner, skeleton LoadingChat, reference EmptyChat copy, pill input bar (amber border when
  typing, Enter/submit sends), retry icon link. SocketContext now also handles
  `connect_error` / `reconnect` / `reconnect_failed`.
- **Reception**: reference headline/copy/Continue CTA. **AC**: "Air Conditioner" title, thermometer
  status card, temperature editable while off. **Lights**: "Lights Control" title, Master Scene
  subtitle + round power button.
- All of the above: `tsc --noEmit` 0 errors, eslint 0 errors.
- **Emulator verification PASSED (2026-07-29, guest karan@yopmail.com / #Runjan22)**: login, dashboard
  (scenes/quick calls/tiles/kebab), Facilities list→detail→reserve (native date→time picker chain works,
  real reservation created), Services request→review→submit→history, Laundry basket→order→instant cancel,
  Chat (dividers, send, ticks, Online), Food menu, Feedback. Three bugs found on-device and FIXED:
  1. **Booking time TZ shift** — `new Date(iso)` in FacilityBookingsScreen rendered the guest's 7:49 AM
     as 1:19 PM (+5:30). Now reads raw `HH:mm` after the "T" like the reference `latestFormattedTime`.
  2. **FoodCard row image stretch** — RN resolves a percentage height against an auto-height row to the
     image's INTRINSIC pixel size, so one tall source image stretched the card to full-screen. Image now
     absolutely fills a `alignSelf:'stretch'` 130px column. Same fix applied to
  3. **FacilityCard image column** (FacilitiesScreen).
  Pattern to remember: never give an RN `Image` `height:'100%'` inside an auto-height flex row —
  absolutely fill a stretched wrapper instead.

## NOT done yet
- **No native Gradle build has actually run anywhere** — GitHub Actions will be the FIRST real native build.
  If it fails, read the Actions step log (likely a native/SDK detail).
- **On-TV run pending** — needs either a machine with Android SDK (local) or the cloud APK sideloaded.

## REMAINING / TODO (priority order)
1. Push repo to GitHub (if not done) → run the Action → download release APK → **sideload on Android TV**
   (Downloader app / USB / adb). See `CLOUD_BUILD.md`.
2. First real native build validation — fix any Gradle/native errors.
3. **Backend gap**: build `POST /v1/customer/forgot-password` (doesn't exist). Also fix the phone-login **OTP-in-response
   leak** (see WEBLINK_ISSUES.md item B).
4. **Razorpay**: needs a real key from backend `initiatePayment`; test the actual payment flow on a device.
5. **AC/Climate + Door are LOCAL mocks** (no backend) — wire when backend endpoints exist.
6. Polish: designed launcher icon + TV banner (currently placeholder vectors); wire light theme; write jest tests
   (jest configured, none written); convert big ScrollView lists → FlatList/SectionList for perf; deeper TV focus order
   (`nextFocus*` hints), optional `TVFocusGuideView` only if switching to the tvos fork.
7. Web-app issues to fix later: `WEBLINK_ISSUES.md` (case-mismatch `Light` import that breaks Metro, hardcoded URLs, etc.).

## Key docs (read these first)
- `README.md` (overview) · `SETUP.md` (local setup) · `CLOUD_BUILD.md` (GitHub Actions build) ·
  `PHASE2_SPEC.md` (**full endpoint/state porting spec for every module** — the reference used for the port) ·
  `WEBLINK_ISSUES.md` (web + backend issues).
- Memory note `weblink-mobile-module.md` is auto-loaded in this project.

## Run locally (capable laptop)
Prereqs: Node 18+, JDK **17**, Android Studio (SDK Platform 35, Build-Tools 35.0.0, NDK 27.1.12297006, an AVD incl. an
**Android TV** AVD), `ANDROID_HOME` set.
```
git clone https://github.com/RunjanKumar/weblink-mobile.git && cd weblink-mobile
npm ci
cp .env.example .env                 # Windows: copy .env.example .env
bash scripts/bootstrap.sh            # Windows: powershell -File scripts/bootstrap.ps1
npm start                            # terminal 1 (Metro)
npm run android                      # terminal 2 (emulator/TV-AVD running)
```
Login with a **checked-in guest's** email + password (backend requires an active stay).
