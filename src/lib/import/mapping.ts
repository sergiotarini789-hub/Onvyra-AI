import { aiService } from "../ai/service";

export const STANDARD_FIELDS = [
  { key: "name", label: "Name", description: "Customer name" },
  { key: "phone", label: "Phone", description: "Phone number" },
  { key: "email", label: "Email", description: "Email address" },
  { key: "company", label: "Company", description: "Company name" },
  { key: "manager", label: "Manager", description: "Manager / responsible" },
  { key: "product", label: "Product", description: "Product / service" },
  { key: "dealValue", label: "Deal Value", description: "Deal amount / budget" },
  { key: "dealStage", label: "Deal Stage", description: "Stage of deal" },
  { key: "status", label: "Status", description: "Lead status" },
  { key: "lastContactAt", label: "Last Contact", description: "Last contact date" },
  { key: "source", label: "Source", description: "Lead source" },
  { key: "lastMessage", label: "Last Message / Comment", description: "Last message, comment, conversation" },
  { key: "rawData", label: "Ignore / Raw", description: "Keep as raw data only" },
] as const;

export type Mapping = Record<string, string>;

export async function suggestMapping(columns: string[]): Promise<Mapping> {
  try {
    const response = await aiService.suggestColumnMapping(columns);
    const parsed = JSON.parse(response.content);
    if (parsed.mapping && typeof parsed.mapping === "object") {
      // Validate that values are in standard fields
      const validKeys = new Set<string>(STANDARD_FIELDS.map((f) => f.key as string));
      const cleaned: Mapping = {};
      for (const [orig, target] of Object.entries(parsed.mapping)) {
        if (validKeys.has(target as string)) {
          cleaned[orig] = target as string;
        } else {
          cleaned[orig] = "rawData";
        }
      }
      // Ensure all columns have mapping
      for (const col of columns) {
        if (!cleaned[col]) cleaned[col] = "rawData";
      }
      return cleaned;
    }
  } catch (e) {
    console.warn("AI mapping failed, using heuristic", e);
  }

  // Fallback heuristic (same as in ai/service mock)
  const mapping: Mapping = {};
  const lowerMap = columns.map((c) => c.toLowerCase());

  // Order matters: more specific first
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
    const lower = lowerMap[idx];
    let found = false;
    for (const [target, keywords] of Object.entries(rules)) {
      if (keywords.some((k) => lower.includes(k))) {
        mapping[col] = target;
        found = true;
        break;
      }
    }
    if (!found) mapping[col] = "rawData";
  });

  return mapping;
}
