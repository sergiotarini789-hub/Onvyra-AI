export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import LeadDetailActions from "./actions";
import { logAudit } from "@/lib/audit";

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && v.toNumber) return v.toNumber();
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function calcPotential(dealValue: any, prob: any): number | null {
  const dv = toNum(dealValue);
  if (dv === null || prob === null || prob === undefined) return null;
  if (dv < 0 || prob < 0 || prob > 1) return null;
  const cents = Math.round(dv * 100);
  return Math.round(cents * prob) / 100;
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, organizationId: session.organizationId },
    include: {
      aiAnalyses: { orderBy: { createdAt: "desc" }, take: 1 },
      recoveryEvents: { orderBy: { createdAt: "desc" } },
      campaignLeads: { include: { campaign: true } },
      recoveryOpportunities: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!lead) notFound();

  await logAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    event: "RECOVERY_OPPORTUNITY_VIEWED",
    entityType: "Lead",
    entityId: lead.id,
  });

  const analysis = lead.aiAnalyses[0];
  const dealAge = lead.createdAt ? Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : null;
  const lastContactDays = lead.lastContactAt ? Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / (1000 * 60 * 60 * 24)) : null;
  const factors = (analysis?.factors as any[]) || [];
  const positiveFactors = factors.filter((f: any) => f.type === "positive" || !f.type);
  const negativeFactors = factors.filter((f: any) => f.type === "negative");

  const timeline: Array<{ date: Date; actor: string; event: string; metadata?: string; type: string }> = [];
  timeline.push({
    date: new Date(lead.createdAt),
    actor: "System",
    event: `Imported${lead.isDemo ? " (DEMO DATA)" : ""}`,
    metadata: lead.source ? `Source: ${lead.source}` : undefined,
    type: "imported",
  });
  if (analysis) {
    timeline.push({
      date: new Date(analysis.createdAt),
      actor: "AI Analyst",
      event: `AI analyzed — Score ${analysis.recoveryScore}, ${analysis.confidence} confidence`,
      metadata: analysis.reasoningSummary,
      type: "analyzed",
    });
    if (analysis.generatedMessage) {
      timeline.push({
        date: new Date(analysis.createdAt),
        actor: "AI",
        event: "Recovery message generated",
        metadata: `Goal: ${analysis.recommendedMessageGoal}`,
        type: "message_generated",
      });
    }
  }
  for (const ev of lead.recoveryEvents) {
    timeline.push({
      date: new Date(ev.createdAt),
      actor: ev.userId ? `User ${ev.userId.slice(0, 6)}` : "System",
      event: ev.outcome,
      metadata: `${ev.revenue ? `₽${ev.revenue.toLocaleString()} ` : ""}${ev.note || ""}${ev.source ? ` • Source: ${ev.source}` : ""}`.trim(),
      type: ev.outcome.toLowerCase(),
    });
  }
  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  const dealValueNum = toNum(lead.dealValue);
  const potential = analysis ? calcPotential(lead.dealValue, analysis.recoveryProbability) : null;

  const latestByLead = new Map<string, any>();
  for (const ev of lead.recoveryEvents.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())) {
    latestByLead.set(ev.leadId, ev);
  }
  const latestEvents = Array.from(latestByLead.values());
  const confirmedTotal = latestEvents.filter((e: any) => e.outcome === "RECOVERED" || e.outcome === "won").reduce((s: number, e: any) => s + (e.revenue || 0), 0);

  const score = analysis?.recoveryScore || 0;
  const prob = analysis?.recoveryProbability ? Math.round(analysis.recoveryProbability * 100) : null;

  return (
    <div className="p-5 lg:p-6 space-y-5 max-w-[1440px] mx-auto">
      <div className="flex items-center gap-2 text-[11px] font-[500] tracking-[0.01em]">
        <Link href="/inbox" className="inline-flex items-center gap-1 text-[#71717A] hover:text-[#0A0A0B] transition-colors"><span className="h-5 w-5 rounded-full bg-[#F4F4F5] border flex items-center justify-center text-[10px]">←</span> Recovery Inbox</Link>
        <span className="text-[#D4D4D8]">/</span>
        <Link href="/leads" className="text-[#71717A] hover:text-[#0A0A0B] transition-colors">Opportunities</Link>
        <span className="text-[#D4D4D8]">/</span>
        <span className="text-[#0A0A0B] font-[700] tracking-[-0.01em]">{lead.name || "Opportunity"}</span>
        {lead.isDemo && <span className="ml-1 text-[9px] px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] font-[800] tracking-[0.05em]">DEMO DATA</span>}
      </div>

      {/* HERO — One of best screens — Strong Visual Header */}
      <div className="rounded-[20px] border border-[#0A0A0B] bg-white shadow-[0_0_0_1px_#0A0A0B,0_24px_48px_rgba(0,0,0,0.12)] overflow-hidden">
        {/* Top — Customer Deal Score Probability Recommended Action */}
        <div className="bg-[#0A0A0B] text-white p-6 lg:p-7 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
          <div className="absolute top-0 right-0 h-[400px] w-[600px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,255,255,0.06)_0%,transparent_70%)] pointer-events-none" />
          <div className="relative">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="flex gap-4 min-w-0 flex-1">
                <div className="h-[64px] w-[64px] rounded-[18px] bg-white text-[#0A0A0B] flex items-center justify-center text-[22px] font-[850] shadow-[0_4px_16px_rgba(255,255,255,0.15)] shrink-0 tracking-[-0.02em]">{(lead.name || "U")[0].toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-[24px] md:text-[26px] font-[800] tracking-[-0.03em] leading-none">{lead.name || "Unnamed"}</h1>
                    {analysis && <span className={`text-[12px] font-[850] px-3 py-1 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] tracking-[-0.01em] ${score >= 80 ? "bg-[#EF4444] text-white" : score >= 60 ? "bg-[#F97316] text-white" : "bg-white/15 text-white border border-white/20"}`}>{score}</span>}
                    <span className="text-[10px] font-[800] tracking-[0.06em] px-2.5 py-1 rounded-full bg-white text-[#0A0A0B] shadow-sm">{analysis?.recoveryScore && analysis.recoveryScore >= 80 ? "CRITICAL • CONTACT NOW" : "HIGH PRIORITY"}</span>
                    {lead.isDemo && <span className="text-[10px] font-[700] tracking-[0.05em] px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">DEMO</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] leading-[1.4] text-white/60">
                    <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-white/30" />{lead.company || "—"} • {lead.email || lead.phone || "No contact"}</span>
                    <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-white/30" />Deal <span className="font-[700] text-white font-mono-financial">₽{dealValueNum ? Math.round(dealValueNum).toLocaleString("ru-RU") : "—"}</span></span>
                    <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-white/30" />Last {lastContactDays !== null ? `${lastContactDays}d ago` : "—"} • {lead.product || "—"} • Age {dealAge}d</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {factors.slice(0, 5).map((f: any, i: number) => (
                      <span key={i} className="group text-[11px] px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/[0.12] text-white/75 font-[500] hover:bg-white/[0.12] hover:border-white/[0.18] hover:text-white transition-all hover:-translate-y-[0.5px]">{f.explanation}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 shrink-0">
                <div className="rounded-[16px] bg-white/[0.06] border border-white/[0.08] backdrop-blur p-4 text-center min-w-[108px] hover:bg-white/[0.08] transition-colors group">
                  <div className="text-[10px] font-[800] tracking-[0.08em] text-white/40 group-hover:text-white/60 transition-colors">SCORE</div>
                  <div className="mt-2 text-[30px] font-[850] leading-none tracking-[-0.03em]">{score || "—"}</div>
                  <div className="mt-2 inline-flex text-[10px] font-[800] tracking-[0.05em] px-2.5 py-1 rounded-full bg-[#EF4444] text-white shadow-[0_2px_8px_rgba(239,68,68,0.3)]">{score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : "MEDIUM"}</div>
                  <div className="mt-3 h-1 w-full rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${score}%` }} /></div>
                </div>
                <div className="rounded-[16px] bg-white text-[#0A0A0B] p-4 text-center min-w-[108px] shadow-[0_8px_24px_rgba(255,255,255,0.12)] hover:shadow-[0_12px_32px_rgba(255,255,255,0.16)] hover:-translate-y-[0.5px] transition-all group">
                  <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">PROBABILITY</div>
                  <div className="mt-2 text-[30px] font-[850] leading-none tracking-[-0.03em]">{prob !== null ? `${prob}%` : "—"}</div>
                  <div className="mt-2 text-[10px] font-[600] tracking-[0.02em] text-[#71717A]">Est. • Not guaranteed</div>
                  <div className="mt-3 h-1 w-full rounded-full bg-[#F4F4F5] overflow-hidden"><div className="h-full bg-[#0A0A0B] rounded-full transition-all duration-1000" style={{ width: `${prob || 0}%` }} /></div>
                </div>
                <div className="hidden lg:flex flex-col gap-2 min-w-[140px]">
                  <div className="rounded-[12px] bg-[#059669] p-3.5 text-white shadow-[0_4px_16px_rgba(5,150,105,0.25)] hover:shadow-[0_8px_24px_rgba(5,150,105,0.3)] hover:-translate-y-[0.5px] transition-all">
                    <div className="text-[10px] font-[800] tracking-[0.08em] text-white/60">CONFIRMED</div>
                    <div className="mt-1 font-mono-financial text-[15px] font-[800] tracking-[-0.02em]">₽{confirmedTotal.toLocaleString("ru-RU")}</div>
                    <div className="text-[10px] text-white/60 mt-1">Attributed only</div>
                  </div>
                  <div className="rounded-[12px] bg-white/[0.06] border border-white/[0.08] p-3 backdrop-blur hover:bg-white/[0.08] transition-colors">
                    <div className="text-[10px] font-[800] tracking-[0.08em] text-white/40">EST. RECOVERABLE</div>
                    <div className="mt-1 font-mono-financial text-[14px] font-[750] tracking-[-0.02em]">₽{potential ? Math.round(potential).toLocaleString("ru-RU") : "—"}</div>
                    <div className="text-[9px] text-white/40 mt-1">Est. not guaranteed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#E4E4E7]">
          <div className="p-6">
            <div className="flex items-center gap-2"><div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">CUSTOMER</div><div className="h-px flex-1 bg-[#F4F4F5]" /></div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-[13px]">
              <div className="group"><div className="text-[10px] font-[700] tracking-[0.06em] text-[#A1A1AA]">NAME</div><div className="font-[650] tracking-[-0.01em] mt-1.5 group-hover:text-[#0A0A0B] transition-colors">{lead.name || "—"}</div></div>
              <div className="group"><div className="text-[10px] font-[700] tracking-[0.06em] text-[#A1A1AA]">COMPANY</div><div className="font-[650] tracking-[-0.01em] mt-1.5">{lead.company || "—"}</div></div>
              <div className="group"><div className="text-[10px] font-[700] tracking-[0.06em] text-[#A1A1AA]">EMAIL</div><div className="font-[500] mt-1.5 truncate text-[12.5px]">{lead.email || "—"}</div></div>
              <div className="group"><div className="text-[10px] font-[700] tracking-[0.06em] text-[#A1A1AA]">PHONE</div><div className="font-[500] mt-1.5 text-[12.5px]">{lead.phone || "—"}</div></div>
              <div><div className="text-[10px] font-[700] tracking-[0.06em] text-[#A1A1AA]">MANAGER</div><div className="font-[500] mt-1.5 text-[12.5px]">{lead.manager || "—"}</div></div>
              <div><div className="text-[10px] font-[700] tracking-[0.06em] text-[#A1A1AA]">DEAL AGE</div><div className="font-[600] font-mono-financial mt-1.5 text-[12.5px]">{dealAge !== null ? `${dealAge} days` : "—"}</div></div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-2"><div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">DEAL • ESTIMATED vs CONFIRMED</div><div className="h-px flex-1 bg-[#F4F4F5]" /></div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-[13px]">
              <div><div className="text-[10px] font-[700] tracking-[0.06em] text-[#A1A1AA]">PRODUCT</div><div className="font-[600] mt-1.5 text-[12.5px]">{lead.product || "—"}</div></div>
              <div><div className="text-[10px] font-[700] tracking-[0.06em] text-[#A1A1AA]">DEAL VALUE</div><div className="font-mono-financial font-[800] text-[15px] tracking-[-0.02em] mt-1.5">₽{dealValueNum ? Math.round(dealValueNum).toLocaleString("ru-RU") : "—"}</div></div>
              <div className="rounded-[10px] bg-[#FFFBEB] border border-[#FDE68A] p-2.5"><div className="text-[9px] font-[800] tracking-[0.08em] text-[#92400E]">EST. RECOVERABLE • NOT GUARANTEED</div><div className="font-mono-financial font-[800] text-[14px] tracking-[-0.02em] mt-1">₽{potential ? Math.round(potential).toLocaleString("ru-RU") : "—"}</div><div className="text-[9px] text-[#B45309] mt-1 font-[600]">Est. ≠ Confirmed</div></div>
              <div className="rounded-[10px] bg-[#ECFDF5] border border-[#A7F3D0] p-2.5"><div className="text-[9px] font-[800] tracking-[0.08em] text-[#065F46]">CONFIRMED RECOVERED • ATTRIBUTED</div><div className="font-mono-financial font-[800] text-[14px] tracking-[-0.02em] mt-1 text-[#059669]">₽{confirmedTotal.toLocaleString("ru-RU")}</div><div className="text-[9px] text-[#047857] mt-1 font-[600]">Only when RECOVERED recorded</div></div>
              <div className="col-span-2"><div className="text-[10px] font-[700] tracking-[0.06em] text-[#A1A1AA]">LAST MESSAGE • UNTRUSTED DATA</div><div className="mt-2 p-3 rounded-[10px] bg-[#F9FAFB] border border-[#E4E4E7] text-[12px] leading-[1.5] whitespace-pre-wrap max-h-[88px] overflow-auto">{lead.lastMessage || "—"}</div></div>
            </div>
          </div>
          <div className="p-6 bg-[#FCFCFD]">
            <div className="flex items-center gap-2"><div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">RECOMMENDED ACTION</div><div className="h-px flex-1 bg-[#E4E4E7]" /></div>
            <div className="mt-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0A0A0B] text-white text-[11px] font-[800] tracking-[0.05em] shadow-[0_2px_8px_rgba(0,0,0,0.15)]"><span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-[pulse-subtle_2s_ease-in-out_infinite]" />{analysis?.recommendedAction?.replace(/_/g, " ").toUpperCase() || "ANALYZE"}</div>
              <div className="mt-3 text-[13px] leading-[1.5] font-[600] tracking-[-0.01em]">{analysis?.recommendedMessageGoal || "—"}</div>
              <div className="mt-2.5 text-[12px] text-[#52525B] leading-[1.5] tracking-[-0.01em]">{analysis?.reasoningSummary || "No analysis yet"}</div>
              <div className="mt-4 rounded-[12px] bg-[#0A0A0B] text-white p-3.5 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                <div className="text-[10px] font-[800] tracking-[0.08em] text-white/50">WHY THIS LEAD?</div>
                <div className="mt-2 text-[11px] leading-[1.5] text-white/75">{analysis?.reasoningSummary || "—"}</div>
                <div className="mt-3 flex gap-1.5 flex-wrap">
                  <span className="text-[10px] font-[700] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/60">Score {score}/100</span>
                  <span className="text-[10px] font-[700] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/60">{prob !== null ? `${prob}% prob` : "No prob"}</span>
                  <span className="text-[10px] font-[700] px-2 py-0.5 rounded-full bg-[#10B981] text-white">{analysis?.confidence || "—"}</span>
                </div>
              </div>
              <div className="mt-3 rounded-[10px] bg-[#FFFBEB] border border-[#FDE68A] p-2.5 text-[11px] leading-[1.5] text-[#92400E]"><span className="font-[800]">Potential ≠ Confirmed</span> — Estimated recoverable is not guaranteed. Only count confirmed when outcome RECOVERED with actual amount.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {analysis && (
            <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] font-[750] tracking-[-0.02em] flex items-center gap-2"><span className="h-6 w-6 rounded-[8px] bg-[#0A0A0B] text-white flex items-center justify-center text-[12px] font-[700]">◧</span> Recovery Score — Why This Matters</h2>
                  <span className="text-[10px] font-[800] tracking-[0.06em] px-2.5 py-1 rounded-full bg-[#0A0A0B] text-white shadow-sm">EXPLAINABLE • NO BLACK BOX</span>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-[14px] border border-[#0A0A0B]/10 bg-white p-4 hover:shadow-sm hover:border-[#0A0A0B]/15 transition-all group">
                    <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">RECOVERY SCORE</div>
                    <div className="mt-2 text-[28px] font-[850] tracking-[-0.03em] leading-none group-hover:scale-105 transition-transform origin-left">{analysis.recoveryScore}<span className="text-[14px] font-[600] text-[#71717A]">/100</span></div>
                    <div className="mt-2.5"><span className={`text-[10px] px-2.5 py-1 rounded-full font-[800] tracking-[0.05em] shadow-sm ${analysis.recoveryScore >= 80 ? "bg-[#EF4444] text-white shadow-[0_2px_8px_rgba(239,68,68,0.25)]" : analysis.recoveryScore >= 60 ? "bg-[#F97316] text-white shadow-[0_2px_8px_rgba(249,115,22,0.25)]" : "bg-[#F4F4F5] text-[#52525B]"}`}>{analysis.recoveryScore >= 80 ? "CRITICAL" : analysis.recoveryScore >= 60 ? "HIGH" : "MEDIUM"}</span></div>
                  </div>
                  <div className="rounded-[14px] border border-[#E4E4E7] bg-[#F9FAFB] p-4 hover:bg-white hover:shadow-sm hover:border-[#0A0A0B]/10 transition-all group">
                    <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">EST. PROBABILITY</div>
                    <div className="mt-2 text-[28px] font-[850] tracking-[-0.03em] leading-none group-hover:scale-105 transition-transform origin-left">{analysis.recoveryProbability ? `${Math.round(analysis.recoveryProbability * 100)}%` : "—"}</div>
                    <div className="mt-2 text-[10px] font-[600] tracking-[0.02em] text-[#A1A1AA]">Est. • Not guaranteed • Potential ≠ Confirmed</div>
                  </div>
                  <div className="rounded-[14px] border border-[#E4E4E7] bg-[#F9FAFB] p-4 hover:bg-white hover:shadow-sm hover:border-[#0A0A0B]/10 transition-all group">
                    <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">CONFIDENCE</div>
                    <div className="mt-2 text-[18px] font-[800] capitalize tracking-[-0.01em] group-hover:scale-105 transition-transform origin-left">{analysis.confidence}</div>
                    <div className="mt-1 text-[11px] text-[#71717A]">{analysis.buyingIntent} buying intent • {analysis.factors ? (analysis.factors as any[]).length : 0} factors</div>
                  </div>
                </div>

                {potential !== null && (
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-[14px] bg-[#FFFBEB] border border-[#FDE68A] p-4 hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="text-[10px] font-[800] tracking-[0.08em] text-[#92400E]">ESTIMATED RECOVERABLE • NOT GUARANTEED</div>
                        <span className="text-[9px] font-[800] tracking-[0.05em] px-2 py-0.5 rounded-full bg-[#FDE68A] text-[#92400E] border border-[#FCD34D]">EST.</span>
                      </div>
                      <div className="font-mono-financial text-[26px] font-[850] tracking-[-0.03em] mt-2 leading-none text-[#92400E]">₽{Math.round(potential).toLocaleString("ru-RU")}</div>
                      <div className="text-[11px] text-[#B45309] mt-2 font-mono-financial">₽{dealValueNum ? Math.round(dealValueNum).toLocaleString("ru-RU") : "—"} × {Math.round((analysis.recoveryProbability || 0) * 100)}% • Decimal-safe • Estimated, not guaranteed</div>
                      <div className="mt-2 text-[10px] font-[700] tracking-[0.02em] text-[#92400E] bg-white/60 border border-[#FDE68A]/50 rounded-full px-2.5 py-1 inline-flex">Potential ≠ Confirmed</div>
                    </div>
                    <div className="rounded-[14px] bg-[#ECFDF5] border border-[#A7F3D0] p-4 hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="text-[10px] font-[800] tracking-[0.08em] text-[#065F46]">CONFIRMED RECOVERED • ATTRIBUTED</div>
                        <span className="text-[9px] font-[800] tracking-[0.05em] px-2 py-0.5 rounded-full bg-[#059669] text-white shadow-sm">CONFIRMED</span>
                      </div>
                      <div className="font-mono-financial text-[26px] font-[850] tracking-[-0.03em] mt-2 leading-none text-[#059669]">₽{confirmedTotal.toLocaleString("ru-RU")}</div>
                      <div className="text-[11px] text-[#047857] mt-2">Explicit user-recorded • Latest per lead prevents ghost • Source + date + user tracked</div>
                      <div className="mt-2 text-[10px] font-[700] tracking-[0.02em] text-[#065F46] bg-white/60 border border-[#A7F3D0]/50 rounded-full px-2.5 py-1 inline-flex">Only when RECOVERED</div>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">WHY THIS OPPORTUNITY? • BUSINESS LANGUAGE</div>
                  <div className="mt-3 text-[13px] leading-[1.6] tracking-[-0.01em] text-[#18181B] bg-[#F9FAFB] border border-[#E4E4E7]/80 rounded-[12px] p-4 hover:bg-white hover:border-[#0A0A0B]/10 transition-colors">{analysis.reasoningSummary}</div>
                </div>

                <div className="mt-6 rounded-[14px] border border-[#0A0A0B]/[0.08] bg-[#FCFCFD] p-1">
                  <div className="rounded-[10px] bg-white border border-[#E4E4E7]/80 p-4">
                    <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">SCORE EXPLANATION — BUSINESS LANGUAGE • EACH FACTOR: TYPE, SIGNAL, POINTS, EXPLANATION</div>
                    <div className="mt-4 space-y-0 font-mono text-[11px] divide-y divide-[#F4F4F5]">
                      {factors.length > 0 ? factors.map((f: any, i: number) => (
                        <div key={i} className="flex justify-between py-2.5 hover:bg-[#F9FAFB] hover:px-2 hover:-mx-2 hover:rounded-[8px] transition-all"><span className="text-[#18181B] font-[500]"><span className={f.type === "positive" ? "text-[#059669] font-[800]" : "text-[#71717A] font-[700]"}>{f.type === "positive" ? "+" : ""}{f.points}</span> {f.explanation}</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-[700] border ${f.type === "positive" ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]" : "bg-[#F4F4F5] border-[#E4E4E7] text-[#71717A]"}`}>{f.signal}</span></div>
                      )) : <div className="text-[#71717A] py-3">No factors stored</div>}
                      <div className="border-t-2 border-[#0A0A0B] pt-3 mt-1 flex justify-between font-[800] text-[#0A0A0B] text-[12px]"><span>Total: {analysis.recoveryScore} → {analysis.recoveryScore >= 80 ? "Critical" : analysis.recoveryScore >= 60 ? "High" : "Medium"}</span><span className="font-mono-financial">{analysis.recoveryScore}/100</span></div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-[14px] border border-[#A7F3D0] bg-[#ECFDF5]/50 p-4 hover:bg-[#ECFDF5] hover:shadow-sm transition-all">
                    <div className="text-[11px] font-[800] tracking-[0.08em] text-[#065F46] flex items-center gap-1.5"><span className="h-4 w-4 rounded-full bg-[#059669] text-white flex items-center justify-center text-[10px]">+</span> POSITIVE SIGNALS • WHY THIS MATTERS</div>
                    <div className="mt-3.5 space-y-2">
                      {positiveFactors.length > 0 ? positiveFactors.map((f: any, i: number) => (
                        <div key={i} className="group flex gap-2.5 text-[12px] border border-[#A7F3D0]/60 bg-white rounded-[10px] p-3 hover:border-[#059669]/30 hover:shadow-sm hover:-translate-y-[0.5px] transition-all"><span className="h-5 min-w-[32px] rounded-full bg-[#059669] text-white flex items-center justify-center font-[800] text-[11px] shadow-sm group-hover:scale-110 transition-transform">+{f.points}</span><span className="flex-1"><span className="font-[600] tracking-[-0.01em]">{f.explanation}</span> <span className="text-[#6B7280] text-[11px]">({f.signal})</span></span></div>
                      )) : <div className="text-[12px] text-[#71717A]">No strong positive signals</div>}
                    </div>
                  </div>
                  <div className="rounded-[14px] border border-[#E4E4E7] bg-[#F9FAFB] p-4 hover:bg-white hover:shadow-sm transition-all">
                    <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A] flex items-center gap-1.5"><span className="h-4 w-4 rounded-full bg-[#F4F4F5] border flex items-center justify-center text-[10px] text-[#71717A]">!</span> NEGATIVE / RISKS • HONEST</div>
                    <div className="mt-3.5 space-y-2">
                      {negativeFactors.length > 0 ? negativeFactors.map((f: any, i: number) => (
                        <div key={i} className="flex gap-2.5 text-[12px] border border-[#E4E4E7] bg-white rounded-[10px] p-3 hover:border-[#0A0A0B]/15 transition-colors"><span className="h-5 min-w-[32px] rounded-full bg-[#F4F4F5] border flex items-center justify-center font-[700] text-[11px] text-[#71717A]">{f.points}</span><span className="flex-1"><span className="font-[600] tracking-[-0.01em]">{f.explanation}</span> <span className="text-[#71717A] text-[11px]">({f.signal})</span></span></div>
                      )) : <div className="text-[12px] text-[#71717A]">No major negative signals — honest assessment, AI never invents missing info</div>}
                    </div>
                  </div>
                </div>

                {analysis.missingInformation && (
                  <div className="mt-6 rounded-[12px] bg-[#FFFBEB] border border-[#FDE68A] p-4 text-[12px] hover:shadow-sm transition-shadow">
                    <div className="font-[700] text-[#92400E] flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-[#FDE68A] border border-[#FCD34D] flex items-center justify-center text-[11px]">?</span> Missing Information • Honest</div>
                    <div className="mt-2 text-[#B45309] leading-[1.5]">{typeof analysis.missingInformation === "string" ? analysis.missingInformation : JSON.parse(analysis.missingInformation as any).join(", ")}</div>
                    <div className="mt-2 text-[11px] text-[#A16207] font-[500] px-2.5 py-1 rounded-full bg-white/70 border border-[#FDE68A]/60 inline-flex">AI says: Not enough information to determine where data missing — never invents</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {analysis?.generatedMessage && (
            <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-[750] tracking-[-0.02em] flex items-center gap-2"><span className="h-6 w-6 rounded-[8px] bg-[#0A0A0B] text-white flex items-center justify-center text-[11px]">✦</span> AI Recommendation & Recovery Message</h3>
                  <span className="text-[10px] font-[700] px-2.5 py-1 rounded-full bg-[#F4F4F5] border text-[#52525B]">Goal: {analysis.recommendedMessageGoal}</span>
                </div>
                <div className="mt-5 rounded-[14px] bg-[#0A0A0B] text-white p-4 text-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
                  <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-[pulse-subtle_2s_ease-in-out_infinite]" /><span className="font-[800] tracking-[0.06em] text-white/50 text-[10px]">AI RECOMMENDATION • DETERMINISTIC ENGINE AS CONTEXT</span></div>
                  <div className="mt-3"><span className="font-[700] text-white/70">Recommended action:</span> <span className="font-[600] text-white">{analysis.recommendedAction.replace(/_/g, " ")}</span></div>
                  <div className="mt-1.5"><span className="font-[700] text-white/70">Reason:</span> <span className="text-white/80">{analysis.reasoningSummary}</span></div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-[11px] text-white/40 leading-[1.5]">AI uses deterministic Recovery Engine as context, does not override financial calculations. Financial calculations remain authoritative. Potential ≠ Confirmed. Human approval required before messaging.</div>
                </div>
                <div className="mt-4 text-[11px] text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] p-3 flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-[#FDE68A] border border-[#FCD34D] flex items-center justify-center text-[11px]">!</span><span><span className="font-[700]">AI-generated • Human approval required</span> — No automatic sending unless real messaging provider verified.</span></div>
                <div className="mt-5"><LeadDetailActions leadId={lead.id} message={analysis.generatedMessage} /></div>
              </div>
            </div>
          )}

          <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium overflow-hidden">
            <div className="p-6">
              <h3 className="text-[11px] font-[800] tracking-[0.08em] uppercase flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-[#F4F4F5] border flex items-center justify-center text-[10px]">◷</span> Activity Timeline — Real Events Only • No Fake Data</h3>
              {timeline.length === 0 ? (
                <div className="text-[12px] text-[#71717A] py-12 text-center">No activity yet</div>
              ) : (
                <div className="mt-6 space-y-0">
                  {timeline.map((item, idx) => (
                    <div key={idx} className="group flex gap-3 text-[12px] hover:bg-[#F9FAFB] hover:px-3 hover:-mx-3 hover:rounded-[12px] py-3 transition-all">
                      <div className="flex flex-col items-center">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-[800] shadow-sm shrink-0 group-hover:scale-110 transition-transform ${item.type.includes("recovered") || item.type === "won" ? "bg-[#059669] text-white shadow-[0_2px_8px_rgba(5,150,105,0.25)]" : item.type.includes("contacted") ? "bg-[#3B82F6] text-white shadow-[0_2px_8px_rgba(59,130,246,0.25)]" : item.type === "analyzed" ? "bg-[#0A0A0B] text-white" : "bg-[#F4F4F5] border border-[#E4E4E7] text-[#71717A]"}`}>{item.type[0].toUpperCase()}</div>
                        {idx < timeline.length - 1 && <div className="w-px h-full bg-[#E4E4E7] mt-1 min-h-[24px] group-hover:bg-[#0A0A0B]/10 transition-colors" />}
                      </div>
                      <div className="flex-1 pb-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="font-[650] tracking-[-0.01em]">{item.event}</div>
                          <div className="text-[11px] text-[#71717A] shrink-0 font-mono-financial">{new Date(item.date).toLocaleString("ru-RU")}</div>
                        </div>
                        <div className="text-[11px] text-[#71717A] mt-0.5 font-[500]">{item.actor} • {item.type}</div>
                        {item.metadata && <div className="mt-2 text-[11px] text-[#52525B] bg-white border border-[#E4E4E7]/80 rounded-[10px] p-2.5 leading-[1.5] group-hover:border-[#0A0A0B]/10 transition-colors">{item.metadata.slice(0, 300)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[20px] border border-[#0A0A0B] bg-white shadow-[0_0_0_1px_#0A0A0B,0_12px_32px_rgba(0,0,0,0.12)] overflow-hidden sticky top-[88px]">
            <div className="bg-[#0A0A0B] text-white p-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-[800] tracking-[0.08em] text-white/50">OUTCOME WORKFLOW</div>
                <div className="mt-1 text-[11px] text-white/60">Record what actually happened • Prevents ghost revenue</div>
              </div>
              <div className="h-7 w-7 rounded-[9px] bg-white/10 border border-white/10 flex items-center justify-center text-[12px]">↗</div>
            </div>
            <div className="p-5">
              <form action={`/api/leads/${lead.id}/outcome`} method="post" className="space-y-4">
                <div>
                  <label className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">OUTCOME</label>
                  <select name="outcome" className="mt-1.5 w-full rounded-[10px] border border-[#E4E4E7] p-2.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0B]/10 focus:border-[#0A0A0B]/20 transition-all">
                    <option value="CONTACTED">Contacted</option>
                    <option value="REPLIED">Replied</option>
                    <option value="INTERESTED">Interested</option>
                    <option value="NEGOTIATING">Negotiating</option>
                    <option value="RECOVERED">Recovered (Won)</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="NO_RESPONSE">No Response</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="NOT_RECOVERABLE">Not Recoverable</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">RECOVERED AMOUNT (required if Recovered)</label>
                  <input name="revenue" type="number" step="0.01" placeholder="e.g. 150000" className="mt-1.5 w-full rounded-[10px] border border-[#E4E4E7] p-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0A0A0B]/10 transition-all" />
                  <div className="text-[10px] text-[#71717A] mt-1.5 leading-[1.4] bg-[#F9FAFB] border border-[#E4E4E7]/60 rounded-[8px] p-2">Do not default recovered amount to deal value without explicit user confirmation. Potential ≠ Confirmed.</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">RECOVERY DATE</label>
                    <input name="recoveredAt" type="date" className="mt-1.5 w-full rounded-[10px] border border-[#E4E4E7] p-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0A0A0B]/10 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">NOTES</label>
                    <input name="note" placeholder="What happened?" className="mt-1.5 w-full rounded-[10px] border border-[#E4E4E7] p-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0A0A0B]/10 transition-all" />
                  </div>
                </div>
                <button type="submit" className="w-full rounded-[11px] bg-[#0A0A0B] text-white py-3 text-[13px] font-[700] tracking-[-0.01em] hover:bg-[#1A1D23] shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] transition-all">Record Outcome →</button>
              </form>
              <div className="mt-4 rounded-[12px] bg-[#ECFDF5] border border-[#A7F3D0] p-3.5 text-[11px] text-[#065F46] leading-[1.5]"><div className="font-[800] tracking-[0.02em] flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#059669]" /> After saving, updates:</div><div className="mt-2 space-y-1 font-[500]"><div className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#059669]/60" /> Confirmed Recovered Revenue</div><div className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#059669]/60" /> Recovery rate • Funnel</div><div className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#059669]/60" /> Campaign statistics</div><div className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#059669]/60" /> Dashboard • Latest per lead prevents ghost</div></div></div>
            </div>
          </div>

          <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-5 shadow-premium hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-shadow">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A] flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" /> REVENUE — ESTIMATED vs CONFIRMED • HONEST</div>
            <div className="mt-4 space-y-3 text-[12px]">
              <div className="flex justify-between items-center p-2.5 rounded-[10px] bg-[#F9FAFB] border border-[#E4E4E7]/60"><span className="text-[#71717A] font-[500]">Deal Value</span><span className="font-[700] font-mono-financial">₽{dealValueNum ? Math.round(dealValueNum).toLocaleString("ru-RU") : "—"}</span></div>
              <div className="flex justify-between items-center p-2.5 rounded-[10px] bg-[#FFFBEB] border border-[#FDE68A]"><span className="text-[#92400E] font-[600]">Est. Recoverable • Not guaranteed</span><span className="font-[800] font-mono-financial text-[#92400E]">₽{potential ? Math.round(potential).toLocaleString("ru-RU") : "—"}</span></div>
              <div className="flex justify-between items-center p-2.5 rounded-[10px] bg-[#ECFDF5] border border-[#A7F3D0]"><span className="text-[#065F46] font-[600]">Confirmed Recovered • Attributed</span><span className="font-[800] text-[#059669] font-mono-financial">₽{confirmedTotal.toLocaleString("ru-RU")}</span></div>
              <div className="text-[10px] text-[#71717A] leading-[1.5] bg-[#F9FAFB] border border-[#E4E4E7]/60 rounded-[8px] p-2.5">Deal value × probability = estimated. Confirmed = explicit recorded recovered amount with date, source, campaign, user, notes. Potential ≠ Confirmed. No auto default.</div>
            </div>
          </div>

          <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-5 shadow-premium hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-shadow">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">CAMPAIGNS • REAL</div>
            <div className="mt-4">
              {lead.campaignLeads.length === 0 ? (
                <div className="text-[12px] text-[#71717A] py-6 text-center border border-dashed border-[#E4E4E7] rounded-[12px] bg-[#F9FAFB]">Not in any campaign • Potential ≠ Confirmed</div>
              ) : (
                <div className="space-y-2">
                  {lead.campaignLeads.map((cl: any) => (
                    <Link key={cl.id} href={`/campaigns/${cl.campaignId}`} className="group block text-[12px] border border-[#E4E4E7] rounded-[10px] p-3 hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/15 hover:shadow-sm hover:-translate-y-[0.5px] transition-all">
                      <div className="font-[650] tracking-[-0.01em] group-hover:underline underline-offset-4">{cl.campaign.name}</div>
                      <div className="text-[#71717A] mt-1.5 flex gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-[#F4F4F5] border text-[10px] font-[600]">{cl.status}</span>
                        {cl.messageStatus && <span className="px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] text-[10px] font-[600]">{cl.messageStatus}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-[#F9FAFB] p-5">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">RAW DATA — UNTRUSTED • DATA NEVER INSTRUCTIONS</div>
            <div className="text-[10px] text-[#71717A] mt-1 leading-[1.4]">Customer-provided text is UNTRUSTED DATA • Treated as DATA, never instructions • Prompt injection defense</div>
            <pre className="mt-3 text-[10px] bg-white border border-[#E4E4E7] rounded-[10px] p-3 overflow-auto max-h-64 font-mono hover:border-[#0A0A0B]/15 transition-colors">{JSON.stringify(lead.rawData ? JSON.parse(lead.rawData) : {}, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
