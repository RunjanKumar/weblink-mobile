# Weblink Mobile (React Native, Android)

A React Native rewrite of the **weblink** hotel-guest web app, targeting **Android
phones, tablets and Android TV** from a single codebase. TypeScript throughout,
MVVM architecture, secure authentication.

> This project was generated **beside** the existing web app and does **not**
> modify it. Issues found in the web app during analysis are logged in
> [`WEBLINK_ISSUES.md`](./WEBLINK_ISSUES.md).

---

## Tech stack

| Concern          | Choice                                             |
| ---------------- | -------------------------------------------------- |
| Framework        | React Native 0.76 + TypeScript                     |
| Styling          | **NativeWind** (Tailwind for RN) + a theme layer   |
| Navigation       | React Navigation v7 (native-stack + bottom-tabs)   |
| Server state     | TanStack React Query v5                            |
| Forms            | React Hook Form + Zod                               |
| HTTP             | Axios (shared instance + interceptors)             |
| Secure storage   | react-native-keychain (auth token)                 |
| Fast KV storage  | react-native-mmkv (cache/prefs) + AsyncStorage     |
| Icons            | react-native-vector-icons (Ionicons)               |
| Env config       | react-native-dotenv (`@env`)                       |
| TV               | Standard RN + Leanback manifest + D-pad focus      |

## Architecture (MVVM)

```
Screen  ──uses──▶  ViewModel  ──uses──▶  Repository  ──uses──▶  API  ──▶  Axios
(pure UI)          (hook: form,          (network +             (endpoint     │
                    query/mutation,        persistence)          calls)        │
                    error mapping)                                             ▼
                                                              Backend (Hotel-Automation)
```

- **Screens** (`src/screens`) are presentational only.
- **ViewModels** (`src/viewmodels`) hold all logic (RHF forms, React Query, error mapping).
- **Repositories** (`src/repositories`) orchestrate API + storage side effects.
- **API** (`src/api`) are thin typed calls over the shared axios instance.
- **Store** (`src/store`) holds cross-cutting session state (`AuthProvider`).
- **Services** (`src/services`) are platform utilities (secure/fast storage, logger, query client, auth event bus).

```
src/
  api/            axios.ts, endpoints.ts, auth.api.ts, customer.api.ts
  assets/
  components/     Button/ Input/ Loader/ Card/ Header/ StateViews/
  constants/      config.ts (env), storageKeys.ts
  hooks/          useResponsive, useTVFocus, useAuth
  models/         api / user / auth types
  navigation/     RootNavigator, AuthNavigator, AppNavigator, types
  repositories/   auth.repository, customer.repository
  screens/        Auth/ Home/ Booking/ Profile/ Settings/ SplashScreen
  services/       secureStorage, storage(MMKV), queryClient, logger, authEvents
  store/          AuthContext
  theme/          colors, spacing, typography, ThemeProvider
  utils/          errorHandler, responsive
  validators/     auth.validators (Zod)
  viewmodels/     Login, ForgotPassword, Home, Booking
App.tsx           provider composition
index.js          entry (gesture-handler + global.css first)
```

## Authentication

The web app uses a magic-link JWT in the URL. The mobile app adds a real login:

- **Login** → `POST /v1/customer/login/email` (`{ email, password }`) → returns `data.token`.
- Token stored in the **Keychain** (mirrored in memory for the axios interceptor).
- Sent as a **raw `authorization` header** (no `Bearer`), matching the backend.
- **Auto-login** on restart via `authRepository.restoreSession()` (validates against `/v1/customer/login/profile`).
- **401** anywhere clears the token and resets to Login (via `authEvents`).
- **Forgot Password** UI calls a *planned* `POST /v1/customer/forgot-password` and
  degrades gracefully to a "contact reception" message until the backend exists
  (see `WEBLINK_ISSUES.md`, item A).

## Android TV

- Same APK installs on phone/tablet/TV: `AndroidManifest.xml` declares
  `touchscreen`/`leanback` as **not required** and adds a `LEANBACK_LAUNCHER` intent-filter.
- D-pad focus: components use `Pressable` `focusable` + `onFocus`/`onBlur` to draw an
  amber focus ring and scale slightly; `hasTVPreferredFocus` sets initial focus.
- Large touch targets (>= 44dp), TV-safe insets via SafeAreaProvider, landscape supported
  (`android:screenOrientation="fullSensor"`).
- Replace the placeholder TV banner (`android:banner`) with a 320×180 image before Play submission.

## Getting started

> **First-time setup requires generating the native binary shell** (gradle wrapper
> jar, launcher icons, debug keystore) which cannot be authored as text. Run the
> bootstrap once — see [`SETUP.md`](./SETUP.md), or:

```powershell
# 1. Install JS deps
npm install

# 2. Generate the native binaries (gradle wrapper, icons, keystore) — one time
npm run # see SETUP.md  ->  scripts/bootstrap.ps1

# 3. Copy env and run
copy .env.example .env
npm run start:reset          # Metro (first run: reset cache)
npm run android              # build + install on a device/emulator/TV
```

## Roadmap

- **Phase 1:** scaffold, MVVM, navigation, axios, theme, auth, Login + Forgot Password. ✅
- **Phase 2:** feature ports — all shipped ✅
  - Dashboard, Room Scenes, Lights & Fans (real API), Climate/AC (local), Quick Calls
  - Hotel Services (catalog → review → details → history)
  - Feedback (star rating)
  - Laundry (rate list + basket + orders + cancel)
  - Facilities (categories → detail → reserve → bookings)
  - Chat (Socket.IO realtime, optimistic send, offline queue, read receipts)
  - Food (menu → detail → cart → coupons/BOGO → Razorpay → order history)
- **Phase 3:** Android TV focus polish, performance, testing. (ongoing)

Every module follows Screen → ViewModel → Repository → API and was adversarially
reviewed. See `PHASE2_SPEC.md` for the full endpoint/state porting spec.
