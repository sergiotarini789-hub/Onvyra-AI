import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseFile, validateFile } from "@/lib/import/parse";
import { suggestMapping } from "@/lib/import/mapping";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const validation = validateFile(file.name, file.size);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseFile(buffer, file.name);

    if (parsed.totalRows === 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });
    if (parsed.totalRows > 10000) return NextResponse.json({ error: "Too many rows. Max 10,000 per import." }, { status: 400 });

    const suggestedMapping = await suggestMapping(parsed.columns);

    // Return only first 5 rows for preview to keep payload small
    const previewRows = parsed.rows.slice(0, 5);

    return NextResponse.json({
      columns: parsed.columns,
      rows: parsed.rows, // full rows needed for import, but we already have them client side? We return all for MVP
      totalRows: parsed.totalRows,
      suggestedMapping,
      preview: previewRows,
    });
  } catch (e: any) {
    console.error("parse error", e);
    return NextResponse.json({ error: e.message || "Failed to parse file" }, { status: 500 });
  }
}
