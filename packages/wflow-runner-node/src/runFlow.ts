/**
 * Playwright execution: launch Chromium, run `runResolvedOnPage` from `playwrightDriver.ts`, always close browser.
 */
import { chromium } from "playwright";
import type { ResolvedIr } from "./types.js";
import { runResolvedOnPage } from "./playwrightDriver.js";
import type { Logger } from "./logger.js";

export type ExecuteIrOptions = {
  headless: boolean;
  defaultTimeoutMs: number;
  screenshotOnFailurePath?: string;
  logger: Logger;
};

export async function executeResolvedIr(ir: ResolvedIr, options: ExecuteIrOptions): Promise<void> {
  const { logger } = options;
  logger.info(`Launching Chromium (headless=${options.headless})`);
  const browser = await chromium.launch({ headless: options.headless });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(options.defaultTimeoutMs);
    page.setDefaultNavigationTimeout(options.defaultTimeoutMs);
    await runResolvedOnPage(ir, page, {
      defaultTimeoutMs: options.defaultTimeoutMs,
      screenshotOnFailurePath: options.screenshotOnFailurePath,
      logger,
    });
  } finally {
    await browser.close();
    logger.info("Browser closed");
  }
}
