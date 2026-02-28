/**
 * create-record.ts — Create a new record in DEVONthink.
 *
 * Creates a record in the specified database and parent group.
 * If parentGroupUuid is provided, the record is created inside that group.
 * If no parentGroupUuid, the record is created in the root of the database.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP, JXA_RESOLVE_DB, JXA_RECORD_PROPS } from "../../jxa/helpers.js";

export const createRecordTool = defineTool({
  name: "create_record",
  description:
    "Create a new record in DEVONthink. " +
    "Specify name and type (e.g. 'markdown', 'txt', 'rtf', 'html', 'bookmark', 'group'). " +
    "Optionally provide content, url, a parent group UUID, and database name. " +
    "Returns the full properties of the newly created record.",
  schema: z.object({
    name: z.string().describe("Name for the new record"),
    type: z.string().describe("Record type: 'markdown', 'txt', 'rtf', 'html', 'bookmark', 'group', etc."),
    content: z.string().optional().describe("Initial text content for the record"),
    url: z.string().optional().describe("URL for bookmark records or to associate with the record"),
    parentGroupUuid: z.string().optional().describe("UUID of the parent group (defaults to database root)"),
    databaseName: z.string().optional().describe("Target database name (defaults to current database)"),
  }),
  run: async (args, executor) => {
    const { name, type, content, url, parentGroupUuid, databaseName } = args;

    const script = `
      ${JXA_APP}
      var dbName = ${jxaLiteral(databaseName ?? null)};
      var parentGroupUuid = ${jxaLiteral(parentGroupUuid ?? null)};

      ${JXA_RESOLVE_DB}

      var props = {
        name: ${jxaLiteral(name)},
        type: ${jxaLiteral(type)}
      };

      var contentVal = ${jxaLiteral(content ?? null)};
      if (contentVal !== null) props.content = contentVal;

      var urlVal = ${jxaLiteral(url ?? null)};
      if (urlVal !== null) props.URL = urlVal;

      var location;
      if (parentGroupUuid) {
        var parentGroup = app.getRecordWithUuid(parentGroupUuid);
        if (!parentGroup || !parentGroup.uuid()) throw new Error("Parent group not found for UUID: " + parentGroupUuid);
        location = {in: parentGroup};
      } else {
        location = {in: db};
      }

      var record = app.createRecordWith(props, location);
      if (!record || !record.uuid()) throw new Error("Failed to create record");

      JSON.stringify(${JXA_RECORD_PROPS});
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
