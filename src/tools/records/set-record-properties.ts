/**
 * set-record-properties.ts — Set properties on a DEVONthink record.
 *
 * Supports setting: comment, flagged, locking, and the six exclude* flags
 * (excludeFromClassification, excludeFromSearch, excludeFromSeeAlso,
 *  excludeFromTagging, excludeFromWikiLinking, excludeFromChat).
 *
 * Resolves the record via uuid, recordId, or recordPath before setting props.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP, JXA_RESOLVE_DB, JXA_RESOLVE_RECORD, JXA_RECORD_PROPS } from "../../jxa/helpers.js";

export const setRecordPropertiesTool = defineTool({
  name: "set_record_properties",
  description:
    "Set properties on a DEVONthink record. " +
    "Settable properties: comment, flag (flagged), locked (locking), " +
    "excludeFromChat, excludeFromClassification, excludeFromSearch, " +
    "excludeFromSeeAlso, excludeFromTagging, excludeFromWikiLinking. " +
    "Resolve record by uuid (preferred), recordId + databaseName, or recordPath + databaseName. " +
    "Only provided properties are updated; others remain unchanged.",
  schema: z.object({
    uuid: z.string().optional().describe("UUID of the record"),
    recordId: z.number().int().nonnegative().optional().describe("Numeric record ID (requires databaseName)"),
    recordPath: z.string().optional().describe("Record path within the database (requires databaseName)"),
    databaseName: z.string().optional().describe("Database name"),
    comment: z.string().optional().describe("Set the record comment/annotation"),
    flag: z.boolean().optional().describe("Set the flagged (starred) state"),
    locked: z.boolean().optional().describe("Set the locked (locking) state"),
    excludeFromChat: z.boolean().optional().describe("Exclude record from AI chat"),
    excludeFromClassification: z.boolean().optional().describe("Exclude record from auto-classification"),
    excludeFromSearch: z.boolean().optional().describe("Exclude record from search results"),
    excludeFromSeeAlso: z.boolean().optional().describe("Exclude record from See Also suggestions"),
    excludeFromTagging: z.boolean().optional().describe("Exclude record from auto-tagging"),
    excludeFromWikiLinking: z.boolean().optional().describe("Exclude record from wiki-style auto-linking"),
  }),
  run: async (args, executor) => {
    const {
      uuid, recordId, recordPath, databaseName,
      comment, flag, locked,
      excludeFromChat, excludeFromClassification, excludeFromSearch,
      excludeFromSeeAlso, excludeFromTagging, excludeFromWikiLinking,
    } = args;

    const script = `
      ${JXA_APP}
      var uuid = ${jxaLiteral(uuid ?? null)};
      var recordId = ${jxaLiteral(recordId ?? null)};
      var recordPath = ${jxaLiteral(recordPath ?? null)};
      var recordName = null;
      var dbName = ${jxaLiteral(databaseName ?? null)};

      ${JXA_RESOLVE_DB}
      ${JXA_RESOLVE_RECORD}

      var comment = ${jxaLiteral(comment ?? null)};
      var flag = ${jxaLiteral(flag ?? null)};
      var locked = ${jxaLiteral(locked ?? null)};
      var excludeFromChat = ${jxaLiteral(excludeFromChat ?? null)};
      var excludeFromClassification = ${jxaLiteral(excludeFromClassification ?? null)};
      var excludeFromSearch = ${jxaLiteral(excludeFromSearch ?? null)};
      var excludeFromSeeAlso = ${jxaLiteral(excludeFromSeeAlso ?? null)};
      var excludeFromTagging = ${jxaLiteral(excludeFromTagging ?? null)};
      var excludeFromWikiLinking = ${jxaLiteral(excludeFromWikiLinking ?? null)};

      if (comment !== null) record.comment = comment;
      if (flag !== null) record.flag = flag;
      if (locked !== null) record.locking = locked;
      if (excludeFromChat !== null) record.excludeFromChat = excludeFromChat;
      if (excludeFromClassification !== null) record.excludeFromClassification = excludeFromClassification;
      if (excludeFromSearch !== null) record.excludeFromSearch = excludeFromSearch;
      if (excludeFromSeeAlso !== null) record.excludeFromSeeAlso = excludeFromSeeAlso;
      if (excludeFromTagging !== null) record.excludeFromTagging = excludeFromTagging;
      if (excludeFromWikiLinking !== null) record.excludeFromWikiLinking = excludeFromWikiLinking;

      JSON.stringify(${JXA_RECORD_PROPS});
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout);
  },
});
