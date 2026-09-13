/**
 * AI Service Layer - isolates LLM provider calls
 * Never call LLM directly from React components
 */

import { z } from "zod";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

export type AIServiceOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export type AIResponse = {
  content: string;
  model: string;
  usage?: any;
  isMock: boolean;
};

async function callOpenAI(prompt: string, systemPrompt: string, options: AIServiceOptions = {}): Promise<AIResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: options.model || OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  return {
    content,
    model: data.model || options.model || OPENAI_MODEL,
    usage: data.usage,
    isMock: false,
  };
}

// Mock fallback for development without API key
function mockAnalystResponse(leadData: any): AIResponse {
  const text = (leadData.lastMessage || leadData.rawData || "").toString().toLowerCase();
  const hasPrice = text.includes("price") || text.includes("цена") || text.includes("стоимость") || text.includes("quotation");
  const hasThink = text.includes("подумаю") || text.includes("think") || text.includes("вернусь");
  const isRejected = (leadData.status || "").toLowerCase().includes("reject") || text.includes("не интересно") || text.includes("not interested");
  const isWon = (leadData.status || "").toLowerCase().includes("won");

  let leadStatus = "stalled";
  let buyingIntent = "medium";
  let lossReason = "no_follow_up";
  let recommendedAction = "follow_up_now";
  let reasoning = "Customer showed interest but conversation stalled without clear rejection.";
  let goal = "Reopen the conversation without pressure.";

  if (isWon) {
    leadStatus = "won";
    buyingIntent = "high";
    lossReason = "already_won";
    recommendedAction = "no_action";
    reasoning = "Deal already marked as won.";
    goal = "No action needed.";
  } else if (isRejected) {
    leadStatus = "lost";
    buyingIntent = "low";
    lossReason = "rejected";
    recommendedAction = "no_action";
    reasoning = "Customer explicitly rejected the offer.";
    goal = "No action needed.";
  } else if (hasPrice) {
    buyingIntent = "high";
    lossReason = "no_follow_up";
    reasoning = "The customer requested a quotation and did not explicitly reject the offer. No follow-up occurred after the quotation.";
    goal = "Reopen the conversation without pressure, referencing the quotation.";
  } else if (hasThink) {
    buyingIntent = "medium";
    lossReason = "timing";
    reasoning = "Customer asked for time to think, indicating consideration but not commitment.";
    goal = "Gentle follow-up to check decision status.";
  }

  const mockJson = JSON.stringify({
    leadStatus,
    buyingIntent,
    lossReason,
    recommendedAction,
    reasoningSummary: reasoning,
    recommendedMessageGoal: goal,
  });

  return {
    content: mockJson,
    model: "mock-v1",
    isMock: true,
  };
}

function mockMessageResponse(leadData: any, analysis: any): AIResponse {
  const name = leadData.name || "there";
  const product = leadData.product ? ` regarding ${leadData.product}` : "";
  const goal = analysis?.recommendedMessageGoal || "reopen conversation";

  const templates = [
    `Hi ${name}, hope you're doing well! Just following up${product}. You had asked about details and we sent over information. Wanted to check if you had any questions or if there's anything I can clarify. No pressure at all — happy to help whenever you're ready.`,
    `${name}, quick check-in${product}. Last time we spoke you mentioned you'd think about it. I wanted to see if any new questions came up. If timing wasn't right, I completely understand — just let me know if you'd like to revisit.`,
    `Hello ${name}! Following up on our previous conversation${product}. I noticed we hadn't connected after the quotation. If you need an updated proposal or have new requirements, I'm happy to assist. Let me know what works best for you.`,
  ];

  // deterministic selection based on lead id hash
  const id = leadData.id || "0";
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % templates.length;
  const message = templates[hash];

  return {
    content: JSON.stringify({ message, goal }),
    model: "mock-v1",
    isMock: true,
  };
}

function mockColumnMapping(columns: string[]): AIResponse {
  // Simple heuristic mapping for Russian/English columns - order matters, specific first
  const mapping: Record<string, string> = {};
  const lowerCols = columns.map((c) => c.toLowerCase());

  const rules: Record<string, string[]> = {
    lastContactAt: ["последний контакт", "last contact", "last contacted", "contact date", "дата контакта"],
    dealValue: ["сумма", "deal value", "deal amount", "бюджет", "amount", "цена", "стоимость"],
    lastMessage: ["комментарий", "comment", "сообщение", "message", "примечание", "note", "история", "conversation"],
    phone: ["телефон", "phone", "тел", "мобильный", "номер"],
    email: ["email", "почта", "e-mail", "эл. почта"],
    company: ["компания", "company", "организация", "фирма"],
    product: ["товар", "product", "услуга", "service"],
    manager: ["менеджер", "manager", "ответственный"],
    dealStage: ["стадия сделки", "deal stage", "этап сделки", "стадия", "stage", "этап"],
    status: ["статус сделки", "lead status", "статус", "status", "состояние"],
    source: ["источник", "source", "откуда"],
    name: ["имя", "фио", "клиент", "customer", "контактное лицо", "full name", "name"],
  };

  columns.forEach((col, idx) => {
    const lower = lowerCols[idx];
    for (const [target, keywords] of Object.entries(rules)) {
      if (keywords.some((k) => lower.includes(k))) {
        mapping[col] = target;
        break;
      }
    }
    if (!mapping[col]) mapping[col] = "rawData";
  });

  return {
    content: JSON.stringify({ mapping }),
    model: "mock-v1",
    isMock: true,
  };
}

