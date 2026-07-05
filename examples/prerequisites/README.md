# Example: `prerequisites` (Bindlace — shared wflow files)

- [common-nav.wflow.yaml](common-nav.wflow.yaml) — navigates to `${data.baseUrl}/`.
- [user-flow.wflow.yaml](user-flow.wflow.yaml) — lists that file under `prerequisites`, then asserts `pageRoot`.

Paths in `prerequisites` resolve **relative to the file that contains them** (here, `./common-nav.wflow.yaml` next to `user-flow.wflow.yaml`).

## Validate (from `packages/wflow-runner-node`)

```bash
npx bindlace validate --flow ../../examples/prerequisites/user-flow.wflow.yaml --locators ../../examples/prerequisites/app.wloc.yaml --data ../../examples/prerequisites/env.wdata.yaml
```

You should see **two** `OK: ... (wflow)` lines (entry + prerequisite), plus wloc/wdata.

## Print IR / run

```bash
npx bindlace print-ir --flow ../../examples/prerequisites/user-flow.wflow.yaml --locators ../../examples/prerequisites/app.wloc.yaml --data ../../examples/prerequisites/env.wdata.yaml
```

Legacy `npx wflow ...` still works — both commands point at the same CLI.

Resolved steps order: prerequisite steps first, then `user-flow` steps.
