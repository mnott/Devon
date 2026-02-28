/**
 * get-record-by-id.ts — Get a DEVONthink record using its UUID or numeric ID.
 *
 * Supports two lookup modes:
 *   - UUID: app.getRecordWithUuid() — works across all open databases
 *   - Numeric ID: db.getRecordAt(id) — requires databaseName
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP, JXA_RESOLVE_DB, JXA_RECORD_PROPS } from "../../jxa/helpers.js";

export const getRecordByIdTool = defineTool({
  name: "get_record_by_identifier",
  description:
    "Get a DEVONthink record using its UUID or ID. " +
    "UUID lookup works across all open databases. " +
    "Numeric ID lookup requires databaseName to be specified.",
  schema: z.object({
    uuid: z.string().optional().describe("UUID of the record (preferred — works across all databases)"),
    id: z.number().int().nonnegative().optional().describe("Numeric record ID (requires databaseName)"),
    databaseName: z.string().optional().describe("Database name (required when using numeric id)"),
  }),
  run: async (args, executor) => {
    const { uuid, id, databaseName } = args;

    if (!uuid && id === undefined) {
      return { error: "Either uuid or id must be provided" };
    }

    const script = `
      ${JXA_APP}
      var uuid = ${jxaLiteral(uuid ?? null)};
      var recordId = ${jxaLiteral(id ?? null)};
      var dbName = ${jxaLiteral(databaseName ?? null)};

      ${JXA_RESOLVE_DB}

      var record;
      if (uuid) {
        record = app.getRecordWithUuid(uuid);
        if (!record || !record.uuid()) throw new Error("Record not found for UUID: " + uuid);
      } else {
        if (!db) throw new Error("databaseName is required when using numeric id");
        record = db.getRecordAt(recordId);
        if (!record || !record.uuid()) throw new Error("Record not found for ID: " + recordId);
      }

      JSON.stringify(${JXA_RECORD_PROPS});
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
