#!/usr/bin/env node
/**
 * Builds the Samsung Tizen .wgt from the same React Native source as the APK
 * and the webOS .ipk. Node, not PowerShell, so it runs on Windows and macOS.
 *
 *   1. Bundles the app with webpack (`--env target=tizen` -> web-build-tizen/).
 *      Same bundle as webOS; only index.html differs (Samsung's webapis.js).
 *   2. Writes tizen/config.xml (with the <access> list generated from .env)
 *      and the icon next to the bundle.
 *   3. Runs `tizen package`, which signs with a Tizen Studio certificate
 *      profile, producing dist-tizen/NexgenHotels.wgt.
 *   4. With --install: `tizen install` + `tizen run` on a connected device
 *      (emulator, Remote Test Lab TV or a TV in Developer Mode).
 *
 * Usage:
 *   node scripts/build-wgt.mjs [--dev] [--install] [--device <serial>] [--profile <name>]
 *
 * Env:
 *   TIZEN_PROFILE  certificate profile (default: demo-samsung). A Samsung TV —
 *                  emulator included — rejects the generic Tizen certificate.
 *   TIZEN_CLI      path to the `tizen` CLI if Tizen Studio is not in the default place.
 */
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'web-build-tizen');
const tizenSrc = path.join(root, 'tizen');
const outDir = path.join(root, 'dist-tizen');
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
const dev = flag('--dev');
const install = flag('--install');
const device = option('--device');
const profile = option('--profile') || process.env.TIZEN_PROFILE || 'demo-samsung';

// -- Helpers -----------------------------------------------------------------
const quote = a => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);

/**
 * Windows needs a shell to run .bat / npx. Node warns when args are passed
 * alongside `shell: true` (it only concatenates them), so build the quoted
 * command line ourselves there.
 */
function spawn(cmd, args, options) {
  return isWindows
    ? spawnSync([cmd, ...args].map(quote).join(' '), {...options, cwd: root, shell: true})
    : spawnSync(cmd, args, {...options, cwd: root});
}

/** Runs a command with live output; fails on a non-zero exit. */
function run(cmd, args, what) {
  const r = spawn(cmd, args, {stdio: 'inherit'});
  if (r.status !== 0) {
    fail(`${what} failed with exit code ${r.status}`);
  }
}

/**
 * Runs a `tizen` CLI command. The CLI can print a failure (e.g. "install
 * failed[118, -12]") and still exit 0, so its output is checked too.
 */
function runTizen(args, what) {
  const r = spawn(tizenCli, args, {encoding: 'utf8'});
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  process.stdout.write(out);
  if (r.status !== 0 || /\bfail(ed)?\b|error:/i.test(out)) {
    fail(`${what} failed — see the output above.`);
  }
}

function findTizenCli() {
  const candidates = [
    process.env.TIZEN_CLI,
    isWindows
      ? 'C:\\tizen-studio\\tools\\ide\\bin\\tizen.bat'
      : path.join(os.homedir(), 'tizen-studio', 'tools', 'ide', 'bin', 'tizen'),
  ].filter(Boolean);
  return candidates.find(p => fs.existsSync(p));
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

/**
 * The hosts the app talks to, as Tizen <access> entries. Fallbacks mirror
 * src/constants/config.ts — keep the two in sync.
 */
function accessOrigins(env) {
  const urls = [
    env.API_BASE_URL || 'https://dev-hotel-api.wattinventive.com',
    env.SOCKET_URL || 'https://chat-hotel-automation.wattinventive.com',
    env.IMAGE_BASE_URL || 'https://d36u10gu6pvj0x.cloudfront.net',
  ];
  const origins = [...new Set(urls.map(u => new URL(u).origin))];
  const lines = origins.map(o => `<access origin="${o}" subdomains="false"/>`);
  // Razorpay checkout (paymentService.web.ts) spans several razorpay.com hosts.
  lines.push('<access origin="https://razorpay.com" subdomains="true"/>');
  return lines.join('\n    ');
}

console.log(`\n${color(1, 'Nexgen Hotels - Samsung Tizen .wgt build')}`);
console.log(`Project: ${root}\n`);

// -- 1. Preflight ------------------------------------------------------------
step('Checking build inputs ...');

const tizenCli = findTizenCli();
if (!tizenCli) {
  fail('Tizen CLI not found. Install Tizen Studio, or set TIZEN_CLI to .../tools/ide/bin/tizen(.bat).');
}
ok(`tizen CLI: ${tizenCli}`);

const envFile = path.join(root, '.env');
if (!fs.existsSync(envFile)) {
  fs.copyFileSync(path.join(root, '.env.example'), envFile);
  ok('created .env from .env.example');
} else {
  ok('.env present');
}

// Dev-credential guard (same rule as build-ipk.ps1): react-native-dotenv
// INLINES .env values, so a production build must not carry DEV_LOGIN_*.
const env = readEnv(envFile);
if (env.DEV_LOGIN_PASSWORD && env.APP_ENV === 'production') {
  fail('.env has APP_ENV=production but still contains DEV_LOGIN_* credentials. Remove them first.');
} else if (env.DEV_LOGIN_PASSWORD) {
  warn('DEV_LOGIN_* credentials are in .env (dev build) - remove them before any production build.');
}

for (const required of ['config.xml', 'icon.png']) {
  if (!fs.existsSync(path.join(tizenSrc, required))) {
    fail(`tizen/${required} is missing.`);
  }
}
const configXml = fs.readFileSync(path.join(tizenSrc, 'config.xml'), 'utf8');
const appId = /<tizen:application\s+id="([^"]+)"/.exec(configXml)?.[1];
if (!appId) {
  fail('tizen/config.xml has no <tizen:application id="...">.');
}
ok(`tizen/ metadata present (app ${appId}), signing profile "${profile}"`);

