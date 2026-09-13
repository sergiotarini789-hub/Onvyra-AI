/**
 * AI Service Layer - Production Ready
 * - Real OpenAI provider with timeout, retry, cost control
 * - Mock fallback for dev when no API key
 * - Never call LLM directly from React components
 * - Structured outputs, no fabricated data
 * - Token tracking and caching per org
 */

import { z } from "zod";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_TIMEOUT_MS = parseInt(process.env.OPENAI_TIMEOUT_MS || "30000", 10);
const OPENAI_MAX_RETRIES = parseInt(process.env.OPENAI_MAX_RETRIES || "2", 10);

export type AIServiceOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  orgId?: string;
};

export type AIResponse = {
  content: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  isMock: boolean;
  cached?: boolean;
};

class AIError extends Error {
  constructor(message: string, public statusCode?: number, public retryable = false) {
    super(message);
    this.name = "AIError";
  }
}

async function callOpenAIWithRetry(prompt: string, systemPrompt: string, options: AIServiceOptions = {}): Promise<AIResponse> {
  if (!OPENAI_API_KEY) {
    throw new AIError("OPENAI_API_KEY not configured", 401, false);
  }

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= OPENAI_MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
      
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
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        const status = response.status;
        
        // Retryable errors: 429, 500, 502, 503, 504
        const retryable = status === 429 || status >= 500;
        
        if (status === 429) {
          // Rate limited - exponential backoff
          const retryAfter = response.headers.get("Retry-After");
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000;
          console.warn(`[ai] Rate limited, retrying after ${delay}ms (attempt ${attempt + 1})`);
          if (attempt < OPENAI_MAX_RETRIES) {
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
        }
        
        if (retryable && attempt < OPENAI_MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[ai] Retryable error ${status}, retrying after ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        
        throw new AIError(`OpenAI API error: ${status} ${errText.slice(0, 500)}`, status, retryable);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      
      if (!content) {
        throw new AIError("Empty response from OpenAI", 500, true);
      }
      
      return {
        content,
        model: data.model || options.model || OPENAI_MODEL,
        usage: data.usage,
        isMock: false,
      };
    } catch (e: any) {
      lastError = e;
      
      if (e.name === "AbortError") {
        console.warn(`[ai] Request timeout after ${OPENAI_TIMEOUT_MS}ms (attempt ${attempt + 1})`);
        if (attempt < OPENAI_MAX_RETRIES) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
          continue;
        }
        throw new AIError(`OpenAI request timeout after ${OPENAI_TIMEOUT_MS}ms`, 504, true);
      }
      
      if (e instanceof AIError && !e.retryable) {
        throw e;
      }
      
      if (attempt < OPENAI_MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[ai] Error, retrying after ${delay}ms:`, e.message);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }
  }
  
  throw lastError || new AIError("Failed after retries", 500, false);
}

// Mock fallback for development without API key - deterministic, no fabricated revenue
function mockAnalystResponse(leadData: any): AIResponse {
  const text = (leadData.lastMessage || leadData.rawData || "").toString().toLowerCase();
  const hasPrice = text.includes("price") || text.includes("цена") || text.includes("стоимость") || text.includes("quotation");
  const hasThink = text.includes("подумаю") || text.includes("think") || text.includes("вернусь");
  const isRejected = (leadData.status || "").toLowerCase().includes("reject") || text.includes("не интересно") || text.includes("not interested");
  const isWon = (leadData.status || "").toLowerCase().includes("won");
  const isCancelled = (leadData.status || "").toLowerCase().includes("cancel");

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
  } else if (isCancelled) {
    leadStatus = "cancelled";
    buyingIntent = "low";
    lossReason = "cancelled";
    recommendedAction = "no_action";
    reasoning = "Customer cancelled the deal.";
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

// Simple in-memory cache per org for AI results (production should use Redis)
type CacheEntry = { response: AIResponse; timestamp: number };
const analysisCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCacheKey(orgId: string, leadId: string, type: string): string {
  return `${orgId}:${type}:${leadId}`;
}

function getCached(orgId: string, leadId: string, type: string): AIResponse | null {
  const key = getCacheKey(orgId, leadId, type);
  const entry = analysisCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    analysisCache.delete(key);
    return null;
  }
  return { ...entry.response, cached: true };
}

function setCached(orgId: string, leadId: string, type: string, response: AIResponse) {
  const key = getCacheKey(orgId, leadId, type);
  analysisCache.set(key, { response, timestamp: Date.now() });
  
  // Simple LRU - keep max 1000 entries
  if (analysisCache.size > 1000) {
    const firstKey = analysisCache.keys().next().value;
    if (firstKey) analysisCache.delete(firstKey);
  }
}

export class AIService {
  private costTracker = new Map<string, { tokens: number; calls: number }>();
  
  async analyzeLead(leadData: any, orgId?: string): Promise<AIResponse> {
    // Check cache
    if (orgId && leadData.id) {
      const cached = getCached(orgId, leadData.id, "analyze");
      if (cached) {
        console.log(`[ai] Cache hit for analyze ${orgId}:${leadData.id}`);
        return cached;
      }
    }
    
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
Be conservative, never invent data. Base analysis only on provided information.`;

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
      const result = await callOpenAIWithRetry(userPrompt, systemPrompt, { temperature: 0.2, maxTokens: 500, orgId });
      
      // Track usage
      if (orgId && result.usage) {
        this.trackUsage(orgId, result.usage.total_tokens || 0);
      }
      
      // Cache
      if (orgId && leadData.id) {
        setCached(orgId, leadData.id, "analyze", result);
      }
      
      return result;
    } catch (e) {
      console.warn("[ai] analyst fallback to mock:", (e as Error).message);
      return mockAnalystResponse(leadData);
    }
  }

  async generateMessage(leadData: any, analysis: any, orgId?: string): Promise<AIResponse> {
    // Messages are more dynamic, cache for shorter time or not at all
    // But we can cache if same analysis
    const cacheKey = analysis ? JSON.stringify(analysis).slice(0, 100) : "";
    if (orgId && leadData.id && cacheKey) {
      const cached = getCached(orgId, `${leadData.id}:${cacheKey}`, "message");
      if (cached) {
        console.log(`[ai] Cache hit for message ${orgId}:${leadData.id}`);
        return cached;
      }
    }
    
    const systemPrompt = `You are a professional B2B sales assistant. Generate personalized, low-pressure follow-up messages.
Rules:
- Use only provided data, never invent prices, discounts, deadlines, specs, promises
- Be contextual, not generic
- Keep tone professional, friendly, helpful
- Max 3-4 sentences
- No excessive formatting
- No fabricated incentives
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
      const result = await callOpenAIWithRetry(userPrompt, systemPrompt, { temperature: 0.7, maxTokens: 400, orgId });
      
      if (orgId && result.usage) {
        this.trackUsage(orgId, result.usage.total_tokens || 0);
      }
      
      if (orgId && leadData.id && cacheKey) {
        setCached(orgId, `${leadData.id}:${cacheKey}`, "message", result);
      }
      
      return result;
    } catch (e) {
      console.warn("[ai] message fallback to mock:", (e as Error).message);
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
      return await callOpenAIWithRetry(userPrompt, systemPrompt, { temperature: 0.1, maxTokens: 500 });
    } catch (e) {
      console.warn("[ai] mapping fallback to mock:", (e as Error).message);
      return mockColumnMapping(columns);
    }
  }
  
  private trackUsage(orgId: string, tokens: number) {
    const existing = this.costTracker.get(orgId) || { tokens: 0, calls: 0 };
    existing.tokens += tokens;
    existing.calls += 1;
    this.costTracker.set(orgId, existing);
  }
  
  getUsageStats(orgId: string): { tokens: number; calls: number } | null {
    return this.costTracker.get(orgId) || null;
  }
  
  clearCache() {
    analysisCache.clear();
  }
}

export const aiService = new AIService();

// Zod validation for AI outputs - prevents fabricated data
export const AIAnalysisSchema = z.object({
  leadStatus: z.enum(["new", "contacted", "qualified", "stalled", "won", "lost", "cancelled", "rejected"]),
  buyingIntent: z.enum(["low", "medium", "high", "unknown"]),
  lossReason: z.enum(["no_follow_up", "no_response", "price", "competitor", "timing", "not_interested", "insufficient_data", "already_won", "rejected", "cancelled", "other", "unknown"]),
  recommendedAction: z.enum(["follow_up_now", "follow_up_later", "no_action", "qualify", "nurture"]),
  reasoningSummary: z.string().min(10).max(500),
  recommendedMessageGoal: z.string().min(5).max(300).optional(),
});

export const AIMessageSchema = z.object({
  message: z.string().min(20).max(1000),
  goal: z.string().min(5).max(300).optional(),
}).refine(data => {
  // Prevent fabricated prices, discounts, deadlines
  const forbiddenPatterns = [
    /\$\d+.*discount/i,
    /\d+%\s*off/i,
    /limited time/i,
    /expires.*\d/i,
    /only.*\d.*left/i,
    /special price.*\$/i,
  ];
  return !forbiddenPatterns.some(p => p.test(data.message));
}, {
  message: "Message contains potentially fabricated incentive",
});

export function validateAIAnalysis(data: any): { valid: boolean; data?: z.infer<typeof AIAnalysisSchema>; error?: string } {
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    const result = AIAnalysisSchema.safeParse(parsed);
    if (!result.success) {
      return { valid: false, error: result.error.errors.map(e => e.message).join(", ") };
    }
    return { valid: true, data: result.data };
  } catch (e: any) {
    return { valid: false, error: e.message };
  }
}

export function validateAIMessage(data: any): { valid: boolean; data?: z.infer<typeof AIMessageSchema>; error?: string } {
  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    const result = AIMessageSchema.safeParse(parsed);
    if (!result.success) {
      return { valid: false, error: result.error.errors.map(e => e.message).join(", ") };
    }
    return { valid: true, data: result.data };
  } catch (e: any) {
    return { valid: false, error: e.message };
  }
}
