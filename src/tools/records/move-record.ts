/**
 * move-record.ts — Move a DEVONthink record to a different group.
 *
 * Resolves the source record via uuid, recordId, recordName, or recordPath.
 * Resolves the destination group via destinationGroupUuid.
 * Uses app.move({record: record, to: destGroup}) to perform the move.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP, JXA_RESOLVE_DB, JXA_RESOLVE_RECORD, JXA_RECORD_PROPS } from "../../jxa/helpers.js";

export const moveRecordTool = defineTool({
  name: "move_record",
  description:
    "Move a record to a different group in DEVONthink. " +
    "Resolve the source record by uuid (preferred), recordId + databaseName, " +
    "recordName + databaseName, or recordPath + databaseName. " +
    "Provide destinationGroupUuid to specify where to move the record. " +
    "Returns the updated record properties after the move.",
  schema: z.object({
    uuid: z.string().optional().describe("UUID of the record to move"),
    recordId: z.number().int().nonnegative().optional().describe("Numeric record ID (requires databaseName)"),
    recordName: z.string().optional().describe("Record name (requires databaseName, use uuid when possible)"),
    recordPath: z.string().optional().describe("Record path within the database (requires databaseName)"),
    destinationGroupUuid: z.string().optional().describe("UUID of the destination group"),
    databaseName: z.string().optional().describe("Database name (required for recordId, recordName, recordPath)"),
  }),
  run: async (args, executor) => {
    const { uuid, recordId, recordName, recordPath, destinationGroupUuid, databaseName } = args;

    const script = `
      ${JXA_APP}
      var uuid = ${jxaLiteral(uuid ?? null)};
      var recordId = ${jxaLiteral(recordId ?? null)};
      var recordName = ${jxaLiteral(recordName ?? null)};
      var recordPath = ${jxaLiteral(recordPath ?? null)};
      var dbName = ${jxaLiteral(databaseName ?? null)};
      var destinationGroupUuid = ${jxaLiteral(destinationGroupUuid ?? null)};

      ${JXA_RESOLVE_DB}
      ${JXA_RESOLVE_RECORD}

      var destGroup = null;
      if (destinationGroupUuid) {
        destGroup = app.getRecordWithUuid(destinationGroupUuid);
        if (!destGroup || !destGroup.uuid()) throw new Error("Destination group not found for UUID: " + destinationGroupUuid);
      } else {
        destGroup = db.root();
      }

      app.move({record: record, to: destGroup});
      var moved = app.getRecordWithUuid(record.uuid());
      if (!moved || !moved.uuid()) throw new Error("Move operation failed");

      var record = moved;
      JSON.stringify(${JXA_RECORD_PROPS});
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
