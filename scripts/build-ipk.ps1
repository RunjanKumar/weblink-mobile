<#
.SYNOPSIS
  Builds the LG webOS .ipk from the same React Native source as the APK.

.DESCRIPTION
  webOS is not Android — it cannot install an APK. Its apps are web apps in an
  .ipk container. This script produces one:

    1. Bundles the app for the browser with webpack (react-native-web). Every
       `*.web.ts` shim wins over its native sibling here — see webpack.config.js.
    2. Copies `webos/` (appinfo.json + launcher icons) alongside the bundle, so
       the output folder is a complete webOS app.
    3. Runs `ares-package` to produce the .ipk.

  Installing onto a TV is a separate step and needs Developer Mode enabled on
  the TV — see the instructions this script prints at the end.

.PARAMETER Dev
  Build the unminified development bundle. Much faster; use while iterating.

.PARAMETER Install
  After packaging, install onto a device already registered with
  `ares-setup-device`. Fails cleanly when no device is set up.

.PARAMETER Device
  Name of the registered device to install onto. Defaults to whichever device
  ares has marked as default.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/build-ipk.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/build-ipk.ps1 -Install -Device mytv
#>

[CmdletBinding()]
param(
    [switch]$Dev,
    [switch]$Install,
    [string]$Device
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$webBuild    = Join-Path $projectRoot 'web-build'
$webosSrc    = Join-Path $projectRoot 'webos'
$outDir      = Join-Path $projectRoot 'dist-webos'
$startedAt   = Get-Date

function Write-Step { param([string]$m) Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Ok   { param([string]$m) Write-Host "    $m" -ForegroundColor Green }
function Write-Warn { param([string]$m) Write-Host "    $m" -ForegroundColor Yellow }

# Windows PowerShell 5.1 turns a native command's stderr into ErrorRecords,
# which under `$ErrorActionPreference = 'Stop'` become TERMINATING errors.
# webpack and ares both write progress to stderr, so judge them on exit code.
function Invoke-Native {
    param([Parameter(Mandatory)][scriptblock]$Command, [Parameter(Mandatory)][string]$What)
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $Command | Out-Host } finally { $ErrorActionPreference = $previous }
    if ($LASTEXITCODE -ne 0) { throw "$What failed with exit code $LASTEXITCODE" }
}

Write-Host ""
Write-Host "Weblink - LG webOS .ipk build" -ForegroundColor White
Write-Host "Project: $projectRoot"
Write-Host ""

# -- 1. Preflight ------------------------------------------------------------
Write-Step "Checking build inputs ..."

$envFile = Join-Path $projectRoot '.env'
if (-not (Test-Path $envFile)) {
    Copy-Item (Join-Path $projectRoot '.env.example') $envFile
    Write-Ok "created .env from .env.example"
} else {
    Write-Ok ".env present"
}

foreach ($required in @('appinfo.json', 'icon.png', 'largeIcon.png')) {
    if (-not (Test-Path (Join-Path $webosSrc $required))) {
        throw "webos\$required is missing. It is required by ares-package."
    }
}
Write-Ok "webos/ metadata present"

# -- 2. Web bundle -----------------------------------------------------------
$mode = if ($Dev) { 'development' } else { 'production' }
Write-Step "Bundling the web app ($mode) ..."
Push-Location $projectRoot
try {
    Invoke-Native -What 'webpack' -Command { npx webpack --mode $mode }
} finally { Pop-Location }

if (-not (Test-Path (Join-Path $webBuild 'index.html'))) {
    throw "webpack produced no index.html in web-build/."
}
Write-Ok "bundle written to web-build/"

# -- 3. webOS metadata -------------------------------------------------------
# Copied AFTER webpack, because `output.clean` wipes web-build/ on every build.
Write-Step "Adding webOS app metadata ..."
Copy-Item (Join-Path $webosSrc '*') $webBuild -Force -Recurse
Write-Ok "appinfo.json + icons copied into web-build/"

# -- 4. Package --------------------------------------------------------------
Write-Step "Packaging .ipk ..."
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory $outDir | Out-Null }

# `-n` (--no-minify) is undocumented in `ares-package --help` but real. Without
# it the CLI runs the app's JS through uglify-js, which is ES5-only and dies on
# the modern syntax terser leaves in ("Failed to minify code"). webpack has
# already minified the bundle in production mode, so nothing is lost.
Push-Location $projectRoot
try {
    Invoke-Native -What 'ares-package' -Command { npx ares-package -n $webBuild -o $outDir }
} finally { Pop-Location }

$ipk = Get-ChildItem $outDir -Filter *.ipk | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $ipk) { throw "ares-package reported success but produced no .ipk." }

Write-Host ""
Write-Host "BUILD SUCCESSFUL" -ForegroundColor Green
Write-Host ""
Write-Host "  IPK      : $($ipk.FullName)"
Write-Host "  Size     : $([math]::Round($ipk.Length / 1MB, 2)) MB"
Write-Host "  Duration : $([math]::Round(((Get-Date) - $startedAt).TotalSeconds)) s"

# -- 5. Optional install -----------------------------------------------------
if ($Install) {
    Write-Host ""
    Write-Step "Installing onto the TV ..."
    Push-Location $projectRoot
    try {
        if ($Device) {
            Invoke-Native -What 'ares-install' -Command { npx ares-install -d $Device $ipk.FullName }
        } else {
            Invoke-Native -What 'ares-install' -Command { npx ares-install $ipk.FullName }
        }
        Write-Ok "installed com.wattinventive.weblink"
    } finally { Pop-Location }
} else {
    Write-Host ""
    Write-Host "  To put this on the TV:" -ForegroundColor DarkGray
    Write-Host "    1. On the TV: install 'Developer Mode' from the LG Content Store," -ForegroundColor DarkGray
    Write-Host "       sign in with your LG developer account, turn Dev Mode ON." -ForegroundColor DarkGray
    Write-Host "       The app then shows the TV's IP address and a passphrase." -ForegroundColor DarkGray
    Write-Host "    2. npx ares-setup-device        # add the TV (IP + passphrase)" -ForegroundColor DarkGray
    Write-Host "    3. npx ares-install `"$($ipk.Name)`"" -ForegroundColor DarkGray
    Write-Host "    4. npx ares-launch com.wattinventive.weblink" -ForegroundColor DarkGray
    Write-Host "  Dev Mode sessions expire (~50h) - extend them from the same TV app." -ForegroundColor DarkGray
}

Write-Host ""
