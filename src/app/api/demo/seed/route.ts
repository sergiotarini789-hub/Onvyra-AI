import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { generateDemoLeads } from "@/lib/demo/data";
import { analyzeLeadWithAI } from "@/lib/ai/analyst";
import { generateFollowUpMessage } from "@/lib/ai/message";
import { hashPassword, createSession, setSessionCookie } from "@/lib/auth";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 30) + "-" + Math.random().toString(36).slice(2, 6);
}

export async function POST(req: NextRequest) {
  try {
    let session = await getSession();
    let orgId: string;

    if (!session) {
      // Create demo user and org if no session
      const email = "demo@onvyra.ai";
      const existingUser = await prisma.user.findUnique({ where: { email }, include: { memberships: true } });
      if (existingUser && existingUser.memberships[0]) {
        orgId = existingUser.memberships[0].organizationId;
        const token = await createSession({
          userId: existingUser.id,
          email: existingUser.email,
          organizationId: orgId,
          role: existingUser.memberships[0].role,
        });
        await setSessionCookie(token);
        session = { userId: existingUser.id, email, organizationId: orgId, role: existingUser.memberships[0].role };
      } else {
        const passwordHash = await hashPassword("demo12345");
        const user = await prisma.user.create({
          data: { email, passwordHash, name: "Demo User" },
        });
        const org = await prisma.organization.create({
          data: { name: "Demo Organization", slug: slugify("Demo Organization") },
        });
        await prisma.organizationMember.create({
          data: { userId: user.id, organizationId: org.id, role: "OWNER" },
        });
        orgId = org.id;
        const token = await createSession({ userId: user.id, email, organizationId: org.id, role: "OWNER" });
        await setSessionCookie(token);
        session = { userId: user.id, email, organizationId: org.id, role: "OWNER" };
      }
    } else {
      orgId = session.organizationId;
    }

    // Check if demo data already exists
    const existingDemoCount = await prisma.lead.count({ where: { organizationId: orgId, isDemo: true } });
    if (existingDemoCount >= 900) {
      return NextResponse.json({ success: true, message: "Demo data already seeded", count: existingDemoCount });
    }

    // Clear existing demo if partial
    if (existingDemoCount > 0) {
      await prisma.lead.deleteMany({ where: { organizationId: orgId, isDemo: true } });
    }

    const demoLeads = generateDemoLeads(1000);
    let imported = 0;
    let analyzed = 0;

    for (const dl of demoLeads) {
      const lead = await prisma.lead.create({
        data: {
          organizationId: orgId,
          name: dl.name,
          phone: dl.phone,
          email: dl.email,
          company: dl.company,
          product: dl.product,
          dealValue: dl.dealValue,
          dealStage: dl.dealStage,
          status: dl.status,
          lastContactAt: dl.lastContactAt,
          lastMessage: dl.lastMessage,
          source: dl.source,
          manager: dl.manager,
          rawData: JSON.stringify(dl),
          isDemo: true,
        },
      });
      imported++;

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
          rawData: dl,
        });

        let genMsg: string | null = null;
        try {
          const msg = await generateFollowUpMessage(
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
          genMsg = msg.message;
        } catch {}

        await prisma.aIAnalysis.create({
          data: {
            organizationId: orgId,
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
            generatedMessage: genMsg,
            modelVersion: analysis.modelVersion,
          },
        });
        analyzed++;
      } catch (e) {
        console.error("demo analysis failed", e);
      }
    }

    return NextResponse.json({ success: true, imported, analyzed });
  } catch (e: any) {
    console.error("demo seed error", e);
    return NextResponse.json({ error: e.message || "Demo seed failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.lead.deleteMany({ where: { organizationId: session.organizationId, isDemo: true } });
  return NextResponse.json({ success: true });
}
