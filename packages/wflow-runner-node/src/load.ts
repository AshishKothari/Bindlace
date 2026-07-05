/**
 * Read a single artifact file as JSON or YAML and return parsed data (`kind` is validated elsewhere).
 * JSON is detected by leading `{` or `[` after trim; everything else is parsed as YAML.
 */
import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";

export type ArtifactKind = "wflow" | "wloc" | "wdata";

/** Reads top-level `kind` from parsed JSON/YAML, if present. */
export function detectKindFromData(data: unknown): ArtifactKind | null {
  if (!data || typeof data !== "object") return null;
  const k = (data as Record<string, unknown>).kind;
  if (k === "wflow" || k === "wloc" || k === "wdata") return k;
  return null;
}

/** Read and parse one artifact file (JSON or YAML). */
export async function loadArtifactFile(path: string): Promise<unknown> {
  const text = await readFile(path, "utf8");
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(text) as unknown;
  }
  return parseYaml(text) as unknown;
}
