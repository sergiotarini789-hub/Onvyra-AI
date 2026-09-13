/**
 * Demo data generator - 1000 synthetic leads with known expected cases
 */

export type DemoLead = {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  product?: string;
  dealValue?: number;
  dealStage?: string;
  status?: string;
  lastContactAt?: Date;
  lastMessage?: string;
  source?: string;
  manager?: string;
};

const firstNames = ["Ivan", "Maria", "Alexey", "Elena", "Dmitry", "Anna", "Sergey", "Olga", "Pavel", "Tatiana", "Viktor", "Natalia", "Andrey", "Yulia", "Mikhail", "Ekaterina", "Artem", "Irina", "Kirill", "Svetlana"];
const lastNames = ["Petrov", "Sokolova", "Kuznetsov", "Smirnova", "Volkov", "Fedorova", "Morozov", "Nikolaeva", "Orlov", "Kozlova", "Lebedev", "Novikova", "Egorov", "Morozova", "Popov", "Petrova", "Semenov", "Vasilieva"];
const companies = ["Acme Corp", "TechNova", "StroyMaster", "LogiTrans", "AgroPlus", "MedService", "BuildPro", "FinGroup", "EduCenter", "RetailMax", "AutoParts", "FoodSupply", "IT Solutions", "MetalWorks", "GreenEnergy"];
const products = ["CRM implementation", "Website redesign", "Logistics optimization", "Accounting software", "Industrial equipment", "Marketing campaign", "Security system", "Consulting package", "Cloud migration", "Training program", "Equipment rental", "Maintenance contract"];
const managers = ["Alex M.", "Sarah K.", "Dmitry L.", "Olga P.", "Igor V."];
const sources = ["Website", "Referral", "Cold call", "Exhibition", "Google Ads", "Yandex", "LinkedIn"];

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomDate(daysAgoMin: number, daysAgoMax: number): Date {
  const days = randomInt(daysAgoMin, daysAgoMax);
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randomInt(9, 18), randomInt(0, 59));
  return d;
}

