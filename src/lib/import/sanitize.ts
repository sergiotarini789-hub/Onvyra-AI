/**
 * Sanitize imported text - treat as DATA not instructions
 * Protect against prompt injection: "Ignore previous instructions", etc
 */

const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions/gi,
  /ignore\s+all\s+previous/gi,
  /reveal\s+system\s+prompt/gi,
  /show\s+system\s+prompt/gi,
  /disregard\s+previous/gi,
  /you\s+are\s+now/gi,
  /act\s+as\s+if/gi,
  /pretend\s+to\s+be/gi,
];

export function sanitizeText(text: string): string {
  if (!text || typeof text !== "string") return text;
  let sanitized = text.slice(0, 2000); // limit length
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[filtered]");
  }
  return sanitized;
}

export function sanitizeRow(row: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === "string") {
      sanitized[k] = sanitizeText(v);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}
