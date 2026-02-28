/**
 * delete-record.ts — Delete a record from DEVONthink.
 *
 * Resolves a record by uuid, recordId, or recordPath, then deletes it.
 * Returns confirmation with the uuid and name of the deleted record.
 *
 * WARNING: This operation is permanent and cannot be undone via the MCP API.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP, JXA_RESOLVE_DB, JXA_RESOLVE_RECORD } from "../../jxa/helpers.js";

export const deleteRecordTool = defineTool({
  name: "delete_record",
  description:
    "Delete a record from DEVONthink. " +
    "This operation is permanent — the record is moved to Trash or permanently deleted. " +
    "Provide uuid (preferred), recordId + databaseName, or recordPath + databaseName. " +
    "Returns the uuid and name of the deleted record for confirmation.",
  schema: z.object({
    uuid: z.string().optional().describe("UUID of the record to delete"),
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

      var deletedUuid = record.uuid();
      var deletedName = record.name();

      try { app.deleteRecord(record); }
      catch(e) { app.delete({record: record}); }

      JSON.stringify({ deleted: true, uuid: deletedUuid, name: deletedName });
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
