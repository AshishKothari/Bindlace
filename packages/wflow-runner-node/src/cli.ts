#!/usr/bin/env node
/**
 * `bindlace` CLI entry (alias: `wflow`): `validate` (schema + prerequisite wflows),
 * `print-ir` (merge → resolved IR JSON), `run` (merge → Playwright or Selenium).
 * Delegates loading/validation to other modules; no browser in validate/print-ir.
 */
import { validateArtifact } from "./validate.js";
import { loadArtifactFile, detectKindFromData, type ArtifactKind } from "./load.js";
import { loadWflow, loadWloc, loadWdata } from "./artifacts.js";
import { type FlowDoc, type LocBundle, type DataDoc } from "./resolve.js";
import { buildResolvedIrFromEntry, collectReachableWflowPaths } from "./flowFlatten.js";
import { executeResolvedIr } from "./runFlow.js";
import { executeResolvedIrSelenium } from "./seleniumRunFlow.js";
import { RunError } from "./runErrors.js";
import { createLogger } from "./logger.js";
import { substituteDataPlaceholders } from "./substitute.js";

/** `--flag value` style; returns the token after `name`, or undefined. */
function argValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function parseIntArg(args: string[], name: string, fallback: number): number {
  const v = argValue(args, name);
  if (v === undefined) return fallback;
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) throw new Error(`Invalid number for ${name}`);
  return n;
}

function parseDriver(args: string[]): "playwright" | "selenium" {
  const v = argValue(args, "--driver")?.toLowerCase();
  if (v === undefined || v === "playwright") return "playwright";
  if (v === "selenium") return "selenium";
  throw new Error(`Invalid --driver "${v}" — use playwright or selenium`);
}

function printHelp(): void {
  console.log(`bindlace — Bindlace runner (Node). Alias: wflow.

Usage:
  bindlace validate --flow <path> [--locators <path>] [--data <path>]
  bindlace print-ir --flow <path> --locators <path> [--data <path>]
  bindlace run      --flow <path> --locators <path> [--data <path>] [options]

Commands:
  validate    Validate JSON Schema for wflow / wloc / wdata (entry wflow + reachable prerequisite wflows)
  print-ir    Merge + resolve; print resolved IR as JSON (no browser)
  run         Merge, resolve locators, execute (Playwright or Selenium — see --driver)

Options (run):
  --flow       Path to *.wflow.yaml|json (required)
  --locators   Path to *.wloc.yaml|json (required for run)
  --data       Path to *.wdata.yaml|json (optional)
  --driver     playwright | selenium (default: playwright)
  --headed     Run with a visible browser (default: headless)
  --timeout-ms Default navigation/action timeout (default: 30000)
  --screenshot-on-failure <path>  Save full-page PNG if a step fails
  --log-file <path>  Append the same timestamped lines as stdout to this file

Global:
  --help       Show this help
`);
}

