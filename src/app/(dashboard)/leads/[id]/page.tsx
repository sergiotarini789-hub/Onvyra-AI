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

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1280px] mx-auto">
      <div className="flex items-center gap-2 text-[12px] text-[#71717A]">
        <Link href="/inbox" className="hover:text-[#0A0A0B] font-[500]">Recovery Inbox</Link>
        <span className="text-[#D4D4D8]">/</span>
        <Link href="/leads" className="hover:text-[#0A0A0B] font-[500]">Opportunities</Link>
        <span className="text-[#D4D4D8]">/</span>
        <span className="text-[#0A0A0B] font-[650]">{lead.name || "Opportunity"}</span>
        {lead.isDemo && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] font-[700]">DEMO DATA</span>}
      </div>

      {/* Hero Opportunity Card */}
      <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium overflow-hidden">
        <div className="bg-[#0A0A0B] text-white p-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex gap-4">
              <div className="h-[56px] w-[56px] rounded-[16px] bg-white text-[#0A0A0B] flex items-center justify-center text-[20px] font-[800] shadow-sm">{(lead.name || "U")[0].toUpperCase()}</div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-[22px] font-[750] tracking-[-0.02em] leading-none">{lead.name || "Unnamed"}</h1>
                  {analysis && <Badge variant={analysis.recoveryScore >= 80 ? "critical" : analysis.recoveryScore >= 60 ? "high" : "medium"} className="text-[11px]">{analysis.recoveryScore}</Badge>}
                  <span className="text-[10px] font-[800] tracking-[0.06em] px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-white/70">{analysis?.recoveryScore && analysis.recoveryScore >= 80 ? "HIGH PRIORITY" : "PRIORITY"}</span>
                </div>
                <div className="mt-2 text-[13px] text-white/60">{lead.company || "—"} • {lead.email || lead.phone || "No contact"} • Deal ₽{dealValueNum ? Math.round(dealValueNum).toLocaleString("ru-RU") : "—"} • Last contact {lastContactDays !== null ? `${lastContactDays}d ago` : "—"} • {lead.product || "—"}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {factors.slice(0, 4).map((f: any, i: number) => (
                    <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-white/80 font-[500]">{f.explanation}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              <div className="rounded-[14px] bg-white/[0.08] border border-white/[0.08] p-4 text-center min-w-[110px]">
                <div className="text-[10px] font-[800] tracking-[0.08em] text-white/50">SCORE</div>
                <div className="mt-1 text-[28px] font-[850] leading-none tracking-[-0.02em]">{analysis?.recoveryScore || "—"}</div>
                <div className="mt-1 text-[10px] font-[700] tracking-[0.05em] text-[#EF4444]">{analysis?.recoveryScore && analysis.recoveryScore >= 80 ? "CRITICAL" : "HIGH"}</div>
              </div>
              <div className="rounded-[14px] bg-white text-[#0A0A0B] p-4 text-center min-w-[110px] shadow-[0_4px_12px_rgba(255,255,255,0.1)]">
                <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">PROBABILITY</div>
                <div className="mt-1 text-[28px] font-[850] leading-none tracking-[-0.02em]">{analysis?.recoveryProbability ? `${Math.round(analysis.recoveryProbability * 100)}%` : "—"}</div>
                <div className="mt-1 text-[10px] text-[#71717A]">Est. • Not guaranteed</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#E4E4E7]/80">
          <div className="p-6">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">CUSTOMER</div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-[13px]">
              <div><div className="text-[11px] text-[#71717A] font-[600] tracking-[0.02em]">Name</div><div className="font-[600] mt-1">{lead.name || "—"}</div></div>
              <div><div className="text-[11px] text-[#71717A] font-[600]">Company</div><div className="font-[600] mt-1">{lead.company || "—"}</div></div>
              <div><div className="text-[11px] text-[#71717A] font-[600]">Email</div><div className="font-[500] mt-1 truncate">{lead.email || "—"}</div></div>
              <div><div className="text-[11px] text-[#71717A] font-[600]">Phone</div><div className="font-[500] mt-1">{lead.phone || "—"}</div></div>
              <div><div className="text-[11px] text-[#71717A] font-[600]">Manager</div><div className="font-[500] mt-1">{lead.manager || "—"}</div></div>
              <div><div className="text-[11px] text-[#71717A] font-[600]">Deal Age</div><div className="font-[500] mt-1">{dealAge !== null ? `${dealAge} days` : "—"}</div></div>
            </div>
          </div>
          <div className="p-6">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">DEAL</div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-[13px]">
              <div><div className="text-[11px] text-[#71717A] font-[600]">Product</div><div className="font-[600] mt-1">{lead.product || "—"}</div></div>
              <div><div className="text-[11px] text-[#71717A] font-[600]">Deal Value</div><div className="font-mono-financial font-[750] text-[16px] mt-1">₽{dealValueNum ? Math.round(dealValueNum).toLocaleString("ru-RU") : "—"}</div></div>
              <div><div className="text-[11px] text-[#71717A] font-[600]">Est. Recoverable</div><div className="font-mono-financial font-[750] text-[16px] mt-1">₽{potential ? Math.round(potential).toLocaleString("ru-RU") : "—"}</div><div className="text-[10px] text-[#A1A1AA]">Est. not guaranteed</div></div>
              <div><div className="text-[11px] text-[#71717A] font-[600]">Confirmed</div><div className="font-mono-financial font-[750] text-[16px] mt-1 text-[#059669]">₽{confirmedTotal.toLocaleString("ru-RU")}</div></div>
              <div className="col-span-2"><div className="text-[11px] text-[#71717A] font-[600]">Last Message</div><div className="mt-2 p-3 rounded-[10px] bg-[#F9FAFB] border border-[#E4E4E7] text-[12px] leading-[1.5] whitespace-pre-wrap">{lead.lastMessage || "—"}</div></div>
            </div>
          </div>
          <div className="p-6">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">RECOMMENDED ACTION</div>
            <div className="mt-4">
              <div className="inline-flex px-3 py-1.5 rounded-full bg-[#0A0A0B] text-white text-[11px] font-[800] tracking-[0.05em]">{analysis?.recommendedAction?.replace(/_/g, " ").toUpperCase() || "ANALYZE"}</div>
              <div className="mt-3 text-[13px] leading-[1.5] font-[500]">{analysis?.recommendedMessageGoal || "—"}</div>
              <div className="mt-3 text-[12px] text-[#52525B] leading-[1.5]">{analysis?.reasoningSummary || "No analysis yet"}</div>
              <div className="mt-5 rounded-[10px] bg-[#FFFBEB] border border-[#FDE68A] p-3 text-[11px] leading-[1.5] text-[#92400E]"><span className="font-[700]">Potential ≠ Confirmed</span> — Estimated recoverable is not guaranteed. Only count confirmed when outcome RECOVERED with actual amount.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {analysis && (
            <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] font-[700] tracking-[-0.01em]">Recovery Score — Why This Matters</h2>
                  <span className="text-[10px] font-[700] px-2 py-1 rounded-full bg-[#F4F4F5] border text-[#52525B]">EXPLAINABLE • NO BLACK BOX</span>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="rounded-[14px] border border-[#E4E4E7] p-4">
                    <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">RECOVERY SCORE</div>
                    <div className="mt-2 text-[28px] font-[850] tracking-[-0.03em] leading-none">{analysis.recoveryScore}<span className="text-[14px] font-[600] text-[#71717A]">/100</span></div>
                    <div className="mt-2"><span className={`text-[10px] px-2 py-1 rounded-full font-[800] tracking-[0.05em] ${analysis.recoveryScore >= 80 ? "bg-[#EF4444] text-white" : analysis.recoveryScore >= 60 ? "bg-[#F97316] text-white" : "bg-[#F4F4F5] text-[#52525B]"}`}>{analysis.recoveryScore >= 80 ? "CRITICAL" : analysis.recoveryScore >= 60 ? "HIGH" : "MEDIUM"}</span></div>
                  </div>
                  <div className="rounded-[14px] border border-[#E4E4E7] p-4">
                    <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">EST. PROBABILITY</div>
                    <div className="mt-2 text-[28px] font-[850] tracking-[-0.03em] leading-none">{analysis.recoveryProbability ? `${Math.round(analysis.recoveryProbability * 100)}%` : "—"}</div>
                    <div className="mt-2 text-[10px] text-[#71717A]">Est. • Not guaranteed</div>
                  </div>
                  <div className="rounded-[14px] border border-[#E4E4E7] p-4">
                    <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">CONFIDENCE</div>
                    <div className="mt-2 text-[18px] font-[750] capitalize">{analysis.confidence}</div>
                    <div className="mt-1 text-[11px] text-[#71717A]">{analysis.buyingIntent} buying intent</div>
                  </div>
                </div>

                {potential !== null && (
                  <div className="mt-5 rounded-[14px] bg-[#0A0A0B] text-white p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] font-[800] tracking-[0.08em] text-white/50">ESTIMATED RECOVERABLE REVENUE</div>
                        <div className="font-mono-financial text-[32px] font-[850] tracking-[-0.03em] mt-2 leading-none">₽{Math.round(potential).toLocaleString("ru-RU")}</div>
                        <div className="text-[11px] text-white/50 mt-2 font-mono-financial">₽{dealValueNum ? Math.round(dealValueNum).toLocaleString("ru-RU") : "—"} × {Math.round((analysis.recoveryProbability || 0) * 100)}% • Estimated, not guaranteed • Decimal-safe</div>
                      </div>
                      <div className="text-right"><div className="text-[10px] font-[800] tracking-[0.08em] text-white/40">POTENTIAL</div><div className="text-[11px] text-white/60 mt-1 font-[600]">≠ Confirmed</div></div>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">WHY THIS OPPORTUNITY?</div>
                  <div className="mt-3 text-[13px] leading-[1.6] text-[#18181B] bg-[#F9FAFB] border border-[#E4E4E7]/80 rounded-[12px] p-4">{analysis.reasoningSummary}</div>
                </div>

                <div className="mt-6 rounded-[14px] border border-[#E4E4E7] p-4">
                  <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">SCORE EXPLANATION — BUSINESS LANGUAGE</div>
                  <div className="mt-3 space-y-2 font-mono text-[11px]">
                    {factors.length > 0 ? factors.map((f: any, i: number) => (
                      <div key={i} className="flex justify-between py-1.5 border-b border-[#F4F4F5] last:border-0"><span className="text-[#18181B]">{f.type === "positive" ? "+" : ""}{f.points} {f.explanation}</span><span className={f.type === "positive" ? "text-[#059669] font-[700]" : "text-[#EF4444] font-[700]"}>{f.signal}</span></div>
                    )) : <div className="text-[#71717A]">No factors stored</div>}
                    <div className="border-t border-[#0A0A0B]/10 pt-3 mt-3 flex justify-between font-[800] text-[#0A0A0B]"><span>Total: {analysis.recoveryScore}</span><span>{analysis.recoveryScore >= 80 ? "Critical" : analysis.recoveryScore >= 60 ? "High" : "Medium"}</span></div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] font-[800] tracking-[0.08em] text-[#059669]">POSITIVE SIGNALS</div>
                    <div className="mt-3 space-y-2">
                      {positiveFactors.length > 0 ? positiveFactors.map((f: any, i: number) => (
                        <div key={i} className="flex gap-2 text-[12px] border border-[#A7F3D0] bg-[#ECFDF5] rounded-[10px] p-3"><span className="text-[#059669] font-[800]">+{f.points}</span><span className="flex-1"><span className="font-[600]">{f.explanation}</span> <span className="text-[#6B7280]">({f.signal})</span></span></div>
                      )) : <div className="text-[12px] text-[#71717A]">No strong positive signals</div>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">NEGATIVE / RISKS</div>
                    <div className="mt-3 space-y-2">
                      {negativeFactors.length > 0 ? negativeFactors.map((f: any, i: number) => (
                        <div key={i} className="flex gap-2 text-[12px] border border-[#E4E4E7] bg-[#F9FAFB] rounded-[10px] p-3"><span className="text-[#71717A] font-[700]">{f.points}</span><span className="flex-1"><span className="font-[600]">{f.explanation}</span> <span className="text-[#71717A]">({f.signal})</span></span></div>
                      )) : <div className="text-[12px] text-[#71717A]">No major negative signals</div>}
                    </div>
                  </div>
                </div>

                {analysis.missingInformation && (
                  <div className="mt-6 rounded-[12px] bg-[#FFFBEB] border border-[#FDE68A] p-4 text-[12px]">
                    <div className="font-[700] text-[#92400E]">Missing Information</div>
                    <div className="mt-1 text-[#B45309]">{typeof analysis.missingInformation === "string" ? analysis.missingInformation : JSON.parse(analysis.missingInformation as any).join(", ")}</div>
                    <div className="mt-1 text-[11px] text-[#A16207]">AI says: Not enough information to determine where data missing — never invents</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {analysis?.generatedMessage && (
            <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-[700] tracking-[-0.01em]">AI Recommendation & Recovery Message</h3>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#F4F4F5] border text-[#52525B] font-[600]">Goal: {analysis.recommendedMessageGoal}</span>
                </div>
                <div className="mt-5 rounded-[12px] bg-[#0A0A0B] text-white p-4 text-[12px]">
                  <div className="font-[800] tracking-[0.06em] text-white/50 text-[10px]">AI RECOMMENDATION</div>
                  <div className="mt-2"><span className="font-[700]">Recommended action:</span> {analysis.recommendedAction.replace(/_/g, " ")}</div>
                  <div className="mt-1"><span className="font-[700]">Reason:</span> {analysis.reasoningSummary}</div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-[11px] text-white/50">AI uses deterministic Recovery Engine as context, does not override financial calculations. Financial calculations remain authoritative. Potential ≠ Confirmed.</div>
                </div>
                <div className="mt-4 text-[11px] text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] p-3"><span className="font-[700]">AI-generated • Human approval required</span> — No automatic sending unless real messaging provider verified.</div>
                <div className="mt-4"><LeadDetailActions leadId={lead.id} message={analysis.generatedMessage} /></div>
              </div>
            </div>
          )}

          <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium">
            <div className="p-6">
              <h3 className="text-[12px] font-[800] tracking-[0.08em] uppercase">Activity Timeline — Real Events Only</h3>
              {timeline.length === 0 ? (
                <div className="text-[12px] text-[#71717A] py-8 text-center">No activity yet</div>
              ) : (
                <div className="mt-6 space-y-4">
                  {timeline.map((item, idx) => (
                    <div key={idx} className="flex gap-3 text-[12px]">
                      <div className="flex flex-col items-center">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-[800] ${item.type.includes("recovered") || item.type === "won" ? "bg-[#059669] text-white" : item.type.includes("contacted") ? "bg-[#3B82F6] text-white" : item.type === "analyzed" ? "bg-[#0A0A0B] text-white" : "bg-[#F4F4F5] border text-[#71717A]"}`}>{item.type[0].toUpperCase()}</div>
                        {idx < timeline.length - 1 && <div className="w-px h-full bg-[#E4E4E7] mt-1 min-h-[24px]" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="font-[650] tracking-[-0.01em]">{item.event}</div>
                          <div className="text-[11px] text-[#71717A] shrink-0 font-mono-financial">{new Date(item.date).toLocaleString("ru-RU")}</div>
                        </div>
                        <div className="text-[11px] text-[#71717A] mt-0.5">{item.actor} • {item.type}</div>
                        {item.metadata && <div className="mt-2 text-[11px] text-[#52525B] bg-[#F9FAFB] border border-[#E4E4E7]/80 rounded-[10px] p-2.5 leading-[1.5]">{item.metadata.slice(0, 300)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[20px] border border-[#0A0A0B] bg-white shadow-premium overflow-hidden">
            <div className="bg-[#0A0A0B] text-white p-4">
              <div className="text-[11px] font-[800] tracking-[0.08em] text-white/50">OUTCOME WORKFLOW</div>
              <div className="mt-1 text-[12px] text-white/70">Record what actually happened • Prevents ghost revenue</div>
            </div>
            <div className="p-5">
              <form action={`/api/leads/${lead.id}/outcome`} method="post" className="space-y-4">
                <div>
                  <label className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">OUTCOME</label>
                  <select name="outcome" className="mt-1.5 w-full rounded-[10px] border border-[#E4E4E7] p-2.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0B]/10 focus:border-[#0A0A0B]/20">
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
                  <input name="revenue" type="number" step="0.01" placeholder="e.g. 150000" className="mt-1.5 w-full rounded-[10px] border border-[#E4E4E7] p-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0A0A0B]/10" />
                  <div className="text-[10px] text-[#71717A] mt-1.5 leading-[1.4]">Do not default recovered amount to deal value without explicit user confirmation.</div>
                </div>
                <div>
                  <label className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">RECOVERY DATE</label>
                  <input name="recoveredAt" type="date" className="mt-1.5 w-full rounded-[10px] border border-[#E4E4E7] p-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0A0A0B]/10" />
                </div>
                <div>
                  <label className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">NOTES</label>
                  <input name="note" placeholder="What happened?" className="mt-1.5 w-full rounded-[10px] border border-[#E4E4E7] p-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0A0A0B]/10" />
                </div>
                <button type="submit" className="w-full rounded-[11px] bg-[#0A0A0B] text-white py-3 text-[13px] font-[650] hover:bg-[#1A1D23] shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] transition-all">Record Outcome</button>
              </form>
              <div className="mt-4 rounded-[10px] bg-[#ECFDF5] border border-[#A7F3D0] p-3 text-[11px] text-[#065F46] leading-[1.5]"><div className="font-[700]">After saving, updates:</div><div className="mt-1 space-y-0.5"><div>• Confirmed Recovered Revenue</div><div>• Recovery rate</div><div>• Campaign statistics</div><div>• Dashboard</div></div></div>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white p-5 shadow-premium">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">REVENUE — ESTIMATED vs CONFIRMED</div>
            <div className="mt-4 space-y-3 text-[12px]">
              <div className="flex justify-between"><span className="text-[#71717A]">Deal Value</span><span className="font-[650] font-mono-financial">₽{dealValueNum ? Math.round(dealValueNum).toLocaleString("ru-RU") : "—"}</span></div>
              <div className="flex justify-between"><span className="text-[#71717A]">Est. Probability</span><span className="font-[650]">{analysis?.recoveryProbability ? `${Math.round(analysis.recoveryProbability * 100)}%` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-[#71717A]">Est. Recoverable</span><span className="font-[750] font-mono-financial">₽{potential ? Math.round(potential).toLocaleString("ru-RU") : "—"}</span></div>
              <div className="border-t border-[#F4F4F5] pt-3 flex justify-between"><span className="text-[#71717A]">Confirmed Recovered</span><span className="font-[750] text-[#059669] font-mono-financial">₽{confirmedTotal.toLocaleString("ru-RU")}</span></div>
              <div className="text-[10px] text-[#71717A] leading-[1.5] bg-[#F9FAFB] border border-[#E4E4E7]/60 rounded-[8px] p-2.5">Deal value × probability = estimated. Confirmed = explicit recorded recovered amount. Potential ≠ Confirmed.</div>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white p-5 shadow-premium">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">CAMPAIGNS</div>
            <div className="mt-4">
              {lead.campaignLeads.length === 0 ? (
                <div className="text-[12px] text-[#71717A]">Not in any campaign</div>
              ) : (
                <div className="space-y-2">
                  {lead.campaignLeads.map((cl: any) => (
                    <Link key={cl.id} href={`/campaigns/${cl.campaignId}`} className="block text-[12px] border border-[#E4E4E7] rounded-[10px] p-3 hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/15 transition-colors">
                      <div className="font-[600]">{cl.campaign.name}</div>
                      <div className="text-[#71717A] mt-1.5 flex gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-[#F4F4F5] text-[10px] font-[600]">{cl.status}</span>
                        {cl.messageStatus && <span className="px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1D4ED8] text-[10px] font-[600]">{cl.messageStatus}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-[#F9FAFB] p-5">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">RAW DATA — UNTRUSTED</div>
            <div className="text-[10px] text-[#71717A] mt-1">Customer-provided text is UNTRUSTED DATA • Treated as DATA, never instructions</div>
            <pre className="mt-3 text-[10px] bg-white border border-[#E4E4E7] rounded-[10px] p-3 overflow-auto max-h-64 font-mono">{JSON.stringify(lead.rawData ? JSON.parse(lead.rawData) : {}, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
