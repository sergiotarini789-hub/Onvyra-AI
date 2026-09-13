import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma, calculatePotentialRevenue, validateMonetaryAmount } from "@/lib/prisma";
import { normalizeRows } from "@/lib/import/normalization";
import { deduplicateBatch, isDuplicateLead } from "@/lib/import/duplicate";
import { analyzeLeadWithAI } from "@/lib/ai/analyst";
import { generateFollowUpMessage } from "@/lib/ai/message";
import { importMappingSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { getScoreCategory } from "@/lib/recovery/score";
import { sanitizeRow, validateRowCount } from "@/lib/import/security";
import { rateLimit, getRateLimitHeaders, getClientIp } from "@/lib/security/rate-limit";
import { getOrganizationUsage, checkSpecificLimit, getPlanForOrganization, incrementUsage } from "@/lib/billing";
import { logger } from "@/lib/observability/logger";

function sanitizeText(text: string): string {
  if (!text) return text;
  return text
    .replace(/ignore previous instructions/gi, "[filtered]")
    .replace(/reveal system prompt/gi, "[filtered]")
    .replace(/system prompt/gi, "[filtered]")
    .slice(0, 2000);
}

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
  const rl = rateLimit(`import_confirm:${session.orgId}`, "import_confirm");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    // Billing check
    const org = await prisma.organization.findUnique({ where: { id: session.orgId } }).catch(() => null);
    const plan = org ? getPlanForOrganization(org) : "FREE";
    const usage = await getOrganizationUsage(prisma, session.orgId);
    const limitCheck = checkSpecificLimit(plan, usage, "import");
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason, limit: true }, { status: 403, headers: getRateLimitHeaders(rl) });
    }

    const body = await req.json();
    const parsed = importMappingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400, headers: getRateLimitHeaders(rl) });
    }
    const { mapping, rows, fileName } = parsed.data;

    const rowCountCheck = validateRowCount(rows.length);
    if (!rowCountCheck.valid) {
      return NextResponse.json({ error: rowCountCheck.error }, { status: 400, headers: getRateLimitHeaders(rl) });
    }

    // Check leads limit
    const leadsCheck = checkSpecificLimit(plan, usage, "leads");
    if (!leadsCheck.allowed) {
      return NextResponse.json({ error: leadsCheck.reason, limit: true }, { status: 403, headers: getRateLimitHeaders(rl) });
    }

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

    // Sanitize rows for security
    const sanitizedRows: any[] = [];
    let sanitizationWarnings = 0;
    for (const row of rows) {
      const { sanitized, warnings } = sanitizeRow(row);
      sanitizedRows.push(sanitized);
      if (warnings.length > 0) sanitizationWarnings++;
    }

    const normalized = normalizeRows(sanitizedRows, mapping);

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

    // Transaction-like processing with error handling
    for (const leadData of toImport) {
      try {
        // Validate monetary amount
        if (leadData.dealValue !== null && leadData.dealValue !== undefined) {
          const monetaryCheck = validateMonetaryAmount(leadData.dealValue, "dealValue");
          if (!monetaryCheck.valid) {
            errors.push(`Invalid dealValue for ${leadData.name || "unknown"}: ${monetaryCheck.error}`);
            continue;
          }
          leadData.dealValue = monetaryCheck.value as any;
        }

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
            provider: "csv",
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
            rawData: lead.rawData ? (() => { try { return JSON.parse(lead.rawData); } catch { return lead.rawData; } })() : null,
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
            logger.warn("Message generation failed", { orgId: session.orgId, leadId: lead.id });
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
              factors: analysis.scoreReasons ? JSON.stringify(analysis.scoreReasons) : analysis.factors ? JSON.stringify(analysis.factors) : null,
              missingInformation: null,
              tokensUsed: (analysis as any).tokensUsed || null,
            },
          });

          const category = getScoreCategory(analysis.recoveryScore);
          const potentialRevenue = calculatePotentialRevenue(lead.dealValue as any, analysis.recoveryProbability || null);
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
            logger.warn("RecoveryOpportunity create failed", { orgId: session.orgId, error: (e as Error).message });
          }

          analyzedCount++;
          
          // Increment usage
          await incrementUsage(prisma, session.organizationId, "aiAnalysis", 1);
          if (aiAnalysis.tokensUsed) {
            await incrementUsage(prisma, session.organizationId, "tokens", aiAnalysis.tokensUsed);
          }
        } catch (e: any) {
          logger.error("Analysis failed for lead", { orgId: session.orgId, leadId: lead.id, error: e.message });
          errors.push(`Analysis failed for ${lead.name || lead.id}: ${e.message}`);
        }

        importedCount++;
      } catch (e: any) {
        logger.error("Failed to import lead", { orgId: session.orgId, error: e.message });
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
      sanitizationWarnings,
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

    await incrementUsage(prisma, session.organizationId, "import", 1);
    await incrementUsage(prisma, session.organizationId, "lead", importedCount);

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
    }, { headers: getRateLimitHeaders(rl) });
  } catch (e: any) {
    logger.error("Import confirm failed", { orgId: session?.orgId, error: e.message });
    return NextResponse.json({ error: e.message || "Import failed" }, { status: 500, headers: getRateLimitHeaders(rl) });
  }
}
