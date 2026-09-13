import { LeadInputForScoring } from "./score";

export type ProbabilityInput = LeadInputForScoring & {
  recoveryScore: number;
  buyingIntent?: string | null;
  hasAIAnalysis?: boolean;
  dataCompleteness?: number; // 0-1
};

export type ProbabilityResult = {
  probability: number | null; // 0-1
  confidence: "low" | "medium" | "high";
  reason: string;
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

  // Insufficient data case
  if (completeness < 0.3 || score === 0) {
    return {
      probability: null,
      confidence: "low",
      reason: "Insufficient data to estimate probability",
    };
  }

  // If explicit negative status, low probability
  const status = (input.status || "").toLowerCase();
  if (status.includes("won")) {
    return {
      probability: 0.05,
      confidence: "high",
      reason: "Already won, minimal recovery chance",
    };
  }
  if (status.includes("rejected") || status.includes("cancelled") || status.includes("canceled")) {
    return {
      probability: 0.1,
      confidence: "medium",
      reason: "Explicit rejection/cancellation lowers probability",
    };
  }

  // Base probability from score
  let prob = score / 100; // 0-1

  // Adjust by deal value (higher value slightly lower prob but higher impact)
  if (input.dealValue && input.dealValue > 500000) {
    prob *= 0.9; // enterprise deals harder to recover
  }

  // Adjust by buying intent
  if (input.buyingIntent === "high") prob = Math.min(0.95, prob + 0.15);
  else if (input.buyingIntent === "medium") prob = Math.min(0.85, prob + 0.05);
  else if (input.buyingIntent === "low") prob = Math.max(0.05, prob - 0.15);
  else if (input.buyingIntent === "unknown") prob *= 0.9;

  // Adjust by inactivity
  if (input.lastContactAt) {
    const days = Math.floor((Date.now() - input.lastContactAt.getTime()) / (1000 * 60 * 60 * 24));
    if (days > 90) prob *= 0.7;
    else if (days > 60) prob *= 0.8;
    else if (days < 7) prob *= 1.1;
  }

  // Adjust by data completeness
  if (completeness < 0.5) prob *= 0.8;

  // Clamp
  prob = Math.max(0.05, Math.min(0.95, prob));

  // Confidence based on completeness and score consistency
  let confidence: "low" | "medium" | "high" = "medium";
  if (completeness >= 0.7 && input.hasAIAnalysis) confidence = "high";
  else if (completeness < 0.4 || score < 20) confidence = "low";
  else confidence = "medium";

  // If low confidence and low completeness, return null per spec? Spec says if insufficient data -> null
  // We already handled <0.3. For low confidence we still give prob but mark low.

  return {
    probability: Math.round(prob * 100) / 100, // 2 decimals
    confidence,
    reason: `Calculated from score ${score}, completeness ${Math.round(completeness * 100)}%, intent ${input.buyingIntent || "unknown"}`,
  };
}
