/**
 * remove-tags.ts — Remove tags from a DEVONthink record.
 *
 * Retrieves the current tags on a record, filters out the specified tags,
 * sets the updated tag list, and returns the record's updated tag state.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP } from "../../jxa/helpers.js";

export const removeTagsTool = defineTool({
  name: "remove_tags",
  description: "Removes tags from a specific record in DEVONthink.",
  schema: z.object({
    uuid: z.string().describe("UUID of the record to remove tags from"),
    tags: z.array(z.string()).min(1).describe("Tags to remove from the record"),
    databaseName: z
      .string()
      .optional()
      .describe("Database name (optional, for disambiguation)"),
  }),
  run: async (args, executor) => {
    const { uuid, tags, databaseName } = args;

    const script = `
      ${JXA_APP}
      var uuid = ${jxaLiteral(uuid)};
      var tagsToRemove = ${jxaLiteral(tags)};
      var dbName = ${jxaLiteral(databaseName ?? null)};

      var record = app.getRecordWithUuid(uuid);
      if (!record || !record.uuid()) throw new Error("Record not found for UUID: " + uuid);

      // Build a set of tags to remove for O(1) lookup
      var removeSet = {};
      for (var i = 0; i < tagsToRemove.length; i++) removeSet[tagsToRemove[i]] = true;

      // Filter current tags
      var currentTags = record.tags() || [];
      var updated = currentTags.filter(function(t) { return !removeSet[t]; });

      record.tags = updated;

      JSON.stringify({
        uuid: record.uuid(),
        name: record.name(),
        tags: record.tags()
      });
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
