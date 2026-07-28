<#
.SYNOPSIS
  Builds the release APK, handling every Windows-specific gotcha automatically.

.DESCRIPTION
  Wraps `gradlew assembleRelease` with the preflight this project needs on Windows:

    1. Maps the project onto a short drive letter via `subst`. REQUIRED - the
       reanimated C++ step generates dependency-file paths ~2x the project path
       length, and the Android SDK's ninja 1.10.2 cannot address paths over the
       259-char Windows MAX_PATH. Building from C:\dev\weblink-mobile (22 chars)
       overflows; a drive root (3 chars) does not.
    2. Restores build inputs that are intentionally NOT in git (.env, the debug
       keystore) so a fresh clone builds without manual steps.
    3. Runs `npm ci` only when package-lock.json actually changed since the last
       build, instead of every time.
    4. Translates the two failure modes this project hits into plain English
       rather than leaving you with a raw Gradle stack trace.

.PARAMETER Clean
  Run `gradlew clean` first. Use when the build behaves inconsistently.

.PARAMETER Install
  Install onto the connected device/emulator when the build succeeds.
  Uses `adb install -r`, which preserves app data.

.PARAMETER SkipDeps
  Skip the dependency check entirely, even if package-lock.json changed.

.PARAMETER KeepDrive
  Leave the subst drive mapped when the script exits. Useful if you also want
  to run Metro or adb against the short path afterwards.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/build-apk.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/build-apk.ps1 -Install -KeepDrive
#>

[CmdletBinding()]
param(
    [switch]$Clean,
    [switch]$Install,
    [switch]$SkipDeps,
    [switch]$KeepDrive
)

$ErrorActionPreference = 'Stop'

$projectRoot  = Split-Path -Parent $PSScriptRoot
$apkRelative  = 'android\app\build\outputs\apk\release\app-release.apk'
$stampFile    = Join-Path $projectRoot 'node_modules\.build-apk-lock-hash'
$createdDrive = $null
$startedAt    = Get-Date

function Write-Step { param([string]$Message) Write-Host "==> $Message" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Message) Write-Host "    $Message" -ForegroundColor Green }
function Write-Warn { param([string]$Message) Write-Host "    $Message" -ForegroundColor Yellow }

# Windows PowerShell 5.1 turns a native command's stderr into ErrorRecords, which
# under `$ErrorActionPreference = 'Stop'` become TERMINATING errors. Gradle and npm
# both write progress and warnings to stderr, so every native call must run with
# 'Continue' and be judged on its exit code instead.
function Invoke-Native {
    param(
        [Parameter(Mandatory)][scriptblock]$Command,
        [Parameter(Mandatory)][string]$What,
        [switch]$PassThruExitCode
    )
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    # Out-Host keeps the command's own output on screen instead of letting it be
    # captured into this function's return value alongside the exit code.
    try { & $Command | Out-Host } finally { $ErrorActionPreference = $previous }

    if (-not $PassThruExitCode -and $LASTEXITCODE -ne 0) {
        throw "$What failed with exit code $LASTEXITCODE"
    }
    return $LASTEXITCODE
}

# Returns a hashtable of drive letter -> target path for current subst mappings.
function Get-SubstMap {
    $map = @{}
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $lines = subst } finally { $ErrorActionPreference = $previous }
    foreach ($line in $lines) {
        # Format: "X:\: => C:\dev\weblink-mobile"
        if ($line -match '^([A-Za-z]):\\: => (.+)$') {
            $map[$Matches[1].ToUpper()] = $Matches[2].TrimEnd('\')
        }
    }
    return $map
}

