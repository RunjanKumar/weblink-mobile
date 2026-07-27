# Weblink (web app) — Issues Found During Mobile Port

> These are issues observed while analysing `D:\project of documents\hotel\weblink`
> for the React Native port. **The web project was NOT modified.** Fix later.
> Backend issues (in `Hotel-Automation`) are listed separately at the bottom because
> they also affect the mobile app.

Legend: 🔴 bug / correctness · 🟠 security · 🟡 quality / maintainability

---

## Web app (`weblink/src`)

### 🔴 1. Case-mismatched import of the Light screen
- **File:** `src/main.jsx:13`
- **Detail:** `import LightControl from './UI/light/light.jsx'` but the file on disk is
  `src/UI/light/Light.jsx` (capital **L**). Works on Windows (case-insensitive FS) but
  **breaks Metro bundler and any case-sensitive CI/Linux build**. React Native's Metro
  bundler is case-sensitive on all platforms.
- **Fix:** Make the import match the filename exactly (`./UI/light/Light.jsx`).

### 🟠 2. Auth token decoded but never verified; stored in `localStorage`
- **File:** `src/context/AuthContext.jsx:9-18, 41`
- **Detail:** The JWT is base64-decoded client-side (`decodeJwtPayload`) with no signature
  check and persisted in `localStorage` (XSS-readable). Acceptable for a magic-link web
  view, but the mobile app will use **Keychain / encrypted storage** instead.
- **Fix (web):** Treat token as opaque; rely on the server 401 to gate access.

### 🟡 3. Hard-coded API & socket base URLs (no env support)
- **Files:** `src/api/client.js:4` (`https://dev-hotel-api.wattinventive.com`),
  `src/utils/socketEvents.js:32` (`https://chat-hotel-automation.wattinventive.com`)
- **Detail:** Base URLs are literals — no `.env` / build-time config, so dev/stage/prod
  cannot be switched without code edits. The mobile app introduces a proper env config.

### 🟡 4. Debug `console.log` left throughout production code
- **Files:** `src/UI/dashboard/dashboardNew.jsx:20-64`,
  `src/viewModel/dashboardViewModel.js:25-135`, and others.
- **Detail:** Verbose lifecycle/state logging shipped to production.

### 🟡 5. 401 handler is web-only and hard-navigates
- **File:** `src/api/client.js:30-34`
- **Detail:** On 401 it does `window.location.href = '/'`. Not portable; the mobile app
  handles 401 by clearing secure storage and resetting the navigation stack to Login.

### 🟡 6. Razorpay injected via external `<script>` tag
- **File:** `index.html:11` (`https://checkout.razorpay.com/v1/checkout.js`)
- **Detail:** Web checkout depends on a global script. Mobile needs the
  `react-native-razorpay` SDK (or a WebView checkout). Flagged for the Food/Payment phase.

### 🟡 7. Token read directly from `localStorage` inside the API layer
- **File:** `src/api/client.js:15`
- **Detail:** Tight coupling of transport to `localStorage`. Mobile abstracts token access
  behind a storage service so the same api/service files stay portable.

---

## Backend (`Hotel-Automation`) — affects the mobile app

### ✅ A. No customer "forgot / reset password" endpoint — RESOLVED 2026-07-27
- **File:** `app/routes/v1/userRoutes.js` (customer routes)
- **Detail:** There is `POST /v1/customer/login/email` (email+password) and phone-OTP login,
  but **no** customer password reset/forgot route (only admin/staff have one).
- **Resolution:** Implemented as an OTP flow (mobile-friendly, no web page needed):
  - `POST /v1/customer/forgot-password { email }` → emails a 6-digit code
    (template `public/templates/customer-reset-otp.html`, 30-min expiry, OTP **not**
    returned in the response body).
  - `POST /v1/customer/reset-password { email, otp, password }` → verifies the code
    (single-use, max 5 wrong attempts) and sets the new password.
  - The mobile Forgot Password screen now runs the full two-step flow and still
    degrades to "contact reception" on a 404 from older backend deploys.

### 🟠 B. OTP returned in the login API response body
- **File:** `app/controllers/userController.js:3351`
  (`return createSuccessResponse(MESSAGES.OTP_SENT_SUCCESSFULLY, { otp, token })`)
- **Detail:** The phone-login OTP is returned **in the HTTP response** (SMS send is commented
  out at `:3349-3350`). Anyone who can call the endpoint gets the OTP → auth bypass.
- **Fix:** Send OTP over SMS/email only; never return it in the response.

### 🟡 C. Email login requires an active (checked-in) booking
- **File:** `app/controllers/userController.js:3369-3384`
- **Detail:** `loginCustomerByEmail` rejects unless `customerStatus === CHECK_IN` and there is
  a booking spanning "today". Correct for a guest app, but the mobile UI must surface these
  as friendly states ("You have no active stay / already checked out"), not raw errors.

---

_Last updated: 2026-07-25 (initial analysis for the React Native port)._
