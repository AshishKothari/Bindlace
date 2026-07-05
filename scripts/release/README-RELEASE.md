# Bindlace Windows release bundle

Pre-built **Node runner** for Windows x64. No compiler required.

## 1. Install

1. Download `bindlace-windows-x64-<version>.zip` from [GitHub Releases](https://github.com/YOUR_ORG/jsonautomation/releases).
2. Extract to a folder, e.g. `C:\Tools\bindlace`.
3. Open PowerShell in that folder and run:

```powershell
.\install.ps1
```

Optional flags:

```powershell
.\install.ps1 -UseSystemNode          # use Node already on PATH (must be 20+)
.\install.ps1 -SkipPlaywright         # skip Chromium download
.\install.ps1 -AddToUserPath          # add bundle folder to user PATH
```

`install.ps1` will:

- Download a **portable Node.js** into `node\` (unless `-UseSystemNode`)
- Install **Playwright Chromium** (unless `-SkipPlaywright`)
- Create **`bindlace.cmd`** in this folder

## 2. Run

```cmd
bindlace.cmd validate --flow packages\wflow-spec\examples\smoke-public.wflow.yaml --locators packages\wflow-spec\examples\smoke-public.wloc.yaml --data packages\wflow-spec\examples\smoke-public.wdata.yaml

bindlace.cmd run --flow packages\wflow-spec\examples\smoke-public.wflow.yaml --locators packages\wflow-spec\examples\smoke-public.wloc.yaml --data packages\wflow-spec\examples\smoke-public.wdata.yaml
```

**Selenium:** add `--driver selenium` (requires Google Chrome; Selenium Manager usually fetches ChromeDriver).

**Legacy alias:** same CLI supports `wflow` when installed via npm; the release wrapper is `bindlace.cmd` only.

## 3. Your own flows

Point `--flow`, `--locators`, and `--data` at your `*.wflow.yaml`, `*.wloc.yaml`, and optional `*.wdata.yaml` files.

## License

See `LICENSE` in this folder. Node.js (when downloaded by `install.ps1`) is MIT-licensed from [nodejs.org](https://nodejs.org).
