<#
.SYNOPSIS
  Generates the native binary shell required for the first Android build and
  copies ONLY the binary/asset files into this repo (never overwrites source).

.DESCRIPTION
  Scaffolds a throwaway React Native 0.76.6 project in the temp folder using the
  community CLI, then copies:
    - android/gradle/wrapper/gradle-wrapper.jar
    - android/gradlew, android/gradlew.bat
    - android/app/debug.keystore
    - android/app/src/main/res/mipmap-* (launcher icons)
    - android/app/src/main/res/drawable/rn_edit_text_material.xml
  Run once after `npm install`. Safe to re-run (skips files that already exist).
#>

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$rnVersion   = '0.76.6'
$cliVersion  = '15.0.1'
$tempParent  = Join-Path $env:TEMP ("wlm-bootstrap-" + [System.Guid]::NewGuid().ToString('N').Substring(0,8))
$tempProject = Join-Path $tempParent 'WeblinkMobile'

Write-Host "==> Project root: $projectRoot"
Write-Host "==> Scaffolding RN $rnVersion into $tempProject ..."

New-Item -ItemType Directory -Force -Path $tempParent | Out-Null

# Non-interactive scaffold. --skip-install keeps it fast (we only need the shell files).
npx --yes "@react-native-community/cli@$cliVersion" init WeblinkMobile `
    --version $rnVersion `
    --directory $tempProject `
    --skip-install `
    --skip-git-init

if (-not (Test-Path $tempProject)) {
    throw "Scaffold failed: $tempProject was not created."
}

function Copy-IfMissing {
    param([string]$From, [string]$To)
    if (Test-Path $To) {
        Write-Host "    skip (exists): $To"
        return
    }
    $toDir = Split-Path -Parent $To
    if (-not (Test-Path $toDir)) { New-Item -ItemType Directory -Force -Path $toDir | Out-Null }
    Copy-Item $From $To -Force
    Write-Host "    copied: $To"
}

Write-Host "==> Copying binary/asset files ..."

Copy-IfMissing `
    (Join-Path $tempProject 'android\gradle\wrapper\gradle-wrapper.jar') `
    (Join-Path $projectRoot 'android\gradle\wrapper\gradle-wrapper.jar')

Copy-IfMissing (Join-Path $tempProject 'android\gradlew')     (Join-Path $projectRoot 'android\gradlew')
Copy-IfMissing (Join-Path $tempProject 'android\gradlew.bat') (Join-Path $projectRoot 'android\gradlew.bat')

Copy-IfMissing `
    (Join-Path $tempProject 'android\app\debug.keystore') `
    (Join-Path $projectRoot 'android\app\debug.keystore')

Copy-IfMissing `
    (Join-Path $tempProject 'android\app\src\main\res\drawable\rn_edit_text_material.xml') `
    (Join-Path $projectRoot 'android\app\src\main\res\drawable\rn_edit_text_material.xml')

# Launcher icon mipmaps (all densities).
$srcRes = Join-Path $tempProject 'android\app\src\main\res'
$dstRes = Join-Path $projectRoot 'android\app\src\main\res'
Get-ChildItem -Path $srcRes -Directory -Filter 'mipmap-*' | ForEach-Object {
    $dst = Join-Path $dstRes $_.Name
    if (-not (Test-Path $dst)) {
        Copy-Item $_.FullName $dst -Recurse -Force
        Write-Host "    copied: $dst"
    } else {
        Write-Host "    skip (exists): $dst"
    }
}

Write-Host "==> Cleaning up temp ..."
Remove-Item $tempParent -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Done. Next:"
Write-Host "  copy .env.example .env"
Write-Host "  npm run start:reset"
Write-Host "  npm run android"
