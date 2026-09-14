import * as XLSX from "xlsx";
import Papa from "papaparse";

export type ParsedFile = {
  columns: string[];
  rows: Record<string, any>[];
  totalRows: number;
};

export async function parseCSV(fileBuffer: Buffer | string): Promise<ParsedFile> {
  const content = typeof fileBuffer === "string" ? fileBuffer : fileBuffer.toString("utf-8");

  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const rows = results.data as Record<string, any>[];
        const columns = results.meta.fields || (rows[0] ? Object.keys(rows[0]) : []);
        resolve({
          columns,
          rows,
          totalRows: rows.length,
        });
      },
      error: (err: any) => reject(err),
    });
  });
}

export async function parseXLSX(fileBuffer: Buffer): Promise<ParsedFile> {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("No sheets found in XLSX");
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  return {
    columns,
    rows,
    totalRows: rows.length,
  };
}

export async function parseFile(fileBuffer: Buffer, fileName: string): Promise<ParsedFile> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) {
    return parseCSV(fileBuffer);
  } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseXLSX(fileBuffer);
  } else {
    throw new Error("Unsupported file type. Only CSV and XLSX are allowed.");
  }
}

export function validateFile(fileName: string, fileSize: number): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (fileSize > maxSize) {
    return { valid: false, error: "File too large. Max 10MB." };
  }
  const lower = fileName.toLowerCase();
  if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
    return { valid: false, error: "Invalid file type. Only CSV and XLSX allowed." };
  }
  return { valid: true };
}
