/**
 * is-running.ts — Check whether the DEVONthink application is currently running.
 *
 * Uses System Events to query the process list, which avoids launching DEVONthink
 * as a side-effect. Checks for both "DEVONthink 3" (v3.x) and "DEVONthink" (v4.x).
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";

export const isRunningTool = defineTool({
  name: "is_running",
  description: "Check if the DEVONthink application is currently running.",
  schema: z.object({}),
  run: async (_args, executor) => {
    const script = `
var se = Application("System Events");
var v3 = se.processes.whose({ name: "DEVONthink 3" }).length > 0;
var v4 = se.processes.whose({ name: "DEVONthink" }).length > 0;
JSON.stringify({ running: v3 || v4 });
`.trim();

    const { stdout } = executor.run(script);
    return JSON.parse(stdout) as { running: boolean };
  },
});
