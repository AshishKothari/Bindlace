/**
 * Prerequisite handling: recursively prepend steps from referenced `*.wflow` files (cycle detection),
 * then hand off to `buildResolvedIr` in `resolve.ts`.
 */
import { dirname, resolve } from "node:path";
import { loadArtifactFile } from "./load.js";
import { validateArtifact } from "./validate.js";
import type { FlowDoc, LocBundle, DataDoc, PrerequisiteRef } from "./resolve.js";
import { buildResolvedIr } from "./resolve.js";
import type { ResolvedIr } from "./types.js";

export type { PrerequisiteRef };

function isFlowDoc(data: unknown): data is FlowDoc {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return o.kind === "wflow" && typeof o.wflowSpecVersion === "number" && Array.isArray(o.steps);
}

/**
 * Recursively concatenate prerequisite steps, then this file's steps.
 * `stack` holds absolute paths in the current recursion chain (cycle detection).
 */
export async function flattenFlowSteps(
  currentPath: string,
  flowDoc: FlowDoc,
  stack: string[],
): Promise<unknown[]> {
  const abs = resolve(currentPath);
  if (stack.includes(abs)) {
    throw new Error(`Circular prerequisite: ${[...stack, abs].join(" -> ")}`);
  }
  stack.push(abs);
  try {
    const out: unknown[] = [];
    const prereqs = flowDoc.prerequisites ?? [];
    for (const item of prereqs) {
      if (!item || typeof item !== "object" || typeof (item as PrerequisiteRef).path !== "string") {
        throw new Error(`Invalid prerequisite entry (expected { path: string }): ${JSON.stringify(item)}`);
      }
      const rel = (item as PrerequisiteRef).path.trim();
      if (!rel) throw new Error("prerequisite path must not be empty");
      const childPath = resolve(dirname(currentPath), rel);
      const raw = await loadArtifactFile(childPath);
      await validateArtifact("wflow", raw);
      if (!isFlowDoc(raw)) {
        throw new Error(`Not a wflow document: ${childPath}`);
      }
      const childSteps = await flattenFlowSteps(childPath, raw, stack);
      out.push(...childSteps);
    }
    out.push(...flowDoc.steps);
    return out;
  } finally {
    stack.pop();
  }
}

/**
 * Load prerequisite chain from the entry flow file, merge steps, then build resolved IR.
 */
export async function buildResolvedIrFromEntry(
  entryFlowPath: string,
  flowDoc: FlowDoc,
  wloc: LocBundle,
  data: DataDoc | null | undefined,
): Promise<ResolvedIr> {
  const mergedSteps = await flattenFlowSteps(entryFlowPath, flowDoc, []);
  const mergedFlow: FlowDoc = {
    ...flowDoc,
    steps: mergedSteps,
    prerequisites: undefined,
  };
  return buildResolvedIr(mergedFlow, wloc, data);
}

/**
 * Collect all wflow file paths reachable from the entry (entry first, then DFS over prerequisites).
 * Each path appears once (Set), order: depth-first discovery.
 */
export async function collectReachableWflowPaths(entryPath: string, flowDoc: FlowDoc): Promise<string[]> {
  const ordered: string[] = [];
  const seen = new Set<string>();

  async function visit(currentPath: string, doc: FlowDoc): Promise<void> {
    const abs = resolve(currentPath);
    if (seen.has(abs)) return;
    seen.add(abs);
    ordered.push(currentPath);

    for (const item of doc.prerequisites ?? []) {
      if (!item || typeof item !== "object" || typeof (item as PrerequisiteRef).path !== "string") continue;
      const childPath = resolve(dirname(currentPath), (item as PrerequisiteRef).path.trim());
      const raw = await loadArtifactFile(childPath);
      await validateArtifact("wflow", raw);
      if (!isFlowDoc(raw)) throw new Error(`Not a wflow document: ${childPath}`);
      await visit(childPath, raw);
    }
  }

  await visit(entryPath, flowDoc);
  return ordered;
}
