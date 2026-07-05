#Requires -Version 5.1
<#
.SYNOPSIS
  Bootstrap Bindlace on Windows: portable Node (optional), Playwright Chromium, bindlace.cmd wrapper.

.DESCRIPTION
  Run from an extracted GitHub release zip (install.ps1 at the bundle root) or from a git clone
  (scripts/release/install.ps1 with -BuildFromSource).

.PARAMETER InstallRoot
  Directory containing packages/wflow-runner-node (default: directory of this script).

.PARAMETER UseSystemNode
  Use node.exe from PATH instead of downloading a portable Node runtime.

.PARAMETER NodeVersion
  Portable Node version to download when not using -UseSystemNode (default: 22.16.0).

.PARAMETER SkipPlaywright
  Do not run `playwright install chromium`.

.PARAMETER AddToUserPath
  Append InstallRoot to the current user's PATH (so bindlace.cmd is available in new shells).

.PARAMETER BuildFromSource
  Run npm install + npm run build in the repo (for git clones without a pre-built release zip).
#>
[CmdletBinding()]
param(
  [string]$InstallRoot = "",
  [switch]$UseSystemNode,
  [string]$NodeVersion = "22.16.0",
  [switch]$SkipPlaywright,
  [switch]$AddToUserPath,
  [switch]$BuildFromSource
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($InstallRoot)) {
  $InstallRoot = $PSScriptRoot
}
if ([string]::IsNullOrWhiteSpace($InstallRoot)) {
  throw "InstallRoot is empty. Pass -InstallRoot or run install.ps1 with -File from its directory."
}

function Write-Info([string]$Message) { Write-Host "[bindlace] $Message" }
function Write-Warn([string]$Message) { Write-Warning $Message }

function Resolve-InstallRoot {
  param([string]$Root)
  return (Resolve-Path -LiteralPath $Root).Path
}

function Get-NodeExe {
  param([string]$Root, [switch]$SystemOnly)

  if (-not $SystemOnly) {
    $portable = Join-Path $Root "node\node.exe"
    if (Test-Path -LiteralPath $portable) { return $portable }
  }

  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  return $null
}

function Test-NodeVersion {
  param([string]$NodeExe)
  $raw = & $NodeExe -p "process.versions.node"
  if (-not $raw) { return $false }
  $major = [int]($raw.Split(".")[0])
  return $major -ge 20
}

function Install-PortableNode {
  param([string]$Root, [string]$Version)

  $arch = "win-x64"
  $folder = "node-v$Version-$arch"
  $zipName = "$folder.zip"
  $url = "https://nodejs.org/dist/v$Version/$zipName"
  $dest = Join-Path $Root "node"
  $tmpZip = Join-Path $env:TEMP "bindlace-$zipName"
  $tmpExtract = Join-Path $env:TEMP "bindlace-node-extract-$Version"

  if (Test-Path -LiteralPath $dest) {
    Remove-Item -LiteralPath $dest -Recurse -Force
  }
  if (Test-Path -LiteralPath $tmpExtract) {
    Remove-Item -LiteralPath $tmpExtract -Recurse -Force
  }

  Write-Info "Downloading Node.js v$Version ($arch) from nodejs.org ..."
  Invoke-WebRequest -Uri $url -OutFile $tmpZip -UseBasicParsing

  Write-Info "Extracting Node.js ..."
  Expand-Archive -LiteralPath $tmpZip -DestinationPath $tmpExtract -Force
  Move-Item -LiteralPath (Join-Path $tmpExtract $folder) -Destination $dest

  Remove-Item -LiteralPath $tmpZip -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $tmpExtract -Recurse -Force -ErrorAction SilentlyContinue

  $nodeExe = Join-Path $dest "node.exe"
  if (-not (Test-Path -LiteralPath $nodeExe)) {
    throw "Portable Node install failed: $nodeExe not found"
  }
  return $nodeExe
}

function Write-BindlaceCmd {
  param([string]$Root)
  $cmdPath = Join-Path $Root "bindlace.cmd"
  $content = @"
@echo off
setlocal
set "BINDLACE_ROOT=%~dp0"
if exist "%BINDLACE_ROOT%node\node.exe" (
  set "NODE_EXE=%BINDLACE_ROOT%node\node.exe"
) else (
  set "NODE_EXE=node"
)
"%NODE_EXE%" "%BINDLACE_ROOT%packages\wflow-runner-node\dist\cli.js" %*
"@
  Set-Content -LiteralPath $cmdPath -Value $content -Encoding ASCII
  Write-Info "Wrote $cmdPath"
}