/** Prints optional root `log` on wflow/wloc/wdata after `${data...}` substitution (runner `run` only). */
function logArtifactBanner(
  kind: string,
  path: string,
  doc: Record<string, unknown>,
  dataRoot: unknown,
  logger: ReturnType<typeof createLogger>,
): void {
  logger.info(`Loading ${kind}: ${path}`);
  const raw = doc.log;
  if (typeof raw === "string" && raw.length > 0) {
    try {
      logger.info(`  file log: ${substituteDataPlaceholders(raw, dataRoot)}`);
    } catch (e) {
      logger.info(
        `  file log (substitution failed): ${raw} — ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}

/** Schema-validate entry flow, wloc, wdata; for wflow also validate each reachable prerequisite file. */
async function cmdValidate(args: string[]): Promise<void> {
  const flowPath = argValue(args, "--flow");
  const locPath = argValue(args, "--locators");
  const dataPath = argValue(args, "--data");

  if (!flowPath) {
    console.error("Error: --flow is required");
    process.exitCode = 2;
    return;
  }

  const tasks: Array<{ path: string; kind: ArtifactKind }> = [
    { path: flowPath, kind: "wflow" },
  ];
  if (locPath) tasks.push({ path: locPath, kind: "wloc" });
  if (dataPath) tasks.push({ path: dataPath, kind: "wdata" });

  for (const t of tasks) {
    const data = await loadArtifactFile(t.path);
    const detected = detectKindFromData(data);
    if (detected && detected !== t.kind) {
      throw new Error(`Kind mismatch for ${t.path}: expected ${t.kind}, file has kind ${detected}`);
    }
    if (t.kind === "wflow") {
      await validateArtifact("wflow", data);
      const paths = await collectReachableWflowPaths(t.path, data as FlowDoc);
      for (const p of paths) {
        console.log(`OK: ${p} (wflow)`);
      }
    } else {
      await validateArtifact(t.kind, data);
      console.log(`OK: ${t.path} (${t.kind})`);
    }
  }
}

/** Full pipeline except browser: flatten prerequisites, substitute data, resolve locators → stdout JSON. */
async function cmdPrintIr(args: string[]): Promise<void> {
  const flowPath = argValue(args, "--flow");
  const locPath = argValue(args, "--locators");
  const dataPath = argValue(args, "--data");

  if (!flowPath || !locPath) {
    console.error("Error: print-ir requires --flow and --locators");
    process.exitCode = 2;
    return;
  }

  const flow = await loadWflow(flowPath);
  const wloc = await loadWloc(locPath);
  const wdata = dataPath ? await loadWdata(dataPath) : null;

  const ir = await buildResolvedIrFromEntry(
    flowPath,
    flow as FlowDoc,
    wloc as LocBundle,
    (wdata ?? null) as DataDoc | null,
  );
  console.log(JSON.stringify(ir, null, 2));
}

/** Build resolved IR then execute with `--driver` (Playwright default, Selenium optional). */
async function cmdRun(args: string[]): Promise<void> {
  const flowPath = argValue(args, "--flow");
  const locPath = argValue(args, "--locators");
  const dataPath = argValue(args, "--data");

  if (!flowPath || !locPath) {
    console.error("Error: run requires --flow and --locators");
    process.exitCode = 2;
    return;
  }

  const flow = await loadWflow(flowPath);
  const wloc = await loadWloc(locPath);
  const wdata = dataPath ? await loadWdata(dataPath) : null;

  const dataRoot = ((wdata ?? null) as DataDoc | null)?.data ?? {};
  const logFilePath = argValue(args, "--log-file");
  const logger = createLogger({ filePath: logFilePath });

  logArtifactBanner("wflow", flowPath, flow as Record<string, unknown>, dataRoot, logger);
  logArtifactBanner("wloc", locPath, wloc as Record<string, unknown>, dataRoot, logger);
  if (dataPath && wdata) {
    logArtifactBanner("wdata", dataPath, wdata as Record<string, unknown>, dataRoot, logger);
  }

  const ir = await buildResolvedIrFromEntry(
    flowPath,
    flow as FlowDoc,
    wloc as LocBundle,
    (wdata ?? null) as DataDoc | null,
  );

  const headless = !hasFlag(args, "--headed");
  const defaultTimeoutMs = parseIntArg(args, "--timeout-ms", 30000);
  const screenshotOnFailurePath = argValue(args, "--screenshot-on-failure");
  let driver: "playwright" | "selenium";
  try {
    driver = parseDriver(args);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 2;
    return;
  }

  logger.info(`Resolved ${ir.resolvedSteps.length} step(s)${ir.meta?.id ? ` (flow id: ${ir.meta.id})` : ""}`);
  logger.info(`Driver: ${driver}`);

  try {
    if (driver === "playwright") {
      await executeResolvedIr(ir, {
        headless,
        defaultTimeoutMs,
        screenshotOnFailurePath,
        logger,
      });
    } else {
      await executeResolvedIrSelenium(ir, {
        headless,
        defaultTimeoutMs,
        screenshotOnFailurePath,
        logger,
      });
    }
    logger.info("OK: run completed");
  } catch (err) {
    if (err instanceof RunError) {
      process.exitCode = 1;
      return;
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Executable doesn't exist")) {
      console.error("Playwright browsers are not installed. Run:\n  npx playwright install chromium");
      process.exitCode = 1;
      return;
    }
    if (
      driver === "selenium" &&
      (msg.includes("chromedriver") || msg.includes("ChromeDriver") || msg.includes("Unable to obtain driver"))
    ) {
      console.error(
        "Selenium could not start Chrome / ChromeDriver. Ensure Google Chrome is installed; Selenium Manager usually fetches a matching driver.\n" +
          `Details: ${msg}`,
      );
      process.exitCode = 1;
      return;
    }
    throw err;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printHelp();
    return;
  }

  const cmd = args[0];
  if (cmd === "validate") {
    await cmdValidate(args.slice(1));
    return;
  }
  if (cmd === "print-ir") {
    await cmdPrintIr(args.slice(1));
    return;
  }
  if (cmd === "run") {
    await cmdRun(args.slice(1));
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  printHelp();
  process.exitCode = 2;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});