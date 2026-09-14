import { describe, it, expect } from "vitest";
import { calculatePotentialRecoverableRevenue, formatCurrency } from "../revenue";

describe("Revenue Calculation", () => {
  it("should calculate potential revenue correctly", () => {
    expect(calculatePotentialRecoverableRevenue({ dealValue: 200000, recoveryProbability: 0.65 })).toBe(130000);
  });

  it("should return null if missing data", () => {
    expect(calculatePotentialRecoverableRevenue({ dealValue: null, recoveryProbability: 0.5 })).toBeNull();
    expect(calculatePotentialRecoverableRevenue({ dealValue: 100000, recoveryProbability: null })).toBeNull();
    expect(calculatePotentialRecoverableRevenue({ dealValue: 0, recoveryProbability: 0.5 })).toBeNull();
  });

  it("should handle edge probabilities", () => {
    expect(calculatePotentialRecoverableRevenue({ dealValue: 100000, recoveryProbability: 0 })).toBeNull();
    expect(calculatePotentialRecoverableRevenue({ dealValue: 100000, recoveryProbability: 1.5 })).toBeNull();
  });

  it("should format currency", () => {
    const formatted = formatCurrency(130000);
    expect(formatted).toContain("130");
  });

  it("should handle null in format", () => {
    expect(formatCurrency(null)).toBe("—");
  });
});