export function generateDemoLeads(count: number = 1000): DemoLead[] {
  const leads: DemoLead[] = [];

  // 1. high-value + quotation + no follow-up (critical)
  for (let i = 0; i < 120; i++) {
    leads.push({
      name: `${random(firstNames)} ${random(lastNames)}`,
      phone: `+7 9${randomInt(100, 999)} ${randomInt(100, 999)}-${randomInt(10, 99)}-${randomInt(10, 99)}`,
      email: `client${i}@${random(["example.com", "company.ru", "mail.ru"])}`,
      company: random(companies),
      product: random(products),
      dealValue: randomInt(150000, 500000),
      dealStage: random(["proposal sent", "quotation sent", "КП отправлено"]),
      status: "contacted",
      lastContactAt: randomDate(10, 45),
      lastMessage: random([
        "Спасибо, получили КП, изучаем. Интересно, но нужно обсудить с директором.",
        "Price looks okay, need to think. Can you send more details about implementation?",
        "Получили ваше коммерческое предложение. Подумаем и вернемся.",
        "Quotation received, looks promising. Will discuss internally and get back.",
      ]),
      source: random(sources),
      manager: random(managers),
    });
  }

  // 2. explicit rejection (should be low score)
  for (let i = 0; i < 100; i++) {
    leads.push({
      name: `${random(firstNames)} ${random(lastNames)}`,
      phone: `+7 9${randomInt(100, 999)} ${randomInt(100, 999)}-${randomInt(10, 99)}-${randomInt(10, 99)}`,
      email: `rejected${i}@example.com`,
      company: random(companies),
      product: random(products),
      dealValue: randomInt(20000, 150000),
      dealStage: "lost",
      status: "rejected",
      lastContactAt: randomDate(5, 60),
      lastMessage: random([
        "Не интересно, спасибо. Нашли другого подрядчика.",
        "Not interested, we already chose competitor.",
        "Дорого, не подходит. Отказ.",
        "We decided not to proceed, thanks.",
      ]),
      source: random(sources),
      manager: random(managers),
    });
  }

  // 3. already won
  for (let i = 0; i < 80; i++) {
    leads.push({
      name: `${random(firstNames)} ${random(lastNames)}`,
      phone: `+7 9${randomInt(100, 999)} ${randomInt(100, 999)}-${randomInt(10, 99)}-${randomInt(10, 99)}`,
      email: `won${i}@example.com`,
      company: random(companies),
      product: random(products),
      dealValue: randomInt(50000, 300000),
      dealStage: "closed won",
      status: "won",
      lastContactAt: randomDate(1, 30),
      lastMessage: "Оплачено, спасибо! Сделка закрыта.",
      source: random(sources),
      manager: random(managers),
    });
  }

  // 4. cancelled
  for (let i = 0; i < 50; i++) {
    leads.push({
      name: `${random(firstNames)} ${random(lastNames)}`,
      phone: `+7 9${randomInt(100, 999)} ${randomInt(100, 999)}-${randomInt(10, 99)}-${randomInt(10, 99)}`,
      email: `cancel${i}@example.com`,
      company: random(companies),
      product: random(products),
      dealValue: randomInt(30000, 200000),
      dealStage: "cancelled",
      status: "cancelled",
      lastContactAt: randomDate(20, 90),
      lastMessage: "Отмена, проект заморожен.",
      source: random(sources),
      manager: random(managers),
    });
  }

  // 5. no response
  for (let i = 0; i < 150; i++) {
    leads.push({
      name: `${random(firstNames)} ${random(lastNames)}`,
      phone: `+7 9${randomInt(100, 999)} ${randomInt(100, 999)}-${randomInt(10, 99)}-${randomInt(10, 99)}`,
      email: `noresp${i}@example.com`,
      company: random(companies),
      product: random(products),
      dealValue: randomInt(40000, 250000),
      dealStage: random(["contacted", "qualified", "proposal sent"]),
      status: "contacted",
      lastContactAt: randomDate(15, 90),
      lastMessage: random([
        "Добрый день, интересует ваше предложение по логистике.",
        "Hi, can you send price list?",
        "Хочу заказать, сколько стоит?",
        "",
      ]),
      source: random(sources),
      manager: random(managers),
    });
  }

  // 6. customer wants to think
  for (let i = 0; i < 120; i++) {
    leads.push({
      name: `${random(firstNames)} ${random(lastNames)}`,
      phone: `+7 9${randomInt(100, 999)} ${randomInt(100, 999)}-${randomInt(10, 99)}-${randomInt(10, 99)}`,
      email: `think${i}@example.com`,
      company: random(companies),
      product: random(products),
      dealValue: randomInt(60000, 350000),
      dealStage: "negotiation",
      status: "qualified",
      lastContactAt: randomDate(3, 30),
      lastMessage: random([
        "Подумаю, вернусь позже. Надо посоветоваться.",
        "I'll think about it and come back later.",
        "Нужно время на обдумывание, вернемся через неделю.",
        "Let me think, interesting offer.",
      ]),
      source: random(sources),
      manager: random(managers),
    });
  }

  // 7. insufficient data
  for (let i = 0; i < 80; i++) {
    leads.push({
      name: random(firstNames),
      phone: undefined,
      email: undefined,
      company: undefined,
      product: undefined,
      dealValue: undefined,
      dealStage: undefined,
      status: "new",
      lastContactAt: undefined,
      lastMessage: "",
      source: "unknown",
      manager: undefined,
    });
  }

  // 8. duplicate records (will be duplicates of earlier)
  for (let i = 0; i < 50; i++) {
    const dupBase = leads[i];
    leads.push({
      ...dupBase,
      lastContactAt: randomDate(1, 10),
      lastMessage: "Дубль записи",
    });
  }

  // 9. low-value lead
  for (let i = 0; i < 100; i++) {
    leads.push({
      name: `${random(firstNames)} ${random(lastNames)}`,
      phone: `+7 9${randomInt(100, 999)} ${randomInt(100, 999)}-${randomInt(10, 99)}-${randomInt(10, 99)}`,
      email: `low${i}@example.com`,
      company: random(companies),
      product: random(products),
      dealValue: randomInt(5000, 20000),
      dealStage: "new",
      status: "new",
      lastContactAt: randomDate(1, 100),
      lastMessage: "Интересует, но бюджет маленький.",
      source: random(sources),
      manager: random(managers),
    });
  }

  // 10. active opportunity
  for (let i = 0; i < 150; i++) {
    leads.push({
      name: `${random(firstNames)} ${random(lastNames)}`,
      phone: `+7 9${randomInt(100, 999)} ${randomInt(100, 999)}-${randomInt(10, 99)}-${randomInt(10, 99)}`,
      email: `active${i}@example.com`,
      company: random(companies),
      product: random(products),
      dealValue: randomInt(80000, 400000),
      dealStage: random(["qualified", "negotiation", "proposal"]),
      status: random(["qualified", "contacted"]),
      lastContactAt: randomDate(0, 5),
      lastMessage: random([
        "Да, давайте созвонимся завтра.",
        "Жду договор.",
        "Готовы обсуждать детали.",
      ]),
      source: random(sources),
      manager: random(managers),
    });
  }

  // Shuffle
  for (let i = leads.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [leads[i], leads[j]] = [leads[j], leads[i]];
  }

  return leads.slice(0, count);
}
