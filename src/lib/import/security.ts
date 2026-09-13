/**
 * Import security hardening
 * - Formula injection prevention
 * - Resource limits
 * - File type validation
 * - Malicious content detection
 */

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_ROWS = 10000;
const MAX_COLUMNS = 100;
const MAX_CELL_LENGTH = 10000;

const FORMULA_INJECTION_PATTERNS = [
  /^=/, // Excel formula
  /^\+/, // Formula
  /^-/, // Could be formula (but also negative number - handle carefully)
  /^@/, // Formula
  /^\t=/,
  /^\r=/,
  /^\n=/,
];

const DANGEROUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /vbscript:/i,
  /onload=/i,
  /onerror=/i,
  /eval\(/i,
  /document\.cookie/i,
  /DDE\(/i, // Excel DDE
];

export function validateFileSize(size: number): { valid: boolean; error?: string } {
  if (size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File too large. Maximum ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB allowed, got ${(size / 1024 / 1024).toFixed(2)}MB` };
  }
  if (size === 0) {
    return { valid: false, error: "File is empty" };
  }
  return { valid: true };
}

export function validateFileType(fileName: string, mimeType?: string): { valid: boolean; error?: string } {
  const allowedExtensions = [".csv", ".xlsx", ".xls"];
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  
  if (!allowedExtensions.includes(ext)) {
    return { valid: false, error: `Invalid file type. Allowed: ${allowedExtensions.join(", ")}, got ${ext}` };
  }
  
  if (mimeType) {
    const allowedMimeTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/csv",
      "text/comma-separated-values",
    ];
    // Be lenient with mime types as browsers vary, but block obviously dangerous ones
    const dangerousMimeTypes = ["application/x-msdownload", "application/x-sh", "text/html", "application/javascript"];
    if (dangerousMimeTypes.includes(mimeType)) {
      return { valid: false, error: `Dangerous file type blocked: ${mimeType}` };
    }
  }
  
  return { valid: true };
}

export function validateRowCount(count: number): { valid: boolean; error?: string } {
  if (count > MAX_ROWS) {
    return { valid: false, error: `Too many rows. Maximum ${MAX_ROWS} allowed, got ${count}` };
  }
  if (count === 0) {
    return { valid: false, error: "File contains no data rows" };
  }
  return { valid: true };
}

export function validateColumnCount(count: number): { valid: boolean; error?: string } {
  if (count > MAX_COLUMNS) {
    return { valid: false, error: `Too many columns. Maximum ${MAX_COLUMNS} allowed, got ${count}` };
  }
  if (count === 0) {
    return { valid: false, error: "File contains no columns" };
  }
  return { valid: true };
}

export function sanitizeCellValue(value: string): { value: string; wasSanitized: boolean; reason?: string } {
  if (!value || typeof value !== "string") {
    return { value: value || "", wasSanitized: false };
  }
  
  // Check length
  if (value.length > MAX_CELL_LENGTH) {
    return {
      value: value.slice(0, MAX_CELL_LENGTH),
      wasSanitized: true,
      reason: `Truncated from ${value.length} to ${MAX_CELL_LENGTH} chars`,
    };
  }
  
  // Check for formula injection
  const trimmed = value.trim();
  for (const pattern of FORMULA_INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      // Special handling for negative numbers - allow if it's a valid number
      if (pattern.source === "^-") {
        if (/^-\d+(\.\d+)?$/.test(trimmed)) {
          continue; // It's a negative number, allow
        }
      }
      
      // Sanitize by prefixing with single quote or space
      // For CSV, prefix with single quote to neutralize formula
      return {
        value: `'${value}`,
        wasSanitized: true,
        reason: "Potential formula injection neutralized",
      };
    }
  }
  
  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(value)) {
      return {
        value: value.replace(pattern, "[removed]"),
        wasSanitized: true,
        reason: `Dangerous pattern ${pattern.source} removed`,
      };
    }
  }
  
  return { value, wasSanitized: false };
}

export function sanitizeRow(row: Record<string, any>): { sanitized: Record<string, any>; warnings: string[] } {
  const sanitized: Record<string, any> = {};
  const warnings: string[] = [];
  
  for (const [key, val] of Object.entries(row)) {
    if (typeof val === "string") {
      const result = sanitizeCellValue(val);
      sanitized[key] = result.value;
      if (result.wasSanitized) {
        warnings.push(`${key}: ${result.reason}`);
      }
    } else {
      sanitized[key] = val;
    }
  }
  
  return { sanitized, warnings };
}

export function validateHeaders(headers: string[]): { valid: boolean; error?: string; sanitized: string[] } {
  const sanitized = headers.map(h => {
    if (!h || typeof h !== "string") return "";
    // Remove dangerous characters from headers
    return h.trim().slice(0, 200).replace(/[<>"'`;]/g, "");
  });
  
  const emptyHeaders = sanitized.filter(h => !h).length;
  if (emptyHeaders > 0) {
    return { valid: false, error: `${emptyHeaders} empty header(s) found`, sanitized };
  }
  
  const duplicates = sanitized.filter((h, i) => sanitized.indexOf(h) !== i);
  if (duplicates.length > 0) {
    const uniqueDupes = Array.from(new Set(duplicates));
    return { valid: false, error: `Duplicate headers: ${uniqueDupes.join(", ")}`, sanitized };
  }
  
  return { valid: true, sanitized };
}

export const IMPORT_LIMITS = {
  MAX_FILE_SIZE_BYTES,
  MAX_ROWS,
  MAX_COLUMNS,
  MAX_CELL_LENGTH,
};
