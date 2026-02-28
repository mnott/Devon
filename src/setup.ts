/**
 * setup.ts — Interactive first-time setup for devon
 *
 * Run with: npx @tekmidian/devon setup
 *
 * Walks the user through:
 *   1. Prerequisites check (macOS, Node version, DEVONthink installed)
 *   2. Update ~/.claude.json mcpServers
 *   3. Update ~/.claude/settings.json enabledMcpjsonServers (if present)
 *   4. Done summary with next steps
 */

import { createInterface } from "node:readline";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// ANSI color helpers (no external deps)
// ---------------------------------------------------------------------------

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";

function bold(s: string): string {
  return `${BOLD}${s}${RESET}`;
}
function green(s: string): string {
  return `${GREEN}${s}${RESET}`;
}
function red(s: string): string {
  return `${RED}${s}${RESET}`;
}
function yellow(s: string): string {
  return `${YELLOW}${s}${RESET}`;
}
function cyan(s: string): string {
  return `${CYAN}${s}${RESET}`;
}
function dim(s: string): string {
  return `${DIM}${s}${RESET}`;
}

function ok(msg: string): void {
  process.stdout.write(`  ${green("✓")} ${msg}\n`);
}
function fail(msg: string): void {
  process.stdout.write(`  ${red("✗")} ${msg}\n`);
}
function warn(msg: string): void {
  process.stdout.write(`  ${yellow("!")} ${msg}\n`);
}
function info(msg: string): void {
  process.stdout.write(`  ${dim("·")} ${msg}\n`);
}

function header(title: string): void {
  process.stdout.write(`\n${bold(title)}\n`);
  process.stdout.write("─".repeat(title.length) + "\n");
}

// ---------------------------------------------------------------------------
// Readline helpers
// ---------------------------------------------------------------------------

let rl: ReturnType<typeof createInterface> | null = null;

function getReadline(): ReturnType<typeof createInterface> {
  if (!rl) {
    rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.on("close", () => {});
  }
  return rl;
}

function closeReadline(): void {
  if (rl) {
    rl.close();
    rl = null;
  }
}

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    getReadline().question(question, (answer) => resolve(answer.trim()));
  });
}

async function promptYesNo(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  const answer = await prompt(`  ${question} ${dim(hint)}: `);
  if (answer === "") return defaultYes;
  return answer.toLowerCase().startsWith("y");
}

// ---------------------------------------------------------------------------
// Resolve the path to this package's dist/index.js
// ---------------------------------------------------------------------------

function getIndexJsPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const distDir = dirname(__filename);
  return join(distDir, "index.js");
}

// ---------------------------------------------------------------------------
// Step 1: Prerequisites check
// ---------------------------------------------------------------------------

interface PrereqInfo {
  isMacOS: boolean;
  nodeVersion: string;
  devonthinkInstalled: boolean;
  devonthinkPath: string | null;
}

function checkDevonThinkInstalled(): { installed: boolean; path: string | null } {
  const candidates = [
    "/Applications/DEVONthink 3.app",
    "/Applications/DEVONthink Pro.app",
    "/Applications/DEVONthink Personal.app",
    "/Applications/DEVONthink.app",
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return { installed: true, path: candidate };
    }
  }

  // Try mdfind as a fallback
  try {
    const result = execSync(
      'mdfind "kMDItemCFBundleIdentifier == \'com.devon-technologies.think3\'" 2>/dev/null',
      { encoding: "utf-8", timeout: 5000 }
    ).trim();
    if (result) {
      const firstPath = result.split("\n")[0];
      return { installed: true, path: firstPath ?? null };
    }
  } catch {
    // mdfind failed or not available
  }

  return { installed: false, path: null };
}

