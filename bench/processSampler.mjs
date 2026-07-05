import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function queryProcesses(processNames) {
  const ps = [
    "$ErrorActionPreference='SilentlyContinue'",
    `$names=@(${processNames.map((n) => `'${String(n).replace(/'/g, "''")}'`).join(",")})`,
    "Get-Process | Where-Object { $names -contains $_.ProcessName } | Select-Object Id,ProcessName,CPU,WorkingSet64 | ConvertTo-Json -Depth 2",
  ].join("; ");

  const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-Command", ps], {
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  const trimmed = String(stdout ?? "").trim();
  if (!trimmed) return [];

  const parsed = JSON.parse(trimmed);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function startProcessSampler({ processNames, intervalMs }) {
  let stopped = false;
  let samples = 0;

  const pidState = new Map(); // pid -> { name, firstCpu, lastCpu, peakWs }

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
            pidState.set(pid, { name, firstCpu: cpu, lastCpu: cpu, peakWs: ws });
          } else {
            if (cpu !== undefined) st.lastCpu = cpu;
            if (ws > st.peakWs) st.peakWs = ws;
          }
        }
      } catch {
        // ignore sampler errors
      }
      await sleep(intervalMs);
    }
  })();

  return {
    stop: async () => {
      stopped = true;
      await loop;

      const byName = {};
      for (const st of pidState.values()) {
        const cpuDeltaSeconds =
          st.firstCpu !== undefined && st.lastCpu !== undefined ? Math.max(0, st.lastCpu - st.firstCpu) : 0;
        const peakWorkingSetBytes = st.peakWs;
        const cur = byName[st.name];
        if (!cur) byName[st.name] = { peakWorkingSetBytes, cpuDeltaSeconds };
        else {
          if (peakWorkingSetBytes > cur.peakWorkingSetBytes) cur.peakWorkingSetBytes = peakWorkingSetBytes;
          cur.cpuDeltaSeconds += cpuDeltaSeconds;
        }
      }

      return { intervalMs, samples, byName };
    },
  };
}

