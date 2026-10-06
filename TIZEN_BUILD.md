# Build & install on Samsung Tizen (hotel TV)

## Why this exists

Samsung TVs run **Tizen**, not Android or webOS. Their apps are web apps
packaged as **`.wgt`**. Like the webOS build, the `.wgt` compiles the *same*
`src/` through **react-native-web**. It is the same webpack bundle with a
different manifest.

```
src/  ──┬── Metro   → app-release.apk  (phone, Android TV)
        ├── webpack → .ipk             (LG webOS)      npm run ipk
        └── webpack → .wgt             (Samsung Tizen) npm run wgt
```

| | webOS | Tizen |
|---|---|---|
| Bundle folder | `web-build/` | `web-build-tizen/` |
| Manifest | `webos/appinfo.json` | `tizen/config.xml` |
| Package tool | `ares-package` | `tizen package` (Tizen Studio CLI) |
| Output | `dist-webos/*.ipk` | `dist-tizen/NexgenHotels.wgt` |
| Back key | 461 (exits at root) | 10009 (does nothing at root: the app is the TV's home screen) |

---

## One-time setup (free)

1. **Tizen Studio** (Windows: `C:\tizen-studio`). In Package Manager:
   - Main SDK → Tizen SDK tools → Emulator
   - Extension SDK → TV Extensions-x.0 → **Emulator** and **Web app. development**
   - Extension SDK → **Samsung Certificate Extension**
   - For Remote Test Lab: **RTL TV Tools** (sdbproxy). This is not in the online list. Download it from the
     [RTL SDB guide](https://developer.samsung.com/remotetestlab/doc/sdb-guide), then add it
     via ⚙ → Extension SDK → **+**.
2. **Certificate.** Tools → Certificate Manager → **+** → **Samsung** → TV.
   - Create the author certificate (Samsung account login).
   - Create the distributor certificate with privilege Public.
   - Add the **DUID** of every device you will install on.
   - Name the profile `demo-samsung` (the build's default).
   > A Samsung TV, **including the emulator**, rejects apps signed with the
   > generic *Tizen* certificate (`install failed[118, -12] … Invalid
   > certificate chain`). Always use a Samsung profile.
3. **Back up** `C:\Users\<you>\SamsungCertificate\<profile>\` and its
   password. An app signed by a different author certificate cannot update
   one already installed.

---

## Build the .wgt

```bash
npm run wgt                 # production bundle → dist-tizen/NexgenHotels.wgt
npm run wgt -- --dev        # unminified, faster
npm run wgt -- --profile other-profile
```

The script (`scripts/build-wgt.mjs`) uses the same `.env` preflight as
`build-ipk.ps1`. It generates the `<access>` list in `config.xml` from `.env`:
API, socket and image hosts, plus razorpay.com. That way a staging or
production `.env` packages with the right hosts. Never add `origin="*"`.

Environment:
- `TIZEN_PROFILE`: certificate profile (default `demo-samsung`)
- `TIZEN_CLI`: path to `tizen` / `tizen.bat` if Tizen Studio is not in the
  default location

## Install

```bash
sdb devices                                  # emulator-26101, RTL TV, or a real TV
npm run wgt:install                          # build + install + launch
npm run wgt:install -- --device emulator-26101
```

- **Emulator:** Tools → Emulator Manager → Launch. It needs Intel HAXM and Hyper-V off.
- **Remote Test Lab TV:** start a session → **SDB** → Confirm → allow
  `sdbproxy`. Add that TV's DUID to the certificate profile before installing.
- **Hotel TV (Developer Mode):** Apps → type `12345` on the remote → Developer
  Mode ON with this PC's IP → restart the TV. Then Tizen Studio → Device
  Manager → connect. Apps installed this way are removed when the TV is
  switched off. That is why real rollout goes through Samsung (see the plan).

## Reading a TV without a debugger

Settings → **Device Info** shows what the TV itself reports:
- DUID
- screen and viewport size
- whether the hotel API and socket are reachable (this also tests the `<access>` list)
- on Samsung: the video inputs, and the installed apps with their **real app IDs**
  (Netflix, YouTube, …)

The full dump is logged as `[tvPlatform] diagnostics`.

Code: `src/services/tvPlatform.web.ts` (web) / `tvPlatform.ts` (native stub).

## No login on the TV: pairing + automatic guest sign-in

On the Samsung build the Login screen never appears. Logic lives in
`src/store/TvPresenceContext.tsx`; the screens are in `src/screens/Tv/TvGateScreen.tsx`.

1. **First start.** The TV calls `POST /v1/tv/pair/start` and shows a 6-digit
   code.
2. **Staff pair it.** In the admin panel: TV Devices → Pair TV → enter the
   code and choose the room.
3. **The TV gets its device token.** It polls `GET /v1/tv/pair/status`, receives
   the token once, and keeps it in `localStorage` as `weblink-app:tv.deviceToken`.
4. **Every check after that.** The TV calls `GET /v1/tv/state` with the
   `x-tv-token` header:
   - Room empty → `idle`, and the TV shows the Welcome screen (hotel + room).
   - Guest checked in → the backend hands over that guest's normal session
     token, and the TV signs in with it.
5. **When the TV checks again:**
   - socket `tv:refresh`, sent by the backend on check-in, checkout and room move
     (the TV connects to the API host with `query.tvToken`)
   - every 60 s
   - when the app comes back to the foreground
   - after any 401
6. **Checkout.** The backend deletes the guest session and the TV returns to
   Welcome. Its local data is cleared: token, React Query cache, carts.
7. **Unpair.** Unpairing in the admin panel, or a 401 on the device token,
   sends the TV back to the pairing code.

There is no Log Out on the TV, since check-in and checkout handle sign-in and
sign-out. A guest logging out on their phone does not affect the TV.

**Testing without a deployed backend.** Run the backend locally and build the
TV against `API_BASE_URL=http://10.0.2.2:<port>`. That is the laptop as seen
from the Tizen emulator, and the build script adds it to `<access>`. Restore
`.env` afterwards and clear `node_modules/.cache/babel-loader`, because
`.env` values are inlined at build time.

## Not yet done (later phases)

- Netflix / YouTube tiles → `launchApp(id)`; Live TV → `showHdmi(port)`.
  Both functions exist but nothing calls them yet.
- Package ID `WattNexgen` is a placeholder until Samsung Seller Office
  registration.
