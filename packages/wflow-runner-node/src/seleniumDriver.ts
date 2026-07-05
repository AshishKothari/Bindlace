/**
 * Selenium implementation of resolved steps. `role`/`text` locators are approximated via XPath (not identical to Playwright semantics).
 */
import { By, type WebDriver, until } from "selenium-webdriver";
import { Select } from "selenium-webdriver/lib/select.js";
import { writeFileSync } from "node:fs";
import type { LocatorDef, ResolvedIr, ResolvedStep } from "./types.js";
import type { Logger } from "./logger.js";
import { RunError, formatAuthorTags } from "./runErrors.js";

export type SeleniumRunOptions = {
  defaultTimeoutMs: number;
  screenshotOnFailurePath?: string;
  logger: Logger;
};

/** XPath string literal (handles quotes in user text). */
function xpathLiteral(s: string): string {
  if (!s.includes("'")) return `'${s}'`;
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Map neutral locator to Selenium `By` (see file header for role/text caveats). */
function byFromDef(def: LocatorDef): By {
  if (def.css) return By.css(def.css);
  if (def.xpath) return By.xpath(def.xpath);
  if (def.text) {
    const t = def.text;
    return By.xpath(`//*[contains(normalize-space(.), ${xpathLiteral(t)})]`);
  }
  if (def.role) {
    if (def.name) {
      const namePred = `(@aria-label=${xpathLiteral(def.name)} or @title=${xpathLiteral(def.name)} or @name=${xpathLiteral(def.name)} or contains(normalize-space(.), ${xpathLiteral(def.name)}))`;
      return By.xpath(`//*[@role=${xpathLiteral(def.role)} and ${namePred}]`);
    }
    return By.xpath(`//*[@role=${xpathLiteral(def.role)}]`);
  }
  throw new Error("Locator must set one of: css, xpath, role (+ optional name), text");
}

async function waitVisible(driver: WebDriver, by: By, timeoutMs: number) {
  const el = await driver.wait(until.elementLocated(by), timeoutMs);
  await driver.wait(until.elementIsVisible(el), timeoutMs);
  return el;
}

async function scrollIntoView(driver: WebDriver, el: import("selenium-webdriver").WebElement): Promise<void> {
  await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", el);
}

async function elementTagName(
  driver: WebDriver,
  el: import("selenium-webdriver").WebElement,
): Promise<string> {
  const tag = await el.getTagName();
  return tag.toLowerCase();
}

/** Mirror of Playwright `runStep`: one resolved op on `driver`. */
async function runStep(driver: WebDriver, step: ResolvedStep, defaultTimeoutMs: number): Promise<void> {
  const timeout = defaultTimeoutMs;
  switch (step.op) {
    case "navigate": {
      await driver.get(step.url);
      return;
    }
    case "waitFor": {
      const by = byFromDef(step.locator);
      const t = step.timeoutMs ?? timeout;
      await waitVisible(driver, by, t);
      return;
    }
    case "fill": {
      const by = byFromDef(step.locator);
      const el = await waitVisible(driver, by, timeout);
      await scrollIntoView(driver, el);
      const tag = await elementTagName(driver, el);
      if (tag === "select") {
        const select = new Select(el);
        await select.selectByVisibleText(step.value);
        return;
      }
      await el.click();
      await el.clear();
      if (step.value.length > 0) {
        await el.sendKeys(step.value);
      }
      return;
    }
    case "click": {
      const by = byFromDef(step.locator);
      const el = await waitVisible(driver, by, timeout);
      await scrollIntoView(driver, el);
      await el.click();
      return;
    }
    case "assertVisible": {
      const by = byFromDef(step.locator);
      await waitVisible(driver, by, timeout);
      return;
    }
    case "expectText": {
      const by = byFromDef(step.locator);
      const el = await waitVisible(driver, by, timeout);
      const text = await el.getText();
      if (!text.includes(step.text)) {
        throw new Error(`Expected text to include ${JSON.stringify(step.text)} — got ${JSON.stringify(text)}`);
      }
      return;
    }
    case "expectInputValue": {
      const by = byFromDef(step.locator);
      const el = await waitVisible(driver, by, timeout);
      const actual = await el.getAttribute("value");
      if (actual !== step.value) {
        throw new Error(`Expected input value ${JSON.stringify(step.value)} — got ${JSON.stringify(actual)}`);
      }
      return;
    }
  }
}

export async function runResolvedOnDriver(ir: ResolvedIr, driver: WebDriver, options: SeleniumRunOptions): Promise<void> {
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
      await runStep(driver, step, options.defaultTimeoutMs);
      logger.info(`Step ${label} done: ${step.op} (${Date.now() - t0}ms)`);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      logger.info(`Step ${label} failed: ${step.op} — ${e.message}`);
      if (options.screenshotOnFailurePath) {
        try {
          const b64 = await driver.takeScreenshot();
          writeFileSync(options.screenshotOnFailurePath, Buffer.from(b64, "base64"));
          logger.info(`Screenshot written: ${options.screenshotOnFailurePath}`);
        } catch {
          /* ignore */
        }
      }
      throw new RunError(index, step, e);
    }
  }
}
