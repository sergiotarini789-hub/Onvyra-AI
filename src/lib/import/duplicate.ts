import { NormalizedLead } from "./normalization";

export type DuplicateResult = {
  isDuplicate: boolean;
  duplicateOf?: string; // id
  reason?: string;
};

export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;
  // Normalize Russian numbers: 8 -> 7
  if (digits.length === 11 && digits.startsWith("8")) {
    return "7" + digits.slice(1);
  }
  return digits;
}

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) return null;
  return trimmed;
}

export function isDuplicateLead(
  lead: NormalizedLead,
  existingLeads: Array<{ id: string; phone?: string | null; email?: string | null; name?: string | null; company?: string | null }>
): DuplicateResult {
  const normPhone = normalizePhone(lead.phone);
  const normEmail = normalizeEmail(lead.email);

  for (const existing of existingLeads) {
    const existingPhone = normalizePhone(existing.phone || null);
    const existingEmail = normalizeEmail(existing.email || null);

    if (normPhone && existingPhone && normPhone === existingPhone) {
      return { isDuplicate: true, duplicateOf: existing.id, reason: `Duplicate phone: ${lead.phone}` };
    }
    if (normEmail && existingEmail && normEmail === existingEmail) {
      return { isDuplicate: true, duplicateOf: existing.id, reason: `Duplicate email: ${lead.email}` };
    }
    // Name + company duplicate (weak)
    if (lead.name && existing.name && lead.company && existing.company) {
      if (
        lead.name.toLowerCase().trim() === existing.name.toLowerCase().trim() &&
        lead.company.toLowerCase().trim() === existing.company.toLowerCase().trim()
      ) {
        return { isDuplicate: true, duplicateOf: existing.id, reason: `Duplicate name+company: ${lead.name}` };
      }
    }
  }

  return { isDuplicate: false };
}

export function deduplicateBatch(leads: NormalizedLead[]): { unique: NormalizedLead[]; duplicates: Array<{ lead: NormalizedLead; reason: string }> } {
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();
  const seenNameCompany = new Set<string>();
  const unique: NormalizedLead[] = [];
  const duplicates: Array<{ lead: NormalizedLead; reason: string }> = [];

  for (const lead of leads) {
    const phone = normalizePhone(lead.phone);
    const email = normalizeEmail(lead.email);
    const nameCompany = lead.name && lead.company ? `${lead.name.toLowerCase().trim()}|${lead.company.toLowerCase().trim()}` : null;

    let isDup = false;
    let reason = "";

    if (phone && seenPhones.has(phone)) {
      isDup = true;
      reason = `Duplicate phone in batch: ${lead.phone}`;
    } else if (email && seenEmails.has(email)) {
      isDup = true;
      reason = `Duplicate email in batch: ${lead.email}`;
    } else if (nameCompany && seenNameCompany.has(nameCompany)) {
      isDup = true;
      reason = `Duplicate name+company in batch: ${lead.name}`;
    }

    if (isDup) {
      duplicates.push({ lead, reason });
    } else {
      unique.push(lead);
      if (phone) seenPhones.add(phone);
      if (email) seenEmails.add(email);
      if (nameCompany) seenNameCompany.add(nameCompany);
    }
  }

  return { unique, duplicates };
}
