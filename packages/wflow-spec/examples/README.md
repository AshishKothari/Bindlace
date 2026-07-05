# Example wflow artifacts (Bindlace)

| File | Description |
|------|-------------|
| [login.wflow.yaml](login.wflow.yaml) | Flow: navigate, wait, fill, click, assert |
| [app.wloc.yaml](app.wloc.yaml) | Locator keys used by the flow |
| [env.wdata.yaml](env.wdata.yaml) | Data for `${data...}` placeholders |
| [resolved-ir/login-resolved.example.json](resolved-ir/login-resolved.example.json) | **Illustrative** merged IR (not yet governed by a separate JSON Schema) |

## Validate / print IR / run

From `packages/wflow-runner-node` after `npm install && npm run build`:

```bash
node dist/cli.js validate --flow ../wflow-spec/examples/login.wflow.yaml --locators ../wflow-spec/examples/app.wloc.yaml --data ../wflow-spec/examples/env.wdata.yaml
node dist/cli.js print-ir --flow ../wflow-spec/examples/login.wflow.yaml --locators ../wflow-spec/examples/app.wloc.yaml --data ../wflow-spec/examples/env.wdata.yaml
npx playwright install chromium
node dist/cli.js run --flow ../wflow-spec/examples/login.wflow.yaml --locators ../wflow-spec/examples/app.wloc.yaml --data ../wflow-spec/examples/env.wdata.yaml
```

`run` needs a reachable app at the URLs in your flow (e.g. `baseUrl` in `env.wdata.yaml`).
