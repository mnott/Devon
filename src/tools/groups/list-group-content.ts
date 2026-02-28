/**
 * list-group-content.ts — List the direct children of a DEVONthink group.
 *
 * If a UUID is supplied, that group is fetched directly. Otherwise the root
 * of the current (or named) database is used. Returns an array of record
 * summaries using the lightweight JXA_RECORD_SUMMARY property set.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import {
  JXA_APP,
  JXA_RESOLVE_DB,
  JXA_RECORD_SUMMARY,
} from "../../jxa/helpers.js";

export const listGroupContentTool = defineTool({
  name: "list_group_content",
  description:
    "Lists the content of a specific group in DEVONthink. " +
    "Supply a group UUID to list any group directly, or omit uuid to list " +
    "the root of the current (or named) database.",
  schema: z.object({
    uuid: z
      .string()
      .optional()
      .describe(
        "UUID of the group to list. If omitted, the database root is listed"
      ),
    databaseName: z
      .string()
      .optional()
      .describe(
        "Name of the database to use when resolving the root group. " +
        "If omitted, the current database is used. Ignored when uuid is provided"
      ),
  }),
  run: async (args, executor) => {
    const { uuid, databaseName } = args;

    const script = `
      ${JXA_APP}
      var uuid = ${jxaLiteral(uuid ?? null)};
      var dbName = ${jxaLiteral(databaseName ?? null)};

      var group;
      if (uuid) {
        // Fetch the group directly by UUID
        group = app.getRecordWithUuid(uuid);
        if (!group || !group.uuid()) {
          throw new Error("Group not found for UUID: " + uuid);
        }
      } else {
        // Fall back to the database root
        ${JXA_RESOLVE_DB}
        group = db.root();
        if (!group || !group.uuid()) {
          throw new Error("Could not retrieve database root");
        }
      }

      // List the direct children
      var children = group.children();
      var result = [];
      for (var i = 0; i < children.length; i++) {
        var record = children[i];
        result.push(${JXA_RECORD_SUMMARY});
      }

      JSON.stringify(result);
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout) as Array<{
      uuid: string;
      name: string;
      type: string;
      location: string;
      database: string;
      tags: string[];
      score: number;
      flagged: boolean;
      label: number;
      modificationDate: string | null;
    }>;
  },
});
