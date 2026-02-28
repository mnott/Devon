/**
 * get-current-database.ts — Get information about the currently selected database.
 *
 * Returns name, uuid, path, and record count for whichever database is currently
 * active in the DEVONthink UI.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { JXA_APP } from "../../jxa/helpers.js";

export const currentDatabaseTool = defineTool({
  name: "current_database",
  description:
    "Get information about the currently selected database in DEVONthink.",
  schema: z.object({}),
  run: async (_args, executor) => {
    const script = `
${JXA_APP}
var db = app.currentDatabase();
if (!db || !db.uuid()) throw new Error("No current database found");
JSON.stringify({
  uuid: db.uuid(),
  name: db.name(),
  path: db.path()
});
`.trim();

    const { stdout } = executor.run(script);
    return JSON.parse(stdout) as {
      uuid: string;
      name: string;
      path: string;
    };
  },
});
