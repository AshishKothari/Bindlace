import { performance } from "node:perf_hooks";

export function readNodeMem() {
  const m = process.memoryUsage();
  return {
    rssBytes: m.rss,
    heapUsedBytes: m.heapUsed,
    heapTotalBytes: m.heapTotal,
    externalBytes: m.external,
    arrayBuffersBytes: m.arrayBuffers,
  };
}

export async function measureIteration({ variant, iteration, warmup, run, procSample }) {
  const cpu0 = process.cpuUsage();
  const t0 = performance.now();
  let ok = true;
  let error;

  try {
    await run();
  } catch (e) {
    ok = false;
    const err = e instanceof Error ? e : new Error(String(e));
    error = { name: err.name, message: err.message, stack: err.stack };
  }

  const durationMs = performance.now() - t0;
  const cpu1 = process.cpuUsage(cpu0);
  const nodeCpu = { userMs: cpu1.user / 1000, systemMs: cpu1.system / 1000 };

  const out = {
    ts: new Date().toISOString(),
    variant,
    iteration,
    warmup,
    ok,
    ...(error ? { error } : {}),
    durationMs,
    nodeCpu,
    nodeMem: readNodeMem(),
  };

  if (procSample) {
    try {
      out.procSample = await procSample();
    } catch {
      // ignore
    }
  }

  return out;
}

