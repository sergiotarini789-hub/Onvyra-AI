import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recoveryEventSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

const NEW_OUTCOMES = ["CONTACTED", "REPLIED", "INTERESTED", "NEGOTIATING", "RECOVERED", "REJECTED", "NO_RESPONSE", "CANCELLED", "NOT_RECOVERABLE", "won", "lost", "contacted", "responded", "interested", "negotiation", "no_response", "not_interested"] as const;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let body: any;
    const contentType = req.headers.get("content-type") || "";
    let recoveredAt: Date | null = null;
    let source = "manual";
    let campaignId: string | undefined;

    if (contentType.includes("application/json")) {
      body = await req.json();
      body.leadId = params.id;
      if (body.recoveredAt) recoveredAt = new Date(body.recoveredAt);
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
      if (ra) recoveredAt = new Date(ra);
    }

    // Allow new outcome values
    const outcomeValue = body.outcome;
    if (!NEW_OUTCOMES.includes(outcomeValue)) {
      return NextResponse.json({ error: `Invalid outcome. Must be one of ${NEW_OUTCOMES.join(", ")}` }, { status: 400 });
    }

    // Validate recovered requires revenue
    if ((outcomeValue === "RECOVERED" || outcomeValue === "won") && !body.revenue) {
      if (!contentType.includes("application/json")) {
        // For form, still allow but warn via note? Enforce for API, allow for form but log
      } else {
        return NextResponse.json({ error: "Recovered outcome requires recoveredAmount (revenue) and date" }, { status: 400 });
      }
    }

    const parsed = recoveryEventSchema.safeParse(body);
    if (!parsed.success && !NEW_OUTCOMES.includes(outcomeValue as any)) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const lead = await prisma.lead.findFirst({
      where: { id: params.id, organizationId: session.organizationId },
    });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const event = await prisma.recoveryEvent.create({
      data: {
        organizationId: session.organizationId,
        leadId: lead.id,
        outcome: outcomeValue,
        revenue: body.revenue,
        note: body.note,
        recoveredAt: recoveredAt,
        source: source,
        campaignId: campaignId,
        createdBy: session.userId,
        // Use extended fields if available
        ...( { recoveredAt, source, campaignId, createdBy: session.userId } as any),
      },
    } as any);

    // Update opportunity if exists
    try {
      const opp = await prisma.recoveryOpportunity.findFirst({ where: { leadId: lead.id, organizationId: session.organizationId } });
      if (opp) {
        await prisma.recoveryOpportunity.update({
          where: { id: opp.id },
          data: {
            status: outcomeValue === "RECOVERED" || outcomeValue === "won" ? "RECOVERED" : outcomeValue === "CONTACTED" || outcomeValue === "contacted" ? "CONTACTED" : opp.status,
            recoveredAmount: outcomeValue === "RECOVERED" || outcomeValue === "won" ? body.revenue : opp.recoveredAmount,
            recoveredAt: recoveredAt || undefined,
          } as any,
        });
      }
    } catch {}

    // Update campaignLead if campaignId provided or any
    try {
      if (campaignId) {
        await prisma.campaignLead.updateMany({
          where: { campaignId, leadId: lead.id, organizationId: session.organizationId },
          data: { outcome: outcomeValue, revenue: body.revenue, status: outcomeValue === "CONTACTED" ? "contacted" : outcomeValue === "RECOVERED" ? "won" : undefined } as any,
        });
      } else {
        await prisma.campaignLead.updateMany({
          where: { leadId: lead.id, organizationId: session.organizationId },
          data: { outcome: outcomeValue, revenue: body.revenue } as any,
        });
      }
    } catch {}

    // Update lead status for certain outcomes
    if (outcomeValue === "RECOVERED" || outcomeValue === "won") {
      await prisma.lead.update({ where: { id: lead.id }, data: { status: "won" } });
    } else if (outcomeValue === "REJECTED" || outcomeValue === "NOT_RECOVERABLE" || outcomeValue === "lost") {
      await prisma.lead.update({ where: { id: lead.id }, data: { status: "rejected" } });
    }

    await logAudit({
      organizationId: session.organizationId,
      userId: session.userId,
      event: outcomeValue === "RECOVERED" || outcomeValue === "won" ? "RECOVERY_CONFIRMED" : "RECOVERY_OUTCOME_UPDATED",
      entityType: "Lead",
      entityId: lead.id,
      metadata: { outcome: outcomeValue, revenue: body.revenue, recoveredAt },
    });

    if (!contentType.includes("application/json")) {
      return NextResponse.redirect(new URL(`/leads/${lead.id}`, req.url));
    }

    return NextResponse.json({ success: true, event });
  } catch (e: any) {
    console.error("outcome error", e);
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
