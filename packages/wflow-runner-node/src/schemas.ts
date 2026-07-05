/**
 * Load packaged JSON Schemas from `schema/` (copied at build from `packages/wflow-spec/schema`).
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Packaged schemas (copied at build from `packages/wflow-spec/schema`). */
const specRoot = join(__dirname, "..", "schema");

export async function readSchema(name: "wflow" | "wloc" | "wdata"): Promise<object> {
  const file = join(specRoot, `${name}.schema.json`);
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw) as object;
}
