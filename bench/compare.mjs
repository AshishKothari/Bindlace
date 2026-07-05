import { readFile } from "node:fs/promises";
import path from "node:path";

function pick(obj, pathStr) {
  const parts = pathStr.split(".");
  let cur = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return null;
    cur = cur[p];
  }
  const n = Number(cur);
  return Number.isFinite(n) ? n : null;
}

function formatDelta(a, b) {
  const abs = b - a;
  const pct = a !== 0 ? (abs / a) * 100 : Number.NaN;
  return { abs, pct };
}

async function main() {
  const argv = process.argv.slice(2);
  const basePath = argv[argv.indexOf("--base") + 1];
  const testPath = argv[argv.indexOf("--test") + 1];
  const metric = argv[argv.indexOf("--metric") + 1] ?? "durationMs.median";

  if (!basePath || !testPath) {
    console.error("Usage: node bench/compare.mjs --base <summary.json> --test <summary.json> [--metric durationMs.median]");
    process.exitCode = 2;
    return;
  }

  const base = JSON.parse(await readFile(path.resolve(basePath), "utf8"));
  const test = JSON.parse(await readFile(path.resolve(testPath), "utf8"));

  const a = pick(base, metric);
  const b = pick(test, metric);
  if (a === null || b === null) {
    console.error(`Metric not found or not numeric: ${metric}`);
    process.exitCode = 2;
    return;
  }

  const d = formatDelta(a, b);
  const out = {
    metric,
    base: { variant: base.variant, value: a, summaryPath: path.resolve(basePath) },
    test: { variant: test.variant, value: b, summaryPath: path.resolve(testPath) },
    delta: { abs: d.abs, pct: d.pct },
  };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : String(e));
  process.exitCode = 1;
});

