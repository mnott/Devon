#!/usr/bin/env node
/**
 * index.ts — CLI entry point for devon
 *
 * Usage: devon <command>
 *
 * Commands:
 *   serve    Start the in-process MCP server (default)
 *   setup    Interactive first-time setup — configures ~/.claude.json
 *   version  Print the version
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { runSetup } from "./setup.js";
import { createExtendedServer } from "./server.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const command = process.argv[2];

function getVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const distDir = dirname(__filename);
    const pkgPath = join(distDir, "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      version?: string;
    };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

async function main(): Promise<void> {
  switch (command) {
    case "serve":
    case undefined: {
      // Default: start the in-process extended MCP server
      const transport = new StdioServerTransport();
      const { server, cleanup } = await createExtendedServer();
      await server.connect(transport);

      // Graceful shutdown
      const shutdown = async (): Promise<void> => {
        await cleanup();
        await server.close();
        process.exit(0);
      };

      process.on("SIGINT", () => {
        void shutdown();
      });
      process.on("SIGTERM", () => {
        void shutdown();
      });
      break;
    }

    case "setup": {
      await runSetup();
      break;
    }

    case "version":
    case "--version":
    case "-v": {
      process.stdout.write(`devon v${getVersion()}\n`);
      break;
    }

    default: {
      process.stderr.write(
        [
          "Usage: devon <command>",
          "",
          "Commands:",
          "  serve    Start the MCP server (default if no command given)",
          "  setup    Interactive first-time setup — configures ~/.claude.json",
          "  version  Print the version",
          "",
        ].join("\n")
      );
      process.exit(command ? 1 : 0);
    }
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[devon] Fatal error: ${msg}\n`);
  process.exit(1);
});
