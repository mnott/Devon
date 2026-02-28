/**
 * search.ts — Search DEVONthink records by query string with optional scope.
 *
 * Supports scoping to a specific group (by UUID, id, or path+database),
 * filtering by record type, specifying comparison mode, and limiting results.
 * Wildcards (* and ?) in the query are preserved as valid search operators.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import {
  JXA_APP,
  JXA_RESOLVE_DB,
  JXA_RECORD_SUMMARY,
} from "../../jxa/helpers.js";

const RECORD_TYPE_VALUES = [
  "group",
  "markdown",
  "PDF",
  "bookmark",
  "formatted note",
  "txt",
  "rtf",
  "rtfd",
  "webarchive",
  "quicktime",
  "picture",
  "smart group",
] as const;

const COMPARISON_VALUES = [
  "no case",
  "no umlauts",
  "fuzzy",
  "related",
] as const;

export const searchTool = defineTool({
  name: "search",
  description:
    'Search DEVONthink records. Examples: {"query": "invoice"} or ' +
    '{"query": "project review", "groupPath": "/Meetings", "databaseName": "MyDB"}. ' +
    "Note: groupPath requires databaseName and must be database-relative " +
    '(e.g., "/Meetings" not "/MyDB/Meetings").',
  schema: z.object({
    query: z.string().describe("Search query (wildcards * and ? are supported)"),
    groupUuid: z
      .string()
      .optional()
      .describe("UUID of the group to search within"),
    groupId: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Numeric ID of the group to search within (requires databaseName)"),
    groupPath: z
      .string()
      .optional()
      .describe(
        "Database-relative path of the group to search within (requires databaseName)"
      ),
    databaseName: z
      .string()
      .optional()
      .describe("Database name (required for groupId or groupPath scoping)"),
    useCurrentGroup: z
      .boolean()
      .optional()
      .describe("Scope search to the currently selected group in DEVONthink"),
    recordType: z
      .enum(RECORD_TYPE_VALUES)
      .optional()
      .describe("Filter results to a specific record type"),
    comparison: z
      .enum(COMPARISON_VALUES)
      .optional()
      .describe("Comparison mode for the search"),
    excludeSubgroups: z
      .boolean()
      .optional()
      .describe("Exclude records from subgroups when scoping to a group"),
    limit: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Maximum number of results to return"),
  }),
  run: async (args, executor) => {
    const {
      query,
      groupUuid,
      groupId,
      groupPath,
      databaseName,
      useCurrentGroup,
      recordType,
      comparison,
      excludeSubgroups,
      limit,
    } = args;

    const script = `
      ${JXA_APP}
      var query = ${jxaLiteral(query)};
      var groupUuid = ${jxaLiteral(groupUuid ?? null)};
      var groupId = ${jxaLiteral(groupId ?? null)};
      var groupPath = ${jxaLiteral(groupPath ?? null)};
      var dbName = ${jxaLiteral(databaseName ?? null)};
      var useCurrentGroup = ${jxaLiteral(useCurrentGroup ?? false)};
      var recordType = ${jxaLiteral(recordType ?? null)};
      var comparison = ${jxaLiteral(comparison ?? null)};
      var excludeSubgroups = ${jxaLiteral(excludeSubgroups ?? false)};
      var limit = ${jxaLiteral(limit ?? null)};

      ${JXA_RESOLVE_DB}

      // Resolve the search scope group if specified
      var searchIn = null;
      if (groupUuid) {
        searchIn = app.getRecordWithUuid(groupUuid);
        if (!searchIn || !searchIn.uuid()) throw new Error("Group not found for UUID: " + groupUuid);
      } else if (typeof groupId === "number" && groupId >= 0) {
        if (!db) throw new Error("databaseName is required when using groupId");
        searchIn = db.getRecordAt(groupId);
        if (!searchIn || !searchIn.uuid()) throw new Error("Group not found for ID: " + groupId);
      } else if (groupPath) {
        if (!db) throw new Error("databaseName is required when using groupPath");
        searchIn = app.getRecordAt(groupPath, {in: db});
        if (!searchIn || !searchIn.uuid()) throw new Error("Group not found at path: " + groupPath);
      } else if (useCurrentGroup) {
        searchIn = app.currentGroup();
      }

      // Build search options
      var searchOpts = {};
      if (searchIn) searchOpts["in"] = searchIn;
      else if (db) searchOpts["in"] = db.root();
      if (comparison) searchOpts["comparison"] = comparison;
      if (excludeSubgroups) searchOpts["excludeSubgroups"] = true;

      // Execute search
      var results = app.search(query, searchOpts);

      // Filter by record type if specified
      if (recordType) {
        results = results.filter(function(r) { return r.type() === recordType; });
      }

      // Apply limit
      if (limit && limit > 0 && results.length > limit) {
        results = results.slice(0, limit);
      }

      // Map to summaries
      var summaries = results.map(function(record) {
        return ${JXA_RECORD_SUMMARY};
      });

      JSON.stringify(summaries);
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
