/**
 * Validate parsed artifact objects with Ajv (+ formats). Compilers are cached per `kind`.
 */
import { createRequire } from "node:module";
import { Ajv, type ErrorObject } from "ajv";
import type { ArtifactKind } from "./load.js";
import { readSchema } from "./schemas.js";

const require = createRequire(import.meta.url);
// CJS interop: ajv-formats default export is a plugin function
const addFormats = require("ajv-formats") as (ajv: Ajv) => void;

let ajvInstance: Ajv | null = null;
const validators = new Map<ArtifactKind, ReturnType<Ajv["compile"]>>();

async function getAjv(): Promise<Ajv> {
  if (!ajvInstance) {
    ajvInstance = new Ajv({ allErrors: true, strict: true });
    addFormats(ajvInstance);
  }
  return ajvInstance;
}

export async function validateArtifact(kind: ArtifactKind, data: unknown): Promise<void> {
  const validator = validators.get(kind) ?? (await getAjv()).compile(await readSchema(kind));
  validators.set(kind, validator);
  const ok = validator(data);
  if (!ok) {
    const msg =
      validator.errors?.map((e: ErrorObject) => `${e.instancePath || "/"} ${e.message}`).join("; ") ?? "unknown";
    throw new Error(`Validation failed (${kind}): ${msg}`);
  }
}
