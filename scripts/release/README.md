# Release scripts (Windows)

| Script | Purpose |
|--------|---------|
| [install.ps1](install.ps1) | End-user bootstrap: portable Node, Playwright Chromium, `bindlace.cmd` |
| [package-windows.ps1](package-windows.ps1) | Maintainer: build `bindlace-windows-x64-<version>.zip` |

## Build a release zip locally

From repo root (PowerShell):

```powershell
.\scripts\release\package-windows.ps1
```

Output: `dist/release/bindlace-windows-x64-v0.1.0.zip` (version from `packages/wflow-runner-node/package.json`).

Custom version label:

```powershell
.\scripts\release\package-windows.ps1 -Version v0.2.0
```

## Publish to GitHub Releases

Push a version tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow [`.github/workflows/release.yml`](../../.github/workflows/release.yml) builds the Windows zip and attaches it to the GitHub Release.

Or create manually:

```bash
gh release create v0.1.0 dist/release/bindlace-windows-x64-v0.1.0.zip --title "v0.1.0" --notes "Windows x64 bundle with install.ps1"
```

## Install from release zip

See [README-RELEASE.md](README-RELEASE.md) (copied into each release zip).

## Install from a git clone (developers)

```powershell
cd packages\wflow-runner-node
npm install
npm run build
cd ..\..
.\scripts\release\install.ps1 -InstallRoot . -BuildFromSource -UseSystemNode
```
