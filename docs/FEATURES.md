# High-level features (tracking)

**Last updated:** 2026-04-19 (Add tracking for Shadow DOM / shadow root support)

**Legend:** `[ ]` not started · `[~]` in progress · `[x]` done

---

## Core contract

- [x] **F1 — JSON Schemas v1** for `wflow`, `wloc`, `wdata` (`wflowSpecVersion: 1`)
- [x] **F2 — Example artifacts** for a minimal login-style flow (YAML + JSON where useful)
- [~] **F3 — Resolved IR format** — fixture + **`wflow print-ir`** output; formal JSON Schema for IR + parity tests still TODO
- [ ] **F4 — Placeholder rules** finalized (`${data...}`), including error messages for missing keys

## Parsing and validation

- [x] **F5 — YAML + JSON load** in Node runner with schema validation (AJV) — `wflow validate`
- [x] **F6 — Merge pipeline** (flow + wdata + wloc → IR) — `buildResolvedIr` + `wflow print-ir`
- [ ] **F7 — Java parser** validating the same schemas (Jackson + json-schema-validator)

## Execution (drivers)

- [x] **F8 — Node CLI** `wflow run` / `print-ir` with `--flow`, `--locators`, optional `--data`
- [x] **F9 — Playwright adapter (Node)** for v1 step vocabulary
- [x] **F10 — Runtime options** (headless default, `--headed`, `--timeout-ms`) via CLI flags
- [x] **F11 — Failure output** (step index + op in message; `--screenshot-on-failure`)
- [ ] **F12 — Java runner + driver** (Playwright Java or Selenium) consuming same IR
- [ ] **F18 — Shadow DOM / shadow root support** — portable locator/step approach that works across Playwright + Selenium (note: **closed** shadow roots may be impossible to pierce reliably)

## Portability and ecosystem

- [ ] **F13 — Manifest file** (optional `wrun.yaml`) listing paths to flow/loc/data for CI
- [x] **F14 — Additional drivers** — Selenium on Node behind the same IR / `--driver` (adapter interface)
- [ ] **F15 — .NET / Python** parsers or runners (future)

## Documentation

- [x] **F16 — Root README**, **CLAUDE.md**, and [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)
- [~] **F17 — Per-package README** and `examples/` walkthrough — package READMEs added; root `examples/` walkthrough optional

---

### Notes

- **MVP slice:** F1 → F5 → F6 → F8 → F9 gets a credible vertical slice; F7/F12 prove cross-language parity.
- Update checkboxes and **Last updated** when you merge meaningful work.