# Reuse an existing mapping to this project if there is one, otherwise claim a
# free letter. Preference order keeps it predictable across runs.
function Resolve-BuildDrive {
    param([string]$Target)

    $normalized = $Target.TrimEnd('\')
    $existing   = Get-SubstMap

    foreach ($letter in $existing.Keys) {
        if ($existing[$letter] -ieq $normalized) {
            Write-Ok "reusing existing mapping $letter`: -> $normalized"
            return @{ Letter = $letter; Created = $false }
        }
    }

    foreach ($candidate in @('X', 'Y', 'W', 'V', 'U', 'T', 'R', 'Q', 'P', 'N')) {
        if ($existing.ContainsKey($candidate)) { continue }
        if (Test-Path "$candidate`:\") { continue }

        $mapExit = Invoke-Native -What 'subst' -PassThruExitCode -Command { subst "$candidate`:" $normalized }
        if ($mapExit -ne 0) { continue }

        Write-Ok "mapped $candidate`: -> $normalized"
        return @{ Letter = $candidate; Created = $true }
    }

    throw "No free drive letter available for subst. Free one up, or run: subst X: `"$normalized`""
}

try {
    Write-Host ""
    Write-Host "Weblink Mobile - release APK build" -ForegroundColor White
    Write-Host "Project: $projectRoot"
    Write-Host ""

    # -- 1. Preflight --------------------------------------------------------
    Write-Step "Checking toolchain ..."

    if (-not (Test-Path (Join-Path $projectRoot 'android\gradlew.bat'))) {
        throw "android\gradlew.bat is missing. The Gradle wrapper is not in git - generate it first with:`n    powershell -ExecutionPolicy Bypass -File scripts/bootstrap.ps1"
    }

    $javaHome = $env:JAVA_HOME
    if (-not $javaHome -or -not (Test-Path $javaHome)) {
        throw "JAVA_HOME is not set to a valid JDK. This project needs JDK 17."
    }
    Write-Ok "JDK: $javaHome"

    $localProps = Join-Path $projectRoot 'android\local.properties'
    if (-not (Test-Path $localProps)) {
        $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
        if (-not (Test-Path $sdk)) {
            throw "Android SDK not found at $sdk. Install it via Android Studio, or create android\local.properties with sdk.dir=<path>."
        }
        "sdk.dir=$($sdk -replace '\\', '\\')" | Out-File -FilePath $localProps -Encoding ascii
        Write-Ok "created android\local.properties -> $sdk"
    } else {
        Write-Ok "android\local.properties present"
    }

    # -- 2. Build inputs that are gitignored ---------------------------------
    Write-Step "Checking build inputs ..."

    $envFile = Join-Path $projectRoot '.env'
    if (-not (Test-Path $envFile)) {
        Copy-Item (Join-Path $projectRoot '.env.example') $envFile
        Write-Ok "created .env from .env.example"
    } else {
        Write-Ok ".env present"
    }

    # Release builds are signed with the debug keystore (see android/app/build.gradle).
    # Fine for sideloading; a real keystore is required before any Play Store upload.
    $keystore = Join-Path $projectRoot 'android\app\debug.keystore'
    if (-not (Test-Path $keystore)) {
        Write-Ok "generating debug.keystore ..."
        Invoke-Native -What 'keytool' -Command {
            & "$javaHome\bin\keytool.exe" -genkeypair -v -storetype PKCS12 `
                -keystore $keystore -alias androiddebugkey -keyalg RSA -keysize 2048 `
                -validity 10000 -storepass android -keypass android `
                -dname "CN=Android Debug,O=Android,C=US" | Out-Null
        } | Out-Null
        Write-Ok "created android\app\debug.keystore"
    } else {
        Write-Ok "debug.keystore present"
    }

    # -- 3. Dependencies -----------------------------------------------------
    Write-Step "Checking dependencies ..."

    $lockPath = Join-Path $projectRoot 'package-lock.json'
    $lockHash = (Get-FileHash $lockPath -Algorithm SHA256).Hash
    $needsInstall = $false
    $reason = ''

    if (-not (Test-Path (Join-Path $projectRoot 'node_modules'))) {
        $needsInstall = $true; $reason = 'node_modules is missing'
    } elseif (-not (Test-Path $stampFile)) {
        $needsInstall = $true; $reason = 'no previous build stamp'
    } elseif ((Get-Content $stampFile -Raw).Trim() -ne $lockHash) {
        $needsInstall = $true; $reason = 'package-lock.json changed'
    }

    if ($SkipDeps -and $needsInstall) {
        Write-Warn "SKIPPED despite: $reason (-SkipDeps)"
    } elseif ($needsInstall) {
        Write-Ok "running npm ci ($reason) ..."
        Push-Location $projectRoot
        try {
            Invoke-Native -What 'npm ci' -Command { npm ci --legacy-peer-deps } | Out-Null
        } finally { Pop-Location }
        $lockHash | Out-File -FilePath $stampFile -Encoding ascii -NoNewline
        Write-Ok "dependencies installed"
    } else {
        Write-Ok "up to date (package-lock.json unchanged)"
    }

    # -- 4. Short drive ------------------------------------------------------
    Write-Step "Mapping short build path ..."
    $drive = Resolve-BuildDrive -Target $projectRoot
    if ($drive.Created) { $createdDrive = $drive.Letter }
    $buildRoot = "$($drive.Letter):"

    # -- 5. Build ------------------------------------------------------------
    $gradlew = "$buildRoot\android\gradlew.bat"

    if ($Clean) {
        Write-Step "Running gradlew clean ..."
        Invoke-Native -What 'gradlew clean' -Command {
            & $gradlew -p "$buildRoot\android" clean --no-daemon
        } | Out-Null
    }

    Write-Step "Building release APK (this takes ~1-5 min; the first ever build is much longer) ..."
    Write-Host ""

    $logFile = Join-Path $env:TEMP "weblink-build-$(Get-Random).log"
    $gradleExit = Invoke-Native -What 'gradlew assembleRelease' -PassThruExitCode -Command {
        & $gradlew -p "$buildRoot\android" assembleRelease --no-daemon 2>&1 | Tee-Object -FilePath $logFile
    }

    Write-Host ""

    if ($gradleExit -ne 0) {
        $log = Get-Content $logFile -Raw

        # Translate the two failures this project is prone to.
        if ($log -match "build\.ninja' still dirty") {
            Write-Host "BUILD FAILED - path length" -ForegroundColor Red
            Write-Host "  The C++ step hit the Windows 260-char MAX_PATH limit." -ForegroundColor Red
            Write-Host "  This should not happen when built via this script. Verify the mapping with: subst" -ForegroundColor Red
        } elseif ($log -match 'Unable to delete directory') {
            Write-Host "BUILD FAILED - a file was locked mid-build" -ForegroundColor Red
            Write-Host "  Usually a sync client (OneDrive/Dropbox) or antivirus holding a file." -ForegroundColor Red
            Write-Host "  Keep this project outside any synced folder, then re-run." -ForegroundColor Red
        } else {
            Write-Host "BUILD FAILED - see the Gradle output above." -ForegroundColor Red
        }

        Write-Host "  Full log: $logFile" -ForegroundColor DarkGray
        exit 1
    }

    Remove-Item $logFile -ErrorAction SilentlyContinue

    # -- 6. Report -----------------------------------------------------------
    $apk = Get-Item (Join-Path $projectRoot $apkRelative)

    # A release APK embeds the JS bundle, so any source edit after the build
    # means the APK is already stale. Catch that before it ships.
    $newestSource = Get-ChildItem (Join-Path $projectRoot 'src') -Recurse -File -ErrorAction SilentlyContinue |
                    Sort-Object LastWriteTime -Descending | Select-Object -First 1

    Write-Host "BUILD SUCCESSFUL" -ForegroundColor Green
    Write-Host ""
    Write-Host "  APK      : $($apk.FullName)"
    Write-Host "  Size     : $([math]::Round($apk.Length / 1MB, 2)) MB"
    Write-Host "  Built    : $($apk.LastWriteTime)"
    Write-Host "  Duration : $([math]::Round(((Get-Date) - $startedAt).TotalSeconds)) s"

    # Gradle hashes task inputs rather than comparing timestamps, so an identical
    # rebuild leaves the existing APK untouched. Say so, otherwise the "Built"
    # time above looks alarmingly stale when the build in fact succeeded.
    if ($apk.LastWriteTime -lt $startedAt) {
        Write-Host "  Note     : APK not rewritten - Gradle found every output already up to date," -ForegroundColor DarkGray
        Write-Host "             so this file is current despite the older timestamp." -ForegroundColor DarkGray
    }

    if ($newestSource -and $newestSource.LastWriteTime -gt $apk.LastWriteTime) {
        Write-Host ""
        Write-Warn "WARNING: $($newestSource.Name) changed after this build started - the APK may be stale. Re-run to be sure."
    }

    # -- 7. Optional install -------------------------------------------------
    if ($Install) {
        Write-Host ""
        Write-Step "Installing to connected device ..."
        $adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
        if (-not (Test-Path $adb)) { throw "adb not found at $adb" }

        # `adb devices` output must be captured, so toggle the preference by hand
        # rather than going through Invoke-Native (which routes output to the host).
        $previous = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            $devices = & $adb devices | Select-Object -Skip 1 | Where-Object { $_ -match '\sdevice$' }
        } finally { $ErrorActionPreference = $previous }

        if (-not $devices) {
            Write-Warn "No device or emulator connected - skipping install."
            Write-Warn "Start an emulator, or connect a phone with USB debugging enabled."
        } else {
            Invoke-Native -What 'adb install' -Command { & $adb install -r $apk.FullName } | Out-Null
            Write-Ok "installed com.weblinkmobile"
            Write-Ok "launch it with: adb shell am start -n com.weblinkmobile/.MainActivity"
        }
    }

    Write-Host ""
}
finally {
    # Only tear down a mapping this script created, and only if not asked to keep it.
    if ($createdDrive -and -not $KeepDrive) {
        subst "$createdDrive`:" /D 2>$null
        Write-Host "    released drive $createdDrive`:" -ForegroundColor DarkGray
    } elseif ($createdDrive -and $KeepDrive) {
        Write-Host "    keeping drive $createdDrive`: mapped (-KeepDrive)" -ForegroundColor DarkGray
    }
}
