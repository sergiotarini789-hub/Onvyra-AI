import { LeadInputForScoring } from "./score";

export type ProbabilityInput = LeadInputForScoring & {
  recoveryScore: number;
  buyingIntent?: string | null;
  hasAIAnalysis?: boolean;
  dataCompleteness?: number; // 0-1
  dealStage?: string | null;
};

export type ProbabilityBreakdown = {
  base: number;
  adjustments: Array<{ factor: string; delta: number; explanation: string }>;
  final: number;
};

export type ProbabilityResult = {
  probability: number | null; // 0-1
  confidence: "low" | "medium" | "high";
  reason: string;
  breakdown?: ProbabilityBreakdown;
  missingInfo?: string[];
};

function calculateDataCompleteness(input: LeadInputForScoring): number {
  let filled = 0;
  let total = 6;
  if (input.name) filled++;
  if (input.email || input.phone) filled++;
  if (input.product) filled++;
  if (input.dealValue) filled++;
  if (input.lastContactAt) filled++;
  if (input.lastMessage) filled++;
  return filled / total;
}

export function calculateRecoveryProbability(input: ProbabilityInput): ProbabilityResult {
  const completeness = input.dataCompleteness ?? calculateDataCompleteness(input);
  const score = input.recoveryScore;

  const missingInfo: string[] = [];
  if (!input.name) missingInfo.push("customer name");
  if (!input.email && !input.phone) missingInfo.push("contact info");
  if (!input.product) missingInfo.push("product");
  if (!input.dealValue) missingInfo.push("deal value");
  if (!input.lastContactAt) missingInfo.push("last contact date");
  if (!input.lastMessage) missingInfo.push("conversation history");

  const status = (input.status || "").toLowerCase();
  // Terminal states have probability even with low completeness — we know outcome
  if (status.includes("won")) {
    return {
      probability: 0.05,
      confidence: "high",
      reason: "Already won, minimal recovery chance",
      breakdown: { base: score / 100, adjustments: [{ factor: "already_won", delta: -0.9, explanation: "Deal already won" }], final: 0.05 },
      missingInfo,
    };
  }
  if (status.includes("rejected") || status.includes("cancelled") || status.includes("canceled")) {
    return {
      probability: 0.1,
      confidence: "medium",
      reason: "Explicit rejection/cancellation lowers probability",
      breakdown: { base: score / 100, adjustments: [{ factor: "rejected", delta: -0.5, explanation: "Explicit rejection" }], final: 0.1 },
      missingInfo,
    };
  }

  // Insufficient data case - critical: never invent probability, except terminal already handled
  if (completeness < 0.3 || score === 0) {
    return {
      probability: null,
      confidence: "low",
      reason: "Insufficient data to estimate probability — missing " + missingInfo.slice(0, 3).join(", "),
      missingInfo,
    };
  }

  let prob = score / 100;
  const adjustments: ProbabilityBreakdown["adjustments"] = [];
  const base = prob;

  if (input.dealValue && input.dealValue > 500000) {
    const delta = prob * 0.9 - prob;
    adjustments.push({ factor: "high_deal_value", delta, explanation: "Enterprise deal (>₽500k) slightly harder to recover" });
    prob *= 0.9;
  }

  if (input.buyingIntent === "high") {
    const newProb = Math.min(0.95, prob + 0.15);
    adjustments.push({ factor: "high_intent", delta: newProb - prob, explanation: "High buying intent increases probability" });
    prob = newProb;
  } else if (input.buyingIntent === "medium") {
    const newProb = Math.min(0.85, prob + 0.05);
    adjustments.push({ factor: "medium_intent", delta: newProb - prob, explanation: "Medium buying intent" });
    prob = newProb;
  } else if (input.buyingIntent === "low") {
    const newProb = Math.max(0.05, prob - 0.15);
    adjustments.push({ factor: "low_intent", delta: newProb - prob, explanation: "Low buying intent reduces probability" });
    prob = newProb;
  } else if (input.buyingIntent === "unknown") {
    const newProb = prob * 0.9;
    adjustments.push({ factor: "unknown_intent", delta: newProb - prob, explanation: "Unknown intent, conservative estimate" });
    prob = newProb;
  }

  if (input.lastContactAt) {
    const days = Math.floor((Date.now() - input.lastContactAt.getTime()) / (1000 * 60 * 60 * 24));
    if (days > 90) {
      const newProb = prob * 0.7;
      adjustments.push({ factor: "long_inactivity", delta: newProb - prob, explanation: `Long inactivity ${days}d reduces probability` });
      prob = newProb;
    } else if (days > 60) {
      const newProb = prob * 0.8;
      adjustments.push({ factor: "inactivity", delta: newProb - prob, explanation: `Inactivity ${days}d` });
      prob = newProb;
    } else if (days < 7) {
      const newProb = Math.min(0.95, prob * 1.1);
      adjustments.push({ factor: "recent_contact", delta: newProb - prob, explanation: `Recent contact ${days}d ago increases probability` });
      prob = newProb;
    }
  }

  if (completeness < 0.5) {
    const newProb = prob * 0.8;
    adjustments.push({ factor: "incomplete_data", delta: newProb - prob, explanation: `Incomplete data (${Math.round(completeness * 100)}%) reduces confidence` });
    prob *= 0.8;
  }

  // Deal stage adjustment
  const stage = (input.dealStage || "").toLowerCase();
  if (stage.includes("proposal") || stage.includes("quotation") || stage.includes("negotiation")) {
    const newProb = Math.min(0.9, prob + 0.05);
    adjustments.push({ factor: "advanced_stage", delta: newProb - prob, explanation: "Advanced deal stage (proposal/negotiation)" });
    prob = newProb;
  }

  prob = Math.max(0.05, Math.min(0.95, prob));

  let confidence: "low" | "medium" | "high" = "medium";
  if (completeness >= 0.7 && input.hasAIAnalysis) confidence = "high";
  else if (completeness < 0.4 || score < 20) confidence = "low";
  else confidence = "medium";

  return {
    probability: Math.round(prob * 100) / 100,
    confidence,
    reason: `Calculated from recovery score ${score}, data completeness ${Math.round(completeness * 100)}%, buying intent ${input.buyingIntent || "unknown"}`,
    breakdown: { base, adjustments, final: Math.round(prob * 100) / 100 },
    missingInfo: missingInfo.length > 0 ? missingInfo : undefined,
  };
}
