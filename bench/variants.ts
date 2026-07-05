import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import type { ProcSampleSummary } from "./processSampler.js";
import { startProcessSampler } from "./processSampler.js";
import { bindlaceCli, bindlaceLib, exampleData, exampleFlow, exampleLocators } from "./paths.js";

type VariantRun = {
  run: () => Promise<void>;
  procSample?: () => Promise<ProcSampleSummary>;
};

function spawnNode(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Process failed: node ${args.join(" ")} (exit ${code ?? "null"})`));
    });
  });
}

function makeProcSampler(): { start: () => { stop: () => Promise<ProcSampleSummary> } } {
  // Names seen on Windows for the relevant drivers/browsers.
  const processNames = [
    "node",
    "chromium",
    "chrome",
    "chromedriver",
    "msedge",
    "msedgedriver",
  ];
  return {
    start: () => startProcessSampler({ processNames, intervalMs: 200 }),
  };
}

export const variants: Record<string, () => VariantRun> = {
  baseline: () => ({
    run: async () => {
      // Minimal harness overhead; keep non-trivial work out.
      return;
    },
  }),

  "bindlace-pipeline": () => ({
    run: async () => {
      // Programmatic pipeline (no browser): load + validate + flatten prerequisites + resolve locators → IR.
      const lib = (await import(pathToFileURL(bindlaceLib).href)) as typeof import("../packages/wflow-runner-node/dist/index.js");
      const flow = (await lib.loadWflow(exampleFlow)) as lib.FlowDoc;
      const wloc = (await lib.loadWloc(exampleLocators)) as lib.LocBundle;
      const wdata = (await lib.loadWdata(exampleData)) as lib.DataDoc;
      await lib.buildResolvedIrFromEntry(exampleFlow, flow, wloc, wdata);
    },
  }),

  "plain-playwright": () => {
    const samplerFactory = makeProcSampler();
    let sampled: ProcSampleSummary | null = null;
    return {
      run: async () => {
        const sampler = samplerFactory.start();
        const { chromium } = await import("playwright");
        const browser = await chromium.launch({ headless: true });
        try {
          const page = await browser.newPage();
          await page.goto("https://example.com");
          await page.locator("h1").waitFor({ state: "visible", timeout: 30000 });
        } finally {
          await browser.close();
          sampled = await sampler.stop();
        }
      },
      procSample: async () => {
        return sampled ?? { intervalMs: 200, samples: 0, byName: {} };
      },
    };
  },

  "plain-selenium": () => {
    const samplerFactory = makeProcSampler();
    let sampled: ProcSampleSummary | null = null;
    return {
      run: async () => {
        const sampler = samplerFactory.start();
        const { Builder, By, until } = await import("selenium-webdriver");
        const chrome = (await import("selenium-webdriver/chrome.js")).default;
        const opts = new chrome.Options();
        opts.addArguments("--headless=new");
        opts.addArguments("--window-size=1280,900");
        const driver = await new Builder().forBrowser("chrome").setChromeOptions(opts).build();
        try {
          await driver.manage().setTimeouts({ implicit: 0, pageLoad: 30000, script: 30000 });
          await driver.get("https://example.com");
          const el = await driver.wait(until.elementLocated(By.css("h1")), 30000);
          await driver.wait(until.elementIsVisible(el), 30000);
        } finally {
          await driver.quit();
          sampled = await sampler.stop();
        }
      },
      procSample: async () => {
        return sampled ?? { intervalMs: 200, samples: 0, byName: {} };
      },
    };
  },

  "bindlace-run-playwright": () => {
    const samplerFactory = makeProcSampler();
    let sampled: ProcSampleSummary | null = null;
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
          ]);
        } finally {
          sampled = await sampler.stop();
        }
      },
      procSample: async () => {
        return sampled ?? { intervalMs: 200, samples: 0, byName: {} };
      },
    };
  },

  "bindlace-run-selenium": () => {
    const samplerFactory = makeProcSampler();
    let sampled: ProcSampleSummary | null = null;
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
          ]);
        } finally {
          sampled = await sampler.stop();
        }
      },
      procSample: async () => {
        return sampled ?? { intervalMs: 200, samples: 0, byName: {} };
      },
    };
  },
};

