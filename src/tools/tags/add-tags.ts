/**
 * add-tags.ts — Add tags to a DEVONthink record.
 *
 * Retrieves the current tags on a record, merges the new tags (deduplicating),
 * sets the updated tag list, and returns the record's updated tag state.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP } from "../../jxa/helpers.js";

export const addTagsTool = defineTool({
  name: "add_tags",
  description: "Adds tags to a DEVONthink record.",
  schema: z.object({
    uuid: z.string().describe("UUID of the record to tag"),
    tags: z.array(z.string()).min(1).describe("Tags to add to the record"),
  }),
  run: async (args, executor) => {
    const { uuid, tags } = args;

    const script = `
      ${JXA_APP}
      var uuid = ${jxaLiteral(uuid)};
      var newTags = ${jxaLiteral(tags)};

      var record = app.getRecordWithUuid(uuid);
      if (!record || !record.uuid()) throw new Error("Record not found for UUID: " + uuid);

      // Get current tags, merge new ones (deduplicating)
      var currentTags = record.tags() || [];
      var tagSet = {};
      for (var i = 0; i < currentTags.length; i++) tagSet[currentTags[i]] = true;
      for (var j = 0; j < newTags.length; j++) tagSet[newTags[j]] = true;
      var merged = Object.keys(tagSet);

      record.tags = merged;

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
