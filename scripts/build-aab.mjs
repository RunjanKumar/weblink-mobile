#!/usr/bin/env node
/**
 * Builds the Android TV app (Google Play .aab + a sideloadable .apk) from the
 * same React Native source as the webOS .ipk and the Tizen .wgt. Node, not
 * PowerShell, so it runs on Windows and macOS.
 *
 *   1. Bundles the app with webpack (`--env target=androidtv` ->
 *      web-build-androidtv/). Same bundle as webOS; only index.html differs
 *      (the viewport is pinned to 1920px).
 *   2. Copies the bundle into the wrapper's assets (androidtv/app/src/main/
 *      assets/www/), which WebViewAssetLoader serves to the WebView.
 *   3. Runs Gradle in androidtv/: release = bundleRelease + assembleRelease,
 *      signed with the upload key from androidtv/keystore.properties;
 *      --debug = assembleDebug only (WebView debuggable via chrome://inspect).
 *   4. Copies the outputs to dist-androidtv/NexgenHotels-<versionName>.aab/.apk.
 *   5. With --install: `adb install -r` + launch on a connected device.
 *
 * Usage:
 *   node scripts/build-aab.mjs [--debug] [--dev] [--install] [--device <serial>]
 *
 *   --debug   debug APK only (no .aab, no upload key needed)
 *   --dev     webpack development bundle (source maps) instead of production
 *
 * Env:
 *   ANDROID_HOME  Android SDK (adb, and Gradle's sdk.dir if local.properties is absent).
 */
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'web-build-androidtv');
const wrapperDir = path.join(root, 'androidtv');
const assetsDir = path.join(wrapperDir, 'app', 'src', 'main', 'assets', 'www');
const outDir = path.join(root, 'dist-androidtv');
const appId = 'com.wattinventive.nexgenhotels';
const isWindows = process.platform === 'win32';
const startedAt = Date.now();

const color = (code, text) => `\x1b[${code}m${text}\x1b[0m`;
const step = m => console.log(color(36, `==> ${m}`));
const ok = m => console.log(color(32, `    ${m}`));
const warn = m => console.log(color(33, `    ${m}`));
const fail = m => {
  console.error(color(31, `\nERROR: ${m}\n`));
  process.exit(1);
};

// -- Args --------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = name => argv.includes(name);
const option = name => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const debug = flag('--debug');
const dev = flag('--dev');
const install = flag('--install');
const device = option('--device');

// -- Helpers -----------------------------------------------------------------
const quote = a => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);

/**
 * Windows needs a shell to run .bat / npx. Node warns when args are passed
 * alongside `shell: true` (it only concatenates them), so build the quoted
 * command line ourselves there.
 */
function spawn(cmd, args, options = {}) {
  const cwd = options.cwd || root;
  return isWindows
    ? spawnSync([cmd, ...args].map(quote).join(' '), {...options, cwd, shell: true})
    : spawnSync(cmd, args, {...options, cwd});
}

/** Runs a command with live output; fails on a non-zero exit. */
function run(cmd, args, what, cwd) {
  const r = spawn(cmd, args, {stdio: 'inherit', cwd});
  if (r.status !== 0) {
    fail(`${what} failed with exit code ${r.status}`);
  }
}

/** Minimal KEY=value reader — same file react-native-dotenv inlines. */
function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) {
      env[m[1]] = m[2];
    }
  }
  return env;
}

function findAdb() {
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdk) {
    return undefined;
  }
  const adb = path.join(sdk, 'platform-tools', isWindows ? 'adb.exe' : 'adb');
  return fs.existsSync(adb) ? adb : undefined;
}

function copyDir(from, to) {
  fs.rmSync(to, {recursive: true, force: true});
  fs.mkdirSync(to, {recursive: true});
  fs.cpSync(from, to, {recursive: true});
}

console.log(`\n${color(1, `Nexgen Hotels - Android TV ${debug ? 'debug .apk' : '.aab + .apk'} build`)}`);
console.log(`Project: ${root}\n`);

// -- 1. Preflight ------------------------------------------------------------
step('Checking build inputs ...');

const gradlew = path.join(wrapperDir, isWindows ? 'gradlew.bat' : 'gradlew');
if (!fs.existsSync(gradlew)) {
  fail(
    'androidtv/ wrapper project not found (no gradlew). Create it first — ' +
      'docs/android-tv/ANDROID_TV_PLAY_HANDOFF.md, Section 6.',
  );
}
ok('androidtv/ wrapper project present');

const adb = findAdb();
if (!adb) {
  fail('Android SDK not found. Set ANDROID_HOME to the SDK folder (Android Studio > Settings > Android SDK).');
}
ok(`adb: ${adb}`);

