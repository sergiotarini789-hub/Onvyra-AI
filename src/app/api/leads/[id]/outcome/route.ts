import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recoveryEventSchema } from "@/lib/validation";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let body: any;
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await req.json();
      body.leadId = params.id;
    } else {
      const form = await req.formData();
      body = {
        leadId: params.id,
        outcome: form.get("outcome") as string,
        revenue: form.get("revenue") ? parseFloat(form.get("revenue") as string) : undefined,
        note: (form.get("note") as string) || undefined,
      };
    }

    const parsed = recoveryEventSchema.safeParse(body);
    if (!parsed.success) {
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
        outcome: parsed.data.outcome,
        revenue: parsed.data.revenue,
        note: parsed.data.note,
      },
    });

    // If won, update lead status
    if (parsed.data.outcome === "won") {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "won" },
      });
    }

    // If request is form, redirect back
    if (!contentType.includes("application/json")) {
      return NextResponse.redirect(new URL(`/leads/${lead.id}`, req.url));
    }

    return NextResponse.json({ success: true, event });
  } catch (e: any) {
    console.error("outcome error", e);
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