// -- 2. Web bundle -----------------------------------------------------------
const mode = dev ? 'development' : 'production';
step(`Bundling the web app (${mode}, target tizen) ...`);
run('npx', ['webpack', '--mode', mode, '--env', 'target=tizen'], 'webpack');
if (!fs.existsSync(path.join(buildDir, 'index.html'))) {
  fail('webpack produced no index.html in web-build-tizen/.');
}
ok('bundle written to web-build-tizen/');

// -- 3. Tizen metadata -------------------------------------------------------
// After webpack, because `output.clean` wipes the folder on every build.
step('Adding Tizen app metadata ...');
fs.writeFileSync(
  path.join(buildDir, 'config.xml'),
  configXml.replace('<!-- @access-origins -->', accessOrigins(env)),
);
fs.copyFileSync(path.join(tizenSrc, 'icon.png'), path.join(buildDir, 'icon.png'));
ok('config.xml (+ <access> from .env) and icon.png copied into web-build-tizen/');

// -- 4. Package + sign -------------------------------------------------------
step('Packaging + signing .wgt ...');
fs.mkdirSync(outDir, {recursive: true});
for (const old of fs.readdirSync(outDir).filter(f => f.endsWith('.wgt'))) {
  fs.rmSync(path.join(outDir, old));
}
runTizen(['package', '-t', 'wgt', '-s', profile, '-o', outDir, '--', buildDir], 'tizen package');

const built = fs.readdirSync(outDir).find(f => f.endsWith('.wgt'));
if (!built) {
  fail('tizen package reported success but produced no .wgt.');
}
// The CLI names the file after <name> ("Nexgen Hotels.wgt"); drop the space.
const wgt = path.join(outDir, 'NexgenHotels.wgt');
if (path.join(outDir, built) !== wgt) {
  fs.renameSync(path.join(outDir, built), wgt);
}

console.log(`\n${color(32, 'BUILD SUCCESSFUL')}\n`);
console.log(`  WGT      : ${wgt}`);
console.log(`  Size     : ${(fs.statSync(wgt).size / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Duration : ${Math.round((Date.now() - startedAt) / 1000)} s`);

// -- 5. Optional install -----------------------------------------------------
const target = device ? ['-s', device] : [];
if (install) {
  console.log('');
  step(`Installing onto ${device || 'the connected device'} ...`);
  runTizen(['install', '-n', wgt, ...target], 'tizen install');
  runTizen(['run', '-p', appId, ...target], 'tizen run');
  ok(`installed + launched ${appId}`);
} else {
  console.log(color(90, '\n  To put this on a TV / the emulator:'));
  console.log(color(90, '    1. Connect it: emulator via Emulator Manager, a TV via Device Manager'));
  console.log(color(90, '       (Developer Mode on, this PC\'s IP set) - check with `sdb devices`.'));
  console.log(color(90, '    2. Its DUID must be in the certificate profile\'s distributor certificate.'));
  console.log(color(90, '    3. npm run wgt:install   (add -- --device <serial> if several are connected)'));
}
console.log('');
