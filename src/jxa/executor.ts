/**
 * executor.ts — JXA (JavaScript for Automation) execution via osascript.
 *
 * Provides a JxaExecutor interface for testability (mock in tests)
 * and an OsascriptExecutor implementation that shells out to osascript.
 */

import { execSync } from "node:child_process";
import { shellQuote } from "./escape.js";

/** Result from executing a JXA script */
export interface JxaResult {
  stdout: string;
  stderr: string;
}

/** Injectable interface for JXA execution */
export interface JxaExecutor {
  run(script: string): JxaResult;
}

/** Default buffer limit: 50 MB (prevents OOM on large DB queries) */
const MAX_BUFFER = 50 * 1024 * 1024;

/** Default timeout: 60 seconds */
const DEFAULT_TIMEOUT = 60_000;

/**
 * Production executor that runs JXA via `osascript -l JavaScript`.
 */
export class OsascriptExecutor implements JxaExecutor {
  private timeout: number;
  private maxBuffer: number;

  constructor(opts?: { timeout?: number; maxBuffer?: number }) {
    this.timeout = opts?.timeout ?? DEFAULT_TIMEOUT;
    this.maxBuffer = opts?.maxBuffer ?? MAX_BUFFER;
  }

  run(script: string): JxaResult {
    try {
      const stdout = execSync(
        `osascript -l JavaScript -e ${shellQuote(script)}`,
        {
          encoding: "utf-8",
          timeout: this.timeout,
          maxBuffer: this.maxBuffer,
          // Capture stderr separately so DEVONthink deprecation warnings don't crash
          stdio: ["pipe", "pipe", "pipe"],
        }
      );
      return { stdout: stdout.trimEnd(), stderr: "" };
    } catch (err: unknown) {
      // execSync throws on non-zero exit. Extract stderr if available.
      if (err && typeof err === "object" && "stderr" in err) {
        const execErr = err as { stdout?: string; stderr?: string; message?: string };
        const stderr = (typeof execErr.stderr === "string" ? execErr.stderr : "").trim();
        const stdout = (typeof execErr.stdout === "string" ? execErr.stdout : "").trim();

        // If we got stdout despite non-zero exit, the script may have succeeded
        // but osascript returned a warning on stderr. Treat as success if stdout is non-empty.
        if (stdout && stderr && !stderr.includes("Error")) {
          return { stdout, stderr };
        }

        throw new Error(stderr || execErr.message || "JXA execution failed");
      }
      throw err;
    }
  }
}

/** Singleton executor for production use */
let defaultExecutor: JxaExecutor | null = null;

export function getDefaultExecutor(): JxaExecutor {
  if (!defaultExecutor) {
    defaultExecutor = new OsascriptExecutor();
  }
  return defaultExecutor;
}

/**
 * Override the default executor (for testing).
 */
export function setDefaultExecutor(executor: JxaExecutor): void {
  defaultExecutor = executor;
}
