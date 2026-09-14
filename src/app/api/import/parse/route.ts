import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { parseFile, validateFile } from "@/lib/import/parse";
import { suggestMapping } from "@/lib/import/mapping";
import { validateFileSize, validateFileType, validateHeaders, IMPORT_LIMITS } from "@/lib/import/security";
import { rateLimit, getRateLimitHeaders, getClientIp } from "@/lib/security/rate-limit";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let session: any = null;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting
  const ip = getClientIp(req);
  const rl = rateLimit(`import_parse:${session.orgId}`, "import_parse");
  if (!rl.allowed) {
    logger.warn("Import parse rate limited", { orgId: session.orgId });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400, headers: getRateLimitHeaders(rl) });

    // Security validations
    const sizeCheck = validateFileSize(file.size);
    if (!sizeCheck.valid) return NextResponse.json({ error: sizeCheck.error }, { status: 400, headers: getRateLimitHeaders(rl) });

    const typeCheck = validateFileType(file.name, file.type);
    if (!typeCheck.valid) return NextResponse.json({ error: typeCheck.error }, { status: 400, headers: getRateLimitHeaders(rl) });

    const validation = validateFile(file.name, file.size);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400, headers: getRateLimitHeaders(rl) });

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Additional buffer size check (defense in depth)
    if (buffer.length > IMPORT_LIMITS.MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: `File too large. Max ${IMPORT_LIMITS.MAX_FILE_SIZE_BYTES / 1024 / 1024}MB` }, { status: 400, headers: getRateLimitHeaders(rl) });
    }

    const parsed = await parseFile(buffer, file.name);

    if (parsed.totalRows === 0) return NextResponse.json({ error: "File is empty" }, { status: 400, headers: getRateLimitHeaders(rl) });
    if (parsed.totalRows > IMPORT_LIMITS.MAX_ROWS) {
      return NextResponse.json({ error: `Too many rows. Max ${IMPORT_LIMITS.MAX_ROWS} per import, got ${parsed.totalRows}` }, { status: 400, headers: getRateLimitHeaders(rl) });
    }

    if (parsed.columns.length > IMPORT_LIMITS.MAX_COLUMNS) {
      return NextResponse.json({ error: `Too many columns. Max ${IMPORT_LIMITS.MAX_COLUMNS}, got ${parsed.columns.length}` }, { status: 400, headers: getRateLimitHeaders(rl) });
    }

    // Validate headers
    const headerCheck = validateHeaders(parsed.columns);
    if (!headerCheck.valid) {
      logger.warn("Invalid headers in import", { orgId: session.orgId, error: headerCheck.error });
      // Don't block, but warn - allow sanitized headers
    }

    const suggestedMapping = await suggestMapping(headerCheck.sanitized);

    // Return only first 5 rows for preview to keep payload small and avoid leaking too much
    const previewRows = parsed.rows.slice(0, 5);

    logger.audit("IMPORT_PARSE", session.orgId, session.userId, { fileName: file.name, totalRows: parsed.totalRows });

    return NextResponse.json({
      columns: headerCheck.sanitized,
      rows: parsed.rows, // full rows needed for next step but limited by MAX_ROWS
      totalRows: parsed.totalRows,
      suggestedMapping,
      preview: previewRows,
    }, { headers: getRateLimitHeaders(rl) });
  } catch (e: any) {
    logger.error("Import parse failed", { orgId: session?.orgId, error: e.message });
    return NextResponse.json({ error: e.message || "Failed to parse file" }, { status: 500, headers: getRateLimitHeaders(rl) });
  }
}
