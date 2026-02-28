/**
 * update-record-content.ts — Update the text content of a DEVONthink record.
 *
 * Sets plainText() for text-based records or source() for HTML/Markdown records.
 * UUID is required. Returns confirmation with uuid and name.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP } from "../../jxa/helpers.js";

export const updateRecordContentTool = defineTool({
  name: "update_record_content",
  description:
    "Updates the content of an existing record in DEVONthink. " +
    "For text records, sets plain text. For HTML/Markdown records, sets the source. " +
    "UUID is required. Returns updated: true with uuid and name on success.",
  schema: z.object({
    uuid: z.string().describe("UUID of the record to update"),
    content: z.string().describe("New content to write to the record"),
  }),
  run: async (args, executor) => {
    const { uuid, content } = args;

    const script = `
      ${JXA_APP}
      var uuid = ${jxaLiteral(uuid)};
      var content = ${jxaLiteral(content)};

      var record = app.getRecordWithUuid(uuid);
      if (!record || !record.uuid()) throw new Error("Record not found for UUID: " + uuid);

      var recordType = record.type();
      if (recordType === "html" || recordType === "markdown" || recordType === "feed") {
        record.source = content;
      } else {
        record.plainText = content;
      }

      JSON.stringify({ updated: true, uuid: record.uuid(), name: record.name() });
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
