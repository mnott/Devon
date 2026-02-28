/**
 * get-record-properties.ts — Get detailed properties and metadata for a DEVONthink record.
 *
 * Resolves a record via uuid, recordId, or recordPath, then returns the full
 * set of standard record properties using the JXA_RECORD_PROPS helper.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP, JXA_RESOLVE_DB, JXA_RESOLVE_RECORD, JXA_RECORD_PROPS } from "../../jxa/helpers.js";

export const getRecordPropertiesTool = defineTool({
  name: "get_record_properties",
  description:
    "Get detailed properties and metadata for a DEVONthink record. " +
    "Returns uuid, name, type, path, location, database, size, dates, tags, " +
    "comment, url, kind, mimeType, flagged, locking, wordCount, and more. " +
    "Provide uuid (preferred), recordId + databaseName, or recordPath + databaseName.",
  schema: z.object({
    uuid: z.string().optional().describe("UUID of the record"),
    recordId: z.number().int().nonnegative().optional().describe("Numeric record ID (requires databaseName)"),
    recordPath: z.string().optional().describe("Record path within the database (requires databaseName)"),
    databaseName: z.string().optional().describe("Database name (required for recordId or recordPath lookups)"),
  }),
  run: async (args, executor) => {
    const { uuid, recordId, recordPath, databaseName } = args;

    const script = `
      ${JXA_APP}
      var uuid = ${jxaLiteral(uuid ?? null)};
      var recordId = ${jxaLiteral(recordId ?? null)};
      var recordPath = ${jxaLiteral(recordPath ?? null)};
      var recordName = null;
      var dbName = ${jxaLiteral(databaseName ?? null)};

      ${JXA_RESOLVE_DB}
      ${JXA_RESOLVE_RECORD}

      JSON.stringify(${JXA_RECORD_PROPS});
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
