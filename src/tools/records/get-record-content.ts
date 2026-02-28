/**
 * get-record-content.ts — Get the text content of a DEVONthink record.
 *
 * Retrieves plain text (via plainText()) for text-based records, or falls back
 * to source() for HTML/Markdown records. Binary records (PDF, images) return null.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP } from "../../jxa/helpers.js";

export const getRecordContentTool = defineTool({
  name: "get_record_content",
  description:
    "Gets the content of a specific record in DEVONthink. " +
    "Returns plain text for text-based records, or HTML source for web/HTML records. " +
    "Binary records (PDF, images) return null for content. " +
    "UUID is required; databaseName is optional.",
  schema: z.object({
    uuid: z.string().describe("UUID of the record whose content to retrieve"),
    databaseName: z.string().optional().describe("Database name (optional, for disambiguation)"),
  }),
  run: async (args, executor) => {
    const { uuid, databaseName } = args;

    const script = `
      ${JXA_APP}
      var uuid = ${jxaLiteral(uuid)};
      var dbName = ${jxaLiteral(databaseName ?? null)};

      var record = app.getRecordWithUuid(uuid);
      if (!record || !record.uuid()) throw new Error("Record not found for UUID: " + uuid);

      var content = null;
      try { content = record.plainText(); } catch(e) {}
      if (!content) {
        try { content = record.source(); } catch(e) {}
      }

      JSON.stringify({
        uuid: record.uuid(),
        name: record.name(),
        type: record.type(),
        content: content || null
      });
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
