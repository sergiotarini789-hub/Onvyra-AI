import { describe, it, expect } from "vitest";
import { calculateRecoveryProbability } from "../probability";

describe("Recovery Probability", () => {
  it("should return null for insufficient data", () => {
    const result = calculateRecoveryProbability({
      recoveryScore: 0,
      name: "John",
    });
    expect(result.probability).toBeNull();
    expect(result.confidence).toBe("low");
  });

  it("should return low prob for won status", () => {
    const result = calculateRecoveryProbability({
      recoveryScore: 90,
      status: "won",
      dataCompleteness: 0.6,
    });
    expect(result.probability).toBeLessThan(0.2);
  });

  it("should return low prob for rejected", () => {
    const result = calculateRecoveryProbability({
      recoveryScore: 50,
      status: "rejected",
      dataCompleteness: 0.6,
    });
    expect(result.probability).toBeLessThan(0.2);
  });

  it("should calculate high prob for high score + high intent", () => {
    const result = calculateRecoveryProbability({
      recoveryScore: 85,
      buyingIntent: "high",
      name: "Ivan",
      email: "ivan@example.com",
      product: "CRM",
      dealValue: 200000,
      lastContactAt: new Date(),
      lastMessage: "Interested",
      dataCompleteness: 0.8,
      hasAIAnalysis: true,
    });
    expect(result.probability).toBeGreaterThan(0.6);
    expect(result.confidence).toBe("high");
  });

  it("should adjust for inactivity", () => {
    const recent = calculateRecoveryProbability({
      recoveryScore: 70,
      lastContactAt: new Date(),
      dataCompleteness: 0.6,
    });
    const old = calculateRecoveryProbability({
      recoveryScore: 70,
      lastContactAt: new Date(Date.now() - 100 * 86400000),
      dataCompleteness: 0.6,
    });
    expect((recent.probability || 0)).toBeGreaterThan(old.probability || 0);
  });

  it("should never invent probability when insufficient", () => {
    const result = calculateRecoveryProbability({
      recoveryScore: 0,
      dataCompleteness: 0.2,
    });
    expect(result.probability).toBeNull();
  });
});
