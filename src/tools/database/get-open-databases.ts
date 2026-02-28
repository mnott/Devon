/**
 * get-open-databases.ts — List all currently open databases in DEVONthink.
 *
 * Returns uuid, name, path, and record count for each open database.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { JXA_APP } from "../../jxa/helpers.js";

export const getOpenDatabasesTool = defineTool({
  name: "get_open_databases",
  description: "Get a list of all currently open databases in DEVONthink.",
  schema: z.object({}),
  run: async (_args, executor) => {
    const script = `
${JXA_APP}
var dbs = app.databases();
var result = [];
for (var i = 0; i < dbs.length; i++) {
  var db = dbs[i];
  result.push({
    uuid: db.uuid(),
    name: db.name(),
    path: db.path()
  });
}
JSON.stringify(result);
`.trim();

    const { stdout } = executor.run(script);
    return JSON.parse(stdout) as Array<{
      uuid: string;
      name: string;
      path: string;
    }>;
  },
});
