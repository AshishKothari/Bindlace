import path from "node:path";

export const repoRoot = path.resolve(import.meta.dirname, "..");

export const exampleFlow = path.join(repoRoot, "packages", "wflow-spec", "examples", "smoke-public.wflow.yaml");
export const exampleLocators = path.join(repoRoot, "packages", "wflow-spec", "examples", "smoke-public.wloc.yaml");
export const exampleData = path.join(repoRoot, "packages", "wflow-spec", "examples", "smoke-public.wdata.yaml");

export const bindlaceCli = path.join(repoRoot, "packages", "wflow-runner-node", "dist", "cli.js");
export const bindlaceLib = path.join(repoRoot, "packages", "wflow-runner-node", "dist", "index.js");

