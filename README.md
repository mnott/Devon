# Devon

DEVONthink MCP server for Claude Code. Zero-config setup — one command and you're done.

The focused complement to DEVONthink 4.2's **built-in** MCP server. DEVONthink now ships its own MCP server covering generic search, reads, and CRUD — so Devon deliberately exposes only the **15 tools where it does something the native server can't**: smart-group and smart-rule introspection, column layouts, `.eml` header parsing, richer web capture, incremental tagging, and parameterized AI. All MIT-licensed, zero external dependencies beyond the MCP SDK. Run both servers side by side.

---

## Quick start

If you have Claude Code, just ask:

> "Hey Claude, clone Devon from github.com/mnott/Devon and set it up for me"

Claude will clone the repo, build it, configure `~/.claude.json`, and enable the server. Restart Claude Code and Devon's tools are available alongside DEVONthink's built-in MCP server.

---

## What it provides

Devon fills the gaps in DEVONthink's built-in MCP server. With it running, Claude Code can:

- Enumerate **smart groups** and **smart rules** (read straight from DEVONthink's plists — the native scripting API doesn't expose these)
- Read and copy **column layouts** for smart groups and rules
- Parse **`.eml` MIME headers** (Message-ID, References, In-Reply-To) for email thread correlation
- Capture web pages with **rich options** (format, readability, custom user-agent, referrer, PDF options)
- Add and remove tags **incrementally** (the native tag tool only replaces the full set)
- Ask DEVONthink's AI with **model / engine / temperature** control and create real **summary records**

For generic full-text search, record reads, and CRUD, use DEVONthink's **built-in** MCP server — Devon does not duplicate it. See [Relationship to the built-in server](#relationship-to-the-built-in-devonthink-mcp-server).
- List smart groups and smart rules (not accessible via AppleScript)
- Parse EML headers for email thread correlation
- Read and copy column layout configurations

---

## Requirements

