# Metrics schema (JSONL)

Each measured iteration emits one JSON object (one line) to `*.jsonl`.

## Common fields

- `ts`: ISO timestamp string
- `variant`: string
- `iteration`: number (1-based, excludes warmup)
- `warmup`: boolean
- `ok`: boolean
- `error`: optional `{ name?: string, message: string, stack?: string }`
- `durationMs`: number (wall time)

## Node process metrics (delta/point-in-time)

- `nodeCpu`: `{ userMs: number, systemMs: number }` (delta over the iteration)
- `nodeMem`: `{ rssBytes: number, heapUsedBytes: number, heapTotalBytes: number, externalBytes: number, arrayBuffersBytes: number }` (captured at end of iteration)

## External process metrics (sampled; end-to-end variants)

Optional `procSample` block:

- `procSample`: `{ intervalMs: number, samples: number, byName: Record<string, { peakWorkingSetBytes: number, cpuDeltaSeconds: number }> }`

Notes:
- `byName` aggregates over all processes matching a given `ProcessName` during the run.
- `cpuDeltaSeconds` is the sum of per-PID CPU deltas across matching processes between the first and last time that PID was observed.
