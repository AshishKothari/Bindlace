/**
 * Structured failure from drivers: preserves step index + resolved step for CLI (`RunError` → exit 1, message already logged).
 */
import type { ResolvedStep } from "./types.js";

export function formatAuthorTags(step: ResolvedStep): string {
  const parts: string[] = [];
  if (step.step != null) parts.push(`author#${step.step}`);
  if (step.id) parts.push(`id=${step.id}`);
  return parts.length ? ` [${parts.join(" ")}]` : "";
}

export class RunError extends Error {
  constructor(
    public readonly stepIndex: number,
    public readonly step: ResolvedStep,
    public readonly cause: Error,
  ) {
    super(`Step ${stepIndex} (${step.op})${formatAuthorTags(step)}: ${cause.message}`);
    this.name = "RunError";
  }
}
