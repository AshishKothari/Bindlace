import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ProcRow = {
  Id: number;
  ProcessName: string;
  CPU?: number; // seconds (may be undefined for some system processes)
  WorkingSet64?: number; // bytes
};

export type ProcSummary = {
  peakWorkingSetBytes: number;
  cpuDeltaSeconds: number;
};

export type ProcSampleSummary = {
  intervalMs: number;
  samples: number;
  byName: Record<string, ProcSummary>;
};

async function queryProcesses(processNames: string[]): Promise<ProcRow[]> {
  // Using ConvertTo-Json to avoid brittle text parsing.
  // `CPU` is cumulative seconds of processor time since start (per process).
  const ps = [
    "$ErrorActionPreference='SilentlyContinue'",
    `$names=@(${processNames.map((n) => `'${n.replace(/'/g, "''")}'`).join(",")})`,
    "Get-Process | Where-Object { $names -contains $_.ProcessName } | Select-Object Id,ProcessName,CPU,WorkingSet64 | ConvertTo-Json -Depth 2",
  ].join("; ");

  const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-Command", ps], {
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  const trimmed = String(stdout ?? "").trim();
  if (!trimmed) return [];

  // ConvertTo-Json returns either an object or an array depending on count.
  const parsed = JSON.parse(trimmed) as unknown;
  if (Array.isArray(parsed)) return parsed as ProcRow[];
  return [parsed as ProcRow];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export type ProcessSampler = {
  stop: () => Promise<ProcSampleSummary>;
};

/**
 * Samples Windows process stats for the given `processNames` until stopped.
 * Aggregates peak working set and CPU delta (seconds) by process name.
 */
export function startProcessSampler(opts: {
  processNames: string[];
  intervalMs: number;
}): ProcessSampler {
  const { processNames, intervalMs } = opts;

  let stopped = false;
  let samples = 0;

  // Track per pid: first/last CPU and peak WS.
  const pidState = new Map<
    number,
    { name: string; firstCpu?: number; lastCpu?: number; peakWs: number }
  >();

  const loop = (async () => {
    while (!stopped) {
      try {
        const rows = await queryProcesses(processNames);
        samples++;
        for (const r of rows) {
          const pid = Number(r.Id);
          const name = String(r.ProcessName);
          const cpu = r.CPU === undefined ? undefined : Number(r.CPU);
          const ws = r.WorkingSet64 === undefined ? 0 : Number(r.WorkingSet64);

          const st = pidState.get(pid);
          if (!st) {
            pidState.set(pid, {
              name,
              firstCpu: cpu,
              lastCpu: cpu,
              peakWs: ws,
            });
          } else {
            st.lastCpu = cpu ?? st.lastCpu;
            if (ws > st.peakWs) st.peakWs = ws;
          }
        }
      } catch {
        // ignore sampler errors; benchmark should still proceed
      }
      await sleep(intervalMs);
    }
  })();

  return {
    stop: async () => {
      stopped = true;
      await loop;

      const byName: Record<string, ProcSummary> = {};
      for (const st of pidState.values()) {
        const name = st.name;
        const peakWorkingSetBytes = st.peakWs;
        const cpuDeltaSeconds =
          st.firstCpu !== undefined && st.lastCpu !== undefined ? Math.max(0, st.lastCpu - st.firstCpu) : 0;

        const cur = byName[name];
        if (!cur) {
          byName[name] = { peakWorkingSetBytes, cpuDeltaSeconds };
        } else {
          if (peakWorkingSetBytes > cur.peakWorkingSetBytes) cur.peakWorkingSetBytes = peakWorkingSetBytes;
          cur.cpuDeltaSeconds += cpuDeltaSeconds;
        }
      }

      return { intervalMs, samples, byName };
    },
  };
}

