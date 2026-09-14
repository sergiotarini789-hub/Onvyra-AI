import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { campaignCreateSchema } from "@/lib/validation";
import { getOrganizationUsage, checkSpecificLimit, getPlanForOrganization, incrementUsage } from "@/lib/billing";
import { rateLimit, getRateLimitHeaders, getClientIp } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const rl = rateLimit(`campaign_create:${session.organizationId}`, "api_default");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    // P1-8: Enforce campaign limits server-side
    const org = await prisma.organization.findUnique({ where: { id: session.organizationId } }).catch(() => null);
    const plan = org ? getPlanForOrganization(org) : "FREE";
    const usage = await getOrganizationUsage(prisma, session.organizationId);
    const limitCheck = checkSpecificLimit(plan, usage, "campaign");
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason, limit: true }, { status: 403, headers: getRateLimitHeaders(rl) });
    }

    const body = await req.json();
    const parsed = campaignCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400, headers: getRateLimitHeaders(rl) });

    // Verify all leadIds belong to org
    const leads = await prisma.lead.findMany({
      where: { id: { in: parsed.data.leadIds }, organizationId: session.organizationId },
      include: { aiAnalyses: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (leads.length !== parsed.data.leadIds.length) {
      return NextResponse.json({ error: "Some leads not found or not in your organization" }, { status: 400, headers: getRateLimitHeaders(rl) });
    }

    const campaign = await prisma.campaign.create({
      data: {
        organizationId: session.organizationId,
        name: parsed.data.name,
        description: parsed.data.description,
        status: "active",
      },
    });

    for (const lead of leads) {
      const analysis = lead.aiAnalyses[0];
      await prisma.campaignLead.create({
        data: {
          organizationId: session.organizationId,
          campaignId: campaign.id,
          leadId: lead.id,
          status: "selected",
          messageGenerated: analysis?.generatedMessage || null,
        },
      });
    }

    await incrementUsage(prisma, session.organizationId, "campaign", 1);

    return NextResponse.json({ success: true, campaignId: campaign.id }, { headers: getRateLimitHeaders(rl) });
  } catch (e: any) {
    console.error("campaign create error", e);
    return NextResponse.json({ error: e.message }, { status: 500, headers: getRateLimitHeaders(rl) });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ campaigns });
}
