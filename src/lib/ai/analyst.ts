import { z } from "zod";
import { aiService } from "./service";
import { calculateRecoveryScore, ScoreFactor } from "../recovery/score";
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
  confidence: z.number().min(0).max(1).optional(),
  missingInformation: z.array(z.string()).optional(),
});

export type AIAnalysisOutput = z.infer<typeof AIAnalysisSchema>;

export type FullAnalysisResult = Omit<AIAnalysisOutput, "confidence"> & {
  recoveryScore: number;
  scoreReasons: string[];
  scoreCategory: "critical" | "high" | "medium" | "low";
  factors: ScoreFactor[];
  businessReasons: string[];
  recoveryProbability: number | null;
  confidence: "low" | "medium" | "high";
  probabilityReason: string;
  potentialRevenue: number | null;
  modelVersion: string;
  isMock: boolean;
  aiConfidence?: number;
  missingInformation?: string[];
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
  const scoring = calculateRecoveryScore(leadData);

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
        aiParsed = fallbackAnalysis(leadData, scoring.score);
        modelVersion = "fallback-v1";
        isMock = true;
      }
    }
  }

  if (!aiParsed) aiParsed = fallbackAnalysis(leadData, scoring.score);

  const probResult = calculateRecoveryProbability({
    ...leadData,
    recoveryScore: scoring.score,
    buyingIntent: aiParsed.buyingIntent,
    hasAIAnalysis: true,
  });

  const potentialRevenue = calculatePotentialRecoverableRevenue({
    dealValue: leadData.dealValue,
    recoveryProbability: probResult.probability,
  });

  // Determine confidence level from probResult
  const confidenceLevel = probResult.confidence;

  const { confidence: aiConf, ...restParsed } = aiParsed;

  return {
    ...restParsed,
    recoveryScore: scoring.score,
    scoreReasons: scoring.reasons,
    scoreCategory: scoring.category,
    factors: scoring.factors,
    businessReasons: scoring.businessReasons,
    recoveryProbability: probResult.probability,
    confidence: confidenceLevel,
    probabilityReason: probResult.reason,
    potentialRevenue,
    modelVersion,
    isMock,
    aiConfidence: aiConf,
    missingInformation: aiParsed.missingInformation,
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
      confidence: 0.9,
      missingInformation: [],
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
      confidence: 0.8,
      missingInformation: [],
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
      confidence: 0.75,
      missingInformation: [],
    };
  }
  return {
    leadStatus: "stalled",
    buyingIntent: "medium",
    lossReason: "no_response",
    recommendedAction: "follow_up_later",
    reasoningSummary: "Lead shows some interest but insufficient recent activity.",
    recommendedMessageGoal: "Gentle check-in.",
    confidence: 0.5,
    missingInformation: ["last contact date", "deal value"],
  };
}
