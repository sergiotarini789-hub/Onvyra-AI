import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma, validateMonetaryAmount } from "@/lib/prisma";
import { recoveryEventSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { rateLimit, getRateLimitHeaders, getClientIp } from "@/lib/security/rate-limit";
import { logger } from "@/lib/observability/logger";
import { z } from "zod";

const NEW_OUTCOMES = ["CONTACTED", "REPLIED", "INTERESTED", "NEGOTIATING", "RECOVERED", "REJECTED", "NO_RESPONSE", "CANCELLED", "NOT_RECOVERABLE", "won", "lost", "contacted", "responded", "interested", "negotiation", "no_response", "not_interested"] as const;

const outcomeSchema = z.object({
  leadId: z.string(),
  outcome: z.enum(NEW_OUTCOMES as any),
  revenue: z.number().min(0).max(9999999999999.99).optional().nullable(),
  recoveredAt: z.string().or(z.date()).optional().nullable(),
  note: z.string().max(2000).optional(),
  source: z.string().max(100).optional(),
  campaignId: z.string().optional(),
});

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let session: any = null;
  try {
    session = await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rl = rateLimit(`outcome:${session.orgId}`, "api_default");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    let body: any;
    const contentType = req.headers.get("content-type") || "";
    let recoveredAt: Date | null = null;
    let source = "manual";
    let campaignId: string | undefined;

    if (contentType.includes("application/json")) {
      body = await req.json();
      body.leadId = params.id;
      if (body.recoveredAt) {
        const dateVal = new Date(body.recoveredAt);
        if (isNaN(dateVal.getTime())) {
          return NextResponse.json({ error: "Invalid recoveredAt date" }, { status: 400, headers: getRateLimitHeaders(rl) });
        }
        if (dateVal > new Date()) {
          return NextResponse.json({ error: "recoveredAt cannot be in the future" }, { status: 400, headers: getRateLimitHeaders(rl) });
        }
        recoveredAt = dateVal;
      }
      source = body.source || "manual";
      campaignId = body.campaignId;
    } else {
      const form = await req.formData();
      body = {
        leadId: params.id,
        outcome: form.get("outcome") as string,
        revenue: form.get("revenue") ? parseFloat(form.get("revenue") as string) : undefined,
        note: (form.get("note") as string) || undefined,
      };
      const ra = form.get("recoveredAt") as string | null;
      if (ra) {
        const dateVal = new Date(ra);
        if (!isNaN(dateVal.getTime()) && dateVal <= new Date()) {
          recoveredAt = dateVal;
        }
      }
    }

    const outcomeValue = body.outcome;
    if (!NEW_OUTCOMES.includes(outcomeValue)) {
      return NextResponse.json({ error: `Invalid outcome. Must be one of ${NEW_OUTCOMES.join(", ")}` }, { status: 400, headers: getRateLimitHeaders(rl) });
    }

    // Financial validation - RECOVERED requires revenue
    if ((outcomeValue === "RECOVERED" || outcomeValue === "won") ) {
      if (body.revenue === undefined || body.revenue === null) {
        if (contentType.includes("application/json")) {
          return NextResponse.json({ error: "Recovered outcome requires revenue amount and date" }, { status: 400, headers: getRateLimitHeaders(rl) });
        }
      } else {
        const monetaryCheck = validateMonetaryAmount(body.revenue, "revenue");
        if (!monetaryCheck.valid) {
          return NextResponse.json({ error: monetaryCheck.error }, { status: 400, headers: getRateLimitHeaders(rl) });
        }
        body.revenue = monetaryCheck.value;
        
        if (body.revenue === 0) {
          return NextResponse.json({ error: "Recovered revenue must be greater than 0" }, { status: 400, headers: getRateLimitHeaders(rl) });
        }
      }
    }

    // Validate with Zod
    const parsed = outcomeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400, headers: getRateLimitHeaders(rl) });
    }

    // Tenant isolation - verify lead belongs to org
    const lead = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: session.organizationId },
    });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404, headers: getRateLimitHeaders(rl) });

    // Verify campaign belongs to org if provided
    if (campaignId) {
      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, organizationId: session.organizationId },
      });
      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404, headers: getRateLimitHeaders(rl) });
      }
    }

    // Create recovery event with transaction safety
    const event = await prisma.recoveryEvent.create({
      data: {
        organizationId: session.organizationId,
        leadId: lead.id,
        outcome: outcomeValue,
        revenue: body.revenue || null,
        note: body.note,
        recoveredAt: recoveredAt,
        source: source,
        campaignId: campaignId,
        userId: session.userId,
      },
    } as any);

    // Update opportunity if exists - keep financial distinction
    try {
      const opp = await prisma.recoveryOpportunity.findFirst({ 
        where: { leadId: lead.id, organizationId: session.organizationId } 
      });
      if (opp) {
        const updateData: any = {};
        if (outcomeValue === "RECOVERED" || outcomeValue === "won") {
          updateData.status = "RECOVERED";
          updateData.potentialRevenue = opp.potentialRevenue; // Keep estimated, don't overwrite with confirmed
        } else if (outcomeValue === "CONTACTED" || outcomeValue === "contacted") {
          updateData.status = "CONTACTED";
        } else if (outcomeValue === "REPLIED" || outcomeValue === "responded") {
          updateData.status = "REPLIED";
        }
        
        if (Object.keys(updateData).length > 0) {
          await prisma.recoveryOpportunity.update({
            where: { id: opp.id },
            data: updateData,
          });
        }
      }
    } catch (e: any) {
      logger.warn("Failed to update opportunity", { orgId: session.orgId, error: e.message });
    }

    // Update campaignLead if applicable
    try {
      if (campaignId) {
        await prisma.campaignLead.updateMany({
          where: { campaignId, leadId: lead.id, organizationId: session.organizationId },
          data: { 
            outcome: outcomeValue, 
            revenue: body.revenue || undefined, 
            status: outcomeValue === "CONTACTED" ? "contacted" : outcomeValue === "RECOVERED" || outcomeValue === "won" ? "outcome" : undefined 
          } as any,
        });
      } else {
        // Update all campaignLeads for this lead
        await prisma.campaignLead.updateMany({
          where: { leadId: lead.id, organizationId: session.organizationId },
          data: { outcome: outcomeValue, revenue: body.revenue || undefined } as any,
        });
      }
    } catch (e: any) {
      logger.warn("Failed to update campaignLead", { orgId: session.orgId, error: e.message });
    }

    // Update lead status for certain outcomes - but preserve original for analytics
    if (outcomeValue === "RECOVERED" || outcomeValue === "won") {
      await prisma.lead.update({ where: { id: lead.id }, data: { status: "won" } });
    } else if (outcomeValue === "REJECTED" || outcomeValue === "NOT_RECOVERABLE" || outcomeValue === "lost" || outcomeValue === "not_interested") {
      await prisma.lead.update({ where: { id: lead.id }, data: { status: "rejected" } });
    }

    await logAudit({
      organizationId: session.organizationId,
      userId: session.userId,
      event: outcomeValue === "RECOVERED" || outcomeValue === "won" ? "RECOVERY_CONFIRMED" : "RECOVERY_OUTCOME_UPDATED",
      entityType: "Lead",
      entityId: lead.id,
      metadata: { outcome: outcomeValue, revenue: body.revenue, recoveredAt, campaignId },
    });

    if (!contentType.includes("application/json")) {
      return NextResponse.redirect(new URL(`/leads/${lead.id}`, req.url));
    }

    return NextResponse.json({ success: true, event }, { headers: getRateLimitHeaders(rl) });
  } catch (e: any) {
    logger.error("Outcome update failed", { orgId: session?.orgId, leadId: params.id, error: e.message });
    return NextResponse.json({ error: "Failed to update outcome" }, { status: 500, headers: getRateLimitHeaders(rl) });
  }
}
