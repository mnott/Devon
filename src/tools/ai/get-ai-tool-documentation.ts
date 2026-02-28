/**
 * get-ai-tool-documentation.ts — Return documentation for DEVONthink AI tools.
 *
 * This is a pure TypeScript tool with no JXA execution. It serves embedded
 * documentation for the four AI tools so that the AI assistant can understand
 * how to use them effectively before making calls.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";

// ---------------------------------------------------------------------------
// Documentation data
// ---------------------------------------------------------------------------

interface ToolDoc {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  returns: string;
  examples: Array<{
    description: string;
    input: Record<string, unknown>;
  }>;
  notes: string[];
}

const AI_TOOL_DOCS: Record<string, ToolDoc> = {
  get_ai_tool_documentation: {
    name: "get_ai_tool_documentation",
    description:
      "Returns detailed documentation, parameter descriptions, usage examples, and " +
      "notes for any of the four DEVONthink AI tools. Call this tool first if you are " +
      "unsure how to use ask_ai_about_documents, check_ai_health, or create_summary_document.",
    parameters: [
      {
        name: "toolName",
        type: "string (enum)",
        required: false,
        description:
          "Optional. One of: get_ai_tool_documentation, check_ai_health, " +
          "ask_ai_about_documents, create_summary_document. " +
          "If omitted, documentation for all four tools is returned.",
      },
    ],
    returns:
      "A documentation object (or array of documentation objects) describing " +
      "each requested AI tool — including its parameters, return shape, usage examples, and tips.",
    examples: [
      {
        description: "Get documentation for all AI tools",
        input: {},
      },
      {
        description: "Get documentation for a specific tool",
        input: { toolName: "ask_ai_about_documents" },
      },
    ],
    notes: [
      "This tool itself has no side-effects and does not call DEVONthink.",
      "Use this before calling AI tools for the first time in a session.",
    ],
  },

  check_ai_health: {
    name: "check_ai_health",
    description:
      "Verifies that DEVONthink's built-in AI features are available and responding. " +
      "Call this before any AI-intensive operations to confirm the AI engine is ready.",
    parameters: [],
    returns:
      "An object with fields: { available: boolean, model?: string, error?: string }. " +
      "`available` is true when DEVONthink AI is ready to process requests. " +
      "`model` reports the active AI model name when available.",
    examples: [
      {
        description: "Check if AI is available before summarising a document",
        input: {},
      },
    ],
    notes: [
      "DEVONthink AI requires an active network connection and a valid subscription.",
      "If `available` is false, inspect the `error` field for the reason.",
      "The check adds minimal latency and is safe to call frequently.",
    ],
  },

  ask_ai_about_documents: {
    name: "ask_ai_about_documents",
    description:
      "Sends a natural-language question to DEVONthink AI with one or more documents " +
      "as context. The AI reads the document content and returns an answer grounded in " +
      "those documents. Ideal for summarisation, extraction, comparison, and Q&A tasks.",
    parameters: [
      {
        name: "question",
        type: "string",
        required: true,
        description:
          "The question or instruction to send to the AI. Be specific: " +
          "'Summarise the key findings' or 'List all action items mentioned'.",
      },
      {
        name: "uuids",
        type: "string[]",
        required: true,
        description:
          "Array of DEVONthink record UUIDs to include as context. " +
          "Use search or get_record_properties to obtain UUIDs first.",
      },
      {
        name: "database",
        type: "string",
        required: false,
        description:
          "Optional database name to scope the lookup. If omitted, all open databases are searched.",
      },
    ],
    returns:
      "An object with fields: { answer: string, tokensUsed?: number, error?: string }. " +
      "`answer` contains the AI-generated response. `tokensUsed` is the approximate " +
      "token count consumed by the request.",
    examples: [
      {
        description: "Summarise a single document",
        input: {
          question: "Summarise this document in three bullet points.",
          uuids: ["A1B2C3D4-..."],
        },
      },
      {
        description: "Compare two contracts",
        input: {
          question: "What are the key differences between these two contracts?",
          uuids: ["UUID-contract-a", "UUID-contract-b"],
          database: "Legal",
        },
      },
      {
        description: "Extract action items",
        input: {
          question: "List every action item and its owner from these meeting notes.",
          uuids: ["UUID-meeting-2026-01", "UUID-meeting-2026-02"],
        },
      },
    ],
    notes: [
      "Each UUID must refer to a record in an open database.",
      "Very large documents may be truncated to fit the AI context window.",
      "Token limits apply — avoid including more than 5-10 large documents at once.",
      "check_ai_health first if you encounter repeated failures.",
    ],
  },

  create_summary_document: {
    name: "create_summary_document",
    description:
      "Generates a new DEVONthink document containing an AI-written summary of one or " +
      "more source records. The summary is saved as a new Markdown or plain-text record " +
      "in the specified group or database, leaving the originals untouched.",
    parameters: [
      {
        name: "uuids",
        type: "string[]",
        required: true,
        description:
          "Array of DEVONthink record UUIDs to summarise. " +
          "Use search or get_record_properties to obtain UUIDs first.",
      },
      {
        name: "prompt",
        type: "string",
        required: false,
        description:
          "Optional custom instruction for the AI, e.g. 'Focus on the financial data only'. " +
          "If omitted, a standard summarisation prompt is used.",
      },
      {
        name: "destinationUuid",
        type: "string",
        required: false,
        description:
          "UUID of the DEVONthink group where the summary document should be created. " +
          "If omitted, the summary is created in the same group as the first source record.",
      },
      {
        name: "title",
        type: "string",
        required: false,
        description:
          "Title for the new summary record. Defaults to 'Summary - <date>'.",
      },
    ],
    returns:
      "An object with fields: { success: boolean, uuid?: string, name?: string, error?: string }. " +
      "`uuid` and `name` identify the newly created summary record.",
    examples: [
      {
        description: "Summarise a single report",
        input: {
          uuids: ["UUID-annual-report-2025"],
          title: "Annual Report 2025 - Summary",
        },
      },
      {
        description: "Create a focused summary in a specific group",
        input: {
          uuids: ["UUID-doc-a", "UUID-doc-b", "UUID-doc-c"],
          prompt: "Extract only the risk factors and mitigation strategies.",
          destinationUuid: "UUID-risk-analysis-group",
          title: "Risk Factor Summary",
        },
      },
    ],
    notes: [
      "The new summary record is created immediately; the AI generation is synchronous.",
      "For very long source documents, the AI may only see a truncated excerpt.",
      "The summary is saved as Markdown by default.",
      "Use check_ai_health if the call fails without a clear error.",
    ],
  },
};

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

const AI_TOOL_NAMES = [
  "get_ai_tool_documentation",
  "check_ai_health",
  "ask_ai_about_documents",
  "create_summary_document",
] as const;

export const getAiToolDocumentationTool = defineTool({
  name: "get_ai_tool_documentation",
  description:
    "Get detailed documentation for DEVONthink AI tools including examples and use cases. " +
    "Optionally specify a toolName to get docs for a single tool; omit to get docs for all four.",
  schema: z.object({
    toolName: z
      .enum(AI_TOOL_NAMES)
      .optional()
      .describe(
        "Optional name of the specific AI tool to document. " +
          "One of: get_ai_tool_documentation, check_ai_health, " +
          "ask_ai_about_documents, create_summary_document."
      ),
  }),
  run: async (args, _executor) => {
    const { toolName } = args;

    if (toolName) {
      const doc = AI_TOOL_DOCS[toolName];
      if (!doc) {
        return { error: `No documentation found for tool: ${toolName}` };
      }
      return doc;
    }

    // Return all tool docs as an array
    return AI_TOOL_NAMES.map((name) => AI_TOOL_DOCS[name]);
  },
});
