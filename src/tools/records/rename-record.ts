/**
 * rename-record.ts — Rename a DEVONthink record.
 *
 * Finds a record by UUID and sets its name to newName.
 * Returns the old name, new name, and uuid for confirmation.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP } from "../../jxa/helpers.js";

export const renameRecordTool = defineTool({
  name: "rename_record",
  description:
    "Renames a specific record in DEVONthink. " +
    "UUID is required. Provide the new name as newName. " +
    "Returns renamed: true with uuid, oldName, and newName for confirmation.",
  schema: z.object({
    uuid: z.string().describe("UUID of the record to rename"),
    newName: z.string().describe("New name for the record"),
    databaseName: z.string().optional().describe("Database name (optional, for disambiguation)"),
  }),
  run: async (args, executor) => {
    const { uuid, newName } = args;

    const script = `
      ${JXA_APP}
      var uuid = ${jxaLiteral(uuid)};
      var newName = ${jxaLiteral(newName)};

      var record = app.getRecordWithUuid(uuid);
      if (!record || !record.uuid()) throw new Error("Record not found for UUID: " + uuid);

      var oldName = record.name();
      record.name = newName;

      JSON.stringify({ renamed: true, uuid: record.uuid(), oldName: oldName, newName: record.name() });
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
