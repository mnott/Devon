/**
 * check-ai-health.ts — Check if DEVONthink's AI services are available.
 *
 * Probes DEVONthink AI by attempting a lightweight operation. Returns a
 * structured availability report with a human-readable message so callers
 * can decide whether to proceed with more expensive AI tool calls.
 */

import { z } from "zod";
import { defineTool } from "../../jxa/types.js";
import { JXA_APP } from "../../jxa/helpers.js";

export const checkAiHealthTool = defineTool({
  name: "check_ai_health",
  description:
    "Check if DEVONthink's AI services are available and working properly.",
  schema: z.object({}),
  run: async (_args, executor) => {
    const script = `
      ${JXA_APP}

      var available = false;
      var message = "";
      var model = null;

      try {
        // Attempt a lightweight AI probe: ask a trivial question with no documents.
        // DEVONthink will throw if the AI engine is unavailable or misconfigured.
        var testAnswer = app.getChatResponseForMessage("Reply with the single word: OK", { temperature: 0 });
        available = true;
        message = "DEVONthink AI is available and responding.";
      } catch (e) {
        available = false;
        message = e.message || String(e);
      }

      JSON.stringify({ available: available, message: message, model: model });
    `;

    const result = executor.run(script);
    return JSON.parse(result.stdout) as {
      available: boolean;
      message: string;
      model: string | null;
    };
  },
});