- macOS (DEVONthink is macOS-only)
- [DEVONthink 3 or 4](https://www.devontechnologies.com/apps/devonthink) installed and running
- Node.js >= 18
- Claude Code

---

## Installation

### Option 1: Ask Claude (recommended)

In Claude Code, ask Claude to set it up:

> "Clone Devon from github.com/mnott/Devon into ~/dev/ai and configure it"

Claude clones, builds, configures `~/.claude.json`, and enables the MCP server.

### Option 2: Setup wizard

```bash
npx @tekmidian/devon setup
```

Interactive CLI that checks prerequisites, configures `~/.claude.json`, and enables the server.

### Option 3: Clone and build

```bash
git clone https://github.com/mnott/Devon ~/dev/ai/devon
cd ~/dev/ai/devon
npm install
npm run build
node dist/index.js setup
```

---

## Manual configuration

If you prefer to configure Claude Code manually, add this to the `mcpServers` section of `~/.claude.json`:

```json
"devonthink": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@tekmidian/devon", "serve"],
  "env": {}
}
```

Or if you have it installed locally:

```json
"devonthink": {
  "type": "stdio",
  "command": "node",
  "args": ["/path/to/devon/dist/index.js", "serve"],
  "env": {}
}
```

Restart Claude Code after editing `~/.claude.json`.

---

## Relationship to the built-in DEVONthink MCP server

DEVONthink 4.2 ships its own MCP server inside the app bundle
(`/Applications/DEVONthink.app/Contents/Library/LoginItems/DEVONthink MCP.app`),
also reachable over HTTP. It exposes ~59 tools covering generic search, reads,
CRUD, OCR, transcription, annotations, custom metadata, reminders, the link
graph, and DOI/CrossRef research.

Devon does **not** compete with it. Run both:

- **Built-in `devonthink` server** — everything generic: `search_records`,
  `get_record_text`, `get_record_properties`, `create_record`, `move_record`,
  batch operations, and all the native-only capabilities above.
- **Devon** — the 15-tool complement below: smart-group / smart-rule
  introspection, column layouts, `.eml` headers, richer web capture,
  incremental tagging, and parameterized AI — the things the built-in server
  can't do.

A full tool-by-tool capability differential lives in `Notes/`.

---

## Tools

15 tools, each chosen because it does something DEVONthink's built-in MCP server can't (or does better).

### Smart groups, rules & layouts

Read directly from DEVONthink's plists — the native scripting API does not expose these.

| Tool | Description |
|------|-------------|
| `list_smart_groups` | Enumerate all smart groups (sync UUID, `UseUUIDKey`) |
| `list_smart_rules` | Enumerate all smart rules (enabled state, `indexOffset`, `lastExecution`) |
| `get_column_layout` | Read column layout (order, visible columns, widths) for a smart group or rule |
| `copy_column_layout` | Copy a column layout from one smart group/rule to another |

### Email

| Tool | Description |
|------|-------------|
| `parse_eml_headers` | Extract Message-ID, References, In-Reply-To, etc. from .eml files |

### Web capture

| Tool | Description |
|------|-------------|
| `create_from_url` | Capture a URL with `format`, `readability`, `userAgent`, `referrer`, `pdfOptions` (richer than native `capture_web_page`) |

### Tags (incremental)

The native `set_record_tags` replaces the entire tag set; these add/remove individual tags.

| Tool | Description |
|------|-------------|
| `add_tags` | Add tags to a record without touching existing ones |
| `remove_tags` | Remove specific tags from a record |

### AI

| Tool | Description |
|------|-------------|
| `ask_ai_about_documents` | Ask DEVONthink's AI with `model` / `engine` / `temperature` control (native `chat_response` is minimal) |
| `create_summary_document` | Create a real DEVONthink summary **record** (native only returns text) |
| `check_ai_health` | Check if DEVONthink's AI features are available |
| `get_ai_tool_documentation` | Get documentation for DEVONthink's AI capabilities |

### Lookup & database

| Tool | Description |
|------|-------------|
| `lookup_record` | Look up records — including by `tags` or `contentHash` (modes native lacks) |
| `get_record_by_identifier` | Focused single-call fetch by UUID/identifier |
| `current_database` | Get the frontmost database (no native equivalent) |

### Delegated to the built-in server

Devon intentionally does **not** ship these — DEVONthink's built-in MCP server does them as well or better (often with batch `uuids` support and its full query DSL): full-text `search_records`, `classify_record`, `find_similar_records`, `get_record_text` / `extract_record_content`, `get_record_properties`, `create_record`, `update_record`, `update_record_content`, `move_record`, `duplicate_record`, `replicate_record`, `convert_record`, `trash_record`, `get_databases`, `get_group_tree`, `get_selected_records`, `is_running`, plus everything native-only (OCR, transcription, annotations, custom metadata, reminders, link graph, DOI/CrossRef research, import/export, merge).

---

## Usage

Once configured, Claude Code has access to all DEVONthink tools automatically. DEVONthink must be running with at least one database open.

Example prompts:

- "Search my DEVONthink databases for notes about the Q3 budget"
- "Find the email from John about the contract and show me related documents"
- "Create a new markdown note in my Inbox with today's meeting notes"
- "List all documents tagged 'todo' in my Ablegen database"
- "Read the content of the PDF I imported yesterday"
- "List my smart groups"
- "Parse the headers from this .eml file to find its thread ID"
- "Ask DEVONthink's AI to summarize these documents"

---

## Custom tool reference

### `list_smart_groups`

Parses `~/Library/Application Support/DEVONthink/SmartGroups.plist` and returns all smart groups with their name, UUID, sync date, and `UseUUIDKey` flag.

> **Key limitation:** Smart groups are **not accessible via the DEVONthink AppleScript scripting dictionary**. This tool is the only programmatic way to enumerate them.

**Parameters:** none

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the operation succeeded |
| `smartGroups` | array | List of smart group entries |
| `totalCount` | number | Total number of smart groups found |

Each entry in `smartGroups`:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name of the smart group |
| `uuid` | string | UUID from the `sync.UUID` field — use this with the `search` tool |
| `syncDate` | string \| null | Last sync date (ISO 8601) |
| `useUuidKey` | boolean \| null | Whether DEVONthink uses UUID as the key internally |

---

### `list_smart_rules`

Parses `~/Library/Application Support/DEVONthink/SmartRules.plist` and returns all smart rules with name, UUID, enabled state, execution metadata, and sync date.

**Parameters:** none

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the operation succeeded |
| `smartRules` | array | List of smart rule entries |
| `totalCount` | number | Total number of smart rules found |

Each entry in `smartRules`:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name of the smart rule |
| `uuid` | string | UUID from the `sync.UUID` field |
| `enabled` | boolean \| null | Whether the rule is currently enabled |
| `indexOffset` | number \| null | Order index within the rules list |
| `lastExecution` | number \| null | CFAbsoluteTime timestamp of last execution |
| `syncDate` | string \| null | Last sync date (ISO 8601) |
| `useUuidKey` | boolean \| null | Whether DEVONthink uses UUID as the key internally |

---

### `parse_eml_headers`

Reads an RFC 2822 `.eml` file and extracts the MIME headers needed for email thread correlation.

Handles CRLF and LF line endings, folded headers (continuation lines), and RFC 2047 encoded words in Subject, From, and To fields.

Only reads the first 64 KB of the file since headers are always at the start.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filePath` | string | yes | Absolute path to the `.eml` file |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether parsing succeeded |
| `filePath` | string | The path that was read |
| `messageId` | string \| null | The `Message-ID` header value |
| `inReplyTo` | string \| null | The `In-Reply-To` header value |
| `references` | string[] | Array of message IDs from the `References` header |
| `subject` | string \| null | Decoded subject line |
| `from` | string \| null | Sender address(es) |
| `to` | string \| null | Recipient address(es) |
| `cc` | string \| null | CC address(es) |
| `date` | string \| null | Date string from the header |

---

### `get_column_layout`

Reads the column layout for a named smart group or smart rule from `~/Library/Preferences/com.devon-technologies.think.plist`.

Returns the ordered visible columns, all table view columns (visible and hidden), and column widths. Supports partial name matching.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | yes | Display name of the smart group or smart rule |
| `uuid` | string | no | UUID fallback if name lookup fails |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether a layout was found |
| `name` | string | The name that was searched |
| `resolvedKey` | string | The actual plist key used |
| `columns` | string[] \| null | Visible columns in display order |
| `tableViewColumns` | string[] \| null | All column identifiers (visible + hidden) |
| `widths` | object \| null | Map of column identifier to width |
| `keysFound` | string[] | Which plist keys were present |

---

### `copy_column_layout`

Copies the column layout from one smart group or smart rule to another. All layout keys are written atomically using Python's `plistlib`.

DEVONthink must be restarted (or the smart group window closed and reopened) for the change to take effect.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sourceName` | string | yes | Name of the source smart group |
| `targetName` | string | yes | Name of the target smart group |
| `sourceUuid` | string | no | UUID fallback for the source |
| `targetUuid` | string | no | UUID for the target (layout written under UUID key) |

---

## Workflows

### Smart group discovery and content querying

Smart groups are virtual views defined by search criteria — they are not part of the AppleScript scripting dictionary. Use this two-step pattern:

**Step 1:** Enumerate all smart groups.

```
list_smart_groups
```

**Step 2:** Query the contents using the built-in server's `search_records` with `group_uuid`.

```
search_records            (native devonthink server)
  query: ""
  group_uuid: "4A469368-94FD-46D3-9A62-ED7C24D822D8"
```

> **Note:** Devon supplies the smart-group UUID (via `list_smart_groups`); the native `search_records` tool scopes to it with `group_uuid` and returns proper DEVONthink records with dates and correct UUIDs. Devon no longer ships its own `search` / `list_group_content` — the built-in server covers those.

---

### Email thread correlation

To link a live email thread back to its archived copy in DEVONthink, use a three-tier matching strategy:

**Tier 1 — Thread ID match (highest precision)**

```
get_record_properties  uuid: <record_uuid>
parse_eml_headers      filePath: "/path/to/archived/email.eml"
```

Use `messageId`, `inReplyTo`, and `references` to correlate precisely.

**Tier 2 — Subject and sender match**

```
search  query: "kind:email subject:\"Contract renewal\" from:jane@example.com"
```

Strip `Re:`, `Fwd:`, `AW:`, `WG:` prefixes before searching.

**Tier 3 — Subject only (broadest)**

```
search  query: "kind:email subject:\"Contract renewal\""
```

---

### Column layout management

```
get_column_layout   name: "Archivieren - Jobs"
copy_column_layout  sourceName: "Archivieren - Jobs"  targetName: "New Smart Group"
```

Close and reopen the smart group window (or restart DEVONthink) after copying.

---

## DEVONthink search syntax

The `search` tool supports these operators:

| Operator | Example | Description |
|----------|---------|-------------|
| `kind:` | `kind:email` | Filter by record type |
| `name:` | `name:"offer letter"` | Match filename or subject |
| `subject:` | `subject:"interview"` | Email subject field |
| `from:` | `from:recruiter@co.com` | Sender address |
| `to:` | `to:user@example.com` | Recipient address |
| `text:` | `text:"stock options"` | Full-text content search |
| `tags:` | `tags:jobs` | Tagged records |
| `date:` | `date:2024-01-01~` | Date range (`~` = after) |
| Quotes | `"exact phrase"` | Exact phrase match |
| AND/OR | `from:x OR from:y` | Boolean operators |

Combining operators:

```
kind:email from:@company.com subject:"compensation" date:2023-01-01~2024-12-31
```

---

## How it works

`devon` is a standalone MCP server built on `@modelcontextprotocol/sdk`. All 15 tools are implemented from scratch under the MIT license with no external dependencies beyond the MCP SDK.

The tools communicate with DEVONthink via JXA (JavaScript for Automation) executed through `osascript`. A shared JXA executor handles script construction, escaping, and result parsing. The custom tools (smart groups, smart rules, column layouts) use `PlistBuddy` and Python's `plistlib` to read DEVONthink preference and data files directly.

Compatible with both DEVONthink 3 and DEVONthink 4, with automatic app name detection.

---

## Troubleshooting

**"DEVONthink not found"**
Make sure DEVONthink 3 or 4 is installed in `/Applications` and running.

**"No databases found"**
Open at least one DEVONthink database before using the MCP tools.

**Tools not appearing in Claude Code**
1. Verify `~/.claude.json` has the `devonthink` entry
2. Restart Claude Code (not just a new session — fully quit and reopen)
3. Check that DEVONthink is running

**AppleScript errors**
Grant Claude Code (or Terminal) Automation permissions in System Settings > Privacy & Security > Automation.

**`list_smart_groups` returns no results or error**
The plist format varies between DEVONthink versions. Use `plutil -p ~/Library/Application\ Support/DEVONthink/SmartGroups.plist` to inspect the raw format and report an issue.

**`get_column_layout` returns "no layout found"**
The smart group does not yet have a custom column layout saved. Use `copy_column_layout` to copy a layout from another smart group that already has one configured.

---

## Credits

This project was inspired by [dvcrn](https://github.com/dvcrn)'s [mcp-server-devonthink](https://github.com/dvcrn/mcp-server-devonthink), which demonstrated the potential of DEVONthink MCP integration. Version 3.0.0 was a clean-room rewrite; from v4.0.0 Devon narrows to the 15 tools that complement DEVONthink 4.2's own built-in MCP server rather than duplicating it. All tools are independently implemented under the MIT license.

---

## License

MIT