function Add-InstallRootToUserPath {
  param([string]$Root)
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if ($userPath -split ";" | Where-Object { $_ -eq $Root }) {
    Write-Info "InstallRoot already on user PATH: $Root"
    return
  }
  $newPath = if ([string]::IsNullOrWhiteSpace($userPath)) { $Root } else { "$userPath;$Root" }
  [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
  Write-Info "Added to user PATH: $Root (open a new terminal to use bindlace.cmd globally)"
}

$InstallRoot = Resolve-InstallRoot -Root $InstallRoot
$runnerDir = Join-Path $InstallRoot "packages\wflow-runner-node"
$cliJs = Join-Path $runnerDir "dist\cli.js"

if (-not (Test-Path -LiteralPath $runnerDir)) {
  throw "Runner package not found at $runnerDir. Extract the full release zip or pass -InstallRoot."
}

if ($BuildFromSource) {
  Write-Info "Building runner from source ..."
  $repoRoot = $InstallRoot
  if (Test-Path -LiteralPath (Join-Path $InstallRoot "packages\wflow-runner-node\package.json")) {
    # InstallRoot is bundle root
  } elseif (Test-Path -LiteralPath (Join-Path (Split-Path $PSScriptRoot -Parent) "..\packages\wflow-runner-node\package.json")) {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
    $runnerDir = Join-Path $repoRoot "packages\wflow-runner-node"
    $cliJs = Join-Path $runnerDir "dist\cli.js"
  } else {
    throw "Cannot locate repo root for -BuildFromSource"
  }

  Push-Location $repoRoot
  try {
    if (Test-Path -LiteralPath (Join-Path $repoRoot "package-lock.json")) {
      & npm ci
    } else {
      & npm install
    }
    if ($LASTEXITCODE -ne 0) { throw "npm install failed (exit $LASTEXITCODE)" }
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed (exit $LASTEXITCODE)" }
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path -LiteralPath $cliJs)) {
  throw "CLI not built: $cliJs missing. Use a release zip or re-run with -BuildFromSource."
}

$nodeExe = Get-NodeExe -Root $InstallRoot -SystemOnly:$UseSystemNode
if (-not $nodeExe -or -not (Test-NodeVersion -NodeExe $nodeExe)) {
  if ($UseSystemNode) {
    throw "Node.js 20+ is required on PATH. Install from https://nodejs.org or omit -UseSystemNode."
  }
  $nodeExe = Install-PortableNode -Root $InstallRoot -Version $NodeVersion
}

$ver = & $nodeExe -p "process.versions.node"
Write-Info "Using Node $ver ($nodeExe)"

if (-not $SkipPlaywright) {
  Write-Info "Installing Playwright Chromium (one-time browser download) ..."
  $playwrightCli = Join-Path $runnerDir "node_modules\playwright\cli.js"
  if (-not (Test-Path -LiteralPath $playwrightCli)) {
    throw "Playwright not found at $playwrightCli"
  }
  & $nodeExe $playwrightCli install chromium
  if ($LASTEXITCODE -ne 0) {
    throw "playwright install chromium failed (exit $LASTEXITCODE)"
  }
} else {
  Write-Warn "Skipped Playwright browser install. Run manually from packages/wflow-runner-node: npx playwright install chromium"
}

Write-BindlaceCmd -Root $InstallRoot

if ($AddToUserPath) {
  Add-InstallRootToUserPath -Root $InstallRoot
}

Write-Host ""
Write-Info "Install complete."
Write-Host @"

Quick test (from this folder):
  .\bindlace.cmd validate --flow packages\wflow-spec\examples\smoke-public.wflow.yaml --locators packages\wflow-spec\examples\smoke-public.wloc.yaml --data packages\wflow-spec\examples\smoke-public.wdata.yaml

Run smoke flow (Playwright):
  .\bindlace.cmd run --flow packages\wflow-spec\examples\smoke-public.wflow.yaml --locators packages\wflow-spec\examples\smoke-public.wloc.yaml --data packages\wflow-spec\examples\smoke-public.wdata.yaml

Selenium (--driver selenium) needs Google Chrome installed; Selenium Manager usually fetches ChromeDriver.

"@
