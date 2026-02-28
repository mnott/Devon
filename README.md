# Devon

DEVONthink MCP server for Claude Code. Zero-config setup — one command and you're done.

33 tools for full DEVONthink integration — search, CRUD, AI, tags, smart groups, email threading, and more. All MIT-licensed, zero external dependencies beyond the MCP SDK.

---

## Quick start

```bash
npx @tekmidian/devon setup
```

The wizard checks prerequisites, configures `~/.claude.json`, and enables the server. Restart Claude Code and DEVONthink tools are immediately available.

---

## What it provides

With this server running, Claude Code can:

- Search and browse all open DEVONthink databases
- Read document content (PDFs, Markdown, plain text, HTML, rich text)
- Create, update, and delete records
- Move, replicate, duplicate, and convert records across groups
- Add and remove tags, classify documents, manage metadata
- Ask DEVONthink's built-in AI about documents and create summaries
- Cross-reference emails with archived documents
- List and navigate database groups
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

### Option 1: npx (no install required)

```bash
npx @tekmidian/devon setup
```

### Option 2: Global install

```bash
npm install -g @tekmidian/devon
devon setup
```

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

## Tools

All 33 tools organized by category.

### Application

| Tool | Description |
|------|-------------|
| `is_running` | Check if DEVONthink is running |

### Database

| Tool | Description |
|------|-------------|
| `get_open_databases` | List all open databases |
| `current_database` | Get the frontmost database |

### Records

| Tool | Description |
|------|-------------|
| `create_record` | Create a new record (markdown, text, HTML, etc.) |
| `delete_record` | Delete a record by UUID |
| `get_record_by_identifier` | Get a record by UUID |
| `get_record_properties` | Get metadata properties of a record |
| `get_record_content` | Read the content of a record |
| `update_record_content` | Update a record's content |
| `set_record_properties` | Set metadata properties on a record |
| `rename_record` | Rename a record |
| `move_record` | Move a record to a different group or database |
| `replicate_record` | Create a replicant of a record in another group |
| `duplicate_record` | Create an independent copy of a record |
| `convert_record` | Convert a record to a different type |

### Groups

| Tool | Description |
|------|-------------|
| `list_group_content` | List contents of a group |
| `selected_records` | Get currently selected records in DEVONthink |

### Search

| Tool | Description |
|------|-------------|
| `search` | Search across databases with DEVONthink query syntax |
| `lookup_record` | Look up a record by name or path |

### Tags

| Tool | Description |
|------|-------------|
| `add_tags` | Add tags to a record |
| `remove_tags` | Remove tags from a record |

### Web

| Tool | Description |
|------|-------------|
| `create_from_url` | Create a record from a URL (markdown, PDF, web archive, formatted note) |

### Intelligence

| Tool | Description |
|------|-------------|
| `classify` | Classify a record using DEVONthink's AI classification |
| `compare` | Compare two records for similarity |

### AI

| Tool | Description |
|------|-------------|
| `ask_ai_about_documents` | Ask DEVONthink's built-in AI a question about documents |
| `check_ai_health` | Check if DEVONthink's AI features are available |
| `create_summary_document` | Create an AI-generated summary of documents |
| `get_ai_tool_documentation` | Get documentation for DEVONthink's AI capabilities |

### Custom extensions

These five tools extend the core DEVONthink scripting API with functionality not available through AppleScript.

| Tool | Description |
|------|-------------|
| `list_smart_groups` | Enumerate all smart groups (reads plist directly) |
| `list_smart_rules` | Enumerate all smart rules (reads plist directly) |
| `parse_eml_headers` | Extract Message-ID, References, Subject, etc. from .eml files |
| `get_column_layout` | Read column layout configuration for a smart group |
| `copy_column_layout` | Copy column layout from one smart group to another |

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

**Step 2:** Query the contents using `search` with `groupUuid`.

```
search
  query: ""
  groupUuid: "4A469368-94FD-46D3-9A62-ED7C24D822D8"
```

> **Note:** `list_group_content` with a smart group UUID returns email Message-IDs in the `uuid` field (not DEVONthink record UUIDs). Use `search` with `groupUuid` instead — it returns proper records with dates and correct UUIDs.

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

`devon` is a standalone MCP server built on `@modelcontextprotocol/sdk`. All 33 tools are implemented from scratch under the MIT license with no external dependencies beyond the MCP SDK.

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

This project was inspired by [dvcrn](https://github.com/dvcrn)'s [mcp-server-devonthink](https://github.com/dvcrn/mcp-server-devonthink), which demonstrated the potential of DEVONthink MCP integration. Version 3.0.0 is a clean-room rewrite — all 33 tools are independently implemented under the MIT license.

---

## License

MIT
