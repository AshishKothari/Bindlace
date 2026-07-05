/**
 * Typed loaders for wflow / wloc / wdata: read file, check `kind` matches, run JSON Schema validation.
 */
import { loadArtifactFile, detectKindFromData, type ArtifactKind } from "./load.js";
import { validateArtifact } from "./validate.js";

async function loadKind(path: string, kind: ArtifactKind): Promise<unknown> {
  const data = await loadArtifactFile(path);
  const detected = detectKindFromData(data);
  if (detected && detected !== kind) {
    throw new Error(`Kind mismatch for ${path}: expected ${kind}, file has kind ${detected}`);
  }
  await validateArtifact(kind, data);
  return data;
}

export async function loadWflow(path: string): Promise<Record<string, unknown>> {
  return (await loadKind(path, "wflow")) as Record<string, unknown>;
}

export async function loadWloc(path: string): Promise<Record<string, unknown>> {
  return (await loadKind(path, "wloc")) as Record<string, unknown>;
}

export async function loadWdata(path: string): Promise<Record<string, unknown>> {
  return (await loadKind(path, "wdata")) as Record<string, unknown>;
}
