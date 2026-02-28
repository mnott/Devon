/**
 * classify.ts — Get DEVONthink's classification proposals for a record.
 *
 * Returns an array of suggested destination groups with their scores,
 * ordered by relevance. DEVONthink's classifier uses content analysis
 * and/or tag comparison depending on the comparison option.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP } from "../../jxa/helpers.js";

const COMPARISON_VALUES = ["data comparison", "tags comparison"] as const;

export const classifyTool = defineTool({
  name: "classify",
  description: "Get classification proposals for a DEVONthink record.",
  schema: z.object({
    recordUuid: z.string().describe("UUID of the record to classify"),
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
    tags: z
      .boolean()
      .optional()
      .describe("Include tag-based proposals in the results"),
  }),
  run: async (args, executor) => {
    const { recordUuid, databaseName, comparison, tags } = args;

    const script = `
      ${JXA_APP}
      var uuid = ${jxaLiteral(recordUuid)};
      var dbName = ${jxaLiteral(databaseName ?? null)};
      var comparison = ${jxaLiteral(comparison ?? null)};
      var includeTags = ${jxaLiteral(tags ?? false)};

      var record = app.getRecordWithUuid(uuid);
      if (!record || !record.uuid()) throw new Error("Record not found for UUID: " + uuid);

      // Build classify options
      var opts = {};
      if (comparison) opts["comparison"] = comparison;
      if (includeTags) opts["tags"] = true;

      var proposals;
      try {
        proposals = app.classify(record, opts);
      } catch(e) {
        // Fallback: try without options (older DEVONthink API)
        try {
          proposals = app.classify(record);
        } catch(e2) {
          proposals = [];
        }
      }

      if (!proposals || proposals.length === 0) {
        JSON.stringify([]);
      } else {
        var results = proposals.map(function(proposal) {
          try {
            return {
              uuid: proposal.uuid ? proposal.uuid() : null,
              name: proposal.name ? proposal.name() : null,
              location: proposal.location ? proposal.location() : null,
              database: proposal.database ? proposal.database().name() : null,
              score: proposal.score ? proposal.score() : null
            };
          } catch(e) {
            return { raw: String(proposal) };
          }
        });
        JSON.stringify(results);
      }
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
