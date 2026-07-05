import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { startProcessSampler } from "./processSampler.mjs";
import { bindlaceCli, bindlaceLib, exampleData, exampleFlow, exampleLocators } from "./paths.mjs";

const bindlaceRequire = createRequire(pathToFileURL(bindlaceLib).href);

function spawnNode(args) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    const child = spawn(process.execPath, args, { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (d) => {
      stderr += String(d);
      if (stderr.length > 10000) stderr = stderr.slice(stderr.length - 10000);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else {
        const hint = stderr.trim() ? `\n--- stderr (tail) ---\n${stderr.trim()}\n---` : "";
        reject(new Error(`Process failed: node ${args.join(" ")} (exit ${code ?? "null"})${hint}`));
      }
    });
  });
}

function makeProcSampler() {
  const processNames = ["node", "chromium", "chrome", "chromedriver", "msedge", "msedgedriver"];
  return { start: () => startProcessSampler({ processNames, intervalMs: 200 }) };
}

export const variants = {
  baseline: () => ({
    run: async () => {},
  }),

  "bindlace-pipeline": () => ({
    run: async () => {
      const lib = await import(pathToFileURL(bindlaceLib).href);
      const flow = await lib.loadWflow(exampleFlow);
      const wloc = await lib.loadWloc(exampleLocators);
      const wdata = await lib.loadWdata(exampleData);
      await lib.buildResolvedIrFromEntry(exampleFlow, flow, wloc, wdata);
    },
  }),

  "plain-playwright": () => {
    const samplerFactory = makeProcSampler();
    let sampled = null;
    return {
      run: async () => {
        const sampler = samplerFactory.start();
        try {
          const { chromium } = bindlaceRequire("playwright");
          const browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();
          try {
            await page.goto("https://example.com", { timeout: 120000 });
            await page.locator("h1").waitFor({ state: "visible", timeout: 120000 });
          } finally {
            await browser.close();
          }
        } finally {
          sampled = await sampler.stop();
        }
      },
      procSample: async () => sampled ?? { intervalMs: 200, samples: 0, byName: {} },
    };
  },

  "plain-selenium": () => {
    const samplerFactory = makeProcSampler();
    let sampled = null;
    return {
      run: async () => {
        const sampler = samplerFactory.start();
        try {
          const { Builder, By, until } = bindlaceRequire("selenium-webdriver");
          const chrome = bindlaceRequire("selenium-webdriver/chrome.js");
          const opts = new chrome.Options();
          opts.addArguments("--headless=new");
          opts.addArguments("--window-size=1280,900");
          const driver = await new Builder().forBrowser("chrome").setChromeOptions(opts).build();
          try {
            await driver.manage().setTimeouts({ implicit: 0, pageLoad: 120000, script: 120000 });
            await driver.get("https://example.com");
            const el = await driver.wait(until.elementLocated(By.css("h1")), 120000);
            await driver.wait(until.elementIsVisible(el), 120000);
          } finally {
            await driver.quit();
          }
        } finally {
          sampled = await sampler.stop();
        }
      },
      procSample: async () => sampled ?? { intervalMs: 200, samples: 0, byName: {} },
    };
  },

  "bindlace-run-playwright": () => {
    const samplerFactory = makeProcSampler();
    let sampled = null;
    return {
      run: async () => {
        const sampler = samplerFactory.start();
        try {
          await spawnNode([
            bindlaceCli,
            "run",
            "--flow",
            exampleFlow,
            "--locators",
            exampleLocators,
            "--data",
            exampleData,
            "--driver",
            "playwright",
            "--timeout-ms",
            "120000",
          ]);
        } finally {
          sampled = await sampler.stop();
        }
      },
      procSample: async () => sampled ?? { intervalMs: 200, samples: 0, byName: {} },
    };
  },

  "bindlace-run-selenium": () => {
    const samplerFactory = makeProcSampler();
    let sampled = null;
    return {
      run: async () => {
        const sampler = samplerFactory.start();
        try {
          await spawnNode([
            bindlaceCli,
            "run",
            "--flow",
            exampleFlow,
            "--locators",
            exampleLocators,
            "--data",
            exampleData,
            "--driver",
            "selenium",
            "--timeout-ms",
            "120000",
          ]);
        } finally {
          sampled = await sampler.stop();
        }
      },
      procSample: async () => sampled ?? { intervalMs: 200, samples: 0, byName: {} },
    };
  },
};

