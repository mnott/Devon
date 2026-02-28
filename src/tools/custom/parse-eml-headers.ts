/**
 * parse-eml-headers.ts — Extract MIME headers from .eml files.
 *
 * Reads an RFC 2822 email file and returns key headers for thread correlation.
 * Handles CRLF/LF line endings, folded headers, and RFC 2047 encoded words.
 */

import { existsSync, createReadStream } from "node:fs";
import type { McpTool } from "../../jxa/types.js";

interface EmlHeadersResult {
  success: boolean;
  filePath?: string;
  messageId?: string | null;
  inReplyTo?: string | null;
  references?: string[];
  subject?: string | null;
  from?: string | null;
  to?: string | null;
  cc?: string | null;
  date?: string | null;
  error?: string;
}

function decodeEncodedWords(input: string): string {
  return input.replace(
    /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g,
    (_match, charset: string, encoding: string, text: string): string => {
      try {
        const enc = encoding.toUpperCase();
        let bytes: Buffer;
        if (enc === "B") {
          bytes = Buffer.from(text, "base64");
        } else {
          const decoded = text
            .replace(/_/g, " ")
            .replace(/=([0-9A-Fa-f]{2})/g, (_m, h: string) =>
              String.fromCharCode(parseInt(h, 16))
            );
          bytes = Buffer.from(decoded, "binary");
        }
        const csLower = charset.toLowerCase();
        const csNorm: BufferEncoding =
          csLower === "us-ascii" ? "ascii" :
          csLower === "iso-8859-1" || csLower === "iso-8859-15" ? "latin1" :
          (csLower as BufferEncoding) || "utf-8";
        return bytes.toString(csNorm);
      } catch {
        return _match;
      }
    }
  );
}

function parseHeaders(headerSection: string): Map<string, string> {
  const headers = new Map<string, string>();
  const normalised = headerSection.replace(/\r\n/g, "\n");
  const lines = normalised.split("\n");

  let currentName: string | null = null;
  let currentValue = "";

  const flush = (): void => {
    if (currentName !== null) {
      const unfolded = currentValue.replace(/\n[ \t]+/g, " ").trim();
      const key = currentName.toLowerCase();
      if (headers.has(key)) {
        headers.set(key, headers.get(key) + "\n" + unfolded);
      } else {
        headers.set(key, unfolded);
      }
    }
  };

  for (const line of lines) {
    if (line === "") break;
    if (line[0] === " " || line[0] === "\t") {
      if (currentName !== null) {
        currentValue += "\n" + line;
      }
    } else {
      flush();
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        currentName = line.slice(0, colonIdx).trim();
        currentValue = line.slice(colonIdx + 1);
      } else {
        currentName = null;
        currentValue = "";
      }
    }
  }
  flush();

  return headers;
}

function parseReferences(raw: string): string[] {
  const matches = raw.match(/<[^>]+>/g);
  return matches ?? [];
}

const parseEmlHeaders = async (args: Record<string, unknown>): Promise<EmlHeadersResult> => {
  const filePath = args.filePath as string | undefined;

  if (!filePath || typeof filePath !== "string") {
    return { success: false, error: "filePath parameter is required and must be a string" };
  }

  if (!existsSync(filePath)) {
    return { success: false, filePath, error: `File not found: ${filePath}` };
  }

  let rawContent: string;
  try {
    const HEADER_READ_LIMIT = 65536;
    const fd = await new Promise<Buffer>((resolve, reject) => {
      const stream = createReadStream(filePath, { start: 0, end: HEADER_READ_LIMIT - 1 });
      const chunks: Buffer[] = [];
      stream.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string)));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
    rawContent = fd.toString("utf-8");
  } catch (err) {
    return {
      success: false,
      filePath,
      error: `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const crlf = rawContent.indexOf("\r\n\r\n");
  const lf = rawContent.indexOf("\n\n");
  let headerSection: string;

  if (crlf !== -1 && (lf === -1 || crlf < lf)) {
    headerSection = rawContent.slice(0, crlf);
  } else if (lf !== -1) {
    headerSection = rawContent.slice(0, lf);
  } else {
    headerSection = rawContent;
  }

  const headers = parseHeaders(headerSection);

  const get = (name: string): string | null => {
    const val = headers.get(name);
    return val !== undefined ? decodeEncodedWords(val.trim()) : null;
  };

  const referencesRaw = get("references");

  return {
    success: true,
    filePath,
    messageId: get("message-id"),
    inReplyTo: get("in-reply-to"),
    references: referencesRaw ? parseReferences(referencesRaw) : [],
    subject: get("subject"),
    from: get("from"),
    to: get("to"),
    cc: get("cc"),
    date: get("date"),
  };
};

export const parseEmlHeadersTool: McpTool = {
  name: "parse_eml_headers",
  description:
    "Extract MIME headers from an .eml file for email thread correlation. " +
    "Returns message_id, in_reply_to, references (array), subject, from, to, cc, and date. " +
    "Handles CRLF/LF line endings, folded headers, and RFC 2047 encoded words in Subject/From/To. " +
    'Input: { "filePath": "/path/to/email.eml" }',
  inputSchema: {
    type: "object" as const,
    properties: {
      filePath: {
        type: "string",
        description: "Absolute path to the .eml file to parse",
      },
    },
    required: ["filePath"],
  },
  run: parseEmlHeaders,
};
