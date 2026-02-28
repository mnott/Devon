/**
 * create-from-url.ts — Create a DEVONthink record from a web URL.
 *
 * Supports four capture formats: formatted_note, markdown, pdf, and web_document.
 * Optionally places the new record in a specified group and supports readability
 * mode, custom user-agent, referrer, and PDF pagination options.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP, JXA_RECORD_PROPS } from "../../jxa/helpers.js";

const FORMAT_VALUES = [
  "formatted_note",
  "markdown",
  "pdf",
  "web_document",
] as const;

export const createFromUrlTool = defineTool({
  name: "create_from_url",
  description: "Create a record in DEVONthink from a web URL.",
  schema: z.object({
    url: z.string().url().describe("The web URL to capture"),
    format: z
      .enum(FORMAT_VALUES)
      .describe(
        "Capture format: formatted_note, markdown, pdf, or web_document"
      ),
    name: z
      .string()
      .optional()
      .describe("Name for the new record (defaults to page title)"),
    parentGroupUuid: z
      .string()
      .optional()
      .describe("UUID of the parent group to place the new record in"),
    readability: z
      .boolean()
      .optional()
      .describe("Use readability mode to strip navigation and ads (where supported)"),
    userAgent: z
      .string()
      .optional()
      .describe("Custom HTTP User-Agent header for the request"),
    referrer: z
      .string()
      .optional()
      .describe("HTTP Referer header for the request"),
    pdfOptions: z
      .object({
        pagination: z
          .boolean()
          .optional()
          .describe("Enable pagination in the PDF"),
        width: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Page width in pixels for the PDF"),
      })
      .optional()
      .describe("PDF-specific options (only applies when format is 'pdf')"),
    databaseName: z
      .string()
      .optional()
      .describe(
        "Target database name; uses current database if omitted"
      ),
  }),
  run: async (args, executor) => {
    const {
      url,
      format,
      name,
      parentGroupUuid,
      readability,
      userAgent,
      referrer,
      pdfOptions,
      databaseName,
    } = args;

    const script = `
      ${JXA_APP}
      var url = ${jxaLiteral(url)};
      var format = ${jxaLiteral(format)};
      var name = ${jxaLiteral(name ?? null)};
      var parentGroupUuid = ${jxaLiteral(parentGroupUuid ?? null)};
      var readability = ${jxaLiteral(readability ?? false)};
      var userAgent = ${jxaLiteral(userAgent ?? null)};
      var referrer = ${jxaLiteral(referrer ?? null)};
      var pdfPagination = ${jxaLiteral(pdfOptions?.pagination ?? null)};
      var pdfWidth = ${jxaLiteral(pdfOptions?.width ?? null)};
      var dbName = ${jxaLiteral(databaseName ?? null)};

      // Resolve target database
      var targetDb;
      if (dbName) {
        var dbs = app.databases();
        targetDb = null;
        for (var i = 0; i < dbs.length; i++) {
          if (dbs[i].name() === dbName) { targetDb = dbs[i]; break; }
        }
        if (!targetDb) throw new Error("Database not found: " + dbName);
      } else {
        targetDb = app.currentDatabase();
      }

      // Resolve parent group
      var parentGroup = null;
      if (parentGroupUuid) {
        parentGroup = app.getRecordWithUuid(parentGroupUuid);
        if (!parentGroup || !parentGroup.uuid()) {
          throw new Error("Parent group not found for UUID: " + parentGroupUuid);
        }
      } else {
        parentGroup = targetDb.root();
      }

      // Build common options
      var opts = {in: parentGroup};
      if (name) opts["name"] = name;
      if (readability) opts["readability"] = true;
      if (userAgent) opts["agent"] = userAgent;
      if (referrer) opts["referrer"] = referrer;

      var record;

      if (format === "formatted_note") {
        record = app.createFormattedNoteFrom(url, opts);

      } else if (format === "markdown") {
        record = app.createMarkdownFrom(url, opts);

      } else if (format === "pdf") {
        if (pdfPagination !== null) opts["paginate"] = pdfPagination;
        if (pdfWidth !== null) opts["width"] = pdfWidth;
        record = app.createPDFDocumentFrom(url, opts);

      } else if (format === "web_document") {
        record = app.createWebDocumentFrom(url, opts);

      } else {
        throw new Error("Unknown format: " + format);
      }

      if (!record || !record.uuid()) throw new Error("Failed to create record from URL: " + url);

      JSON.stringify(${JXA_RECORD_PROPS});
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
