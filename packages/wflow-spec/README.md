# @bindlace/wflow-spec

**Bindlace** — JSON Schemas and examples for portable web automation artifacts:

| File pattern | kind | Purpose |
|--------------|------|---------|
| `*.wflow.json` / `*.wflow.yaml` | `wflow` | Step list |
| `*.wloc.json` / `*.wloc.yaml` | `wloc` | Logical name → neutral locator |
| `*.wdata.json` / `*.wdata.yaml` | `wdata` | Data for `${data...}` substitution |

All documents set `wflowSpecVersion` to `1` (integer).

Schema **`$id`** values use the namespace `https://bindlace.dev/schema/`.

## Schemas

- [schema/wflow.schema.json](schema/wflow.schema.json)
- [schema/wloc.schema.json](schema/wloc.schema.json)
- [schema/wdata.schema.json](schema/wdata.schema.json)

## Examples

See [examples/](examples/).

## Related

- [Bindlace root README](../../README.md)
- Node runner: [@bindlace/wflow-runner-node](../wflow-runner-node/)