async function stepPrerequisites(): Promise<PrereqInfo> {
  header("Step 1: Prerequisites");

  const isMacOS = platform() === "darwin";
  const nodeVersion = process.version;

  if (isMacOS) {
    ok("macOS detected");
  } else {
    fail(`Platform: ${platform()} — DEVONthink is macOS-only`);
    warn("Devon requires macOS with DEVONthink installed.");
    warn("This setup cannot continue on non-macOS platforms.");
    throw new Error("Devon requires macOS.");
  }

  const nodeOk =
    nodeVersion.startsWith("v") && parseInt(nodeVersion.slice(1)) >= 18;
  if (nodeOk) {
    ok(`Node ${nodeVersion} — supported`);
  } else {
    warn(`Node ${nodeVersion} may be too old. Node 18+ recommended.`);
  }

  const { installed, path: devonthinkPath } = checkDevonThinkInstalled();
  if (installed) {
    ok(`DEVONthink found: ${cyan(devonthinkPath ?? "yes")}`);
  } else {
    fail("DEVONthink 3 not found in /Applications");
    warn("Install DEVONthink from https://www.devontechnologies.com/apps/devonthink");
    warn(
      "Note: The MCP server still works if DEVONthink is installed elsewhere."
    );
  }

  return { isMacOS, nodeVersion, devonthinkInstalled: installed, devonthinkPath };
}

// ---------------------------------------------------------------------------
// Step 2: Update ~/.claude.json
// ---------------------------------------------------------------------------

