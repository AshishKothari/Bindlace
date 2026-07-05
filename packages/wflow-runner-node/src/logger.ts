/**
 * Timestamped lines to stdout; optional duplicate append to `--log-file` (used by CLI `run`).
 */
import { appendFileSync } from "node:fs";

export type Logger = {
  /** Same line to stdout and optional log file (with ISO timestamp prefix). */
  info: (message: string) => void;
};

export type CreateLoggerOptions = {
  /** If set, each `info` line is appended (UTF-8). */
  filePath?: string;
};

function formatLine(message: string): string {
  return `[${new Date().toISOString()}] ${message}`;
}

export function createLogger(options: CreateLoggerOptions): Logger {
  return {
    info(message: string): void {
      const line = formatLine(message);
      console.log(line);
      if (options.filePath) {
        appendFileSync(options.filePath, `${line}\n`, "utf8");
      }
    },
  };
}
