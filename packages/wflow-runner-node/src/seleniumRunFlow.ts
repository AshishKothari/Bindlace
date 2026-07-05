/**
 * Selenium execution: build Chrome WebDriver (headless flag), delegate to `runResolvedOnDriver`, always quit.
 */
import { Builder } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import type { ResolvedIr } from "./types.js";
import { runResolvedOnDriver } from "./seleniumDriver.js";
import type { Logger } from "./logger.js";

export type ExecuteSeleniumIrOptions = {
  headless: boolean;
  defaultTimeoutMs: number;
  screenshotOnFailurePath?: string;
  logger: Logger;
};

export async function executeResolvedIrSelenium(ir: ResolvedIr, options: ExecuteSeleniumIrOptions): Promise<void> {
  const { logger } = options;
  const chromeOpts = new chrome.Options();
  if (options.headless) chromeOpts.addArguments("--headless=new");
  chromeOpts.addArguments("--window-size=1280,900");

  logger.info(`Launching Chrome via Selenium (headless=${options.headless})`);
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(chromeOpts).build();
  try {
    await driver.manage().setTimeouts({
      implicit: 0,
      pageLoad: options.defaultTimeoutMs,
      script: options.defaultTimeoutMs,
    });
    await runResolvedOnDriver(ir, driver, {
      defaultTimeoutMs: options.defaultTimeoutMs,
      screenshotOnFailurePath: options.screenshotOnFailurePath,
      logger,
    });
  } finally {
    await driver.quit();
    logger.info("Browser closed");
  }
}