export class AIService {
  async analyzeLead(leadData: any): Promise<AIResponse> {
    const systemPrompt = `You are an expert B2B sales analyst for Onvyra. Analyze leads and identify stalled opportunities.
Return ONLY valid JSON with this structure:
{
  "leadStatus": "new|contacted|qualified|stalled|won|lost|cancelled|rejected",
  "buyingIntent": "low|medium|high|unknown",
  "lossReason": "no_follow_up|no_response|price|competitor|timing|not_interested|insufficient_data|already_won|rejected|cancelled|other|unknown",
  "recommendedAction": "follow_up_now|follow_up_later|no_action|qualify|nurture",
  "reasoningSummary": "1-2 sentence explanation why this lead is recoverable or not",
  "recommendedMessageGoal": "Goal for follow-up message"
}
Be conservative, never invent data.`;

    const userPrompt = `Analyze this lead:
Name: ${leadData.name || "unknown"}
Product: ${leadData.product || "unknown"}
Deal Value: ${leadData.dealValue || "unknown"}
Deal Stage: ${leadData.dealStage || "unknown"}
Status: ${leadData.status || "unknown"}
Last Contact: ${leadData.lastContactAt || "unknown"}
Last Message: ${leadData.lastMessage || "none"}
Raw Data: ${JSON.stringify(leadData.rawData || {}).slice(0, 1000)}

Return JSON only.`;

    try {
      if (!OPENAI_API_KEY) return mockAnalystResponse(leadData);
      return await callOpenAI(userPrompt, systemPrompt, { temperature: 0.2, maxTokens: 500 });
    } catch (e) {
      console.warn("AI analyst fallback to mock:", e);
      return mockAnalystResponse(leadData);
    }
  }

  async generateMessage(leadData: any, analysis: any): Promise<AIResponse> {
    const systemPrompt = `You are a professional B2B sales assistant. Generate personalized, low-pressure follow-up messages.
Rules:
- Use only provided data, never invent prices, discounts, deadlines, specs, promises
- Be contextual, not generic
- Keep tone professional, friendly, helpful
- Max 3-4 sentences
- No excessive formatting
- Return JSON: {"message": "...", "goal": "..."}`;

    const userPrompt = `Generate follow-up for:
Customer: ${leadData.name || "customer"}
Company: ${leadData.company || "unknown"}
Product: ${leadData.product || "unknown"}
Deal Stage: ${leadData.dealStage || "unknown"}
Last Message: ${leadData.lastMessage || "none"}
Loss Reason: ${analysis?.lossReason || "unknown"}
Recommended Action: ${analysis?.recommendedAction || "follow_up_now"}
Message Goal: ${analysis?.recommendedMessageGoal || "Reopen conversation"}

Return JSON only with message.`;

    try {
      if (!OPENAI_API_KEY) return mockMessageResponse(leadData, analysis);
      return await callOpenAI(userPrompt, systemPrompt, { temperature: 0.7, maxTokens: 400 });
    } catch (e) {
      console.warn("AI message fallback to mock:", e);
      return mockMessageResponse(leadData, analysis);
    }
  }

  async suggestColumnMapping(columns: string[]): Promise<AIResponse> {
    const systemPrompt = `You are a data mapping assistant. Given CSV/XLSX column names, suggest mapping to standard fields.
Standard fields: name, phone, email, company, manager, product, dealValue, dealStage, status, lastContactAt, source, lastMessage, rawData
Return JSON: {"mapping": {"OriginalColumn": "standardField"}}`;

    const userPrompt = `Columns: ${columns.join(", ")}
Map each to standard field. Example: Имя → name, Телефон → phone, Сумма → dealValue.
Return JSON only.`;

    try {
      if (!OPENAI_API_KEY) return mockColumnMapping(columns);
      return await callOpenAI(userPrompt, systemPrompt, { temperature: 0.1, maxTokens: 500 });
    } catch (e) {
      console.warn("AI mapping fallback to mock:", e);
      return mockColumnMapping(columns);
    }
  }
}

export const aiService = new AIService();
