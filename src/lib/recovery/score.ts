/**
 * Deterministic Recovery Score Engine 2.0
 * Explainable, testable, extensible
 * Preserves original scoring logic but adds structured factors
 */

export type LeadInputForScoring = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  product?: string | null;
  dealValue?: number | null;
  dealStage?: string | null;
  status?: string | null;
  lastContactAt?: Date | null;
  lastMessage?: string | null;
  rawData?: any;
  source?: string | null;
};

export type ScoreFactor = {
  type: "positive" | "negative";
  signal: string; // e.g., purchase_intent, high_deal_value, inactivity
  points: number;
  explanation: string; // business language
  raw?: string; // technical detail for debugging
};

export type ScoringResult = {
  score: number;
  reasons: string[]; // legacy, for backward compat
  category: "critical" | "high" | "medium" | "low";
  factors: ScoreFactor[]; // new explainable structure
  businessReasons: string[]; // business language reasons
};

const KEYWORDS_COMMERCIAL_INTEREST = [
  "interested", "interest", "хочу", "интересно", "купить", "заказать",
  "price", "цена", "стоимость", "сколько стоит", "прайс", "buy", "purchase",
];

const KEYWORDS_PRICE_REQUEST = [
  "price", "quotation", "quote", "кп", "коммерческое предложение",
  "смета", "расчет", "сколько стоит", "цена", "прайс", "стоимость",
];

const KEYWORDS_THINK = [
  "think", "подумаю", "подумать", "вернусь", "come back", "later", "попозже", "обдумаю", "посоветуюсь",
];

const KEYWORDS_REJECTION = [
  "not interested", "не интересно", "не нужно", "отказываюсь", "не подходит", "дорого", "отказ", "не будем", "rejected", "reject",
];

const KEYWORDS_WON = [
  "won", "выиграли", "оплатил", "оплачено", "сделка закрыта", "deal won", "closed won", "куплено",
];

const KEYWORDS_CANCELLED = [
  "cancelled", "canceled", "отменено", "отмена", "cancel",
];

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

