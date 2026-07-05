import { performance } from "node:perf_hooks";

export type NodeCpuDelta = { userMs: number; systemMs: number };
export type NodeMem = {
  rssBytes: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  externalBytes: number;
  arrayBuffersBytes: number;
};

export type IterationResult = {
  ts: string;
  variant: string;
  iteration: number;
  warmup: boolean;
  ok: boolean;
  error?: { name?: string; message: string; stack?: string };
  durationMs: number;
  nodeCpu: NodeCpuDelta;
  nodeMem: NodeMem;
  procSample?: unknown;
};

export function readNodeMem(): NodeMem {
  const m = process.memoryUsage();
  return {
    rssBytes: m.rss,
    heapUsedBytes: m.heapUsed,
    heapTotalBytes: m.heapTotal,
    externalBytes: m.external,
    arrayBuffersBytes: m.arrayBuffers,
  };
}

export async function measureIteration(opts: {
  variant: string;
  iteration: number;
  warmup: boolean;
  run: () => Promise<void>;
  procSample?: () => Promise<unknown>;
}): Promise<IterationResult> {
  const cpu0 = process.cpuUsage();
  const t0 = performance.now();
  let ok = true;
  let error: IterationResult["error"] | undefined;

  try {
    await opts.run();
  } catch (e) {
    ok = false;
    const err = e instanceof Error ? e : new Error(String(e));
    error = { name: err.name, message: err.message, stack: err.stack };
  }

  const durationMs = performance.now() - t0;
  const cpu1 = process.cpuUsage(cpu0);
  const nodeCpu: NodeCpuDelta = {
    userMs: cpu1.user / 1000,
    systemMs: cpu1.system / 1000,
  };

  const out: IterationResult = {
    ts: new Date().toISOString(),
    variant: opts.variant,
    iteration: opts.iteration,
    warmup: opts.warmup,
    ok,
    ...(error ? { error } : {}),
    durationMs,
    nodeCpu,
    nodeMem: readNodeMem(),
  };

  if (opts.procSample) {
    try {
      out.procSample = await opts.procSample();
    } catch {
      // ignore
    }
  }

  return out;
}

