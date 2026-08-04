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

- **Searches cover OPEN databases only — open the closed ones first (see below)**
- Smart group search: native \`search_records\` with \`group_uuid\` (the UUID from
  Devon's \`list_smart_groups\`) — returns proper DEVONthink UUIDs
- Thread correlation: always attempt Tier 1 (EML headers) first, fall back to Tier 2/3
- Mail import: report count of imported mails after script completes
- Never delete records — only move to trash (recoverable; use native \`trash_record\`)
- Never run Archive Mails without confirming user has reviewed inbox first

### Database Availability — DO THIS BEFORE ANY "FIND EVERYTHING" SEARCH

\`search_records\` and \`get_databases\` see **only the databases DEVONthink
currently has open**. Closed databases are invisible: they produce no hits and
no warning. A "nothing found" verdict drawn from a partial set is **wrong, not
empty** — and archives are exactly where history lives, so the databases most
likely to be closed are the ones most likely to hold the answer.

So for any search that claims completeness — a person's history, everything on a
topic, "search all my mail" — open everything first:

**1. List what is open, and where those databases live.**
\`\`\`bash
osascript -e 'tell application id "DNtp" to get path of every database'
\`\`\`

**2. Scan those folders for databases that are NOT open.** Take the parent
directory of each open database and list \`*.dtBase2\` in it. Anything on disk but
absent from step 1 is closed. Ask the user for additional locations if the
archive naming suggests gaps (e.g. \`Mail_2005_2009\` present, \`Mail_2010_2014\`
missing from both lists).

**3. Open each closed database — ONE PER CALL.**
\`\`\`bash
osascript -e 'tell application id "DNtp" to open database "/abs/path/Foo.dtBase2"'
\`\`\`
Opening a large archive can take **minutes**. Do NOT loop several \`open database\`
statements inside one \`osascript\` call — the whole call dies on the 120 s Bash
timeout and you cannot tell which databases made it. One open per call, generous
timeout.

**4. Clear the recovery dialog.** Opening a database may raise a *"database was
recovered / issues were found"* sheet. It **blocks the open until dismissed** —
the database never finishes opening and silently stays out of every subsequent
search.
\`\`\`bash
osascript -e 'tell application "System Events" to tell process "DEVONthink" to get name of windows'
\`\`\`
If a dialog is present, click its **Repair** / **OK** button before continuing.

**5. Verify before searching.**
\`\`\`bash
osascript -e 'tell application id "DNtp" to get name of every database'
\`\`\`
Every database from step 2 must appear. Only now run the search.

When you report results, say which databases were in scope. If any stayed
closed, name them — an unqualified "no history found" over a partial set is the
failure this section exists to prevent.

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

- DEVONthink must be running
- **Every database you intend to search must be OPEN** — see "Database
  Availability" above; closed databases fail silently
- Database locations are per-user; derive them from \`path of every database\`
  rather than assuming a fixed folder
`.trim();

export const createExtendedServer = async (): Promise<{
  server: Server;
  cleanup: () => Promise<void>;
}> => {
  const server = new Server(
    {
      name: "@tekmidian/devon",
      version: "4.1.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      // Surfaced to the client at initialize — without this the guide is only
      // reachable via the devonthink-instructions prompt, i.e. never read
      // unless explicitly asked for.
      instructions: INSTRUCTIONS,
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
