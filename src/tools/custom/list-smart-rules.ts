/**
 * list-smart-rules.ts — Parse DEVONthink SmartRules.plist to enumerate all smart rules.
 *
 * Smart rules are NOT accessible via the standard AppleScript scripting dictionary.
 * This tool reads the plist file directly using `plutil -convert xml1`.
 */

import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import {
  extractTopLevelDicts,
  extractStringAfterKey,
  extractDateAfterKey,
  extractBoolAfterKey,
  extractIntegerAfterKey,
  extractRealAfterKey,
  extractSubDictAfterKey,
} from "../../shared/plist/parser.js";
import type { McpTool } from "../../jxa/types.js";

const PLIST_PATH = join(
  homedir(),
  "Library",
  "Application Support",
  "DEVONthink",
  "SmartRules.plist"
);

interface SmartRuleEntry {
  name: string;
  uuid: string;
  enabled: boolean | null;
  indexOffset: number | null;
  lastExecution: number | null;
  syncDate: string | null;
  useUuidKey: boolean | null;
}

interface SmartRulesResult {
  success: boolean;
  smartRules?: SmartRuleEntry[];
  totalCount?: number;
  error?: string;
}

function parsePlistXmlToSmartRules(xml: string): SmartRuleEntry[] {
  const topLevelDicts = extractTopLevelDicts(xml);
  const results: SmartRuleEntry[] = [];

  for (const dictContent of topLevelDicts) {
    const name = extractStringAfterKey(dictContent, "name");
    const enabled = extractBoolAfterKey(dictContent, "Enabled");
    const indexOffset = extractIntegerAfterKey(dictContent, "IndexOffset");
    const lastExecution = extractRealAfterKey(dictContent, "LastExecution");
    const useUuidKey = extractBoolAfterKey(dictContent, "UseUUIDKey");

    const syncContent = extractSubDictAfterKey(dictContent, "sync");
    const uuid = syncContent ? extractStringAfterKey(syncContent, "UUID") : null;
    const syncDate = syncContent ? extractDateAfterKey(syncContent, "date") : null;

    if (!name && !uuid) continue;

    results.push({
      name: name ?? "(unnamed)",
      uuid: uuid ?? "",
      enabled,
      indexOffset,
      lastExecution,
      syncDate: syncDate ?? null,
      useUuidKey,
    });
  }

  return results;
}

const listSmartRules = async (): Promise<SmartRulesResult> => {
  if (!existsSync(PLIST_PATH)) {
    return {
      success: false,
      error: `SmartRules.plist not found at: ${PLIST_PATH}. Ensure DEVONthink has been run at least once and smart rules have been created.`,
    };
  }

  let xml: string;
  try {
    xml = execSync(`plutil -convert xml1 -o - "${PLIST_PATH}"`, {
      encoding: "utf-8",
      timeout: 10000,
    });
  } catch (err) {
    return {
      success: false,
      error: `Failed to parse SmartRules.plist: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  let smartRules: SmartRuleEntry[];
  try {
    smartRules = parsePlistXmlToSmartRules(xml);
  } catch (err) {
    return {
      success: false,
      error: `Failed to parse XML output from plutil: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  smartRules.sort((a, b) => a.name.localeCompare(b.name));

  return { success: true, smartRules, totalCount: smartRules.length };
};

export const listSmartRulesTool: McpTool = {
  name: "list_smart_rules",
  description:
    "List all DEVONthink smart rules by parsing SmartRules.plist. " +
    "Returns name, UUID (from sync.UUID), enabled state, indexOffset, lastExecution timestamp, " +
    "and sync date for each rule. " +
    "Smart rules are NOT accessible via the standard AppleScript API — this is the only way to enumerate them.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
  run: listSmartRules,
};
