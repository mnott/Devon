/**
 * reader.ts — Plist reading/writing utilities using PlistBuddy and Python plistlib.
 *
 * Migrated from columnLayout.ts to be shared across tools.
 */

import { execSync } from "node:child_process";
import { shellQuote } from "../shell.js";

const PLISTBUDDY = "/usr/libexec/PlistBuddy";

/**
 * Run PlistBuddy with a command against a plist file.
 * Returns trimmed stdout, or null if the key does not exist.
 */
export function plistRead(plistPath: string, command: string): string | null {
  try {
    const result = execSync(
      `${PLISTBUDDY} -c ${shellQuote(command)} ${shellQuote(plistPath)}`,
      { encoding: "utf-8", timeout: 10_000 }
    );
    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Parse a PlistBuddy "Array { ... }" output into a string array.
 */
export function parsePlistBuddyArray(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && l !== "Array {" && l !== "}");
}

/**
 * Parse a PlistBuddy "Dict { key = value ... }" output into a Record.
 */
export function parsePlistBuddyDict(raw: string): Record<string, number> {
  const result: Record<string, number> = {};
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && l !== "Dict {" && l !== "}");
  for (const line of lines) {
    const match = line.match(/^(\S+)\s*=\s*(.+)$/);
    if (match) {
      result[match[1]] = parseFloat(match[2]);
    }
  }
  return result;
}

/**
 * Get all plist keys matching a prefix pattern using Python plistlib.
 * Returns extracted base names (portion after the prefix).
 */
export function getPlistKeysByPrefix(
  plistPath: string,
  prefixes: string[],
  limit = 200
): string[] {
  const prefixesPy = prefixes.map((p) => `'${p.replace(/'/g, "\\'")}'`).join(", ");
  const script = `
import plistlib, sys
with open('${plistPath}', 'rb') as f:
    data = plistlib.load(f)
prefixes = [${prefixesPy}]
names = set()
for k in data:
    for p in prefixes:
        if k.startswith(p):
            names.add(k[len(p):])
names = [n for n in names if not n.startswith('Outline')]
names.sort()
print('\\n'.join(names[:${limit}]))
`.trim();

  try {
    const result = execSync(`python3 -c ${shellQuote(script)}`, {
      encoding: "utf-8",
      timeout: 10_000,
    });
    return result.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Copy plist keys from source to target using Python plistlib (atomic read/write).
 */
export function copyPlistKeys(
  plistPath: string,
  suffixes: string[],
  sourceBaseName: string,
  targetBaseName: string
): { ok: boolean; keysCopied: string[]; error?: string } {
  const suffixesPy = suffixes.map((s) => `'${s.replace(/'/g, "\\'")}'`).join(", ");
  const script = `
import plistlib, sys, copy

plist_path = '${plistPath}'
source = '${sourceBaseName.replace(/'/g, "\\'")}'
target = '${targetBaseName.replace(/'/g, "\\'")}'
suffixes = [${suffixesPy}]

with open(plist_path, 'rb') as f:
    data = plistlib.load(f)

copied = []
for suffix in suffixes:
    src_key = suffix + '-' + source
    tgt_key = suffix + '-' + target
    if src_key in data:
        data[tgt_key] = copy.deepcopy(data[src_key])
        copied.append(tgt_key)

if not copied:
    print('ERROR: no source keys found for: ' + source, file=sys.stderr)
    sys.exit(1)

with open(plist_path, 'wb') as f:
    plistlib.dump(data, f, fmt=plistlib.FMT_BINARY)

print('\\n'.join(copied))
`.trim();

  try {
    const result = execSync(`python3 -c ${shellQuote(script)}`, {
      encoding: "utf-8",
      timeout: 15_000,
    });
    return { ok: true, keysCopied: result.trim().split("\n").filter(Boolean) };
  } catch (err) {
    return {
      ok: false,
      keysCopied: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
