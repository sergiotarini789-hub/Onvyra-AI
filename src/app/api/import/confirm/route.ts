import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeRows } from "@/lib/import/normalization";
import { deduplicateBatch, isDuplicateLead } from "@/lib/import/duplicate";
import { analyzeLeadWithAI } from "@/lib/ai/analyst";
import { generateFollowUpMessage } from "@/lib/ai/message";
import { importMappingSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getScoreCategory } from "@/lib/recovery/score";

function sanitizeText(text: string): string {
  // Treat imported text as DATA, not instructions - strip potential prompt injection
  if (!text) return text;
  // Remove common prompt injection patterns, but keep as data
  return text
    .replace(/ignore previous instructions/gi, "[filtered]")
    .replace(/reveal system prompt/gi, "[filtered]")
    .replace(/system prompt/gi, "[filtered]")
    .slice(0, 2000); // limit length
}

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

    await logAudit({
      organizationId: session.organizationId,
      userId: session.userId,
      event: "IMPORT_STARTED",
      entityType: "ImportJob",
      metadata: { fileName, totalRows: rows.length },
    });

    const importJob = await prisma.importJob.create({
      data: {
        organizationId: session.organizationId,
        fileName,
        status: "processing",
        totalRows: rows.length,
        mapping: JSON.stringify(mapping),
      },
    });

    const normalized = normalizeRows(rows, mapping);

    const { unique, duplicates: batchDups } = deduplicateBatch(normalized);

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
    let criticalCount = 0;
    let highCount = 0;
    let totalPotential = 0;
    const errors: string[] = [];

    for (const leadData of toImport) {
      try {
        // Sanitize text fields to prevent prompt injection
        const sanitizedLastMessage = leadData.lastMessage ? sanitizeText(leadData.lastMessage) : null;
        const sanitizedRawData = leadData.rawData ? sanitizeText(leadData.rawData) : null;

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
            lastMessage: sanitizedLastMessage,
            rawData: sanitizedRawData || leadData.rawData,
          },
        });

        await logAudit({
          organizationId: session.organizationId,
          userId: session.userId,
          event: "LEAD_CREATED",
          entityType: "Lead",
          entityId: lead.id,
          metadata: { source: "import", fileName },
        });

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

          const aiAnalysis = await prisma.aIAnalysis.create({
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
              factors: analysis.scoreReasons ? analysis.scoreReasons : analysis.factors ? JSON.stringify(analysis.factors) : null,
              missingInformation: null,
            },
          });

          // Create RecoveryOpportunity for inbox
          const category = getScoreCategory(analysis.recoveryScore);
          const potentialRevenue = lead.dealValue && analysis.recoveryProbability ? lead.dealValue * analysis.recoveryProbability : null;
          if (potentialRevenue) totalPotential += potentialRevenue;
          if (analysis.recoveryScore >= 80) criticalCount++;
          else if (analysis.recoveryScore >= 60) highCount++;

          try {
            await prisma.recoveryOpportunity.create({
              data: {
                organizationId: session.organizationId,
                leadId: lead.id,
                score: analysis.recoveryScore,
                category: category.toUpperCase(),
                probability: analysis.recoveryProbability,
                confidence: analysis.confidence,
                potentialRevenue,
                status: "open",
                factors: analysis.factors ? JSON.stringify(analysis.factors) : JSON.stringify(analysis.scoreReasons || []),
                reasoningSummary: analysis.reasoningSummary,
                recommendedAction: analysis.recommendedAction,
                lastContactAt: lead.lastContactAt,
              },
            });
          } catch (e) {
            console.warn("recoveryOpportunity create failed", e);
          }

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

    const duplicateCount = batchDups.length + existingDups.length;
    const summary = {
      imported: importedCount,
      created: importedCount,
      updated: 0,
      duplicates: duplicateCount,
      skipped: rows.length - importedCount - duplicateCount,
      errors: errors.length,
      potentialRecoverableRevenue: Math.round(totalPotential),
      criticalOpportunities: criticalCount,
      highOpportunities: highCount,
    };

    await prisma.importJob.update({
      where: { id: importJob.id },
      data: {
        status: "completed",
        processedRows: importedCount,
        createdCount: importedCount,
        duplicateCount,
        skippedCount: summary.skipped,
        errorCount: errors.length,
        errors: JSON.stringify(errors.slice(0, 20)),
        summary,
      },
    });

    await logAudit({
      organizationId: session.organizationId,
      userId: session.userId,
      event: "IMPORT_COMPLETED",
      entityType: "ImportJob",
      entityId: importJob.id,
      metadata: summary,
    });

    return NextResponse.json({
      imported: importedCount,
      created: importedCount,
      updated: 0,
      duplicates: duplicateCount,
      skipped: summary.skipped,
      analyzed: analyzedCount,
      errors,
      importJobId: importJob.id,
      summary,
    });
  } catch (e: any) {
    console.error("import confirm error", e);
    return NextResponse.json({ error: e.message || "Import failed" }, { status: 500 });
  }
}
