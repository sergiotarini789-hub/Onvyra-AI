import { z } from "zod";
import { aiService } from "./service";
import { calculateRecoveryScore } from "../recovery/score";
import { calculateRecoveryProbability } from "../recovery/probability";
import { calculatePotentialRecoverableRevenue } from "../recovery/revenue";

export const AIAnalysisSchema = z.object({
  leadStatus: z.enum(["new", "contacted", "qualified", "stalled", "won", "lost", "cancelled", "rejected"]),
  buyingIntent: z.enum(["low", "medium", "high", "unknown"]),
  lossReason: z.enum([
    "no_follow_up",
    "no_response",
    "price",
    "competitor",
    "timing",
    "not_interested",
    "insufficient_data",
    "already_won",
    "rejected",
    "cancelled",
    "other",
    "unknown",
  ]),
  recommendedAction: z.enum(["follow_up_now", "follow_up_later", "no_action", "qualify", "nurture"]),
  reasoningSummary: z.string().min(10).max(500),
  recommendedMessageGoal: z.string().min(5).max(300),
});

export type AIAnalysisOutput = z.infer<typeof AIAnalysisSchema>;

export type FullAnalysisResult = AIAnalysisOutput & {
  recoveryScore: number;
  scoreReasons: string[];
  scoreCategory: "critical" | "high" | "medium" | "low";
  recoveryProbability: number | null;
  confidence: "low" | "medium" | "high";
  potentialRevenue: number | null;
  modelVersion: string;
  isMock: boolean;
};

export async function analyzeLeadWithAI(leadData: {
  id: string;
  name?: string | null;
  product?: string | null;
  dealValue?: number | null;
  dealStage?: string | null;
  status?: string | null;
  lastContactAt?: Date | null;
  lastMessage?: string | null;
  rawData?: any;
}): Promise<FullAnalysisResult> {
  // Step 1: deterministic score
  const scoring = calculateRecoveryScore(leadData);

  // Step 2: AI analysis
  let aiParsed: AIAnalysisOutput | null = null;
  let modelVersion = "v1";
  let isMock = false;
  let retries = 2;

  while (retries >= 0) {
    try {
      const response = await aiService.analyzeLead(leadData);
      modelVersion = response.model;
      isMock = response.isMock;
      const json = JSON.parse(response.content);
      const validated = AIAnalysisSchema.parse(json);
      aiParsed = validated;
      break;
    } catch (e) {
      retries--;
      if (retries < 0) {
        // fallback deterministic analysis based on score
        aiParsed = fallbackAnalysis(leadData, scoring.score);
        modelVersion = "fallback-v1";
        isMock = true;
      }
    }
  }

  if (!aiParsed) {
    aiParsed = fallbackAnalysis(leadData, scoring.score);
  }

  // Step 3: probability
  const probResult = calculateRecoveryProbability({
    ...leadData,
    recoveryScore: scoring.score,
    buyingIntent: aiParsed.buyingIntent,
    hasAIAnalysis: true,
  });

  // Step 4: revenue
  const potentialRevenue = calculatePotentialRecoverableRevenue({
    dealValue: leadData.dealValue,
    recoveryProbability: probResult.probability,
  });

  return {
    ...aiParsed,
    recoveryScore: scoring.score,
    scoreReasons: scoring.reasons,
    scoreCategory: scoring.category,
    recoveryProbability: probResult.probability,
    confidence: probResult.confidence,
    potentialRevenue,
    modelVersion,
    isMock,
  };
}

function fallbackAnalysis(leadData: any, score: number): AIAnalysisOutput {
  const status = (leadData.status || "").toLowerCase();
  if (status.includes("won")) {
    return {
      leadStatus: "won",
      buyingIntent: "high",
      lossReason: "already_won",
      recommendedAction: "no_action",
      reasoningSummary: "Deal already marked as won, no recovery needed.",
      recommendedMessageGoal: "No action needed.",
    };
  }
  if (status.includes("reject")) {
    return {
      leadStatus: "rejected",
      buyingIntent: "low",
      lossReason: "rejected",
      recommendedAction: "no_action",
      reasoningSummary: "Customer explicitly rejected the offer.",
      recommendedMessageGoal: "No action needed.",
    };
  }
  if (score >= 60) {
    return {
      leadStatus: "stalled",
      buyingIntent: "high",
      lossReason: "no_follow_up",
      recommendedAction: "follow_up_now",
      reasoningSummary: "High commercial intent detected but no follow-up after meaningful interaction.",
      recommendedMessageGoal: "Reopen conversation without pressure.",
    };
  }
  return {
    leadStatus: "stalled",
    buyingIntent: "medium",
    lossReason: "no_response",
    recommendedAction: "follow_up_later",
    reasoningSummary: "Lead shows some interest but insufficient recent activity.",
    recommendedMessageGoal: "Gentle check-in.",
  };
}
