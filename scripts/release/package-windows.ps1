#Requires -Version 5.1
<#
.SYNOPSIS
  Build bindlace-windows-x64.zip for GitHub Releases.

.PARAMETER Version
  Release version label (e.g. v0.1.0). Defaults to @bindlace/wflow-runner-node package version.

.PARAMETER OutputDir
  Directory for the zip file (default: dist/release under repo root).
#>
[CmdletBinding()]
param(
  [string]$Version = "",
  [string]$OutputDir = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$RunnerPkg = Join-Path $RepoRoot "packages\wflow-runner-node"
$SpecExamples = Join-Path $RepoRoot "packages\wflow-spec\examples"
$BundleName = "bindlace-windows-x64"

if (-not $Version) {
  $pkgJson = Get-Content (Join-Path $RunnerPkg "package.json") -Raw | ConvertFrom-Json
  $Version = "v$($pkgJson.version)"
}

if (-not $OutputDir) {
  $OutputDir = Join-Path $RepoRoot "dist\release"
}
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$StageRoot = Join-Path $env:TEMP "bindlace-stage-$BundleName"
if (Test-Path -LiteralPath $StageRoot) {
  Remove-Item -LiteralPath $StageRoot -Recurse -Force
}
$BundleRoot = Join-Path $StageRoot $BundleName
New-Item -ItemType Directory -Force -Path $BundleRoot | Out-Null

Write-Host "[bindlace] Building runner in $RunnerPkg ..."
Push-Location $RepoRoot
try {
  if (Test-Path -LiteralPath (Join-Path $RepoRoot "package-lock.json")) {
    & npm ci
  } else {
    & npm install
  }
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed (exit $LASTEXITCODE)" }
  & npm run build
  if ($LASTEXITCODE -ne 0) { throw "npm run build failed (exit $LASTEXITCODE)" }
} finally {
  Pop-Location
}

Write-Host "[bindlace] Installing production dependencies for runner ..."
Push-Location $RunnerPkg
try {
  if (Test-Path -LiteralPath "package-lock.json") {
    & npm ci --omit=dev
  } else {
    & npm install --omit=dev
  }
  if ($LASTEXITCODE -ne 0) { throw "npm ci --omit=dev failed (exit $LASTEXITCODE)" }
} finally {
  Pop-Location
}

$destRunner = Join-Path $BundleRoot "packages\wflow-runner-node"
New-Item -ItemType Directory -Force -Path $destRunner | Out-Null
Copy-Item -LiteralPath (Join-Path $RunnerPkg "package.json") -Destination $destRunner
Copy-Item -LiteralPath (Join-Path $RunnerPkg "dist") -Destination (Join-Path $destRunner "dist") -Recurse
Copy-Item -LiteralPath (Join-Path $RunnerPkg "schema") -Destination (Join-Path $destRunner "schema") -Recurse
Copy-Item -LiteralPath (Join-Path $RunnerPkg "node_modules") -Destination (Join-Path $destRunner "node_modules") -Recurse

$destExamples = Join-Path $BundleRoot "packages\wflow-spec\examples"
New-Item -ItemType Directory -Force -Path $destExamples | Out-Null
foreach ($name in @(
  "smoke-public.wflow.yaml",
  "smoke-public.wloc.yaml",
  "smoke-public.wdata.yaml",
  "README.md"
)) {
  $src = Join-Path $SpecExamples $name
  if (Test-Path -LiteralPath $src) {
    Copy-Item -LiteralPath $src -Destination $destExamples
  }
}

Copy-Item -LiteralPath (Join-Path $RepoRoot "LICENSE") -Destination $BundleRoot
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "install.ps1") -Destination $BundleRoot
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "README-RELEASE.md") -Destination $BundleRoot

Set-Content -LiteralPath (Join-Path $BundleRoot "VERSION.txt") -Value $Version -Encoding utf8

$zipPath = Join-Path $OutputDir "$BundleName-$Version.zip"
if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Write-Host "[bindlace] Creating $zipPath ..."
Compress-Archive -LiteralPath $BundleRoot -DestinationPath $zipPath -Force

Remove-Item -LiteralPath $StageRoot -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "[bindlace] Done: $zipPath"
Write-Host "[bindlace] Users: expand zip, then run: .\install.ps1"
