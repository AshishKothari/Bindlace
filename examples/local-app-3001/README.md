# Example: local app on port 3001

Use this folder as a **template** to test any web app served locally — for example an app at **`http://localhost:3001/`**. It does **not** bundle code from other repositories; only URLs and selectors you edit here.

## Files

| File | Role |
|------|------|
| [env.wdata.yaml](env.wdata.yaml) | Sets `baseUrl` (default `http://localhost:3001`). |
| [app.wloc.yaml](app.wloc.yaml) | Logical locator names → CSS/xpath/role (add keys for your UI). |
| [smoke.wflow.yaml](smoke.wflow.yaml) | Two steps: open `/`, assert `body` is visible. |

## Prerequisites

1. Start your app so `baseUrl` responds (e.g. `http://localhost:3001/`).
2. From the repo, build the Node runner: `cd packages/wflow-runner-node && npm install && npm run build`.
3. Install Playwright’s browser once: `npx playwright install chromium`.

## Commands (from `packages/wflow-runner-node`)

Paths are relative to that directory.

```bash
npx bindlace validate --flow ../../examples/local-app-3001/smoke.wflow.yaml --locators ../../examples/local-app-3001/app.wloc.yaml --data ../../examples/local-app-3001/env.wdata.yaml
npx bindlace print-ir --flow ../../examples/local-app-3001/smoke.wflow.yaml --locators ../../examples/local-app-3001/app.wloc.yaml --data ../../examples/local-app-3001/env.wdata.yaml
npx playwright install chromium
npx bindlace run --flow ../../examples/local-app-3001/smoke.wflow.yaml --locators ../../examples/local-app-3001/app.wloc.yaml --data ../../examples/local-app-3001/env.wdata.yaml --log-file ./bindlace-run.log
```

Legacy `npx wflow ...` still works — both commands point at the same CLI.

The YAML files include optional `log` fields (per file and per step) so you can see **author messages** in the terminal and in the log file.

## Next steps

1. Copy this folder (or these three files) into your project or keep editing here.
2. Add locator keys in `app.wloc.yaml` and steps in a new `*.wflow.yaml` for flows you care about (sign-in, main screen, etc.).
3. Put secrets in CI env or a **gitignored** `wdata` file — not committed passwords.
