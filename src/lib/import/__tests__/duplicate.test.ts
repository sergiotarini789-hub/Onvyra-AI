import { describe, it, expect } from "vitest";
import { isDuplicateLead, deduplicateBatch, normalizePhone, normalizeEmail } from "../duplicate";

describe("Duplicate Detection", () => {
  it("should normalize phones", () => {
    expect(normalizePhone("+7 912 345-67-89")).toBe("79123456789");
    expect(normalizePhone("8 912 345 67 89")).toBe("79123456789");
    expect(normalizePhone("invalid")).toBeNull();
  });

  it("should normalize emails", () => {
    expect(normalizeEmail("Test@Example.COM ")).toBe("test@example.com");
    expect(normalizeEmail("invalid")).toBeNull();
  });

  it("should detect duplicate by phone", () => {
    const lead = { phone: "+7 912 345-67-89", email: null, name: "Ivan", company: "Acme" };
    const existing = [{ id: "1", phone: "89123456789", email: null, name: "Ivan Petrov" }];
    const result = isDuplicateLead(lead as any, existing);
    expect(result.isDuplicate).toBe(true);
  });

  it("should detect duplicate by email", () => {
    const lead = { phone: null, email: "TEST@example.com", name: "Ivan" };
    const existing = [{ id: "1", phone: null, email: "test@example.com", name: "Other" }];
    const result = isDuplicateLead(lead as any, existing);
    expect(result.isDuplicate).toBe(true);
  });

  it("should not flag unique leads", () => {
    const lead = { phone: "+7 999 111-22-33", email: "unique@example.com", name: "Ivan" };
    const existing = [{ id: "1", phone: "+7 912 345-67-89", email: "other@example.com", name: "Other" }];
    const result = isDuplicateLead(lead as any, existing);
    expect(result.isDuplicate).toBe(false);
  });

  it("should deduplicate batch", () => {
    const leads = [
      { phone: "+7 912 111-11-11", email: "a@example.com", name: "A", company: "X", rawData: "{}" },
      { phone: "+7 912 111-11-11", email: "b@example.com", name: "B", company: "Y", rawData: "{}" },
      { phone: "+7 912 222-22-22", email: "a@example.com", name: "C", company: "Z", rawData: "{}" },
    ] as any[];
    const result = deduplicateBatch(leads);
    expect(result.unique.length).toBe(1);
    expect(result.duplicates.length).toBe(2);
  });
});
