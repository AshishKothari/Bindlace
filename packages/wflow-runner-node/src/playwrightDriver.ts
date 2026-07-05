/**
 * Playwright implementation of resolved steps: map `LocatorDef` → Playwright locators, run ops, log timing, `RunError` on failure.
 */
import type { Page } from "playwright";
import type { LocatorDef, ResolvedIr, ResolvedStep } from "./types.js";
import type { Logger } from "./logger.js";
import { RunError, formatAuthorTags } from "./runErrors.js";

export type RunOptions = {
  defaultTimeoutMs: number;
  screenshotOnFailurePath?: string;
  logger: Logger;
};

/** First matching field wins: css, xpath, role (+name), text — same priority as Selenium path (see `seleniumDriver.byFromDef`). */
function locatorFromDef(page: Page, def: LocatorDef) {
  if (def.css) return page.locator(def.css);
  if (def.xpath) return page.locator(`xpath=${def.xpath}`);
  if (def.role) {
    const name = def.name;
    return page.getByRole(
      def.role as Parameters<Page["getByRole"]>[0],
      name ? { name } : undefined,
    );
  }
  if (def.text) return page.getByText(def.text);
  throw new Error("Locator must set one of: css, xpath, role (+ optional name), text");
}

/** Single resolved op against `page` (timeouts from step or `defaultTimeoutMs`). */
async function runStep(page: Page, step: ResolvedStep, defaultTimeoutMs: number): Promise<void> {
  const timeout = defaultTimeoutMs;
  switch (step.op) {
    case "navigate": {
      await page.goto(step.url, { timeout });
      return;
    }
    case "waitFor": {
      const loc = locatorFromDef(page, step.locator);
      await loc.waitFor({ state: "visible", timeout: step.timeoutMs ?? timeout });
      return;
    }
    case "fill": {
      const loc = locatorFromDef(page, step.locator);
      await loc.waitFor({ state: "visible", timeout });
      const tag = await loc.evaluate((el) => el.tagName.toLowerCase());
      if (tag === "select") {
        await loc.selectOption({ label: step.value }, { timeout });
        return;
      }
      // React controlled inputs: click + sequential keys fire input events reliably (fill alone can desync).
      await loc.click({ timeout });
      await loc.clear();
      if (step.value.length > 0) {
        await loc.pressSequentially(step.value, { delay: 5 });
      }
      return;
    }
    case "click": {
      const loc = locatorFromDef(page, step.locator);
      await loc.click({ timeout });
      return;
    }
    case "assertVisible": {
      const loc = locatorFromDef(page, step.locator);
      await loc.waitFor({ state: "visible", timeout });
      return;
    }
    case "expectText": {
      const loc = locatorFromDef(page, step.locator);
      await loc.waitFor({ state: "visible", timeout });
      const inner = await loc.innerText();
      if (!inner.includes(step.text)) {
        throw new Error(`Expected text to include ${JSON.stringify(step.text)} — got ${JSON.stringify(inner)}`);
      }
      return;
    }
    case "expectInputValue": {
      const loc = locatorFromDef(page, step.locator);
      await loc.waitFor({ state: "visible", timeout });
      const actual = await loc.inputValue();
      if (actual !== step.value) {
        throw new Error(`Expected input value ${JSON.stringify(step.value)} — got ${JSON.stringify(actual)}`);
      }
      return;
    }
  }
}

/** Execute a resolved flow against an existing Playwright page (caller owns browser lifecycle). */
export async function runResolvedOnPage(ir: ResolvedIr, page: Page, options: RunOptions): Promise<void> {
  const total = ir.resolvedSteps.length;
  const { logger } = options;
  for (let index = 0; index < total; index++) {
    const step = ir.resolvedSteps[index];
    const label = `${index + 1}/${total}`;
    logger.info(`Step ${label} start: ${step.op}${formatAuthorTags(step)}`);
    if (step.log) {
      logger.info(`  author log: ${step.log}`);
    }
    const t0 = Date.now();
    try {
      await runStep(page, step, options.defaultTimeoutMs);
      logger.info(`Step ${label} done: ${step.op} (${Date.now() - t0}ms)`);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      logger.info(`Step ${label} failed: ${step.op} — ${e.message}`);
      if (options.screenshotOnFailurePath) {
        await page.screenshot({ path: options.screenshotOnFailurePath, fullPage: true }).catch(() => {});
        logger.info(`Screenshot written: ${options.screenshotOnFailurePath}`);
      }
      throw new RunError(index, step, e);
    }
  }
}

export { RunError, formatAuthorTags } from "./runErrors.js";
