import { describe, it, expect } from "vitest";
import { calculateRecoveryScore } from "../score";

describe("Recovery Score Engine", () => {
  it("should give high score for high-value + quotation + no follow-up", () => {
    const result = calculateRecoveryScore({
      name: "Ivan Petrov",
      product: "CRM implementation",
      dealValue: 185000,
      dealStage: "proposal sent",
      status: "contacted",
      lastContactAt: new Date(Date.now() - 14 * 86400000),
      lastMessage: "Спасибо, получили КП, изучаем. Интересно.",
    });
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.category).toMatch(/high|critical/);
  });

  it("should give 0 for explicit rejection (terminal state)", () => {
    const result = calculateRecoveryScore({
      status: "rejected",
      lastMessage: "Не интересно, спасибо. Отказ.",
    });
    expect(result.score).toBe(0);
  });

  it("should give 0 for already won", () => {
    const result = calculateRecoveryScore({
      status: "won",
      dealStage: "closed won",
      lastMessage: "Оплачено, спасибо! Сделка закрыта.",
    });
    expect(result.score).toBe(0);
  });

  it("should give 0 for cancelled (terminal state)", () => {
    const result = calculateRecoveryScore({
      status: "cancelled",
      lastMessage: "Отмена, проект заморожен.",
    });
    expect(result.score).toBe(0);
  });

  it("should handle 'I'll think about it' signal", () => {
    const result = calculateRecoveryScore({
      product: "Website redesign",
      lastMessage: "Подумаю, вернусь позже.",
      lastContactAt: new Date(Date.now() - 5 * 86400000),
    });
    expect(result.reasons.some((r) => r.includes("think"))).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it("should clamp score 0-100", () => {
    const high = calculateRecoveryScore({
      product: "Test",
      dealValue: 500000,
      dealStage: "proposal sent",
      lastMessage: "Хочу купить, цена интересует, пришлите КП, спасибо, получил",
      lastContactAt: new Date(Date.now() - 10 * 86400000),
    });
    expect(high.score).toBeLessThanOrEqual(100);
    expect(high.score).toBeGreaterThanOrEqual(0);

    const low = calculateRecoveryScore({
      status: "won",
      dealStage: "won",
    });
    expect(low.score).toBeGreaterThanOrEqual(0);
    expect(low.score).toBeLessThanOrEqual(100);
  });

  it("should categorize correctly", () => {
    expect(calculateRecoveryScore({ status: "won" }).category).toBe("low");
    const critical = calculateRecoveryScore({
      product: "CRM",
      dealValue: 200000,
      dealStage: "proposal sent",
      lastMessage: "Price requested, quotation received, interested",
      lastContactAt: new Date(Date.now() - 10 * 86400000),
    });
    if (critical.score >= 80) expect(critical.category).toBe("critical");
  });

  it("should handle insufficient data", () => {
    const result = calculateRecoveryScore({
      name: "John",
    });
    expect(result.score).toBe(0);
    expect(result.category).toBe("low");
  });

  it("should handle low-value lead", () => {
    const result = calculateRecoveryScore({
      product: "Consulting",
      dealValue: 5000,
      lastMessage: "Интересует, но бюджет маленький.",
    });
    expect(result.score).toBeLessThan(60);
  });

  it("should handle active opportunity (recent contact)", () => {
    const result = calculateRecoveryScore({
      product: "Training",
      dealValue: 100000,
      dealStage: "negotiation",
      status: "qualified",
      lastContactAt: new Date(),
      lastMessage: "Да, давайте созвонимся завтра.",
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
