/**
 * replicate-record.ts — Replicate a DEVONthink record within the same database.
 *
 * Creates a replicant: a record that shares the same underlying data as the original.
 * Changes to any replicant affect all replicants. Requires destination group UUID.
 * Uses app.replicate({record: record, to: destGroup}).
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP, JXA_RESOLVE_DB, JXA_RESOLVE_RECORD, JXA_RECORD_PROPS } from "../../jxa/helpers.js";

export const replicateRecordTool = defineTool({
  name: "replicate_record",
  description:
    "Replicate a record within the same database to a destination group. " +
    "Replicants share the same underlying data — editing one affects all replicants. " +
    "Destination group UUID is required. " +
    "Resolve the source record by uuid (preferred), recordId + databaseName, or recordPath + databaseName. " +
    "Returns the properties of the new replicant.",
  schema: z.object({
    uuid: z.string().optional().describe("UUID of the record to replicate"),
    recordId: z.number().int().nonnegative().optional().describe("Numeric record ID (requires databaseName)"),
    recordPath: z.string().optional().describe("Record path within the database (requires databaseName)"),
    destinationGroupUuid: z.string().describe("UUID of the destination group for the replicant"),
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

      var replicant = app.replicate({record: record, to: destGroup});
      if (!replicant || !replicant.uuid()) throw new Error("Replicate operation failed");

      var record = replicant;
      JSON.stringify(${JXA_RECORD_PROPS});
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
