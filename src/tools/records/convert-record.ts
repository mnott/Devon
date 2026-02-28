/**
 * convert-record.ts — Convert a DEVONthink record to a different format.
 *
 * Creates a new record in the target format. The original record is unaffected.
 * If destinationGroupUuid is provided, the new record is placed in that group;
 * otherwise it is placed in the same group as the original.
 *
 * Uses app.convert({record: record, to: format}) — the converted record is a new object.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP, JXA_RESOLVE_DB, JXA_RESOLVE_RECORD, JXA_RECORD_PROPS } from "../../jxa/helpers.js";

const CONVERT_FORMATS = [
  "bookmark",
  "simple",
  "rich",
  "note",
  "markdown",
  "HTML",
  "webarchive",
  "PDF document",
  "single page PDF document",
  "PDF without annotations",
  "PDF with annotations burnt in",
] as const;

export const convertRecordTool = defineTool({
  name: "convert_record",
  description:
    "Convert a record to a different format, creating a new record. " +
    "The original record is not modified. " +
    "Supported formats: bookmark, simple, rich, note, markdown, HTML, webarchive, " +
    "'PDF document', 'single page PDF document', 'PDF without annotations', 'PDF with annotations burnt in'. " +
    "Optionally place the converted record in a specific destination group. " +
    "Returns the properties of the newly created converted record.",
  schema: z.object({
    uuid: z.string().optional().describe("UUID of the record to convert"),
    recordId: z.number().int().nonnegative().optional().describe("Numeric record ID (requires databaseName)"),
    recordPath: z.string().optional().describe("Record path within the database (requires databaseName)"),
    format: z.enum(CONVERT_FORMATS).describe(
      "Target format for conversion: bookmark, simple, rich, note, markdown, HTML, webarchive, " +
      "'PDF document', 'single page PDF document', 'PDF without annotations', or 'PDF with annotations burnt in'"
    ),
    destinationGroupUuid: z.string().optional().describe("UUID of the destination group for the converted record (optional)"),
    databaseName: z.string().optional().describe("Database name (required for recordId or recordPath lookups)"),
  }),
  run: async (args, executor) => {
    const { uuid, recordId, recordPath, format, destinationGroupUuid, databaseName } = args;

    const script = `
      ${JXA_APP}
      var uuid = ${jxaLiteral(uuid ?? null)};
      var recordId = ${jxaLiteral(recordId ?? null)};
      var recordPath = ${jxaLiteral(recordPath ?? null)};
      var recordName = null;
      var dbName = ${jxaLiteral(databaseName ?? null)};
      var targetFormat = ${jxaLiteral(format)};
      var destinationGroupUuid = ${jxaLiteral(destinationGroupUuid ?? null)};

      ${JXA_RESOLVE_DB}
      ${JXA_RESOLVE_RECORD}

      var convertOpts = {record: record, to: targetFormat};

      if (destinationGroupUuid) {
        var destGroup = app.getRecordWithUuid(destinationGroupUuid);
        if (!destGroup || !destGroup.uuid()) throw new Error("Destination group not found for UUID: " + destinationGroupUuid);
        convertOpts.in = destGroup;
      }

      var converted = app.convert(convertOpts);
      if (!converted || !converted.uuid()) throw new Error("Convert operation failed");

      var record = converted;
      JSON.stringify(${JXA_RECORD_PROPS});
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
