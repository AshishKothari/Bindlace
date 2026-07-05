# Bindlace

**Bindlace** is a **language- and driver-neutral** layer for **web UI automation**: author **portable JSON/YAML** (`*.wflow`, `*.wloc`, optional `*.wdata`), merge to a **resolved IR**, and run with **Playwright** or **Selenium**—or future runtimes—**without rewriting** your specs.

*Tagline:* portable flow specs, neutral locators, swappable runners.

## Repository layout

| Path | Purpose |
|------|---------|
| [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) | Architecture and execution pipeline |
| [docs/DIAGRAMS.md](docs/DIAGRAMS.md) | Mermaid diagrams: context, components, CLI flows, sequences |
| [docs/FEATURES.md](docs/FEATURES.md) | High-level feature list and delivery tracking |
| [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) | Current implementation tasks |
| [CLAUDE.md](CLAUDE.md) | Contributor context for Cursor and humans |
| [packages/wflow-spec/](packages/wflow-spec/) | JSON Schemas and example artifacts |
| [packages/wflow-runner-node/](packages/wflow-runner-node/) | Node.js parser, IR merge, **`wflow`** CLI, Playwright + Selenium |
| [packages/wflow-runner-java/](packages/wflow-runner-java/) | JVM runner (planned; same schemas / IR) |
| [examples/](examples/) | End-to-end examples |
| [examples/local-app-3001/](examples/local-app-3001/) | Local dev app template (`http://localhost:3001`) — smoke flow |
| [examples/prerequisites/](examples/prerequisites/) | **`prerequisites`** — shared `*.wflow` composition |

The [autonomous-dev/](autonomous-dev/) folder is a separate experiment and is **not** a dependency of the Bindlace packages.

## File types (contract)

- **`*.wflow.json` / `*.wflow.yaml`** — Ordered steps; targets reference **locator keys** in `wloc`.
- **`*.wloc.json` / `*.wloc.yaml`** — Logical name → **neutral** locator (`css`, `xpath`, `role`, `text`, …).
- **`*.wdata.json` / `*.wdata.yaml`** *(optional)* — Data for **`${data...}`** placeholders.

Version field: **`wflowSpecVersion: 1`**. See [CLAUDE.md](CLAUDE.md) for the full pipeline.

- **`navigate`** may include **`assertVisible`** (locator key) in the same object; the runner expands this to two IR ops. Optional **`step`**, **`id`**, **`log`** on steps are echoed in logs.
- **`prerequisites`:** optional list of `{ "path": "other.wflow" }` on a **wflow** root. Paths resolve **relative to that file’s directory**; nested prereqs supported; **cycles** rejected. `wflow validate` on an entry flow validates the entry and each reachable prerequisite.

### How this relates to Playwright or Selenium scripts

Hand-written tests are tied to one stack. Bindlace keeps **flows, locators, and data** portable; only the **runner** (`--driver playwright` | `selenium`) and **runtime** (Node today, Java planned) change. The **`wflow`** CLI uses the **`playwright`** library or **Selenium WebDriver** under the hood—not a replacement for every framework feature, but the same style of browser automation driven from YAML/JSON.

**Logging:** `wflow run` logs each step (start, optional author `log`, done/fail, duration) to the terminal and optionally **`--log-file`**. Optional **`log`** on each artifact root and on each step supports `${data...}` where documented.

## Quick start (Node runner)

### Windows download (no git)

