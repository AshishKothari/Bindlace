## Bindlace benchmark harness

This folder runs repeatable comparisons between:
- plain Playwright
- plain Selenium
- Bindlace `wflow` pipeline / execution

### Variants

List variants:

```bash
node bench/runBench.mjs --list
```

Run a variant (default 10 iterations + 1 warmup):

```bash
node bench/runBench.mjs --variant plain-playwright --iterations 10
```

Outputs:
- `bench/out/<timestamp>/<variant>.jsonl`
- `bench/out/<timestamp>/<variant>-summary.json`

### Compare two runs

Compare a single metric between two summary files:

```bash
node bench/compare.mjs --base bench/out/<t>/plain-playwright-summary.json --test bench/out/<t2>/bindlace-run-playwright-summary.json --metric durationMs.median
```

### Notes

- Playwright requires browsers installed once:

```bash
npx playwright install chromium
```

- Selenium uses `selenium-webdriver` + Chrome (Selenium Manager typically fetches a matching driver).

