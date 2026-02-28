/**
 * get-selected-records.ts — Get information about currently selected records.
 *
 * Returns summary properties for each record currently selected in the
 * DEVONthink UI. Uses JXA_RECORD_SUMMARY for a lightweight property set
 * suitable for lists.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { JXA_APP, JXA_RECORD_SUMMARY } from "../../jxa/helpers.js";

export const selectedRecordsTool = defineTool({
  name: "selected_records",
  description:
    "Get information about currently selected records in DEVONthink.",
  schema: z.object({}),
  run: async (_args, executor) => {
    const script = `
${JXA_APP}
var records = app.selectedRecords();
var result = [];
for (var i = 0; i < records.length; i++) {
  var record = records[i];
  result.push(${JXA_RECORD_SUMMARY});
}
JSON.stringify(result);
`.trim();

    const { stdout } = executor.run(script);
    return JSON.parse(stdout) as Array<{
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
