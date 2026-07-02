/**
 * server.ts — In-process MCP server for DEVONthink.
 *
 * Devon exposes only the tools where it beats or complements DEVONthink's
 * built-in MCP server (all MIT, zero upstream dependency). Generic CRUD,
 * full-text search, and batch ops are delegated to the native `devonthink`
 * server — see Notes/ for the capability differential.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { allTools } from "./tools/index.js";

// ---------------------------------------------------------------------------
// Server instructions — embedded from the DEVONthink skill
// ---------------------------------------------------------------------------

const INSTRUCTIONS = `
## DEVONthink MCP — Usage Guide

Devon provides the DEVONthink capabilities the built-in \`devonthink\` MCP server
lacks (smart-group/rule introspection, column layouts, EML headers, richer web
capture, incremental tagging, parameterized AI). For generic search, reads, and
CRUD, call the native \`devonthink\` server — the routing table below names its
tools explicitly.

### Pre-Action Defaults (apply before every tool call)

- Smart group search: native \`search_records\` with \`group_uuid\` (the UUID from
  Devon's \`list_smart_groups\`) — returns proper DEVONthink UUIDs
- Thread correlation: always attempt Tier 1 (EML headers) first, fall back to Tier 2/3
- Mail import: report count of imported mails after script completes
- Never delete records — only move to trash (recoverable; use native \`trash_record\`)
- Never run Archive Mails without confirming user has reviewed inbox first

### Tool Routing (Devon = ours, native = built-in \`devonthink\` server)

| Goal | Tool |
|------|------|
| List all smart groups | Devon \`list_smart_groups\` |
| Enumerate smart rules | Devon \`list_smart_rules\` |
| Read/copy column layout | Devon \`get_column_layout\` / \`copy_column_layout\` |
| Extract MIME headers from .eml | Devon \`parse_eml_headers\` |
| Capture a web page (rich options) | Devon \`create_from_url\` |
| Add/remove tags incrementally | Devon \`add_tags\` / \`remove_tags\` |
| Search (incl. within a smart group) | native \`search_records\` (with \`group_uuid\`) |
| Get record metadata + file path | native \`get_record_properties\` |
| Read record body | native \`get_record_text\` / \`extract_record_content\` |

### Common Workflows

**A. Smart group review** — Devon \`list_smart_groups\` → native \`search_records\`(group_uuid) → native \`get_record_text\`

**B. Email search** — native \`search_records\`("kind:email subject:\\"<topic>\\"")

**C. Gmail cross-reference** — 3-tier strategy:
  - Tier 1 (highest precision): Devon \`parse_eml_headers\` → match Message-ID / References
  - Tier 2: native \`search_records\`("kind:email subject:\\"<normalized>\\" from:<domain>")
  - Tier 3: native \`search_records\`("kind:email subject:\\"<normalized>\\"")
  Always normalize subject: strip Re:/Fwd:/AW:/WG: prefixes, lowercase, trim.

**D. Reply with archive context** — run C, synthesize 3–5 excerpts, draft via Gmail tool

**E. Import mails** (trigger: "import mails", "pull mails"):
  osascript "~/Library/Application Scripts/com.devon-technologies.think/Toolbar/Import Mails.scpt"

**F. Archive mails** (trigger: "archive mails", "run mail rules") — confirm user reviewed inbox first:
  osascript "~/Library/Application Scripts/com.devon-technologies.think/Toolbar/Archive Mails.scpt"

### Search Syntax

kind:email  name:"offer"  subject:"interview"  from:recruiter@co.com
to:user@example.com  text:"stock options"  tags:jobs  date:2024-01-01~
Boolean: from:x OR from:y

### Known Smart Group UUIDs

Use \`list_smart_groups\` to discover available smart groups and their UUIDs.
UUIDs are database-specific and must be looked up per installation.

### Prerequisites

- DEVONthink must be running with the target database open
- Database: configured per-user (check DEVONthink preferences for database path)
`.trim();

export const createExtendedServer = async (): Promise<{
  server: Server;
  cleanup: () => Promise<void>;
}> => {
  const server = new Server(
    {
      name: "@tekmidian/devon",
      version: "4.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // ---- ListTools handler ----
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: allTools };
  });

  // ---- Empty resource/prompt handlers (required by MCP spec) ----
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: [] };
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return { resources: [] };
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: "devonthink-instructions",
          description:
            "Usage guide for the DEVONthink MCP server: workflows, tool routing, search syntax, and behavioral defaults.",
        },
      ],
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    if (request.params.name !== "devonthink-instructions") {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown prompt: ${request.params.name}`
      );
    }
    return {
      description:
        "DEVONthink MCP usage guide — workflows, tool routing, search syntax, and behavioral defaults.",
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: INSTRUCTIONS,
          },
        },
      ],
    };
  });

  // ---- CallTool handler ----
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    const tool = allTools.find((t) => t.name === name);
    if (!tool) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    try {
      const result = await tool.run(args as Record<string, unknown>);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw error instanceof McpError
        ? error
        : new McpError(
            ErrorCode.InternalError,
            error instanceof Error ? error.message : String(error)
          );
    }
  });

  return {
    server,
    cleanup: async () => {
      // No persistent resources to clean up
    },
  };
};