Pre-built **Windows x64** bundles with `install.ps1` are published on [GitHub Releases](https://github.com/YOUR_ORG/jsonautomation/releases). See [scripts/release/README.md](scripts/release/README.md).

### From source

The CLI binary is **`bindlace`** (legacy alias: `wflow`). Both are installed; use whichever you prefer.

```bash
cd packages/wflow-runner-node
npm install
npm run build
npx bindlace validate --flow ../wflow-spec/examples/login.wflow.yaml --locators ../wflow-spec/examples/app.wloc.yaml --data ../wflow-spec/examples/env.wdata.yaml
```

Print **resolved IR** (no browser):

```bash
npx bindlace print-ir --flow ../wflow-spec/examples/login.wflow.yaml --locators ../wflow-spec/examples/app.wloc.yaml --data ../wflow-spec/examples/env.wdata.yaml
```

**Playwright** (Chromium) — install browsers once:

```bash
npx playwright install chromium
npx bindlace run --flow ../wflow-spec/examples/login.wflow.yaml --locators ../wflow-spec/examples/app.wloc.yaml --data ../wflow-spec/examples/env.wdata.yaml
```

**Selenium** (Chrome):

```bash
npx bindlace run --flow ../wflow-spec/examples/login.wflow.yaml --locators ../wflow-spec/examples/app.wloc.yaml --data ../wflow-spec/examples/env.wdata.yaml --driver selenium
```

Use **`--headed`**, **`--timeout-ms`**, **`--screenshot-on-failure`**, **`--log-file`** as needed.

### Example: app on port 3001

See **[examples/local-app-3001/](examples/local-app-3001/)**.

### Troubleshooting

**`net::ERR_CONNECTION_REFUSED`** — Nothing listening on the URL in your `wdata` / flow. Start the app or change `baseUrl`.

**PowerShell** — Paste one `npx bindlace ...` line at a time; do not paste prompts or old `OK:` output.

**Nested `cd`** — If you are already in `packages/wflow-runner-node`, do not `cd packages/wflow-runner-node` again.

Further work is tracked in [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md).

## Use as a dependency in another project

The installable package is **`@bindlace/wflow-runner-node`** ([packages/wflow-runner-node/](packages/wflow-runner-node/)). It exposes the **`bindlace`** CLI (alias: `wflow`) and a programmatic API (`buildResolvedIr`, **`buildResolvedIrFromEntry`**, `executeResolvedIr`, `executeResolvedIrSelenium`, …).

### 1. Build this repo once

From your **Bindlace** clone (folder name on disk may differ, e.g. `bindlace` or `jsonautomation`):

```bash
cd packages/wflow-runner-node
npm install
npm run build
```

### 2. Add `file:` dependency

From your app’s `package.json`, point to this repo’s runner package (adjust `..` segments from that file’s directory):

```json
{
  "dependencies": {
    "@bindlace/wflow-runner-node": "file:../bindlace/packages/wflow-runner-node"
  }
}
```

If the clone lives next to your app as `jsonautomation`, use `file:../jsonautomation/packages/wflow-runner-node` instead.

```bash
cd /path/to/your-app
npm install
```

### 3. Browsers

- **Playwright:** `npx playwright install chromium` (from your app root after `npm install`).
- **Selenium:** Chrome installed; Selenium Manager usually resolves ChromeDriver.

### 4. Run CLI

```bash
npx bindlace validate --flow ./automation/smoke.wflow.yaml --locators ./automation/app.wloc.yaml --data ./automation/env.wdata.yaml
npx bindlace run --flow ./automation/smoke.wflow.yaml --locators ./automation/app.wloc.yaml --data ./automation/env.wdata.yaml
```

### 5. Optional npm scripts

```json
{
  "scripts": {
    "bindlace:validate": "bindlace validate --flow ./automation/smoke.wflow.yaml --locators ./automation/app.wloc.yaml --data ./automation/env.wdata.yaml",
    "bindlace:run": "bindlace run --flow ./automation/smoke.wflow.yaml --locators ./automation/app.wloc.yaml --data ./automation/env.wdata.yaml"
  }
}
```

### 6. Programmatic API

```js
import { buildResolvedIrFromEntry, executeResolvedIr, createLogger } from "@bindlace/wflow-runner-node";
```

See [packages/wflow-runner-node/README.md](packages/wflow-runner-node/README.md).

### Publishing to npm

Publish **`@bindlace/wflow-spec`** and **`@bindlace/wflow-runner-node`** under the **`@bindlace`** scope; consumers then use a **version range** instead of `file:`.

JSON Schema **`$id`** URIs use **`https://bindlace.dev/schema/`** as the canonical namespace (host for docs or redirects can be wired when you go live).

## Contributing

1. Read [CLAUDE.md](CLAUDE.md) and [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md).
2. Pick a task in [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md).
3. Keep schemas and golden IR examples in sync when changing the contract.

## License

Licensed under the [Apache License 2.0](LICENSE) — free to use, modify, distribute, and sell, including commercially, provided you retain the copyright/attribution notices and the [NOTICE](NOTICE) file. Includes an express patent grant. See `LICENSE` for the full text.
