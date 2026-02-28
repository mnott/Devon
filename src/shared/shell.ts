/**
 * shell.ts — Shell utilities shared across tools.
 */

import { execSync } from "node:child_process";

/**
 * Shell-quote a string by wrapping in single quotes and escaping embedded single quotes.
 */
export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

/**
 * Execute a shell command with timeout and encoding defaults.
 * Returns trimmed stdout. Throws on non-zero exit.
 */
export function execSyncWithTimeout(
  command: string,
  opts?: { timeout?: number; maxBuffer?: number }
): string {
  return execSync(command, {
    encoding: "utf-8",
    timeout: opts?.timeout ?? 10_000,
    maxBuffer: opts?.maxBuffer ?? 50 * 1024 * 1024,
  }).trim();
}
