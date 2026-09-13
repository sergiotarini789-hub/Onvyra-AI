import { z } from "zod";
import { aiService } from "./service";

export const MessageSchema = z.object({
  message: z.string().min(10).max(1000),
  goal: z.string().optional(),
});

export async function generateFollowUpMessage(
  leadData: {
    id?: string;
    name?: string | null;
    company?: string | null;
    product?: string | null;
    dealStage?: string | null;
    dealValue?: number | null;
    lastMessage?: string | null;
  },
  analysis: {
    lossReason?: string | null;
    recommendedAction?: string | null;
    recommendedMessageGoal?: string | null;
  }
): Promise<{ message: string; goal: string; model: string; isMock: boolean }> {
  let retries = 2;
  while (retries >= 0) {
    try {
      const response = await aiService.generateMessage(leadData, analysis);
      const json = JSON.parse(response.content);
      const parsed = MessageSchema.parse(json);
      return {
        message: parsed.message,
        goal: parsed.goal || analysis.recommendedMessageGoal || "Reopen conversation",
        model: response.model,
        isMock: response.isMock,
      };
    } catch (e) {
      retries--;
      if (retries < 0) {
        // fallback
        const name = leadData.name || "there";
        const product = leadData.product ? ` about ${leadData.product}` : "";
        return {
          message: `Hi ${name}, just following up${product}. Wanted to check if you had any questions after our last conversation. Happy to help whenever you're ready — no pressure.`,
          goal: analysis.recommendedMessageGoal || "Reopen conversation",
          model: "fallback-v1",
          isMock: true,
        };
      }
    }
  }
  throw new Error("Failed to generate message");
}
