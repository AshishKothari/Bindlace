/**
 * Public API re-exports for programmatic use (library consumers); CLI lives in `cli.ts`.
 */
export { loadArtifactFile, detectKindFromData, type ArtifactKind } from "./load.js";
export { validateArtifact } from "./validate.js";
export { loadWflow, loadWloc, loadWdata } from "./artifacts.js";
export {
  buildResolvedIr,
  type FlowDoc,
  type LocBundle,
  type DataDoc,
  type PrerequisiteRef,
} from "./resolve.js";
export {
  flattenFlowSteps,
  buildResolvedIrFromEntry,
  collectReachableWflowPaths,
} from "./flowFlatten.js";
export type { ResolvedIr, ResolvedStep, LocatorDef, StepMeta } from "./types.js";
export { substituteDataPlaceholders, getByDotPath, deepSubstituteStrings } from "./substitute.js";
export { executeResolvedIr } from "./runFlow.js";
export type { ExecuteIrOptions } from "./runFlow.js";
export { executeResolvedIrSelenium } from "./seleniumRunFlow.js";
export type { ExecuteSeleniumIrOptions } from "./seleniumRunFlow.js";
export { createLogger } from "./logger.js";
export type { Logger, CreateLoggerOptions } from "./logger.js";
export { RunError, formatAuthorTags } from "./runErrors.js";
export { runResolvedOnPage } from "./playwrightDriver.js";
export type { RunOptions } from "./playwrightDriver.js";
export { runResolvedOnDriver } from "./seleniumDriver.js";
export type { SeleniumRunOptions } from "./seleniumDriver.js";
