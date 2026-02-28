/**
 * lookup-record.ts — Look up DEVONthink records by a specific attribute.
 *
 * Supports looking up by filename, path, url, tags, comment, or contentHash.
 * Returns an array of matching record summaries, optionally limited.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import {
  JXA_APP,
  JXA_RESOLVE_DB,
  JXA_RECORD_SUMMARY,
} from "../../jxa/helpers.js";

const LOOKUP_TYPE_VALUES = [
  "filename",
  "path",
  "url",
  "tags",
  "comment",
  "contentHash",
] as const;

export const lookupRecordTool = defineTool({
  name: "lookup_record",
  description: "Look up records in DEVONthink by a specific attribute.",
  schema: z.object({
    lookupType: z
      .enum(LOOKUP_TYPE_VALUES)
      .describe("The attribute to look up by"),
    value: z
      .string()
      .describe("The value to match against the specified attribute"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Additional tags to match (only used when lookupType is 'tags')"),
    matchAnyTag: z
      .boolean()
      .optional()
      .describe(
        "When true, match records that have ANY of the specified tags; " +
          "when false (default), match records that have ALL tags"
      ),
    databaseName: z
      .string()
      .optional()
      .describe("Limit lookup to this database; uses all open databases if omitted"),
    limit: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Maximum number of results to return"),
  }),
  run: async (args, executor) => {
    const { lookupType, value, tags, matchAnyTag, databaseName, limit } = args;

    // Merge value into tags list when lookupType is 'tags'
    const tagList = lookupType === "tags" ? [value, ...(tags ?? [])] : (tags ?? []);

    const script = `
      ${JXA_APP}
      var lookupType = ${jxaLiteral(lookupType)};
      var value = ${jxaLiteral(value)};
      var tagList = ${jxaLiteral(tagList)};
      var matchAnyTag = ${jxaLiteral(matchAnyTag ?? false)};
      var dbName = ${jxaLiteral(databaseName ?? null)};
      var limit = ${jxaLiteral(limit ?? null)};

      ${JXA_RESOLVE_DB}

      var results = [];

      if (lookupType === "filename") {
        // Search by name across the scoped database or all databases
        var searchQuery = "name:" + value;
        var searchOpts = {};
        if (db) searchOpts["in"] = db.root();
        results = app.search(searchQuery, searchOpts);
        // Further filter to exact filename matches
        results = results.filter(function(r) {
          return r.name() === value;
        });

      } else if (lookupType === "path") {
        // Look up by filesystem path
        if (db) {
          var rec = app.getRecordAt(value, {in: db});
          if (rec && rec.uuid()) results = [rec];
        } else {
          // Try each open database
          var dbs = app.databases();
          for (var i = 0; i < dbs.length; i++) {
            try {
              var r = app.getRecordAt(value, {in: dbs[i]});
              if (r && r.uuid()) { results.push(r); break; }
            } catch(e) {}
          }
        }

      } else if (lookupType === "url") {
        // Search by URL
        var urlResults = app.lookupRecordsWithURL(value);
        if (urlResults) results = urlResults;

      } else if (lookupType === "tags") {
        // Look up by tags using DEVONthink's tag lookup
        if (matchAnyTag) {
          // Union: results that match any of the tags
          var seen = {};
          for (var t = 0; t < tagList.length; t++) {
            var tagResults = app.lookupRecordsWithTags([tagList[t]]);
            if (tagResults) {
              for (var j = 0; j < tagResults.length; j++) {
                var u = tagResults[j].uuid();
                if (!seen[u]) {
                  seen[u] = true;
                  results.push(tagResults[j]);
                }
              }
            }
          }
        } else {
          // Intersection: results that match all of the tags
          results = app.lookupRecordsWithTags(tagList) || [];
        }

      } else if (lookupType === "comment") {
        // Search by comment using DEVONthink search
        var commentQuery = "comment:" + value;
        var commentOpts = {};
        if (db) commentOpts["in"] = db.root();
        results = app.search(commentQuery, commentOpts);
        // Filter to actual comment matches
        results = results.filter(function(r) {
          var c = r.comment();
          return c && c.indexOf(value) !== -1;
        });

      } else if (lookupType === "contentHash") {
        // Look up by content hash (MD5/SHA)
        var hashResults = app.lookupRecordsWithContentHash(value);
        if (hashResults) results = hashResults;
      }

      // Filter by database if specified and not already scoped
      if (dbName && lookupType !== "filename" && lookupType !== "path" && lookupType !== "comment") {
        results = results.filter(function(r) {
          try { return r.database().name() === dbName; } catch(e) { return false; }
        });
      }

      // Apply limit
      if (limit && limit > 0 && results.length > limit) {
        results = results.slice(0, limit);
      }

      var summaries = results.map(function(record) {
        return ${JXA_RECORD_SUMMARY};
      });

      JSON.stringify(summaries);
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
