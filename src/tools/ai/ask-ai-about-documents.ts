/**
 * ask-ai-about-documents.ts — Ask DEVONthink's AI a question about specific documents.
 *
 * Resolves each UUID to a DEVONthink record and passes them to DEVONthink's
 * built-in AI feature along with the user's question. Supports optional engine,
 * model, and temperature overrides. Returns the AI-generated answer string.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { jxaLiteral } from "../../jxa/escape.js";
import { JXA_APP } from "../../jxa/helpers.js";

const ENGINE_VALUES = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Mistral AI",
  "GPT4All",
  "LM Studio",
  "Ollama",
] as const;

export const askAiAboutDocumentsTool = defineTool({
  name: "ask_ai_about_documents",
  description:
    "Ask AI questions about specific DEVONthink documents for analysis, comparison, or extraction.",
  schema: z.object({
    documentUuids: z
      .array(z.string())
      .min(1)
      .describe("One or more DEVONthink record UUIDs to use as context for the AI question"),
    question: z
      .string()
      .min(1)
      .max(10000)
      .describe("The question or instruction to send to the AI about the documents"),
    temperature: z
      .number()
      .min(0)
      .max(2)
      .default(0.7)
      .optional()
      .describe("Sampling temperature for the AI response (0 = deterministic, 2 = creative). Defaults to 0.7"),
    model: z
      .string()
      .optional()
      .describe("Optional AI model name to use (e.g. 'gpt-4o', 'claude-3-5-sonnet'). Uses DEVONthink default if omitted"),
    engine: z
      .enum(ENGINE_VALUES)
      .optional()
      .describe("Optional AI engine to use. Uses DEVONthink's configured default if omitted"),
  }),
  run: async (args, executor) => {
    const { documentUuids, question, temperature, model, engine } = args;

    const script = `
      ${JXA_APP}
      var uuids = ${jxaLiteral(documentUuids)};
      var question = ${jxaLiteral(question)};
      var temperature = ${jxaLiteral(temperature ?? 0.7)};
      var modelName = ${jxaLiteral(model ?? null)};
      var engineName = ${jxaLiteral(engine ?? null)};

      // Resolve each UUID to a DEVONthink record
      var records = [];
      for (var i = 0; i < uuids.length; i++) {
        var rec = app.getRecordWithUuid(uuids[i]);
        if (!rec || !rec.uuid()) {
          throw new Error("Record not found for UUID: " + uuids[i]);
        }
        records.push(rec);
      }

      // Build AI call options
      var aiOpts = { record: records, temperature: temperature };
      if (engineName) aiOpts["engine"] = engineName;
      if (modelName) aiOpts["model"] = modelName;

      // Call DEVONthink's AI
      var answer = app.getChatResponseForMessage(question, aiOpts);

      JSON.stringify({
        answer: answer || null,
        documentCount: records.length,
        question: question
      });
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout) as {
      answer: string | null;
      documentCount: number;
      question: string;
    };
  },
});
