import { describe, it, expect } from "vitest";
import { normalizeRow } from "../normalization";

describe("Normalization", () => {
  it("should normalize Russian column mapping example", () => {
    const row = {
      Имя: "Иван Петров",
      Телефон: "+7 912 345-67-89",
      Сумма: "200 000",
      "Последний контакт": "15.03.2024",
      Товар: "CRM",
      Комментарий: "Интересует цена",
    };
    const mapping = {
      Имя: "name",
      Телефон: "phone",
      Сумма: "dealValue",
      "Последний контакт": "lastContactAt",
      Товар: "product",
      Комментарий: "lastMessage",
    };
    const normalized = normalizeRow(row, mapping);
    expect(normalized.name).toBe("Иван Петров");
    expect(normalized.phone).toBe("+7 912 345-67-89");
    expect(normalized.dealValue).toBe(200000);
    expect(normalized.product).toBe("CRM");
    expect(normalized.lastMessage).toBe("Интересует цена");
    expect(normalized.lastContactAt).toBeInstanceOf(Date);
    expect(JSON.parse(normalized.rawData)).toEqual(row);
  });

  it("should parse deal values with various formats", () => {
    const tests = [
      { input: "₽200,000", expected: 200000 },
      { input: "200 000", expected: 200000 },
      { input: "200000", expected: 200000 },
      { input: "", expected: null },
    ];
    for (const t of tests) {
      const norm = normalizeRow({ Сумма: t.input }, { Сумма: "dealValue" });
      expect(norm.dealValue).toBe(t.expected);
    }
  });

  it("should parse dates", () => {
    const row = { date: "2024-03-15" };
    const norm = normalizeRow(row, { date: "lastContactAt" });
    expect(norm.lastContactAt).toBeInstanceOf(Date);
  });

  it("should preserve rawData", () => {
    const row = { a: 1, b: 2 };
    const norm = normalizeRow(row, { a: "name" });
    expect(norm.rawData).toBeDefined();
    const parsed = JSON.parse(norm.rawData);
    expect(parsed.a).toBe(1);
  });
});
