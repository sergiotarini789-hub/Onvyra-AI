import { z } from "zod";

export type RawRow = Record<string, any>;
export type Mapping = Record<string, string>; // original column -> standard field

export type NormalizedLead = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  manager?: string | null;
  product?: string | null;
  dealValue?: number | null;
  dealStage?: string | null;
  status?: string | null;
  lastContactAt?: Date | null;
  source?: string | null;
  lastMessage?: string | null;
  rawData: string; // JSON string
};

function parseDealValue(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const str = String(value).replace(/[^\d.,-]/g, "").trim();
  if (!str) return null;
  // Handle Russian formats: "200 000", "200,000", "200.000"
  // Replace spaces, handle comma as decimal or thousand
  let cleaned = str.replace(/\s/g, "");
  // If both comma and dot present, assume comma is thousand separator? Simplified
  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",")) {
    // If comma and 2 digits after, treat as decimal, else thousand
    const parts = cleaned.split(",");
    const last = parts[parts.length - 1];
    if (last.length === 2 || last.length === 3 && parts.length > 2) {
      // ambiguous, check if more than 3 digits before?
      if (parts.length === 2 && last.length <= 2) {
        cleaned = cleaned.replace(",", ".");
      } else {
        cleaned = cleaned.replace(/,/g, "");
      }
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    // Excel serial date?
    if (value > 30000 && value < 60000) {
      const excelEpoch = new Date(1899, 11, 30);
      const d = new Date(excelEpoch.getTime() + value * 86400000);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  const str = String(value).trim();
  if (!str) return null;
  // Try ISO
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  // Try DD.MM.YYYY
  const dmY = str.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/);
  if (dmY) {
    const day = parseInt(dmY[1], 10);
    const month = parseInt(dmY[2], 10) - 1;
    let year = parseInt(dmY[3], 10);
    if (year < 100) year += 2000;
    d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  // Try DD.MM.YYYY HH:mm
  const dmYTime = str.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})\s+(\d{1,2}):(\d{1,2})/);
  if (dmYTime) {
    const day = parseInt(dmYTime[1], 10);
    const month = parseInt(dmYTime[2], 10) - 1;
    let year = parseInt(dmYTime[3], 10);
    if (year < 100) year += 2000;
    const hour = parseInt(dmYTime[4], 10);
    const minute = parseInt(dmYTime[5], 10);
    d = new Date(year, month, day, hour, minute);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function cleanString(value: any): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

export function normalizeRow(row: RawRow, mapping: Mapping): NormalizedLead {
  const inverted: Record<string, any> = {};
  for (const [orig, std] of Object.entries(mapping)) {
    if (row[orig] !== undefined) {
      inverted[std] = row[orig];
    }
  }

  // Also check if row already uses standard field names directly
  for (const key of Object.keys(row)) {
    if (["name", "phone", "email", "company", "manager", "product", "dealValue", "dealStage", "status", "lastContactAt", "source", "lastMessage"].includes(key)) {
      if (inverted[key] === undefined) inverted[key] = row[key];
    }
  }

  const normalized: NormalizedLead = {
    name: cleanString(inverted.name),
    phone: cleanString(inverted.phone),
    email: cleanString(inverted.email),
    company: cleanString(inverted.company),
    manager: cleanString(inverted.manager),
    product: cleanString(inverted.product),
    dealValue: parseDealValue(inverted.dealValue),
    dealStage: cleanString(inverted.dealStage),
    status: cleanString(inverted.status),
    lastContactAt: parseDate(inverted.lastContactAt),
    source: cleanString(inverted.source),
    lastMessage: cleanString(inverted.lastMessage),
    rawData: JSON.stringify(row),
  };

  return normalized;
}

export function normalizeRows(rows: RawRow[], mapping: Mapping): NormalizedLead[] {
  return rows.map((r) => normalizeRow(r, mapping));
}
