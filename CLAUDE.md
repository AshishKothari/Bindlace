# CLAUDE.md — Bindlace / wflow

Always-on context for Cursor and humans. Keep short; specifics live in `docs/` and `.cursor/rules/`.

**Bindlace** is the project; **`wflow` / `wloc` / `wdata`** are the portable artifact extensions and `kind` values.

## Mission

Language- and framework-agnostic layer for web UI automation. Users author **JSON/YAML** only. Swapping Node ↔ Java or Playwright ↔ Selenium must not require editing user flow/locator/data files — only the runner and driver adapter.

## Artifacts

| Extension | Role |
|---|---|
| `*.wflow.*` | **Flow** — ordered steps; targets reference logical keys (not raw CSS). |
| `*.wloc.*` | **Locator bundle** — logical name → neutral locator (`css`, `xpath`, `role`+`name`, `text`). |
| `*.wdata.*` | **Optional data** — values for `${data.path}` substitution. |

Every artifact carries `wflowSpecVersion: 1`. Breaking changes bump the version and are logged in `docs/FEATURES.md`.

## Execution pipeline

1. **Parse** each file → validate against schemas in `packages/wflow-spec/schema/`.
2. **Flatten prerequisites** (wflow): paths resolve **relative to the current file's directory**; recursive; cycles fail validation.
3. **Substitute** `${data.<dot.path>}` from `wdata` (+ documented env overrides).
4. **Resolve locators** from `wloc` → neutral IR.
5. **Driver adapter** (Playwright / Selenium) executes IR.

Golden IR fixtures under `packages/wflow-spec/examples/resolved-ir/` are the cross-runtime contract.

## Node CLI

Binary: **`bindlace`** (legacy alias: `wflow` — both point at the same entry).

- `bindlace validate` — schema-only
- `bindlace print-ir` — merge + substitute + resolve, no browser
- `bindlace run --driver playwright|selenium` — executes with `--headed`, `--timeout-ms`, `--screenshot-on-failure`, `--log-file`

## Step extras

- Optional **root `log`** on each of `wflow`, `wloc`, `wdata` (supports `${data...}`).
- Per-step optional **`log`**, **`step`** (int ≥ 1), **`id`** — echoed in logs/errors.
- `navigate` may include `assertVisible: <locatorKey>` — runner expands to two IR ops.

## Secrets

Prefer env vars for passwords. Never commit secrets to `wdata`.

## Policies (details in rules)

- Code hygiene & comment density: `.cursor/rules/code-hygiene.mdc`
- Node runner conventions: `.cursor/rules/runner-node.mdc`
- Schema editing: `.cursor/rules/schema-editing.mdc`
- YAML/JSON artifact rules: `.cursor/rules/yaml-examples.mdc`
- Docs sync: `.cursor/rules/docs-sync.mdc`

## Where to look

System design `docs/SYSTEM_DESIGN.md` · diagrams `docs/DIAGRAMS.md` · features `docs/FEATURES.md` · tasks `docs/IMPLEMENTATION.md` · Node package `packages/wflow-runner-node/`.

## Out of scope (until listed in FEATURES)

Iframes · shadow DOM · multi-tab flows · copying third-party app code.
