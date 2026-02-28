/**
 * types.ts — McpTool interface and defineTool() factory.
 *
 * Each tool is created via defineTool(), which:
 *   - Takes a Zod schema for input validation
 *   - Converts it to JSON Schema for MCP's inputSchema
 *   - Wraps the run function with safeParse for readable errors
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { JxaExecutor } from "./executor.js";
import { getDefaultExecutor } from "./executor.js";

/** The shape registered with the MCP server */
export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (args: Record<string, unknown>) => Promise<unknown>;
}

/** Options for defineTool */
interface DefineToolOptions<T extends z.ZodTypeAny> {
  name: string;
  description: string;
  schema: T;
  run: (args: z.infer<T>, executor: JxaExecutor) => Promise<unknown>;
}

/**
 * Factory that creates an McpTool from a Zod schema and a run function.
 *
 * The Zod schema is converted to JSON Schema for the MCP inputSchema.
 * At runtime, args are validated with safeParse — invalid args get a
 * readable error message instead of throwing.
 */
export function defineTool<T extends z.ZodTypeAny>(
  opts: DefineToolOptions<T>
): McpTool {
  const jsonSchema = zodToJsonSchema(opts.schema, {
    $refStrategy: "none",
    target: "openApi3",
  });

  // Remove the top-level $schema and additionalProperties keys that
  // zodToJsonSchema adds — MCP servers typically don't include these.
  const { $schema: _, ...schemaBody } = jsonSchema as Record<string, unknown>;

  return {
    name: opts.name,
    description: opts.description,
    inputSchema: schemaBody,
    run: async (args: Record<string, unknown>) => {
      const result = opts.schema.safeParse(args);
      if (!result.success) {
        const issues = result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        return { error: `Invalid arguments: ${issues}` };
      }
      const executor = getDefaultExecutor();
      return opts.run(result.data, executor);
    },
  };
}
