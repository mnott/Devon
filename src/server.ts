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
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { allTools } from "./tools/index.js";

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
    return { prompts: [] };
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
