/**
 * Deterministic Recovery Score Engine
 * Independent, testable, no AI calls
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

export type ScoringResult = {
  score: number;
  reasons: string[];
  category: "critical" | "high" | "medium" | "low";
};

const KEYWORDS_COMMERCIAL_INTEREST = [
  "interested",
  "interest",
  "хочу",
  "интересно",
  "купить",
  "заказать",
  "price",
  "цена",
  "стоимость",
  "сколько стоит",
  "прайс",
  "buy",
  "purchase",
];

const KEYWORDS_PRODUCT_SPECIFIC = [
  // generic detection: if product field present + message contains product-like details
];

const KEYWORDS_PRICE_REQUEST = [
  "price",
  "quotation",
  "quote",
  "кп",
  "коммерческое предложение",
  "смета",
  "расчет",
  "сколько стоит",
  "цена",
  "прайс",
  "стоимость",
];

const KEYWORDS_THINK = [
  "think",
  "подумаю",
  "подумать",
  "вернусь",
  "come back",
  "later",
  "попозже",
  "обдумаю",
  "посоветуюсь",
];

const KEYWORDS_REJECTION = [
  "not interested",
  "не интересно",
  "не нужно",
  "отказываюсь",
  "не подходит",
  "дорого",
  "отказ",
  "не будем",
  "rejected",
  "reject",
];

const KEYWORDS_WON = [
  "won",
  "выиграли",
  "оплатил",
  "оплачено",
  "сделка закрыта",
  "deal won",
  "closed won",
  "куплено",
];

const KEYWORDS_CANCELLED = [
  "cancelled",
  "canceled",
  "отменено",
  "отмена",
  "cancel",
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

  const combinedText = `${input.lastMessage || ""} ${input.status || ""} ${input.dealStage || ""} ${JSON.stringify(input.rawData || "")}`.toLowerCase();
  const lastMessage = (input.lastMessage || "").toLowerCase();
  const status = (input.status || "").toLowerCase();
  const stage = (input.dealStage || "").toLowerCase();

  // Negative signals first (clamp later, but track)
  if (containsAny(status + " " + stage + " " + lastMessage, KEYWORDS_WON) || status.includes("won") || stage.includes("won") || stage.includes("closed won")) {
    score -= 50;
    reasons.push("Already won (-50)");
  }

  if (containsAny(combinedText, KEYWORDS_REJECTION) && (status.includes("rejected") || status.includes("lost") || combinedText.includes("not interested") || combinedText.includes("не интересно"))) {
    // More precise: explicit rejection
    if (status.includes("rejected") || status.includes("отказ") || containsAny(lastMessage, ["not interested", "не интересно", "не нужно"])) {
      score -= 40;
      reasons.push("Explicit rejection (-40)");
    }
  } else if (status.includes("rejected") || status === "rejected") {
    score -= 40;
    reasons.push("Explicit rejection (-40)");
  }

  if (status.includes("cancelled") || status.includes("canceled") || containsAny(combinedText, KEYWORDS_CANCELLED)) {
    score -= 30;
    reasons.push("Cancelled opportunity (-30)");
  }

  // Positive signals

  // +20 explicit commercial interest
  if (containsAny(combinedText, KEYWORDS_COMMERCIAL_INTEREST)) {
    score += 20;
    reasons.push("Explicit commercial interest (+20)");
  }

  // +15 specific product/service mentioned
  if (input.product && input.product.trim().length > 2) {
    score += 15;
    reasons.push("Specific product mentioned (+15)");
  } else if (combinedText.length > 20 && (combinedText.includes("product") || combinedText.includes("товар") || combinedText.includes("услуга"))) {
    score += 10;
    reasons.push("Product context (+10)");
  }

  // +15 requested price or quotation
  if (containsAny(combinedText, KEYWORDS_PRICE_REQUEST)) {
    score += 15;
    reasons.push("Requested price/quotation (+15)");
  }

  // +10 quotation/proposal sent
  if (stage.includes("proposal") || stage.includes("quotation") || stage.includes("кп") || status.includes("proposal") || combinedText.includes("sent proposal") || combinedText.includes("отправили кп")) {
    score += 10;
    reasons.push("Quotation/proposal sent (+10)");
  }

  // +10 customer replied after quotation
  if ((stage.includes("proposal") || combinedText.includes("quotation")) && lastMessage.length > 10) {
    // If last message exists and contains reply after proposal
    if (containsAny(lastMessage, ["спасибо", "thanks", "получил", "received", "изучим", "посмотрим"])) {
      score += 10;
      reasons.push("Customer replied after quotation (+10)");
    } else if (lastMessage.length > 20) {
      // generic reply after proposal
      score += 5;
      reasons.push("Possible reply after proposal (+5)");
    }
  }

  // +10 high deal value
  if (input.dealValue && input.dealValue >= 100000) {
    score += 10;
    reasons.push("High deal value (+10)");
  } else if (input.dealValue && input.dealValue >= 50000) {
    score += 5;
    reasons.push("Medium-high deal value (+5)");
  }

  // +10 no follow-up after meaningful interaction
  const days = daysSince(input.lastContactAt);
  if (days !== null && days >= 3 && days <= 90) {
    if (score >= 20) {
      // Only if there was meaningful interaction
      score += 10;
      reasons.push(`No follow-up after meaningful interaction, ${days} days ago (+10)`);
    }
  }

  // +5 "I'll think about it" / "I'll come back later"
  if (containsAny(combinedText, KEYWORDS_THINK)) {
    score += 5;
    reasons.push("\"I'll think about it\" signal (+5)");
  }

  // +5 meaningful inactivity
  if (days !== null && days >= 7 && days <= 60) {
    score += 5;
    reasons.push(`Meaningful inactivity ${days}d (+5)`);
  } else if (days !== null && days > 60 && days <= 180) {
    score += 3;
    reasons.push(`Long inactivity ${days}d (+3)`);
  }

  // Clamp 0-100
  const clamped = Math.max(0, Math.min(100, score));

  let category: ScoringResult["category"] = "low";
  if (clamped >= 80) category = "critical";
  else if (clamped >= 60) category = "high";
  else if (clamped >= 40) category = "medium";
  else category = "low";

  return {
    score: clamped,
    reasons,
    category,
  };
}

export function getScoreCategory(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}
