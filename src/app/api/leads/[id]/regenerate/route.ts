import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateFollowUpMessage } from "@/lib/ai/message";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, organizationId: session.organizationId },
    include: { aiAnalyses: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const analysis = lead.aiAnalyses[0];
  if (!analysis) return NextResponse.json({ error: "No analysis found" }, { status: 400 });

  try {
    const result = await generateFollowUpMessage(
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

    await prisma.aIAnalysis.update({
      where: { id: analysis.id },
      data: { generatedMessage: result.message },
    });

    return NextResponse.json({ message: result.message, model: result.model });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
