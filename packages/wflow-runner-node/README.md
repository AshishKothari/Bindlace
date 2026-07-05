# @bindlace/wflow-runner-node

**Bindlace** Node package: validates **`wflow` / `wloc` / `wdata`**, merges to a **resolved IR**, and runs flows with **Playwright** or **Selenium** via the **`bindlace`** CLI (alias: `wflow`).

## Status

See [docs/IMPLEMENTATION.md](../../docs/IMPLEMENTATION.md) for task tracking. Architecture: [docs/SYSTEM_DESIGN.md](../../docs/SYSTEM_DESIGN.md).

## Consume from another repo

1. In the **Bindlace** clone: `cd packages/wflow-runner-node && npm install && npm run build`.
2. In **your app** `package.json`: `"@bindlace/wflow-runner-node": "file:../<clone>/packages/wflow-runner-node"` (adjust path and `..` segments).
3. Run `npm install` in your app, then `npx playwright install chromium` if using Playwright.
4. Run `npx bindlace validate|run|print-ir ...` (or legacy `npx wflow ...`) with paths to your `*.wflow` / `*.wloc` / `*.wdata` files.

Full steps: [root README — “Use as a dependency”](../../README.md#use-as-a-dependency-in-another-project).

## Logging

- **Terminal:** Every `bindlace run` line is prefixed with an ISO timestamp (same format as `--log-file` when used).
- **File:** `--log-file <path>` appends the same lines as stdout.
- **Author messages:** Optional root-level `log` on `wflow`, `wloc`, and `wdata` (supports `${data...}`). Optional `log` on each step (see JSON Schema).

## Troubleshooting

- **`net::ERR_CONNECTION_REFUSED`** — No server at the URL in your flow/data; start the app or change `baseUrl`.
- **PowerShell** — Paste one command at a time.
- **Wrong `cd`** — If cwd is already `.../packages/wflow-runner-node`, do not `cd packages/wflow-runner-node` again.

## Install

```bash
cd packages/wflow-runner-node
npm install
npm run build
```

Playwright browsers (when using `--driver playwright`):

```bash
npx playwright install chromium
```

## CLI

Primary command: `bindlace`. Legacy alias `wflow` still works.

```bash
npx bindlace validate --flow ../wflow-spec/examples/login.wflow.yaml --locators ../wflow-spec/examples/app.wloc.yaml --data ../wflow-spec/examples/env.wdata.yaml
npx bindlace print-ir --flow ... --locators ... [--data ...]
npx bindlace run --flow ... --locators ... [--data ...] [--driver playwright|selenium] [--headed] [--timeout-ms 30000] [--screenshot-on-failure ./fail.png]
```

## API

Exports include `loadArtifact`, `validateArtifact`, `buildResolvedIr`, `buildResolvedIrFromEntry`, `executeResolvedIr`, `executeResolvedIrSelenium` — see `src/index.ts`.
