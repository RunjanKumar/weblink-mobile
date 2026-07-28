# Build & install on LG webOS (TV)

## Why this exists

**LG webOS cannot install an APK.** It is not Android and has no Android
compatibility layer — `app-release.apk` will never run on an LG TV. webOS apps
are web apps packaged as **`.ipk`**.

Rather than write the app a second time, the web build compiles the *same*
`src/` through **react-native-web**, so the phone APK and the TV `.ipk` ship the
same screens, view-models, repositories and API layer. One codebase, two
outputs.

```
src/  ──┬── Metro   → app-release.apk  (phone, Android TV)
        └── webpack → .ipk             (LG webOS)
```

---

## Build the .ipk

```powershell
npm run ipk
```

Output: `dist-webos/com.wattinventive.weblink_1.0.0_all.ipk` (~0.75 MB).

Other commands:

| Command | What it does |
| --- | --- |
| `npm run web` | Dev server on <http://localhost:8082> — iterate in a desktop browser |
| `npm run web:build` | Production static bundle into `web-build/` only |
| `npm run ipk` | Bundle + package the `.ipk` |
| `npm run ipk:install` | …and install onto a registered TV |

---

## Install on the TV

The TV must be in **Developer Mode** first. This is LG's process, not ours:

1. Create an LG developer account at <https://developer.lge.com>.
2. On the TV: LG Content Store → install the **Developer Mode** app.
3. Open it, sign in with that account, switch **Dev Mode Status** to ON. The TV
   restarts and then displays its **IP address** and a **passphrase**.
4. On your PC, register the TV:
   ```powershell
   npx ares-setup-device
   ```
   Add a device with the TV's IP (port 9922, user `prisoner`) and the passphrase.
5. Install and launch:
   ```powershell
   npx ares-install dist-webos/com.wattinventive.weblink_1.0.0_all.ipk
   npx ares-launch com.wattinventive.weblink
   ```
   or in one step: `npm run ipk:install`.

> **Dev Mode sessions expire after roughly 50 hours** and the app is removed.
> Extend the session from the same Developer Mode app on the TV. This is a
> testing channel only.

### For real in-room deployment

Dev Mode is not how you ship to guest rooms. LG's hospitality platform is
**Pro:Centric SMART**, which is built to push a custom web app to every TV in a
property. Talk to your LG account contact about onboarding this `.ipk` — the
packaging is the same, the distribution channel is not.

### Debugging on the TV

```powershell
npx ares-inspect --app com.wattinventive.weblink --open
```

A startup crash also paints its stack trace directly onto the screen — see the
error overlay in `web/index.html`. A TV has no reachable console, and without
that a crash is just a black screen.

---

## How the web build differs from native

### Native modules replaced by web shims

Webpack resolves `.web.*` before the plain extension, so each file below wins
over its native sibling automatically. Nothing in `src/` branches on platform.

| Native | Web shim | Notes |
| --- | --- | --- |
| `react-native-mmkv` | `src/services/storage.service.web.ts` | `localStorage`, namespaced `weblink-app:` |
| `react-native-keychain` | `src/services/secureStorage.service.web.ts` | **`sessionStorage`**, so a shared TV never leaks a session to the next guest |
| `react-native-razorpay` | `src/services/paymentService.web.ts` | Injects Razorpay `checkout.js` on first use |
| `@react-native-community/datetimepicker` | `src/shims/DateTimePicker.web.tsx` | Aliased in `webpack.config.js`; overlay around `<input type="date">` |

Everything else — Reanimated, gesture-handler, safe-area-context, screens, svg,
vector-icons, NetInfo, React Navigation, React Query, axios, socket.io — has
real web support and is used unchanged.

### TV input

`Platform.isTV` is always false under react-native-web, so `IS_TV` also sniffs
the webOS user agent (`src/utils/responsive.ts`). Every TV sizing branch and
focus ring the Android TV build already had therefore applies on webOS too.

A browser does not move focus on arrow keys the way Android TV does, so
`src/services/webosRemote.web.ts` adds spatial navigation: it scores every
visible focusable element by distance along the travel axis plus a weighted
off-axis penalty, and focuses the winner. The remote's **Back** button
(keyCode 461) pops the navigator via `src/navigation/navigationRef.ts`, falling
through to close the app at the root.

### Gotchas worth knowing

- **`ares-package` needs `-n`.** Without it the CLI runs the bundle through
  `uglify-js`, which is ES5-only and dies on modern syntax ("Failed to minify
  code"). webpack has already minified it. The flag is real but undocumented in
  `ares-package --help`.
- **`publicPath: ''`.** webOS serves the app from a file path, not a web root;
  an absolute `/static/main.js` 404s on the TV.
- **`darkMode: 'class'`** in `tailwind.config.js` — under the Tailwind default
  (`media`), NativeWind's web runtime throws outright when the app sets its own
  colour scheme.
- **`sourceType: 'unambiguous'`** in the webpack babel options — the dependency
  tree mixes ESM and CommonJS, and assuming ESM everywhere makes the CJS files
  fail with `exports is not defined`.
- **`disableImportExportTransform: true`** — Metro wants CommonJS, webpack needs
  ESM preserved, or React Navigation's `lib/module` build breaks the same way.
- The API accepts browser origins (verified against
  `dev-hotel-api.wattinventive.com`), so **no CORS proxy is needed**.

---

## Not yet done

- **Never run on real webOS hardware.** Verified in Chromium (the same engine
  webOS uses) at phone size. Needs a pass at 1920×1080 on an actual TV, and the
  spatial-navigation order wants checking with a real remote.
- No splash image — `appinfo.json` has `bgColor` only. Add `splashBackground`
  (1920×1080 PNG) before any store submission.
- Launcher icons are the same placeholder bed motif as the Android build.
- `version` in `webos/appinfo.json` is maintained by hand; it does not read
  `package.json`.
