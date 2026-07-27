# Build the APK in the cloud (no Android SDK, no powerful laptop)

Your laptop only needs to build if you build **locally**. This guide builds the
APK on **GitHub's servers** for free, and you install the finished APK straight
onto your Android TV. Nothing heavy runs on your machine.

The project is already set up so the cloud build needs **no binary files** — the
launcher/TV-banner icons are XML vectors, and the workflow generates the Gradle
wrapper and signing keystore itself.

---

## 1. Put this project in a GitHub repo

Create a new **empty** repo on github.com (e.g. `weblink-mobile`). Then, from the
`weblink-mobile` folder on your laptop (this folder must be the repo **root** — so
`package.json` sits at the top level):

```bash
cd "weblink-mobile"
git init
git add .
git commit -m "Weblink mobile app"
git branch -M main
git remote add origin https://github.com/<you>/weblink-mobile.git
git push -u origin main
```

Pushing to `main` automatically starts the build. (You can also start it by hand:
repo → **Actions** tab → **Build Android APK** → **Run workflow**.)

## 2. Download the APK

- Repo → **Actions** → click the latest **Build Android APK** run.
- Wait ~15–25 min (green check = done).
- Scroll to **Artifacts** → download **weblink-android-apk** (a zip).
- Unzip it → you get **`app-release.apk`**. This is a standalone, installable app
  (the JS is bundled in — it does **not** need a dev server).

## 3. Install it on the Android TV

Pick whichever is easiest — none require a strong laptop:

- **Downloader app (no computer at all):** On the TV install "Downloader" (by
  AFTVnews) from the Play Store. Host `app-release.apk` at a URL — e.g. attach it
  to a **GitHub Release**, or drop it in Google Drive/Dropbox and copy the direct
  link — then type that URL into Downloader. It downloads + installs on the TV.
- **USB drive:** Copy `app-release.apk` to a USB stick, plug it into the TV, open a
  file-manager app (e.g. "X-plore"), tap the APK, allow install from unknown sources.
- **Phone → TV:** Use the "Send files to TV" app on a phone + the TV to transfer
  the APK over Wi-Fi, then open it on the TV.
- **adb (if you have any PC with `adb`):** enable Developer Options + Network
  debugging on the TV, then `adb connect <TV-IP>:5555` and `adb install app-release.apk`.

On first install the TV will ask to **allow installs from unknown sources** — accept.

## 4. First launch

The app opens on the **Login** screen. Sign in with a **checked-in guest's** email
+ password (the backend requires an active stay). The API it talks to is baked in
from `.env` at build time (defaults to the dev server in `.env.example`).

> To point at a different backend, edit `.env` (or `.env.example`), commit, push —
> the next build bakes in the new URL.

---

## Notes & troubleshooting

- The APK is signed with an auto-generated **debug keystore** — perfect for
  sideloading/testing, but you'll need a real release keystore before a Play Store
  upload.
- The TV banner + launcher icon are simple placeholder vectors; swap them for
  designed art later (`android/app/src/main/res/drawable/ic_launcher.xml`,
  `tv_banner.xml`).
- If the Actions build fails, open the failed step's log and paste it to me — the
  JS side is already verified (typecheck + bundle green), so a failure would be a
  native/Gradle detail I can fix.
- Build too slow / APK too big? In `.github/workflows/android-build.yml` you can
  limit ABIs by adding `-PreactNativeArchitectures=arm64-v8a` to the gradle command
  (arm64 covers most real Android TV devices).
