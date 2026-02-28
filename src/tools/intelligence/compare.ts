/**
 * compare.ts — Compare DEVONthink records for content similarity.
 *
 * When compareWithUuid is provided, performs a pairwise comparison between
 * two specific records. Otherwise returns similar records for the source record
 * (similar to "See Also" in DEVONthink). Results are ordered by similarity score.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP } from "../../jxa/helpers.js";

const COMPARISON_VALUES = ["data comparison", "tags comparison"] as const;

export const compareTool = defineTool({
  name: "compare",
  description: "Compare DEVONthink records for similarities.",
  schema: z.object({
    recordUuid: z
      .string()
      .describe("UUID of the source record to compare"),
    compareWithUuid: z
      .string()
      .optional()
      .describe(
        "UUID of a second record to compare against; if omitted, returns similar records"
      ),
    databaseName: z
      .string()
      .optional()
      .describe("Database name (optional, for disambiguation)"),
    comparison: z
      .enum(COMPARISON_VALUES)
      .optional()
      .describe(
        "Comparison mode: 'data comparison' (content-based) or 'tags comparison'"
      ),
  }),
  run: async (args, executor) => {
    const { recordUuid, compareWithUuid, databaseName, comparison } = args;

    const script = `
      ${JXA_APP}
      var uuid = ${jxaLiteral(recordUuid)};
      var compareWithUuid = ${jxaLiteral(compareWithUuid ?? null)};
      var dbName = ${jxaLiteral(databaseName ?? null)};
      var comparison = ${jxaLiteral(comparison ?? null)};

      var record = app.getRecordWithUuid(uuid);
      if (!record || !record.uuid()) throw new Error("Record not found for UUID: " + uuid);

      var opts = {};
      if (comparison) opts["comparison"] = comparison;

      if (compareWithUuid) {
        // Pairwise comparison between two specific records
        var recordB = app.getRecordWithUuid(compareWithUuid);
        if (!recordB || !recordB.uuid()) throw new Error("Comparison record not found for UUID: " + compareWithUuid);

        var score = null;
        try {
          // Try compareContent which returns a score
          score = app.compareContent(record, recordB, opts);
        } catch(e) {
          try {
            score = app.compare(record, {to: recordB, comparison: comparison || "data comparison"});
          } catch(e2) {
            score = null;
          }
        }

        JSON.stringify({
          recordA: {
            uuid: record.uuid(),
            name: record.name(),
            database: record.database().name()
          },
          recordB: {
            uuid: recordB.uuid(),
            name: recordB.name(),
            database: recordB.database().name()
          },
          score: score,
          comparison: comparison || "data comparison"
        });

      } else {
        // Get similar records (See Also)
        var similar = null;
        try {
          similar = app.compare(record, opts);
        } catch(e) {
          try {
            similar = app.seeAlso(record);
          } catch(e2) {
            similar = [];
          }
        }

        if (!similar || similar.length === 0) {
          JSON.stringify([]);
        } else {
          var results = similar.map(function(r) {
            try {
              return {
                uuid: r.uuid ? r.uuid() : null,
                name: r.name ? r.name() : null,
                type: r.type ? r.type() : null,
                location: r.location ? r.location() : null,
                database: r.database ? r.database().name() : null,
                score: r.score ? r.score() : null,
                modificationDate: r.modificationDate && r.modificationDate()
                  ? r.modificationDate().toISOString()
                  : null
              };
            } catch(e) {
              return { raw: String(r) };
            }
          });
          JSON.stringify(results);
        }
      }
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
