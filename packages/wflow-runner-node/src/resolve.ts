/**
 * Turn a merged `FlowDoc` + `LocBundle` (+ optional `DataDoc`) into **resolved IR**:
 * deep `${data...}` substitution on steps, then map each step to one or more `ResolvedStep`s with concrete locators.
 */
import type { LocatorDef, ResolvedIr, ResolvedStep, StepMeta } from "./types.js";
import { deepSubstituteStrings } from "./substitute.js";

/** Reference to another wflow file; steps from prerequisites run before this file's steps. */
export type PrerequisiteRef = { path: string };

export type FlowDoc = {
  wflowSpecVersion: number;
  kind: "wflow";
  meta?: { id?: string; name?: string; description?: string };
  /** Optional banner for runner logs when the flow file is loaded. */
  log?: string;
  /** Other wflow files (in order) whose steps are prepended before `steps`. Paths resolve relative to this file. */
  prerequisites?: PrerequisiteRef[];
  steps: unknown[];
};

export type LocBundle = {
  wflowSpecVersion: number;
  kind: "wloc";
  log?: string;
  locators: Record<string, LocatorDef>;
};

export type DataDoc = {
  wflowSpecVersion: number;
  kind: "wdata";
  log?: string;
  data: unknown;
};

function requireLocator(key: string, locators: Record<string, LocatorDef>): LocatorDef {
  const loc = locators[key];
  if (!loc) {
    throw new Error(`Unknown locator key "${key}" — add it to the wloc bundle`);
  }
  return loc;
}

function normalizeStep(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid step: expected object");
  }
  return raw as Record<string, unknown>;
}

function pickStepMeta(step: Record<string, unknown>): StepMeta {
  const meta: StepMeta = {};
  if (typeof step.log === "string") meta.log = step.log;
  if (typeof step.step === "number" && Number.isFinite(step.step)) meta.step = step.step;
  if (typeof step.id === "string") meta.id = step.id;
  return meta;
}

function applyMeta(base: ResolvedStep, step: Record<string, unknown>): ResolvedStep {
  const m = pickStepMeta(step);
  return { ...base, ...m };
}

/** Same author step/id on a follow-up op (e.g. navigate + assertVisible); omit `log` on the second. */
function withAuthorOnly(meta: StepMeta): StepMeta {
  return { step: meta.step, id: meta.id };
}

/** Map one author step object to IR ops (`navigate` may emit navigate + assertVisible). */
function stepToResolvedList(step: Record<string, unknown>, locators: Record<string, LocatorDef>): ResolvedStep[] {
  if ("navigate" in step) {
    const nav = applyMeta({ op: "navigate", url: String(step.navigate) }, step);
    const out: ResolvedStep[] = [nav];
    if (typeof step.assertVisible === "string") {
      const k = step.assertVisible;
      const meta = pickStepMeta(step);
      const assert: ResolvedStep = {
        op: "assertVisible",
        targetKey: k,
        locator: requireLocator(k, locators),
        ...withAuthorOnly(meta),
      };
      out.push(assert);
    }
    return out;
  }
  if ("click" in step) {
    const k = String(step.click);
    return [applyMeta({ op: "click", targetKey: k, locator: requireLocator(k, locators) }, step)];
  }
  if ("fill" in step) {
    const f = step.fill;
    if (!f || typeof f !== "object") throw new Error('Invalid "fill" step');
    const o = f as Record<string, unknown>;
    const target = String(o.target);
    return [
      applyMeta(
        {
          op: "fill",
          targetKey: target,
          locator: requireLocator(target, locators),
          value: String(o.value ?? ""),
        },
        step,
      ),
    ];
  }
  if ("assertVisible" in step) {
    const k = String(step.assertVisible);
    return [applyMeta({ op: "assertVisible", targetKey: k, locator: requireLocator(k, locators) }, step)];
  }
  if ("expectText" in step) {
    const e = step.expectText;
    if (!e || typeof e !== "object") throw new Error('Invalid "expectText" step');
    const o = e as Record<string, unknown>;
    const target = String(o.target);
    return [
      applyMeta(
        {
          op: "expectText",
          targetKey: target,
          locator: requireLocator(target, locators),
          text: String(o.text ?? ""),
        },
        step,
      ),
    ];
  }
  if ("expectInputValue" in step) {
    const e = step.expectInputValue;
    if (!e || typeof e !== "object") throw new Error('Invalid "expectInputValue" step');
    const o = e as Record<string, unknown>;
    const target = String(o.target);
    return [
      applyMeta(
        {
          op: "expectInputValue",
          targetKey: target,
          locator: requireLocator(target, locators),
          value: String(o.value ?? ""),
        },
        step,
      ),
    ];
  }
  if ("waitFor" in step) {
    const w = step.waitFor;
    if (!w || typeof w !== "object") throw new Error('Invalid "waitFor" step');
    const o = w as Record<string, unknown>;
    const target = String(o.target);
    const timeoutMs =
      o.timeoutMs === undefined ? undefined : Number(o.timeoutMs);
    if (o.timeoutMs !== undefined && (Number.isNaN(timeoutMs!) || timeoutMs! < 0)) {
      throw new Error('Invalid "waitFor.timeoutMs"');
    }
    return [
      applyMeta(
        {
          op: "waitFor",
          targetKey: target,
          locator: requireLocator(target, locators),
          timeoutMs: timeoutMs === undefined ? undefined : timeoutMs,
        },
        step,
      ),
    ];
  }
  throw new Error(`Unsupported step shape: ${JSON.stringify(step)}`);
}

/**
 * Build resolved IR: substitute `${data...}` in steps, attach locators from wloc.
 */
export function buildResolvedIr(flow: FlowDoc, wloc: LocBundle, data: DataDoc | null | undefined): ResolvedIr {
  const dataRoot = data?.data ?? {};
  const substitutedSteps = deepSubstituteStrings(flow.steps, dataRoot) as unknown[];
  const resolvedSteps: ResolvedStep[] = [];
  for (const raw of substitutedSteps) {
    resolvedSteps.push(...stepToResolvedList(normalizeStep(raw), wloc.locators));
  }
  return {
    wflowSpecVersion: 1,
    kind: "resolved",
    meta: flow.meta,
    resolvedSteps,
  };
}