const gradleFile = fs.readFileSync(path.join(wrapperDir, 'app', 'build.gradle.kts'), 'utf8');
const versionName = /versionName\s*=\s*"([^"]+)"/.exec(gradleFile)?.[1];
const versionCode = /versionCode\s*=\s*(\d+)/.exec(gradleFile)?.[1];
if (!versionName || !versionCode) {
  fail('androidtv/app/build.gradle.kts has no versionName / versionCode.');
}
ok(`version ${versionName} (code ${versionCode})`);

if (!debug && !fs.existsSync(path.join(wrapperDir, 'keystore.properties'))) {
  fail(
    'androidtv/keystore.properties is missing — a release must be signed with the upload key ' +
      '(handoff doc, Section 8.6). Use --debug for a test build.',
  );
}

const envFile = path.join(root, '.env');
if (!fs.existsSync(envFile)) {
  fail('.env is missing — API_BASE_URL is baked into the bundle at build time.');
}
ok('.env present');

// Dev-credential guard (same rule as build-ipk.ps1 / build-wgt.mjs):
// react-native-dotenv INLINES .env values, so a production build must not
// carry DEV_LOGIN_*.
const env = readEnv(envFile);
if (env.DEV_LOGIN_PASSWORD && env.APP_ENV === 'production') {
  fail('.env has APP_ENV=production but still contains DEV_LOGIN_* credentials. Remove them first.');
} else if (env.DEV_LOGIN_PASSWORD) {
  warn('DEV_LOGIN_* credentials are in .env (dev build) - remove them before any Play upload.');
}

// -- 2. Web bundle -----------------------------------------------------------
const mode = dev ? 'development' : 'production';
step(`Bundling the web app (${mode}, target androidtv) ...`);
run('npx', ['webpack', '--mode', mode, '--env', 'target=androidtv'], 'webpack');
if (!fs.existsSync(path.join(buildDir, 'index.html'))) {
  fail('webpack produced no index.html in web-build-androidtv/.');
}
ok('bundle written to web-build-androidtv/');

// -- 3. Into the APK's assets ------------------------------------------------
step('Copying the bundle into the wrapper ...');
copyDir(buildDir, assetsDir);
ok('androidtv/app/src/main/assets/www/');

// -- 4. Gradle ---------------------------------------------------------------
const tasks = debug ? [':app:assembleDebug'] : [':app:bundleRelease', ':app:assembleRelease'];
step(`Gradle ${tasks.join(' ')} ...`);
run(gradlew, [...tasks, '--console=plain'], 'Gradle', wrapperDir);

const outputs = path.join(wrapperDir, 'app', 'build', 'outputs');
const builtApk = debug
  ? path.join(outputs, 'apk', 'debug', 'app-debug.apk')
  : path.join(outputs, 'apk', 'release', 'app-release.apk');
const builtAab = path.join(outputs, 'bundle', 'release', 'app-release.aab');

fs.mkdirSync(outDir, {recursive: true});
const base = `NexgenHotels-${versionName}${debug ? '-debug' : ''}`;
const apk = path.join(outDir, `${base}.apk`);
if (!fs.existsSync(builtApk)) {
  fail(`Gradle reported success but ${path.relative(root, builtApk)} is missing.`);
}
fs.copyFileSync(builtApk, apk);
let aab;
if (!debug) {
  if (!fs.existsSync(builtAab)) {
    fail(`Gradle reported success but ${path.relative(root, builtAab)} is missing.`);
  }
  aab = path.join(outDir, `${base}.aab`);
  fs.copyFileSync(builtAab, aab);
}

const mb = file => `${(fs.statSync(file).size / 1024 / 1024).toFixed(2)} MB`;
console.log(`\n${color(32, 'BUILD SUCCESSFUL')}\n`);
if (aab) {
  console.log(`  AAB      : ${aab}  (${mb(aab)})  <- upload this to Play Console`);
}
console.log(`  APK      : ${apk}  (${mb(apk)})`);
console.log(`  Duration : ${Math.round((Date.now() - startedAt) / 1000)} s`);

// -- 5. Optional install -----------------------------------------------------
const target = device ? ['-s', device] : [];
if (install) {
  console.log('');
  step(`Installing onto ${device || 'the connected device'} ...`);
  run(adb, [...target, 'install', '-r', apk], 'adb install');
  run(adb, [...target, 'shell', 'am', 'start', '-n', `${appId}/.MainActivity`], 'adb launch');
  ok(`installed + launched ${appId}`);
} else {
  console.log(color(90, '\n  To put this on the emulator / a TV:'));
  console.log(color(90, '    1. Start a TV emulator (Android Studio > Device Manager), or'));
  console.log(color(90, '       `adb connect <TV-IP>:5555` with network debugging on.'));
  console.log(color(90, '    2. npm run aab:install   (add -- --device <serial> if several are connected)'));
  if (!debug) {
    console.log(color(90, '  Hotels without Play get the Play-SIGNED universal APK from Play Console'));
    console.log(color(90, '  (App bundle explorer), never this upload-key APK - see handoff doc G4.'));
  }
}
console.log('');
