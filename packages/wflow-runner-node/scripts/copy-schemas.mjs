/**
 * Copy JSON Schemas from wflow-spec into this package so `wflow` works when
 * installed from npm or `file:` (schemas live next to package.json).
 */
import { cp } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, "..");
const src = join(pkgRoot, "..", "wflow-spec", "schema");
const dest = join(pkgRoot, "schema");

await cp(src, dest, { recursive: true });
console.log(`copy-schemas: ${src} -> ${dest}`);
