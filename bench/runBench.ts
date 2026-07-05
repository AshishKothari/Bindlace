import { mkdir, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { measureIteration } from "./collectMetrics.js";
import { variants } from "./variants.js";
import { mean, percentile } from "./stats.js";

type Args = { variant: string; iterations: number; outDir?: string; list?: boolean };

function parseArgs(argv: string[]): Args {
  const args: Args = { variant: "", iterations: 10 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--list") args.list = true;
    else if (a === "--variant") args.variant = String(argv[++i] ?? "");
    else if (a === "--iterations") args.iterations = Number(argv[++i] ?? "10");
    else if (a === "--out-dir") args.outDir = String(argv[++i] ?? "");
  }
  return args;
}

function isoStampForPath(d = new Date()): string {
  // Windows-safe timestamp for folder names.
  return d.toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.list) {
    console.log(Object.keys(variants).sort().join("\n"));
    return;
  }

  if (!args.variant) {
    console.error("Missing --variant. Use --list to see options.");
    process.exitCode = 2;
    return;
  }
  if (!Number.isFinite(args.iterations) || args.iterations <= 0) {
    console.error("Invalid --iterations (must be > 0).");
    process.exitCode = 2;
    return;
  }

  const make = variants[args.variant];
  if (!make) {
    console.error(`Unknown variant: ${args.variant}. Use --list to see options.`);
    process.exitCode = 2;
    return;
  }

  const run = make();
  const baseOut = args.outDir
    ? path.resolve(args.outDir)
    : path.resolve("bench", "out", isoStampForPath());
  await mkdir(baseOut, { recursive: true });

  const jsonlPath = path.join(baseOut, `${args.variant}.jsonl`);
  const summaryPath = path.join(baseOut, `${args.variant}-summary.json`);
  await writeFile(jsonlPath, "", "utf8");

  // Warmup (excluded from summary)
  const warm = await measureIteration({
    variant: args.variant,
    iteration: 0,
    warmup: true,
    run: run.run,
    procSample: run.procSample,
  });
  await appendFile(jsonlPath, JSON.stringify(warm) + "\n", "utf8");

  const rows: Array<{
    durationMs: number;
    cpuMs: number;
    rssBytes: number;
    externalPeakWsBytesApproxSum?: number;
    externalCpuDeltaSecondsSum?: number;
  }> = [];
  let failures = 0;

  for (let i = 1; i <= args.iterations; i++) {
    const r = await measureIteration({
      variant: args.variant,
      iteration: i,
      warmup: false,
      run: run.run,
      procSample: run.procSample,
    });
    await appendFile(jsonlPath, JSON.stringify(r) + "\n", "utf8");

    if (!r.ok) {
      failures++;
      continue;
    }

    const proc = r.procSample as any;
    let externalPeakWsBytesApproxSum: number | undefined;
    let externalCpuDeltaSecondsSum: number | undefined;
    if (proc && proc.byName && typeof proc.byName === "object") {
      externalPeakWsBytesApproxSum = 0;
      externalCpuDeltaSecondsSum = 0;
      for (const v of Object.values(proc.byName as Record<string, any>)) {
        if (v && typeof v === "object") {
          const peak = Number(v.peakWorkingSetBytes ?? 0);
          const cpu = Number(v.cpuDeltaSeconds ?? 0);
          if (Number.isFinite(peak)) externalPeakWsBytesApproxSum += peak;
          if (Number.isFinite(cpu)) externalCpuDeltaSecondsSum += cpu;
        }
      }
    }

    rows.push({
      durationMs: r.durationMs,
      cpuMs: r.nodeCpu.userMs + r.nodeCpu.systemMs,
      rssBytes: r.nodeMem.rssBytes,
      ...(externalPeakWsBytesApproxSum !== undefined ? { externalPeakWsBytesApproxSum } : {}),
      ...(externalCpuDeltaSecondsSum !== undefined ? { externalCpuDeltaSecondsSum } : {}),
    });
  }

  const durations = rows.map((x) => x.durationMs);
  const cpuMs = rows.map((x) => x.cpuMs);
  const rss = rows.map((x) => x.rssBytes);
  const extWs = rows.map((x) => x.externalPeakWsBytesApproxSum).filter((x): x is number => typeof x === "number");
  const extCpu = rows.map((x) => x.externalCpuDeltaSecondsSum).filter((x): x is number => typeof x === "number");

  const summary = {
    variant: args.variant,
    iterations: args.iterations,
    okIterations: rows.length,
    failedIterations: failures,
    durationMs: {
      mean: mean(durations),
      median: percentile(durations, 0.5),
      p95: percentile(durations, 0.95),
      min: durations.length ? Math.min(...durations) : NaN,
      max: durations.length ? Math.max(...durations) : NaN,
    },
    nodeCpuMs: {
      mean: mean(cpuMs),
      median: percentile(cpuMs, 0.5),
      p95: percentile(cpuMs, 0.95),
    },
    nodeRssBytes: {
      mean: mean(rss),
      median: percentile(rss, 0.5),
      p95: percentile(rss, 0.95),
    },
    ...(extWs.length
      ? {
          externalPeakWorkingSetBytesApproxSum: {
            mean: mean(extWs),
            median: percentile(extWs, 0.5),
            p95: percentile(extWs, 0.95),
          },
        }
      : {}),
    ...(extCpu.length
      ? {
          externalCpuDeltaSecondsSum: {
            mean: mean(extCpu),
            median: percentile(extCpu, 0.5),
            p95: percentile(extCpu, 0.95),
          },
        }
      : {}),
    output: {
      jsonlPath,
      summaryPath,
    },
  };

  await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : String(e));
  process.exitCode = 1;
});

