/**
 * Shared types for **resolved IR** — the contract between merge/resolve and Playwright/Selenium drivers.
 * Keep in sync with `packages/wflow-spec/schema` and both drivers when adding ops.
 */
/** Neutral locator as stored in wloc (subset enforced by JSON Schema). */
export type LocatorDef = {
  css?: string;
  xpath?: string;
  role?: string;
  name?: string;
  text?: string;
};

/** Optional annotations on any step (YAML: `step`, `id`, `log`). */
export type StepMeta = {
  /** Author-defined step number for logs/reports (not necessarily 1..n). */
  step?: number;
  /** Author-defined id (${data...} substituted before run). */
  id?: string;
  log?: string;
};

export type ResolvedStep =
  | ({ op: "navigate"; url: string } & StepMeta)
  | ({ op: "click"; targetKey: string; locator: LocatorDef } & StepMeta)
  | ({ op: "fill"; targetKey: string; locator: LocatorDef; value: string } & StepMeta)
  | ({ op: "assertVisible"; targetKey: string; locator: LocatorDef } & StepMeta)
  | ({ op: "expectText"; targetKey: string; locator: LocatorDef; text: string } & StepMeta)
  | ({ op: "expectInputValue"; targetKey: string; locator: LocatorDef; value: string } & StepMeta)
  | ({ op: "waitFor"; targetKey: string; locator: LocatorDef; timeoutMs?: number } & StepMeta);

export type ResolvedIr = {
  wflowSpecVersion: 1;
  kind: "resolved";
  meta?: { id?: string; name?: string; description?: string };
  resolvedSteps: ResolvedStep[];
};
