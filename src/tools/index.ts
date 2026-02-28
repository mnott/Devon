/**
 * tools/index.ts — Barrel export of all 33 MCP tools.
 *
 * Collects all tools into a single allTools array for registration
 * with the MCP server.
 */

import type { McpTool } from "../jxa/types.js";

// Application
import { isRunningTool } from "./application/is-running.js";

// Database
import { getOpenDatabasesTool } from "./database/get-open-databases.js";
import { currentDatabaseTool } from "./database/get-current-database.js";

// Records
import { getRecordByIdTool } from "./records/get-record-by-id.js";
import { getRecordPropertiesTool } from "./records/get-record-properties.js";
import { getRecordContentTool } from "./records/get-record-content.js";
import { createRecordTool } from "./records/create-record.js";
import { deleteRecordTool } from "./records/delete-record.js";
import { updateRecordContentTool } from "./records/update-record-content.js";
import { setRecordPropertiesTool } from "./records/set-record-properties.js";
import { renameRecordTool } from "./records/rename-record.js";
import { moveRecordTool } from "./records/move-record.js";
import { replicateRecordTool } from "./records/replicate-record.js";
import { duplicateRecordTool } from "./records/duplicate-record.js";
import { convertRecordTool } from "./records/convert-record.js";

// Groups
import { listGroupContentTool } from "./groups/list-group-content.js";
import { selectedRecordsTool } from "./groups/get-selected-records.js";

// Search
import { searchTool } from "./search/search.js";
import { lookupRecordTool } from "./search/lookup-record.js";

// Tags
import { addTagsTool } from "./tags/add-tags.js";
import { removeTagsTool } from "./tags/remove-tags.js";

// Web
import { createFromUrlTool } from "./web/create-from-url.js";

// Intelligence
import { classifyTool } from "./intelligence/classify.js";
import { compareTool } from "./intelligence/compare.js";

// AI
import { askAiAboutDocumentsTool } from "./ai/ask-ai-about-documents.js";
import { checkAiHealthTool } from "./ai/check-ai-health.js";
import { createSummaryDocumentTool } from "./ai/create-summary-document.js";
import { getAiToolDocumentationTool } from "./ai/get-ai-tool-documentation.js";

// Custom (our extensions, not from upstream)
import { listSmartGroupsTool } from "./custom/list-smart-groups.js";
import { listSmartRulesTool } from "./custom/list-smart-rules.js";
import { parseEmlHeadersTool } from "./custom/parse-eml-headers.js";
import { getColumnLayoutTool, copyColumnLayoutTool } from "./custom/column-layout.js";

/** All 33 tools in registration order */
export const allTools: McpTool[] = [
  // Core (28 tools matching upstream API surface)
  isRunningTool,
  createRecordTool,
  deleteRecordTool,
  moveRecordTool,
  getRecordPropertiesTool,
  getRecordByIdTool,
  searchTool,
  lookupRecordTool,
  createFromUrlTool,
  getOpenDatabasesTool,
  currentDatabaseTool,
  selectedRecordsTool,
  listGroupContentTool,
  getRecordContentTool,
  renameRecordTool,
  addTagsTool,
  removeTagsTool,
  classifyTool,
  compareTool,
  replicateRecordTool,
  duplicateRecordTool,
  convertRecordTool,
  updateRecordContentTool,
  setRecordPropertiesTool,
  askAiAboutDocumentsTool,
  checkAiHealthTool,
  createSummaryDocumentTool,
  getAiToolDocumentationTool,

  // Custom extensions (5 tools)
  listSmartGroupsTool,
  listSmartRulesTool,
  parseEmlHeadersTool,
  getColumnLayoutTool,
  copyColumnLayoutTool,
];
