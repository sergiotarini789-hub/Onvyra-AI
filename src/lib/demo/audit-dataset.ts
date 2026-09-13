/**
 * Sprint 5 - Realistic Test Data Generator
 * Creates deterministic 1000 leads with scenarios A-J
 */

type LeadScenario = "A_HIGH_DORMANT" | "B_LOW_DORMANT" | "C_RECENT_INTEREST" | "D_REJECTED" | "E_WON" | "F_CANCELLED" | "G_MISSING" | "H_DUPLICATE" | "I_RUSSIAN" | "J_EXTREME";

type AuditLead = {
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  manager: string | null;
  product: string | null;
  dealValue: number | null;
  dealStage: string | null;
  status: string | null;
  lastContactAt: Date | null;
  source: string | null;
  lastMessage: string | null;
  scenario: LeadScenario;
  expectedScoreRange: [number, number];
  shouldBeRecoverable: boolean;
  notes: string;
};

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function randomElement<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

export function generateAuditDataset(count = 1000): AuditLead[] {
  const leads: AuditLead[] = [];
  
  const products = ["CRM", "Website Development", "Consulting", "E-commerce", "Mobile App", "SaaS Platform", "Marketing Automation"];
  const managers = ["Alex Johnson", "Maria Garcia", "Иван Петров", "Sarah Chen", "David Smith"];
  const sources = ["Website", "Referral", "Cold Call", "LinkedIn", "Event", "HubSpot"];
  const companies = ["Acme Corp", "Tech Solutions", "ООО Ромашка", "Global Industries", "StartupXYZ", "Enterprise Ltd", "ООО Вектор"];
  
  const russianNames = ["Иван Петров", "Мария Иванова", "Алексей Смирнов", "Елена Козлова", "Дмитрий Волков", "Анна Морозова"];
  const englishNames = ["John Smith", "Emily Johnson", "Michael Brown", "Sarah Davis", "David Wilson", "Lisa Anderson"];
  
  let idCounter = 0;
  
  // Helper to create lead
  function createLead(overrides: Partial<AuditLead> & { scenario: LeadScenario }): AuditLead {
    idCounter++;
    const base: AuditLead = {
      name: `Test Lead ${idCounter}`,
      phone: `+1-555-${String(1000 + idCounter).padStart(4, "0")}`,
      email: `lead${idCounter}@example.com`,
      company: randomElement(companies, idCounter),
      manager: randomElement(managers, idCounter),
      product: randomElement(products, idCounter),
      dealValue: 50000,
      dealStage: "qualified",
      status: "stalled",
      lastContactAt: daysAgo(30),
      source: randomElement(sources, idCounter),
      lastMessage: "Interested in your services",
      scenario: overrides.scenario,
      expectedScoreRange: [0, 100],
      shouldBeRecoverable: true,
      notes: "",
      ...overrides,
    };
    return base;
  }
  
  // SCENARIO A - HIGH VALUE DORMANT (should be high score)
  for (let i = 0; i < 150; i++) {
    leads.push(createLead({
      scenario: "A_HIGH_DORMANT",
      name: randomElement(englishNames, i),
      dealValue: 100000 + (i * 1000), // 100k-250k
      lastContactAt: daysAgo(45 + (i % 60)), // 45-105 days
      lastMessage: randomElement([
        "We are very interested, please send quotation",
        "Хочу купить, сколько стоит?",
        "This looks promising, need pricing",
        "Interested in purchasing, send proposal",
        "We need this for Q2, price please",
      ], i),
      status: "stalled",
      dealStage: "proposal",
      expectedScoreRange: [60, 100],
      shouldBeRecoverable: true,
      notes: "High value, long inactivity, previous interest - should be high recovery",
    }));
  }
  
  // SCENARIO B - LOW VALUE DORMANT (should not dominate)
  for (let i = 0; i < 150; i++) {
    leads.push(createLead({
      scenario: "B_LOW_DORMANT",
      name: randomElement(englishNames, i + 150),
      dealValue: 5000 + (i * 100), // 5k-20k
      lastContactAt: daysAgo(60 + (i % 90)),
      lastMessage: "Maybe later",
      status: "stalled",
      dealStage: "new",
      expectedScoreRange: [0, 50],
      shouldBeRecoverable: true,
      notes: "Low value dormant - should not dominate priority",
    }));
  }
  
  // SCENARIO C - RECENT INTEREST (meaningful priority)
  for (let i = 0; i < 100; i++) {
    leads.push(createLead({
      scenario: "C_RECENT_INTEREST",
      name: randomElement(englishNames, i + 300),
      dealValue: 75000 + (i * 500),
      lastContactAt: daysAgo(2 + (i % 10)), // 2-12 days
      lastMessage: randomElement([
        "Very interested, can we schedule a call?",
        "Хочу заказать, когда можем встретиться?",
        "This is exactly what we need, price?",
        "Interested, need more details",
      ], i),
      status: "qualified",
      dealStage: "qualified",
      expectedScoreRange: [40, 90],
      shouldBeRecoverable: true,
      notes: "Recent interest, strong buying signal",
    }));
  }
  
  // SCENARIO D - RECENTLY REJECTED (should NOT be valuable recovery)
  for (let i = 0; i < 100; i++) {
    leads.push(createLead({
      scenario: "D_REJECTED",
      name: randomElement(englishNames, i + 400),
      dealValue: 100000,
      lastContactAt: daysAgo(5 + (i % 10)),
      lastMessage: randomElement([
        "Not interested, please don't contact",
        "Не интересно, не нужно",
        "We decided to go with competitor",
        "Rejected, not suitable",
      ], i),
      status: "rejected",
      dealStage: "lost",
      expectedScoreRange: [0, 20],
      shouldBeRecoverable: false,
      notes: "Explicit rejection - should NOT be classified as valuable recovery",
    }));
  }
  
  // SCENARIO E - WON (should not appear as recoverable)
  for (let i = 0; i < 100; i++) {
    leads.push(createLead({
      scenario: "E_WON",
      name: randomElement(englishNames, i + 500),
      dealValue: 120000,
      lastContactAt: daysAgo(1 + (i % 5)),
      lastMessage: "Deal won, payment received",
      status: "won",
      dealStage: "closed_won",
      expectedScoreRange: [0, 10],
      shouldBeRecoverable: false,
      notes: "Already won - should not appear as recoverable unless business logic requires",
    }));
  }
  
  // SCENARIO F - CANCELLED
  for (let i = 0; i < 50; i++) {
    leads.push(createLead({
      scenario: "F_CANCELLED",
      name: randomElement(englishNames, i + 600),
      dealValue: 80000,
      lastContactAt: daysAgo(20 + (i % 30)),
      lastMessage: "Cancelled due to budget",
      status: "cancelled",
      dealStage: "cancelled",
      expectedScoreRange: [0, 15],
      shouldBeRecoverable: false,
      notes: "Cancelled - should be handled correctly",
    }));
  }
  
  // SCENARIO G - MISSING DATA (system must not invent)
  for (let i = 0; i < 100; i++) {
    const missingType = i % 5;
    leads.push(createLead({
      scenario: "G_MISSING",
      name: missingType === 0 ? null as any : `Incomplete Lead ${i}`,
      phone: missingType === 1 ? null : `+1-555-${String(2000 + i).padStart(4, "0")}`,
      email: missingType === 2 ? null : `incomplete${i}@example.com`,
      company: missingType === 3 ? null : randomElement(companies, i),
      dealValue: missingType === 4 ? null : 30000,
      lastContactAt: i % 2 === 0 ? null : daysAgo(40),
      lastMessage: i % 3 === 0 ? null : "Some message",
      status: "new",
      expectedScoreRange: [0, 60],
      shouldBeRecoverable: false,
      notes: `Missing data type ${missingType} - system must not invent values`,
    }));
  }
  
  // SCENARIO H - DUPLICATES (same person/phone/email)
  for (let i = 0; i < 100; i++) {
    const baseIdx = Math.floor(i / 2);
    leads.push(createLead({
      scenario: "H_DUPLICATE",
      name: `Duplicate Person ${baseIdx}`,
      phone: `+1-555-999-${String(baseIdx).padStart(4, "0")}`,
      email: `duplicate${baseIdx}@example.com`,
      company: "Duplicate Corp",
      dealValue: 50000,
      lastContactAt: daysAgo(30),
      status: "stalled",
      expectedScoreRange: [20, 70],
      shouldBeRecoverable: true,
      notes: `Duplicate of base ${baseIdx} - should be detected`,
    }));
  }
  
  // SCENARIO I - MULTILINGUAL / RUSSIAN
  for (let i = 0; i < 100; i++) {
    leads.push(createLead({
      scenario: "I_RUSSIAN",
      name: randomElement(russianNames, i),
      company: randomElement(["ООО Ромашка", "ООО Вектор", "ИП Иванов", "ЗАО Прогресс"], i),
      dealValue: 100000 + (i * 800),
      lastContactAt: daysAgo(25 + (i % 40)),
      lastMessage: randomElement([
        "Интересно, хочу купить",
        "Сколько стоит ваша услуга?",
        "Отправьте коммерческое предложение",
        "Подумаю, вернусь позже",
        "Не интересно, спасибо",
      ], i),
      status: i % 5 === 0 ? "rejected" : "stalled",
      expectedScoreRange: [10, 85],
      shouldBeRecoverable: i % 5 !== 0,
      notes: "Russian data - must preserve Unicode",
    }));
  }
  
  // SCENARIO J - EXTREME VALUES
  const extremeValues = [
    { dealValue: 9999999999, notes: "Very large value" },
    { dealValue: 0, notes: "Zero value" },
    { dealValue: -1000, notes: "Negative value - should be rejected" },
    { dealValue: 0.01, notes: "Very small value" },
    { dealValue: 100000.99, notes: "Decimal value" },
    { dealValue: null, notes: "Null value" },
  ];
  
  for (let i = 0; i < 50; i++) {
    const extreme = randomElement(extremeValues, i);
    leads.push(createLead({
      scenario: "J_EXTREME",
      name: `Extreme Lead ${i}`,
      dealValue: extreme.dealValue as any,
      lastContactAt: daysAgo(30),
      lastMessage: "Test extreme values",
      status: "stalled",
      expectedScoreRange: extreme.dealValue && extreme.dealValue > 0 ? [10, 70] : [0, 20],
      shouldBeRecoverable: (extreme.dealValue || 0) > 0,
      notes: extreme.notes,
    }));
  }
  
  return leads;
}

export function validateDataset(leads: AuditLead[]) {
  const stats = {
    total: leads.length,
    byScenario: {} as Record<string, number>,
    missingData: 0,
    extremeValues: 0,
    russian: 0,
    duplicates: 0,
  };
  
  for (const lead of leads) {
    stats.byScenario[lead.scenario] = (stats.byScenario[lead.scenario] || 0) + 1;
    if (!lead.dealValue || !lead.email || !lead.phone || !lead.name || !lead.company || !lead.lastContactAt) {
      stats.missingData++;
    }
    if (lead.scenario === "J_EXTREME") stats.extremeValues++;
    if (lead.scenario === "I_RUSSIAN") stats.russian++;
    if (lead.scenario === "H_DUPLICATE") stats.duplicates++;
  }
  
  return stats;
}
