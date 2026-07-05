/**
 * `${data.path}` substitution: reads from `dataRoot` (usually `wdata.data`). Used on flow steps and log strings.
 */
export function getByDotPath(root: unknown, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = root;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function substituteDataPlaceholders(input: string, dataRoot: unknown): string {
  return input.replace(/\$\{data\.([^}]+)\}/g, (_m, path: string) => {
    const v = getByDotPath(dataRoot, path.trim());
    if (v === undefined || v === null) {
      throw new Error(`Missing data for placeholder \${data.${path}}`);
    }
    return String(v);
  });
}

/** Deep-substitute string leaves under `value` (used for flow `steps` only). */
export function deepSubstituteStrings(value: unknown, dataRoot: unknown): unknown {
  if (typeof value === "string") return substituteDataPlaceholders(value, dataRoot);
  if (Array.isArray(value)) return value.map((v) => deepSubstituteStrings(v, dataRoot));
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepSubstituteStrings(v, dataRoot);
    }
    return out;
  }
  return value;
}