function daysSince(date?: Date | null): number | null {
  if (!date) return null;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function calculateRecoveryScore(input: LeadInputForScoring): ScoringResult {
  let score = 0;
  const reasons: string[] = [];
  const factors: ScoreFactor[] = [];
  const businessReasons: string[] = [];

  const combinedText = `${input.lastMessage || ""} ${input.status || ""} ${input.dealStage || ""} ${JSON.stringify(input.rawData || "")}`.toLowerCase();
  const lastMessage = (input.lastMessage || "").toLowerCase();
  const status = (input.status || "").toLowerCase();
  const stage = (input.dealStage || "").toLowerCase();

  function addFactor(type: "positive" | "negative", signal: string, points: number, explanation: string, raw?: string) {
    factors.push({ type, signal, points, explanation, raw });
    score += points;
    if (type === "positive") {
      reasons.push(`${explanation} (${points > 0 ? "+" : ""}${points})`);
      businessReasons.push(explanation);
    } else {
      reasons.push(`${explanation} (${points})`);
      // negative factors still explain why not recoverable, but we keep businessReasons for positive mainly
    }
  }

  // Negative signals
  if (containsAny(status + " " + stage + " " + lastMessage, KEYWORDS_WON) || status.includes("won") || stage.includes("won") || stage.includes("closed won")) {
    addFactor("negative", "already_won", -50, "Deal already marked as won — no recovery needed", "Status indicates won");
  }

  if (containsAny(combinedText, KEYWORDS_REJECTION) && (status.includes("rejected") || status.includes("lost") || combinedText.includes("not interested") || combinedText.includes("не интересно"))) {
    if (status.includes("rejected") || status.includes("отказ") || containsAny(lastMessage, ["not interested", "не интересно", "не нужно"])) {
      addFactor("negative", "explicit_rejection", -40, "Customer explicitly rejected the offer", "Rejection signal detected");
    }
  } else if (status.includes("rejected") || status === "rejected") {
    addFactor("negative", "explicit_rejection", -40, "Customer explicitly rejected the offer", "Status = rejected");
  }

  if (status.includes("cancelled") || status.includes("canceled") || containsAny(combinedText, KEYWORDS_CANCELLED)) {
    addFactor("negative", "cancelled", -30, "Opportunity was cancelled", "Cancelled signal");
  }

  // Positive signals
  if (containsAny(combinedText, KEYWORDS_COMMERCIAL_INTEREST)) {
    addFactor("positive", "purchase_intent", 20, "Customer explicitly indicated interest in purchasing", "Commercial interest keywords found");
  }

  if (input.product && input.product.trim().length > 2) {
    addFactor("positive", "product_relevance", 15, `Specific product/service mentioned: ${input.product}`, "Product field filled");
  } else if (combinedText.length > 20 && (combinedText.includes("product") || combinedText.includes("товар") || combinedText.includes("услуга"))) {
    addFactor("positive", "product_relevance", 10, "Product context detected in conversation", "Product keyword in text");
  }

  if (containsAny(combinedText, KEYWORDS_PRICE_REQUEST)) {
    addFactor("positive", "price_request", 15, "Customer requested pricing or quotation", "Price request keywords");
  }

  if (stage.includes("proposal") || stage.includes("quotation") || stage.includes("кп") || status.includes("proposal") || combinedText.includes("sent proposal") || combinedText.includes("отправили кп")) {
    addFactor("positive", "proposal_sent", 10, "Quotation or proposal was sent", "Proposal stage detected");
  }

  if ((stage.includes("proposal") || combinedText.includes("quotation")) && lastMessage.length > 10) {
    if (containsAny(lastMessage, ["спасибо", "thanks", "получил", "received", "изучим", "посмотрим"])) {
      addFactor("positive", "reply_after_proposal", 10, "Customer replied after receiving proposal", "Reply after quotation");
    } else if (lastMessage.length > 20) {
      addFactor("positive", "reply_after_proposal", 5, "Possible reply after proposal detected", "Generic reply");
    }
  }

  if (input.dealValue && input.dealValue >= 100000) {
    addFactor("positive", "high_deal_value", 10, `High deal value: ₽${Math.round(input.dealValue).toLocaleString("ru-RU")}`, `Value ${input.dealValue}`);
  } else if (input.dealValue && input.dealValue >= 50000) {
    addFactor("positive", "high_deal_value", 5, `Above-average deal value: ₽${Math.round(input.dealValue).toLocaleString("ru-RU")}`, `Value ${input.dealValue}`);
  }

  const days = daysSince(input.lastContactAt);
  if (days !== null && days >= 3 && days <= 90) {
    if (score >= 20) {
      addFactor("positive", "no_follow_up", 10, `No follow-up after meaningful interaction, ${days} days ago`, `${days}d since contact`);
    }
  }

  if (containsAny(combinedText, KEYWORDS_THINK)) {
    addFactor("positive", "think_signal", 5, "Customer asked for time to think — indicates consideration", "\"I'll think about it\" detected");
  }

  if (days !== null && days >= 7 && days <= 60) {
    addFactor("positive", "inactivity", 5, `Meaningful inactivity: ${days} days without contact`, `${days}d inactivity`);
  } else if (days !== null && days > 60 && days <= 180) {
    addFactor("positive", "inactivity", 3, `Long inactivity: ${days} days — opportunity may be forgotten`, `${days}d inactivity`);
  } else if (days !== null && days > 180) {
    addFactor("negative", "long_inactivity", -10, `Very long inactivity: ${days} days — low chance of recovery`, `${days}d`);
  }

  // Data completeness bonus
  let completeness = 0;
  let total = 6;
  if (input.name) completeness++;
  if (input.email || input.phone) completeness++;
  if (input.product) completeness++;
  if (input.dealValue) completeness++;
  if (input.lastContactAt) completeness++;
  if (input.lastMessage) completeness++;
  const compRatio = completeness / total;
  if (compRatio >= 0.8) {
    addFactor("positive", "complete_data", 5, "Complete customer data available", `${Math.round(compRatio * 100)}% complete`);
  }

  // Clamp 0-100
  const rawScore = score;
  const clamped = Math.max(0, Math.min(100, score));

  let category: ScoringResult["category"] = "low";
  if (clamped >= 80) category = "critical";
  else if (clamped >= 60) category = "high";
  else if (clamped >= 40) category = "medium";
  else category = "low";

  // If clamped differs from raw, add factor for clamping (for transparency, not affecting score)
  // We don't add points for clamp, just note

  return {
    score: clamped,
    reasons,
    category,
    factors,
    businessReasons,
  };
}

export function getScoreCategory(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function getScoreCategoryLabel(category: string): string {
  switch (category) {
    case "critical": return "CRITICAL";
    case "high": return "HIGH";
    case "medium": return "MEDIUM";
    case "low": return "LOW";
    default: return category.toUpperCase();
  }
}
