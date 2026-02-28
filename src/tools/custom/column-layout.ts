/**
 * column-layout.ts — Read and copy DEVONthink column layouts for smart groups/rules.
 *
 * Column layouts are stored in ~/Library/Preferences/com.devon-technologies.think.plist
 * under three related keys per smart group or rule.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import {
  plistRead,
  parsePlistBuddyArray,
  parsePlistBuddyDict,
  getPlistKeysByPrefix,
  copyPlistKeys,
} from "../../shared/plist/reader.js";
import type { McpTool } from "../../jxa/types.js";

const PLIST_PATH = join(
  homedir(),
  "Library",
  "Preferences",
  "com.devon-technologies.think.plist"
);

const LAYOUT_PREFIXES = [
  "ListColumnsHorizontal-",
  "TableView Columns ListColumnsHorizontal-",
  "TableView Column Widths ListColumnsHorizontal-",
];

const LAYOUT_SUFFIXES = [
  "ListColumnsHorizontal",
  "TableView Columns ListColumnsHorizontal",
  "TableView Column Widths ListColumnsHorizontal",
];

function keysForName(name: string) {
  return {
    columnsKey: `ListColumnsHorizontal-${name}`,
    tableViewColumnsKey: `TableView Columns ListColumnsHorizontal-${name}`,
    tableViewWidthsKey: `TableView Column Widths ListColumnsHorizontal-${name}`,
  };
}

interface ColumnLayoutResult {
  found: boolean;
  name: string;
  resolvedKey: string;
  columns: string[] | null;
  tableViewColumns: string[] | null;
  widths: Record<string, number> | null;
  keysFound: string[];
}

function readLayoutForName(baseName: string): ColumnLayoutResult | null {
  const { columnsKey, tableViewColumnsKey, tableViewWidthsKey } = keysForName(baseName);

  const rawColumns = plistRead(PLIST_PATH, `Print ':${columnsKey}'`);
  const rawTableViewColumns = plistRead(PLIST_PATH, `Print ':${tableViewColumnsKey}'`);
  const rawWidths = plistRead(PLIST_PATH, `Print ':${tableViewWidthsKey}'`);

  if (!rawColumns && !rawTableViewColumns && !rawWidths) {
    return null;
  }

  const keysFound: string[] = [];
  if (rawColumns) keysFound.push(columnsKey);
  if (rawTableViewColumns) keysFound.push(tableViewColumnsKey);
  if (rawWidths) keysFound.push(tableViewWidthsKey);

  return {
    found: true,
    name: baseName,
    resolvedKey: baseName,
    columns: rawColumns ? parsePlistBuddyArray(rawColumns) : null,
    tableViewColumns: rawTableViewColumns ? parsePlistBuddyArray(rawTableViewColumns) : null,
    widths: rawWidths ? parsePlistBuddyDict(rawWidths) : null,
    keysFound,
  };
}

function getExistingNames(limit = 20): string[] {
  return getPlistKeysByPrefix(PLIST_PATH, LAYOUT_PREFIXES, limit);
}

function findMatchingNames(searchTerm: string): string[] {
  const allNames = getExistingNames(200);
  const lower = searchTerm.toLowerCase();
  return allNames.filter((n) => n.toLowerCase().includes(lower));
}

// ---------------------------------------------------------------------------
// get_column_layout
// ---------------------------------------------------------------------------

const getColumnLayout = async (args: Record<string, unknown>): Promise<unknown> => {
  const name = args.name as string | undefined;
  const uuid = args.uuid as string | undefined;

  if (!name || typeof name !== "string") {
    return { success: false, error: "name parameter is required" };
  }

  const exactResult = readLayoutForName(name);
  if (exactResult) {
    return { success: true, ...exactResult };
  }

  if (uuid && typeof uuid === "string") {
    const uuidResult = readLayoutForName(uuid);
    if (uuidResult) {
      return { success: true, ...uuidResult, name };
    }
  }

  const fuzzyMatches = findMatchingNames(name);

  if (fuzzyMatches.length === 1) {
    const fuzzyResult = readLayoutForName(fuzzyMatches[0]);
    if (fuzzyResult) {
      return {
        success: true,
        ...fuzzyResult,
        nameSearched: name,
        note: `Exact name not found; matched "${fuzzyMatches[0]}" via partial search`,
      };
    }
  }

  const examples = getExistingNames(15);

  if (fuzzyMatches.length > 1) {
    return {
      success: false,
      name,
      error: `No exact match for "${name}". Multiple partial matches found — be more specific.`,
      partialMatches: fuzzyMatches,
    };
  }

  return {
    success: false,
    name,
    error:
      `No column layout found for "${name}". ` +
      "This smart group may not have a custom layout yet (it will use defaults). " +
      "Use copy_column_layout to copy an existing layout to it.",
    exampleNames: examples,
  };
};

export const getColumnLayoutTool: McpTool = {
  name: "get_column_layout",
  description:
    "Read the column layout for a DEVONthink smart group or smart rule from preferences. " +
    "Returns the ordered visible columns, all table view columns, and column widths. " +
    "Looks up by name (or UUID). Supports partial name matching. " +
    'Input: { "name": "Archivieren - Jobs" } or { "name": "Jobs", "uuid": "4A469368-..." }',
  inputSchema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description: "Name of the smart group or smart rule whose column layout to read",
      },
      uuid: {
        type: "string",
        description:
          "Optional UUID of the smart group (fallback if name not found). " +
          "DEVONthink sometimes stores layouts under the UUID rather than the display name.",
      },
    },
    required: ["name"],
  },
  run: getColumnLayout,
};

// ---------------------------------------------------------------------------
// copy_column_layout
// ---------------------------------------------------------------------------

interface CopyColumnLayoutResult {
  success: boolean;
  sourceName?: string;
  targetName?: string;
  resolvedSourceKey?: string;
  resolvedTargetKey?: string;
  keysCopied?: string[];
  message?: string;
  error?: string;
}

const copyColumnLayout = async (args: Record<string, unknown>): Promise<CopyColumnLayoutResult> => {
  const sourceName = args.sourceName as string | undefined;
  const targetName = args.targetName as string | undefined;
  const sourceUuid = args.sourceUuid as string | undefined;
  const targetUuid = args.targetUuid as string | undefined;

  if (!sourceName || typeof sourceName !== "string") {
    return { success: false, error: "sourceName parameter is required" };
  }
  if (!targetName || typeof targetName !== "string") {
    return { success: false, error: "targetName parameter is required" };
  }

  let resolvedSourceKey: string | null = null;

  if (readLayoutForName(sourceName)) {
    resolvedSourceKey = sourceName;
  } else if (sourceUuid && readLayoutForName(sourceUuid)) {
    resolvedSourceKey = sourceUuid;
  } else {
    const fuzzy = findMatchingNames(sourceName);
    if (fuzzy.length === 1 && readLayoutForName(fuzzy[0])) {
      resolvedSourceKey = fuzzy[0];
    } else if (fuzzy.length > 1) {
      return {
        success: false,
        sourceName,
        targetName,
        error: `Ambiguous source name "${sourceName}". Multiple matches: ${fuzzy.slice(0, 8).join(", ")}`,
      };
    }
  }

  if (!resolvedSourceKey) {
    const examples = getExistingNames(10);
    return {
      success: false,
      sourceName,
      targetName,
      error:
        `Source column layout for "${sourceName}" not found. ` +
        "This smart group may not have a custom layout saved yet. " +
        `Known layouts include: ${examples.slice(0, 8).join(", ")}`,
    };
  }

  const resolvedTargetKey = targetUuid ?? targetName;

  const copyResult = copyPlistKeys(PLIST_PATH, LAYOUT_SUFFIXES, resolvedSourceKey, resolvedTargetKey);

  if (!copyResult.ok) {
    return {
      success: false,
      sourceName,
      targetName,
      resolvedSourceKey,
      resolvedTargetKey,
      error: `Copy failed: ${copyResult.error}`,
    };
  }

  const verification = readLayoutForName(resolvedTargetKey);

  if (!verification) {
    return {
      success: false,
      sourceName,
      targetName,
      resolvedSourceKey,
      resolvedTargetKey,
      error: "Copy appeared to succeed but target keys not readable after write",
    };
  }

  return {
    success: true,
    sourceName,
    targetName,
    resolvedSourceKey,
    resolvedTargetKey,
    keysCopied: copyResult.keysCopied,
    message:
      `Copied column layout from "${sourceName}" to "${targetName}". ` +
      `Keys written: ${copyResult.keysCopied.join(", ")}. ` +
      `Columns: [${verification.columns?.join(", ") ?? "n/a"}]. ` +
      "Restart DEVONthink or close/reopen the smart group window for the change to take effect.",
  };
};

export const copyColumnLayoutTool: McpTool = {
  name: "copy_column_layout",
  description:
    "Copy the column layout (column order, visible columns, and column widths) from one " +
    "DEVONthink smart group or smart rule to another. " +
    "All three layout keys are copied atomically. Supports partial name matching. " +
    'Input: { "sourceName": "Archivieren - Jobs", "targetName": "Jobs - To Review" }',
  inputSchema: {
    type: "object" as const,
    properties: {
      sourceName: {
        type: "string",
        description: "Name of the source smart group or smart rule (must have a saved layout)",
      },
      targetName: {
        type: "string",
        description: "Name of the target smart group or smart rule to copy the layout to",
      },
      sourceUuid: {
        type: "string",
        description:
          "Optional UUID of the source smart group (fallback if name lookup fails). " +
          "DEVONthink sometimes stores layouts under the UUID.",
      },
      targetUuid: {
        type: "string",
        description:
          "Optional UUID of the target smart group. If supplied, the layout is written " +
          "under the UUID key (which DEVONthink prefers for smart groups).",
      },
    },
    required: ["sourceName", "targetName"],
  },
  run: copyColumnLayout,
};
