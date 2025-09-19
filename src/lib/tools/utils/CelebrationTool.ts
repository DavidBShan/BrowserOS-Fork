import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ExecutionContext } from "@/lib/runtime/ExecutionContext";
import { Logging } from "@/lib/utils/Logging";
import { CONFETTI_SCRIPT } from "@/lib/utils/confetti";

/**
 * Creates a celebration tool for showing confetti animation
 * @param context - The execution context
 * @returns A DynamicStructuredTool for celebrations
 */
export function createCelebrationTool(context: ExecutionContext): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "celebration_tool",
    description: "Shows a confetti celebration animation on the current page. Use this to celebrate successful actions like upvoting or starring.",
    schema: z.object({}),  // No parameters needed
    func: async () => {
      try {
        Logging.log("CelebrationTool", "Showing confetti celebration");

        // Get current page
        const page = await context.browserContext.getCurrentPage();
        if (!page) {
          return JSON.stringify({
            ok: false,
            output: "No active page to show celebration"
          });
        }

        // Execute confetti script
        await page.executeJavaScript(CONFETTI_SCRIPT);

        return JSON.stringify({
          ok: true,
          output: "Confetti celebration shown!"
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logging.log("CelebrationTool", `Failed to show celebration: ${errorMessage}`, "error");

        return JSON.stringify({
          ok: false,
          output: `Failed to show celebration: ${errorMessage}`
        });
      }
    }
  });
}