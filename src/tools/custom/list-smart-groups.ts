/**
 * list-smart-groups.ts — Parse DEVONthink SmartGroups.plist to enumerate all smart groups.
 *
 * Smart groups are NOT accessible via the standard AppleScript scripting dictionary.
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
  extractSubDictAfterKey,
} from "../../shared/plist/parser.js";
import type { McpTool } from "../../jxa/types.js";

const PLIST_PATH = join(
  homedir(),
  "Library",
  "Application Support",
  "DEVONthink",
  "SmartGroups.plist"
);

interface SmartGroupEntry {
  name: string;
  uuid: string;
  syncDate: string | null;
  useUuidKey: boolean | null;
}

interface SmartGroupsResult {
  success: boolean;
  smartGroups?: SmartGroupEntry[];
  totalCount?: number;
  error?: string;
}

function parsePlistXmlToSmartGroups(xml: string): SmartGroupEntry[] {
  const topLevelDicts = extractTopLevelDicts(xml);
  const results: SmartGroupEntry[] = [];

  for (const dictContent of topLevelDicts) {
    const name = extractStringAfterKey(dictContent, "name");
    const useUuidKey = extractBoolAfterKey(dictContent, "UseUUIDKey");

    const syncContent = extractSubDictAfterKey(dictContent, "sync");
    const uuid = syncContent ? extractStringAfterKey(syncContent, "UUID") : null;
    const syncDate = syncContent ? extractDateAfterKey(syncContent, "date") : null;

    if (!name && !uuid) continue;

    results.push({
      name: name ?? "(unnamed)",
      uuid: uuid ?? "",
      syncDate: syncDate ?? null,
      useUuidKey,
    });
  }

  return results;
}

const listSmartGroups = async (): Promise<SmartGroupsResult> => {
  if (!existsSync(PLIST_PATH)) {
    return {
      success: false,
      error: `SmartGroups.plist not found at: ${PLIST_PATH}. Ensure DEVONthink has been run at least once.`,
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
      error: `Failed to parse SmartGroups.plist: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  let smartGroups: SmartGroupEntry[];
  try {
    smartGroups = parsePlistXmlToSmartGroups(xml);
  } catch (err) {
    return {
      success: false,
      error: `Failed to parse XML output from plutil: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  smartGroups.sort((a, b) => a.name.localeCompare(b.name));

  return { success: true, smartGroups, totalCount: smartGroups.length };
};

export const listSmartGroupsTool: McpTool = {
  name: "list_smart_groups",
  description:
    "List all DEVONthink smart groups by parsing SmartGroups.plist. " +
    "Returns name, UUID (from sync.UUID), sync date, and UseUUIDKey flag for each smart group. " +
    "Smart groups are NOT accessible via the standard AppleScript API — this is the only way to enumerate them. " +
    "Use the returned uuid with the search tool (groupUuid parameter) to query the contents of a smart group.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
  run: listSmartGroups,
};
