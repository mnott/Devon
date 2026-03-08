/**
 * server.ts — In-process MCP server for DEVONthink.
 *
 * All 33 tools are our own code under MIT — zero upstream dependency.
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

Orchestrates workflows between DEVONthink (via this server) and Gmail for email archive retrieval,
cross-referencing, and reply drafting.

### Pre-Action Defaults (apply before every tool call)

- Smart group search: use \`search\` with \`groupUuid\`, NOT \`list_group_content\`
  (search returns proper DEVONthink UUIDs; list_group_content returns Message-IDs)
- Thread correlation: always attempt Tier 1 (EML headers) first, fall back to Tier 2/3
- Mail import: report count of imported mails after script completes
- Never delete records — only move to trash (recoverable)
- Never run Archive Mails without confirming user has reviewed inbox first

### Tool Routing

| Goal | Tool |
|------|------|
| List all smart groups | \`list_smart_groups\` |
| Search within a smart group | \`search\` with \`groupUuid\` from list_smart_groups |
| Get record metadata + file path | \`get_record_properties\` |
| Read record body | \`get_record_content\` |
| Extract MIME headers from .eml | \`parse_eml_headers\` |
| Read/copy column layout | \`get_column_layout\` / \`copy_column_layout\` |
| Enumerate smart rules | \`list_smart_rules\` |

### Common Workflows

**A. Smart group review** — list_smart_groups → search(groupUuid) → get_record_content

**B. Email search** — search("kind:email subject:\\"<topic>\\"")

**C. Gmail cross-reference** — 3-tier strategy:
  - Tier 1 (highest precision): parse_eml_headers → match Message-ID / References
  - Tier 2: search("kind:email subject:\\"<normalized>\\" from:<domain>")
  - Tier 3: search("kind:email subject:\\"<normalized>\\"")
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
      version: "3.0.0",
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