async function stepUpdateClaudeJson(indexJsPath: string): Promise<boolean> {
  header("Step 2: Configure Claude Code (/.claude.json)");

  const claudeJsonPath = join(homedir(), ".claude.json");

  if (!existsSync(claudeJsonPath)) {
    warn("~/.claude.json not found.");
    warn(
      "This file is created the first time you run Claude Code. Run Claude Code once, then re-run setup."
    );
    return false;
  }

  let parsed: Record<string, unknown>;
  try {
    const raw = readFileSync(claudeJsonPath, "utf-8");
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    warn(`Could not parse ~/.claude.json: ${err}`);
    return false;
  }

  const mcpServers =
    (parsed["mcpServers"] as Record<string, unknown> | undefined) ?? {};

  // Check if already configured
  const existingEntry = mcpServers["devonthink"] as
    | Record<string, unknown>
    | undefined;

  if (existingEntry) {
    const currentArgs = (existingEntry["args"] as string[] | undefined) ?? [];
    const currentCmd = (existingEntry["command"] as string | undefined) ?? "";
    info(`Existing entry: ${cyan([currentCmd, ...currentArgs].join(" "))}`);
    info(`Proposed entry: ${cyan(`node ${indexJsPath} serve`)}`);
    process.stdout.write("\n");

    const doUpdate = await promptYesNo(
      "Update the existing devonthink entry to use this installation?",
      true
    );
    if (!doUpdate) {
      warn("Skipping ~/.claude.json update");
      return false;
    }
  } else {
    info(`Will add: ${cyan(`devonthink`)}`);
    info(`Command:  ${cyan(`node ${indexJsPath} serve`)}`);
    process.stdout.write("\n");

    const doAdd = await promptYesNo(
      'Add "devonthink" MCP server to ~/.claude.json?',
      true
    );
    if (!doAdd) {
      warn("Skipping ~/.claude.json update");
      return false;
    }
  }

  // Update the mcpServers entry
  const updatedServers = { ...mcpServers };
  updatedServers["devonthink"] = {
    type: "stdio",
    command: "node",
    args: [indexJsPath, "serve"],
    env: {},
  };

  parsed["mcpServers"] = updatedServers;

  try {
    writeFileSync(claudeJsonPath, JSON.stringify(parsed, null, 2) + "\n", "utf-8");
    ok(`Updated ~/.claude.json — "devonthink" MCP server configured`);
  } catch (err) {
    throw new Error(`Failed to write ~/.claude.json: ${err}`);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Step 3: Update ~/.claude/settings.json (enabledMcpjsonServers)
// ---------------------------------------------------------------------------

async function stepUpdateSettings(): Promise<boolean> {
  header("Step 3: Enable in Claude Code Settings");

  const settingsPath = join(homedir(), ".claude", "settings.json");

  if (!existsSync(settingsPath)) {
    info("~/.claude/settings.json not found — skipping");
    info("(This file is optional; Claude Code creates it when needed)");
    return false;
  }

  let parsed: Record<string, unknown>;
  try {
    const raw = readFileSync(settingsPath, "utf-8");
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    warn(`Could not parse ~/.claude/settings.json: ${err}`);
    return false;
  }

  const enabled = (parsed["enabledMcpjsonServers"] as string[] | undefined) ?? [];

  if (enabled.includes("devonthink")) {
    ok('"devonthink" is already in enabledMcpjsonServers');
    return true;
  }

  const disabled =
    (parsed["disabledMcpjsonServers"] as string[] | undefined) ?? [];

  const doEnable = await promptYesNo(
    'Add "devonthink" to enabledMcpjsonServers in ~/.claude/settings.json?',
    true
  );

  if (!doEnable) {
    warn("Skipping settings.json update");
    return false;
  }

  parsed["enabledMcpjsonServers"] = [...enabled, "devonthink"];

  // Remove from disabled list if present
  if (disabled.includes("devonthink")) {
    parsed["disabledMcpjsonServers"] = disabled.filter((s) => s !== "devonthink");
    info('Removed "devonthink" from disabledMcpjsonServers');
  }

  try {
    writeFileSync(
      settingsPath,
      JSON.stringify(parsed, null, 2) + "\n",
      "utf-8"
    );
    ok('Added "devonthink" to enabledMcpjsonServers in ~/.claude/settings.json');
  } catch (err) {
    throw new Error(`Failed to write ~/.claude/settings.json: ${err}`);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Step 4: Done summary
// ---------------------------------------------------------------------------

function stepDone(opts: {
  claudeJsonUpdated: boolean;
  settingsUpdated: boolean;
  indexJsPath: string;
}): void {
  header("Setup Complete!");

  const { claudeJsonUpdated, settingsUpdated, indexJsPath } = opts;

  process.stdout.write("\n");

  if (claudeJsonUpdated || settingsUpdated) {
    ok('DEVONthink MCP server is now configured for Claude Code');
    warn("Restart Claude Code to load the new MCP server.");
  } else {
    info(
      "Configuration was not updated. You can run setup again or configure manually."
    );
    process.stdout.write("\n");
    process.stdout.write(bold("  Manual configuration:\n"));
    process.stdout.write(
      "  Add this to the mcpServers section of ~/.claude.json:\n\n"
    );
    process.stdout.write(
      `    "devonthink": {\n      "type": "stdio",\n      "command": "node",\n      "args": ["${indexJsPath}", "serve"],\n      "env": {}\n    }\n`
    );
  }

  process.stdout.write("\n");
  process.stdout.write(bold("  What this MCP server provides:\n"));
  process.stdout.write("    · Search and browse DEVONthink databases\n");
  process.stdout.write("    · Read document content\n");
  process.stdout.write("    · Create, update, and organize records\n");
  process.stdout.write("    · Add tags, classify, and manage metadata\n");
  process.stdout.write("    · Cross-reference emails and documents\n");
  process.stdout.write("\n");
  process.stdout.write(bold("  Requires:\n"));
  process.stdout.write("    · DEVONthink 3 running on macOS\n");
  process.stdout.write("    · One or more open databases\n");
  process.stdout.write("\n");
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function runSetup(): Promise<void> {
  process.stdout.write("\n");
  process.stdout.write(bold("devon setup") + "\n");
  process.stdout.write("===========\n");
  process.stdout.write(
    dim("Configure Devon for Claude Code. Press Ctrl+C to abort.\n")
  );

  const indexJsPath = getIndexJsPath();

  try {
    // Step 1: Prerequisites
    await stepPrerequisites();

    // Step 2: Update ~/.claude.json
    const claudeJsonUpdated = await stepUpdateClaudeJson(indexJsPath);

    // Step 3: Update ~/.claude/settings.json
    const settingsUpdated = await stepUpdateSettings();

    // Step 4: Done
    stepDone({ claudeJsonUpdated, settingsUpdated, indexJsPath });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stdout.write(`\n${red("Setup failed:")} ${msg}\n`);
    process.exit(1);
  } finally {
    closeReadline();
  }
}
