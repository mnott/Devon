/**
 * duplicate-record.ts — Duplicate a DEVONthink record to any destination group.
 *
 * Creates an independent copy (unlike replicants, duplicates are separate records).
 * The duplicate can be in a different database from the original.
 * Uses app.duplicate({record: record, to: destGroup}).
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP, JXA_RESOLVE_DB, JXA_RESOLVE_RECORD, JXA_RECORD_PROPS } from "../../jxa/helpers.js";

export const duplicateRecordTool = defineTool({
  name: "duplicate_record",
  description:
    "Duplicate a record to any destination group, creating an independent copy. " +
    "Unlike replicants, duplicates are completely separate records — editing one does not affect the other. " +
    "The duplicate can be placed in a different database from the original. " +
    "Destination group UUID is required. " +
    "Returns the properties of the newly created duplicate.",
  schema: z.object({
    uuid: z.string().optional().describe("UUID of the record to duplicate"),
    recordId: z.number().int().nonnegative().optional().describe("Numeric record ID (requires databaseName)"),
    recordPath: z.string().optional().describe("Record path within the database (requires databaseName)"),
    destinationGroupUuid: z.string().describe("UUID of the destination group for the duplicate"),
    databaseName: z.string().optional().describe("Database name (required for recordId or recordPath lookups)"),
  }),
  run: async (args, executor) => {
    const { uuid, recordId, recordPath, destinationGroupUuid, databaseName } = args;

    const script = `
      ${JXA_APP}
      var uuid = ${jxaLiteral(uuid ?? null)};
      var recordId = ${jxaLiteral(recordId ?? null)};
      var recordPath = ${jxaLiteral(recordPath ?? null)};
      var recordName = null;
      var dbName = ${jxaLiteral(databaseName ?? null)};
      var destinationGroupUuid = ${jxaLiteral(destinationGroupUuid)};

      ${JXA_RESOLVE_DB}
      ${JXA_RESOLVE_RECORD}

      var destGroup = app.getRecordWithUuid(destinationGroupUuid);
      if (!destGroup || !destGroup.uuid()) throw new Error("Destination group not found for UUID: " + destinationGroupUuid);

      var duplicate = app.duplicate({record: record, to: destGroup});
      if (!duplicate || !duplicate.uuid()) throw new Error("Duplicate operation failed");

      var record = duplicate;
      JSON.stringify(${JXA_RECORD_PROPS});
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
