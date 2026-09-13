import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeRows } from "@/lib/import/normalization";
import { deduplicateBatch, isDuplicateLead } from "@/lib/import/duplicate";
import { analyzeLeadWithAI } from "@/lib/ai/analyst";
import { generateFollowUpMessage } from "@/lib/ai/message";
import { importMappingSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = importMappingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { mapping, rows, fileName } = parsed.data;

    if (rows.length > 10000) return NextResponse.json({ error: "Too many rows" }, { status: 400 });

    // Create import job
    const importJob = await prisma.importJob.create({
      data: {
        organizationId: session.organizationId,
        fileName,
        status: "processing",
        totalRows: rows.length,
        mapping: JSON.stringify(mapping),
      },
    });

    // Normalize
    const normalized = normalizeRows(rows, mapping);

    // Deduplicate within batch
    const { unique, duplicates: batchDups } = deduplicateBatch(normalized);

    // Check against existing leads in DB
    const existingLeads = await prisma.lead.findMany({
      where: { organizationId: session.organizationId },
      select: { id: true, phone: true, email: true, name: true, company: true },
      take: 10000,
    });

    const toImport: typeof unique = [];
    const existingDups: typeof unique = [];
    for (const lead of unique) {
      const dup = isDuplicateLead(lead, existingLeads);
      if (dup.isDuplicate) existingDups.push(lead);
      else toImport.push(lead);
    }

    let importedCount = 0;
    let analyzedCount = 0;
    const errors: string[] = [];

    // Import in batches
    for (const leadData of toImport) {
      try {
        const lead = await prisma.lead.create({
          data: {
            organizationId: session.organizationId,
            name: leadData.name,
            phone: leadData.phone,
            email: leadData.email,
            company: leadData.company,
            manager: leadData.manager,
            product: leadData.product,
            dealValue: leadData.dealValue,
            dealStage: leadData.dealStage,
            status: leadData.status || "new",
            lastContactAt: leadData.lastContactAt,
            source: leadData.source,
            lastMessage: leadData.lastMessage,
            rawData: leadData.rawData,
          },
        });

        // AI analysis
        try {
          const analysis = await analyzeLeadWithAI({
            id: lead.id,
            name: lead.name,
            product: lead.product,
            dealValue: lead.dealValue,
            dealStage: lead.dealStage,
            status: lead.status,
            lastContactAt: lead.lastContactAt,
            lastMessage: lead.lastMessage,
            rawData: lead.rawData ? JSON.parse(lead.rawData) : null,
          });

          let generatedMessage: string | null = null;
          try {
            const msgResult = await generateFollowUpMessage(
              {
                id: lead.id,
                name: lead.name,
                company: lead.company,
                product: lead.product,
                dealStage: lead.dealStage,
                dealValue: lead.dealValue,
                lastMessage: lead.lastMessage,
              },
              {
                lossReason: analysis.lossReason,
                recommendedAction: analysis.recommendedAction,
                recommendedMessageGoal: analysis.recommendedMessageGoal,
              }
            );
            generatedMessage = msgResult.message;
          } catch (e) {
            console.warn("message generation failed", e);
          }

          await prisma.aIAnalysis.create({
            data: {
              organizationId: session.organizationId,
              leadId: lead.id,
              leadStatus: analysis.leadStatus,
              buyingIntent: analysis.buyingIntent,
              lossReason: analysis.lossReason,
              recoveryScore: analysis.recoveryScore,
              recoveryProbability: analysis.recoveryProbability,
              confidence: analysis.confidence,
              recommendedAction: analysis.recommendedAction,
              reasoningSummary: analysis.reasoningSummary,
              recommendedMessageGoal: analysis.recommendedMessageGoal,
              generatedMessage,
              modelVersion: analysis.modelVersion,
            },
          });

          analyzedCount++;
        } catch (e: any) {
          console.error("analysis failed for lead", lead.id, e);
          errors.push(`Analysis failed for ${lead.name || lead.id}: ${e.message}`);
        }

        importedCount++;
      } catch (e: any) {
        errors.push(`Failed to import row: ${e.message}`);
      }
    }

    await prisma.importJob.update({
      where: { id: importJob.id },
      data: {
        status: "completed",
        processedRows: importedCount,
        errors: JSON.stringify(errors.slice(0, 20)),
      },
    });

    return NextResponse.json({
      imported: importedCount,
      duplicates: batchDups.length + existingDups.length,
      analyzed: analyzedCount,
      errors,
      importJobId: importJob.id,
    });
  } catch (e: any) {
    console.error("import confirm error", e);
    return NextResponse.json({ error: e.message || "Import failed" }, { status: 500 });
  }
}
