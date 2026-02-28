/**
 * create-summary-document.ts — Create an AI-generated summary document in DEVONthink.
 *
 * Resolves source documents by UUID, invokes DEVONthink's AI summarization,
 * and stores the result as a new record. The destination group and title are
 * optional; sensible defaults are applied when they are omitted.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP, JXA_RECORD_PROPS } from "../../jxa/helpers.js";

const SUMMARY_TYPE_VALUES = ["markdown", "rich", "sheet", "simple"] as const;

const SUMMARY_STYLE_VALUES = [
  "text summary",
  "key points summary",
  "list summary",
  "table summary",
  "custom summary",
] as const;

export const createSummaryDocumentTool = defineTool({
  name: "create_summary_document",
  description:
    "Create an AI-generated summary document from multiple DEVONthink documents.",
  schema: z.object({
    documentUuids: z
      .array(z.string())
      .min(1)
      .describe("UUIDs of the source DEVONthink records to summarize"),
    summaryType: z
      .enum(SUMMARY_TYPE_VALUES)
      .default("markdown")
      .optional()
      .describe(
        "Output format for the summary document. " +
        "One of: markdown, rich, sheet, simple. Defaults to markdown"
      ),
    summaryStyle: z
      .enum(SUMMARY_STYLE_VALUES)
      .optional()
      .describe(
        "Style of summary to generate. " +
        "One of: text summary, key points summary, list summary, table summary, custom summary"
      ),
    parentGroupUuid: z
      .string()
      .optional()
      .describe(
        "UUID of the group where the summary document should be created. " +
        "If omitted, the summary is placed in the same group as the first source record"
      ),
    customTitle: z
      .string()
      .optional()
      .describe(
        "Title for the new summary record. Defaults to 'Summary - <ISO date>' if omitted"
      ),
  }),
  run: async (args, executor) => {
    const { documentUuids, summaryType, summaryStyle, parentGroupUuid, customTitle } = args;

    const script = `
      ${JXA_APP}
      var uuids = ${jxaLiteral(documentUuids)};
      var summaryType = ${jxaLiteral(summaryType ?? "markdown")};
      var summaryStyle = ${jxaLiteral(summaryStyle ?? null)};
      var parentGroupUuid = ${jxaLiteral(parentGroupUuid ?? null)};
      var customTitle = ${jxaLiteral(customTitle ?? null)};

      // Resolve source records
      var records = [];
      for (var i = 0; i < uuids.length; i++) {
        var rec = app.getRecordWithUuid(uuids[i]);
        if (!rec || !rec.uuid()) {
          throw new Error("Record not found for UUID: " + uuids[i]);
        }
        records.push(rec);
      }

      // Resolve destination group
      var parentGroup = null;
      if (parentGroupUuid) {
        parentGroup = app.getRecordWithUuid(parentGroupUuid);
        if (!parentGroup || !parentGroup.uuid()) {
          throw new Error("Parent group not found for UUID: " + parentGroupUuid);
        }
      } else {
        // Default: same group as the first source record
        parentGroup = records[0].parent();
      }

      // Build summarization options
      var summarizeOpts = {
        records: records,
        to: summaryType,
        in: parentGroup
      };
      if (summaryStyle) summarizeOpts["as"] = summaryStyle;

      // Call DEVONthink's AI summarization
      var summaryRecord = app.summarizeContentsOf(summarizeOpts);
      if (!summaryRecord || !summaryRecord.uuid()) {
        throw new Error("DEVONthink did not return a summary record");
      }

      var record = summaryRecord;
      JSON.stringify(${JXA_RECORD_PROPS});
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
