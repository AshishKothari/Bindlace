# Implementation tasks (current)

**Last updated:** 2026-04-19 (workspaces root; legacy scaffolding removed; Cursor agents restructured)

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done

---

## Active focus — Phase 1 (MVP-A: Node + schemas)

### T1 — Repository docs and tracking

- [x] **T1.1** Root [README.md](../README.md)
- [x] **T1.2** Root [CLAUDE.md](../CLAUDE.md)
- [x] **T1.3** [FEATURES.md](FEATURES.md) (high-level tracking)
- [x] **T1.4** This file [IMPLEMENTATION.md](IMPLEMENTATION.md)

### T2 — `packages/wflow-spec`

- [x] **T2.1** Package metadata (`package.json`) and `schema/` JSON Schemas
- [x] **T2.2** Example `*.wflow`, `*.wloc`, `*.wdata` under `examples/`
- [x] **T2.3** Document resolved IR JSON shape + add `examples/resolved-ir/*.json` (illustrative; formal schema TBD)
- [~] **T2.4** npm script or note to validate examples against schemas — use `npm run build && node dist/cli.js validate ...` from `wflow-runner-node`; dedicated script optional

### T3 — `packages/wflow-runner-node`

- [x] **T3.1** TypeScript project scaffold (`package.json`, `tsconfig.json`, `src/`)
- [x] **T3.2** Load YAML/JSON; validate three artifacts with AJV (`wflow validate`)
- [x] **T3.3** Implement merge + `${data...}` substitution (minimal)
- [x] **T3.4** Build resolved IR object (in-memory)
- [x] **T3.5** CLI: `wflow run` with `--flow`, `--locators`, `--data`, `--headed`, `--timeout-ms`, `--screenshot-on-failure`
- [x] **T3.5a** CLI: `wflow validate` with `--flow`, optional `--locators`, `--data`
- [x] **T3.5b** CLI: `wflow print-ir` (debug merge without browser)
- [x] **T3.6** Playwright adapter for steps: `navigate`, `click`, `fill`, `assertVisible`, `expectText`, `waitFor`, `expectInputValue`
- [x] **T3.6b** Selenium adapter (Node, Chrome) for the same IR ops — `wflow run --driver selenium`
- [x] **T3.7** Exit codes + structured error (`RunError`: step index + op); screenshot optional
- [ ] **T3.8** Unit tests for merge + placeholder edge cases

### T4 — `packages/wflow-runner-java` (MVP-B)

- [ ] **T4.1** Gradle or Maven project skeleton
- [ ] **T4.2** Load YAML/JSON; validate with same schemas (resources)
- [ ] **T4.3** Same merge/IR as Node; compare to golden fixtures
- [ ] **T4.4** Driver adapter (Playwright Java recommended first)

### T5 — Root hygiene

- [x] **T5.1** Root `.gitignore` for `node_modules/`, `dist/`, logs
- [x] **T5.2** Root workspace `package.json` with `workspaces: ["packages/*"]` (monorepo helper)

---

## Subtasks backlog (not yet scheduled)

- [ ] **B1** Optional `wrun.yaml` manifest (paths + defaults)
- [x] **B2** Selenium adapter (Node) — see `wflow run --driver selenium`; Java still planned
- [ ] **B3** CI: GitHub Actions template for `wflow run`

---

## How to update this doc

1. When starting work, mark a task `[~]`.
2. When done, mark `[x]` and bump **Last updated**.
3. Mirror feature-level status in [FEATURES.md](FEATURES.md) when appropriate.
