/**
 * tools/index.ts — Barrel export of Devon's MCP tools.
 *
 * Devon deliberately exposes only the tools where it is BETTER THAN or
 * UNIQUE relative to DEVONthink 4.2's built-in MCP server. Everything the
 * native server does equally well or better (generic CRUD, full-text search,
 * classify/compare, batch property ops) is intentionally NOT re-exposed here —
 * clients should call the native `devonthink` server for those.
 *
 * See Notes/ for the capability differential that drove this split.
 */

import type { McpTool } from "../jxa/types.js";

// Database — "currently focused database" has no native equivalent
import { currentDatabaseTool } from "./database/get-current-database.js";

// Records — focused single-call identifier lookup (convenience)
import { getRecordByIdTool } from "./records/get-record-by-id.js";

// Search — lookup with tags / contentHash modes native lacks
import { lookupRecordTool } from "./search/lookup-record.js";

// Tags — additive / subtractive model (native set_record_tags is replace-only)
import { addTagsTool } from "./tags/add-tags.js";
import { removeTagsTool } from "./tags/remove-tags.js";

// Web — richer capture (format enum, readability, userAgent, referrer, pdfOptions)
import { createFromUrlTool } from "./web/create-from-url.js";

// AI — richer parameterization / writes real records vs native text-only
import { askAiAboutDocumentsTool } from "./ai/ask-ai-about-documents.js";
import { checkAiHealthTool } from "./ai/check-ai-health.js";
import { createSummaryDocumentTool } from "./ai/create-summary-document.js";
import { getAiToolDocumentationTool } from "./ai/get-ai-tool-documentation.js";

// Custom — plist-level introspection the native JXA API does not expose
import { listSmartGroupsTool } from "./custom/list-smart-groups.js";
import { listSmartRulesTool } from "./custom/list-smart-rules.js";
import { parseEmlHeadersTool } from "./custom/parse-eml-headers.js";
import { getColumnLayoutTool, copyColumnLayoutTool } from "./custom/column-layout.js";

/** The 15 tools where Devon beats or complements the native DEVONthink MCP */
export const allTools: McpTool[] = [
  // Capture
  createFromUrlTool,

  // Tags (incremental)
  addTagsTool,
  removeTagsTool,

  // Database
  currentDatabaseTool,

  // Lookup
  lookupRecordTool,
  getRecordByIdTool,

  // AI
  askAiAboutDocumentsTool,
  checkAiHealthTool,
  createSummaryDocumentTool,
  getAiToolDocumentationTool,

  // Custom extensions (plist-based)
  listSmartGroupsTool,
  listSmartRulesTool,
  parseEmlHeadersTool,
  getColumnLayoutTool,
  copyColumnLayoutTool,
];
