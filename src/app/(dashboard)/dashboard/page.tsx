export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const orgId = session.organizationId;

  const [
    totalLeads,
    demoLeadsCount,
    analyses,
    recoveryEvents,
    campaigns,
  ] = await Promise.all([
    prisma.lead.count({ where: { organizationId: orgId } }),
    prisma.lead.count({ where: { organizationId: orgId, isDemo: true } }),
    prisma.aIAnalysis.findMany({
      where: { organizationId: orgId },
      orderBy: { recoveryScore: "desc" },
      take: 10000,
      include: { lead: true },
    }),
    prisma.recoveryEvent.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" } }),
    prisma.campaign.findMany({ where: { organizationId: orgId } }),
  ]);

  function calcPotential(dealValue: any, prob: any): number {
    if (!dealValue || !prob) return 0;
    const dv = typeof dealValue === "object" && dealValue.toNumber ? dealValue.toNumber() : Number(dealValue);
    if (dv < 0 || prob < 0 || prob > 1) return 0;
    const cents = Math.round(dv * 100);
    return Math.round(cents * prob) / 100;
  }

  const potentialRevenue = analyses.reduce((sum, a) => sum + calcPotential(a.lead.dealValue, a.recoveryProbability), 0);
  const highConfidenceRevenue = analyses.filter((a) => a.confidence === "high" && a.recoveryProbability && a.recoveryProbability >= 0.6).reduce((sum, a) => sum + calcPotential(a.lead.dealValue, a.recoveryProbability), 0);

  const latestEventsByLead = new Map<string, any>();
  for (const ev of recoveryEvents.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())) {
    latestEventsByLead.set(ev.leadId, ev);
  }
  const latestEvents = Array.from(latestEventsByLead.values());

  const confirmedRevenue = latestEvents.filter((e) => e.outcome === "RECOVERED" || e.outcome === "won").reduce((sum, e) => sum + (e.revenue || 0), 0);
  const recoveredCount = latestEvents.filter((e) => e.outcome === "RECOVERED" || e.outcome === "won").length;
  const contactedCount = latestEvents.filter((e) => ["CONTACTED", "REPLIED", "INTERESTED", "NEGOTIATING", "RECOVERED", "contacted", "responded", "interested", "negotiation", "won"].includes(e.outcome)).length;
  const repliedCount = latestEvents.filter((e) => ["REPLIED", "INTERESTED", "NEGOTIATING", "RECOVERED", "responded", "interested", "negotiation", "won"].includes(e.outcome)).length;

  const criticalCount = analyses.filter((a) => a.recoveryScore >= 80).length;
  const highCount = analyses.filter((a) => a.recoveryScore >= 60 && a.recoveryScore < 80).length;
  const mediumCount = analyses.filter((a) => a.recoveryScore >= 40 && a.recoveryScore < 60).length;
  const lowCount = analyses.filter((a) => a.recoveryScore < 40).length;
  const priorityLeads = analyses.filter((a) => a.recoveryScore >= 60).slice(0, 8);
  const recoveryRate = totalLeads > 0 ? (recoveredCount / totalLeads) * 100 : 0;
  const contactRate = analyses.length > 0 ? (contactedCount / analyses.length) * 100 : 0;
  const avgProb = analyses.length > 0 ? Math.round(analyses.reduce((s, a) => s + (a.recoveryProbability || 0), 0) / analyses.length * 100) : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-[pulse-subtle_2s_ease-in-out_infinite]" />
            <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">REVENUE INTELLIGENCE • LIVE</span>
          </div>
          <h1 className="mt-4 text-[28px] md:text-[32px] font-[750] leading-[1.05] tracking-[-0.025em]">Where should I recover revenue today?</h1>
          <p className="mt-2 text-[14px] leading-[1.5] text-[#52525B]">Prioritized by Recovery Score, probability, and estimated recoverable revenue. <span className="font-[600] text-[#0A0A0B]">Potential ≠ Confirmed</span> • Est. not guaranteed.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/inbox" className="inline-flex h-[38px] items-center justify-center rounded-[11px] bg-[#0A0A0B] px-[18px] text-[13px] font-[600] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:bg-[#1A1D23] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] transition-all">Recovery Inbox →</Link>
          <Link href="/import" className="inline-flex h-[38px] items-center justify-center rounded-[11px] border border-[#E4E4E7] bg-white px-[18px] text-[13px] font-[600] shadow-sm hover:bg-[#F9FAFB] transition-colors">Import Pipeline</Link>
        </div>
      </div>

      {demoLeadsCount > 0 && (
        <div className="rounded-[14px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 flex items-center justify-between gap-4">
          <div className="text-[13px]"><span className="font-[800] tracking-[0.02em]">DEMO DATA</span> — {demoLeadsCount} demo leads. Metrics from actual demo dataset, not hardcoded. <span className="font-[600]">Potential ≠ real revenue.</span></div>
          <Link href="/leads" className="shrink-0 text-[12px] font-[700] px-3 py-1.5 rounded-full bg-[#0A0A0B] text-white">View demo leads</Link>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white p-[22px] shadow-premium hover-lift">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">RECOVERABLE REVENUE • ESTIMATED</div>
            <span className="text-[10px] font-[800] tracking-[0.06em] px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">ESTIMATED • NOT GUARANTEED</span>
          </div>
          <div className="mt-5 flex items-baseline gap-4">
            <div className="font-mono-financial text-[44px] font-[850] tracking-[-0.03em] leading-none">₽{Math.round(potentialRevenue).toLocaleString("ru-RU")}</div>
            <div className="text-[13px] font-[500] text-[#71717A]">{analyses.length} opportunities • {criticalCount + highCount} priority</div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-[14px] bg-[#F9FAFB] border border-[#E4E4E7]/80 p-4">
              <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">HIGH CONFIDENCE</div>
              <div className="mt-2 font-mono-financial text-[18px] font-[750] tracking-[-0.02em]">₽{Math.round(highConfidenceRevenue).toLocaleString("ru-RU")}</div>
              <div className="mt-1 text-[11px] font-[600] text-[#059669]">60%+ prob • High</div>
            </div>
            <div className="rounded-[14px] bg-[#F9FAFB] border border-[#E4E4E7]/80 p-4">
              <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">AVG PROBABILITY</div>
              <div className="mt-2 font-mono-financial text-[18px] font-[750] tracking-[-0.02em]">{avgProb}%</div>
              <div className="mt-1 text-[11px] text-[#71717A]">Across analyzed</div>
            </div>
            <div className="rounded-[14px] bg-[#0A0A0B] text-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
              <div className="text-[10px] font-[800] tracking-[0.08em] text-white/50">PRIORITY LEADS</div>
              <div className="mt-2 text-[18px] font-[750] tracking-[-0.02em]">{criticalCount + highCount}</div>
              <div className="mt-1 text-[11px] text-white/60">{criticalCount} critical • {highCount} high</div>
            </div>
          </div>
          <div className="mt-5 h-px bg-[#F4F4F5]" />
          <div className="mt-4 flex items-center justify-between text-[11px]">
            <span className="text-[#71717A]">Formula: Deal Value × Probability • Decimal-safe • 100000×0.5=50000 exact</span>
            <span className="font-[600] text-[#0A0A0B]">Potential ≠ Confirmed</span>
          </div>
        </div>

        <div className="rounded-[20px] border border-[#059669]/20 bg-[#059669] p-[22px] text-white shadow-[0_8px_24px_rgba(5,150,105,0.2)] hover-lift">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-white/70">RECOVERED REVENUE • CONFIRMED</div>
            <span className="text-[10px] font-[800] tracking-[0.06em] px-2.5 py-1 rounded-full bg-white text-[#059669]">CONFIRMED • ATTRIBUTED</span>
          </div>
          <div className="mt-5">
            <div className="font-mono-financial text-[44px] font-[850] tracking-[-0.03em] leading-none">₽{Math.round(confirmedRevenue).toLocaleString("ru-RU")}</div>
            <div className="mt-2 text-[13px] text-white/80">{recoveredCount} recovered • {recoveryRate.toFixed(1)}% rate</div>
          </div>
          <div className="mt-6 space-y-3">
            <div className="rounded-[12px] bg-white/10 border border-white/15 p-3 flex justify-between text-[12px]"><span className="text-white/70">Recovery Rate</span><span className="font-[700] font-mono-financial">{recoveryRate.toFixed(1)}%</span></div>
            <div className="rounded-[12px] bg-white/10 border border-white/15 p-3 flex justify-between text-[12px]"><span className="text-white/70">Contact Rate</span><span className="font-[700] font-mono-financial">{contactRate.toFixed(1)}%</span></div>
            <div className="rounded-[12px] bg-white/10 border border-white/15 p-3 flex justify-between text-[12px]"><span className="text-white/70">Campaigns</span><span className="font-[700]">{campaigns.length}</span></div>
          </div>
          <div className="mt-5 rounded-[10px] bg-white/10 border border-white/10 p-3 text-[11px] leading-[1.5] text-white/70">Attributed only when you record RECOVERED with actual amount. Onvyra finds, your team recovers. Latest per lead prevents ghost revenue.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-5">
        {/* Priority Opportunities */}
        <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium">
          <div className="flex items-center justify-between p-[22px] pb-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-[700] tracking-[-0.01em]">Priority Opportunities</h2>
                <span className="text-[11px] font-[500] text-[#71717A]">— Who should I contact first?</span>
              </div>
              <div className="mt-1 text-[11px] text-[#71717A]">Sorted by score • Deal value • Est. recoverable • Why chips • Recommended action</div>
            </div>
            <Link href="/inbox" className="h-[30px] inline-flex items-center gap-1 rounded-[9px] border border-[#E4E4E7] bg-white px-3 text-[11px] font-[600] shadow-sm hover:bg-[#0A0A0B] hover:text-white hover:border-[#0A0A0B] transition-all">Open Inbox →</Link>
          </div>
          
          <div className="p-3 space-y-2 mt-3">
            {priorityLeads.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto h-12 w-12 rounded-[14px] bg-[#F4F4F5] border flex items-center justify-center text-[20px]">◫</div>
                <div className="mt-4 text-[14px] font-[600]">No priority leads yet</div>
                <div className="mt-1 text-[12px] text-[#71717A] max-w-[320px] mx-auto">Import your pipeline or load demo to see where you are leaving money behind.</div>
                <div className="mt-5 flex justify-center gap-2">
                  <Link href="/import" className="h-[34px] px-4 rounded-[10px] bg-[#0A0A0B] text-white text-[12px] font-[600] inline-flex items-center">Import CSV/XLSX</Link>
                  <Link href="/inbox" className="h-[34px] px-4 rounded-[10px] border bg-white text-[12px] font-[600] inline-flex items-center">Recovery Inbox</Link>
                </div>
              </div>
            ) : (
              priorityLeads.map((a) => (
                <Link key={a.id} href={`/leads/${a.leadId}`} className="group flex items-center justify-between rounded-[14px] border border-[#E4E4E7]/80 p-4 hover:border-[#0A0A0B]/20 hover:bg-[#F9FAFB] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-[#0A0A0B] text-white flex items-center justify-center text-[13px] font-[700] shadow-sm shrink-0">{(a.lead.name || "U")[0].toUpperCase()}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-[650] text-[13px] tracking-[-0.01em] truncate">{a.lead.name || "Unnamed"}</span>
                        {a.lead.isDemo && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] font-[700]">DEMO</span>}
                        <span className="hidden md:inline text-[12px] text-[#71717A] truncate">• {a.lead.company || ""}</span>
                        <Badge variant={a.recoveryScore >= 80 ? "critical" : a.recoveryScore >= 60 ? "high" : "medium"}>{a.recoveryScore}</Badge>
                      </div>
                      <div className="text-[11.5px] text-[#52525B] truncate max-w-[360px] mt-0.5">{a.reasoningSummary}</div>
                      <div className="mt-1.5 flex gap-1.5 flex-wrap">
                        {(a.factors ? (typeof a.factors === "string" ? (()=>{try{return JSON.parse(a.factors)}catch{return []}})() : a.factors) : []).slice(0, 3).map((f: any, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] text-[#52525B] font-[500]">{f.explanation || f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <div className="hidden md:block text-right">
                      <div className="font-mono-financial font-[700] text-[13px] tracking-[-0.01em]">₽{a.lead.dealValue ? Math.round(Number(a.lead.dealValue)).toLocaleString("ru-RU") : "—"}</div>
                      <div className="text-[11px] text-[#71717A]">Est. <span className="font-[700] text-[#0A0A0B] font-mono-financial">₽{(() => { const p = calcPotential(a.lead.dealValue, a.recoveryProbability); return p ? Math.round(p).toLocaleString("ru-RU") : "—"; })()}</span></div>
                      <div className="text-[10px] text-[#A1A1AA]">{a.recoveryProbability ? `${Math.round(a.recoveryProbability * 100)}%` : "—"} • {a.confidence}</div>
                    </div>
                    <div className="h-8 w-8 rounded-[9px] bg-[#F4F4F5] border group-hover:bg-[#0A0A0B] group-hover:text-white group-hover:border-[#0A0A0B] flex items-center justify-center transition-colors">↗</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          {/* Pipeline */}
          <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white p-[20px] shadow-premium">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">RECOVERY PIPELINE</div>
              <span className="text-[10px] font-[700] px-2 py-0.5 rounded-full bg-[#F4F4F5] border">{totalLeads} total</span>
            </div>
            <div className="mt-5 space-y-4">
              {[
                { label: "Critical 80-100", count: criticalCount, color: "bg-[#EF4444]", bg: "bg-[#FEF2F2]" },
                { label: "High 60-79", count: highCount, color: "bg-[#F97316]", bg: "bg-[#FFF7ED]" },
                { label: "Medium 40-59", count: mediumCount, color: "bg-[#F59E0B]", bg: "bg-[#FFFBEB]" },
                { label: "Low 0-39", count: lowCount, color: "bg-[#D4D4D8]", bg: "bg-[#F4F4F5]" },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between text-[12px]"><span className="flex items-center gap-2 font-[500]"><span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />{item.label}</span><span className="font-[700] font-mono-financial">{item.count}</span></div>
                  <div className={`h-1.5 w-full rounded-full ${item.bg} overflow-hidden`}><div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${totalLeads ? (item.count / totalLeads) * 100 : 0}%` }} /></div>
                </div>
              ))}
            </div>
          </div>

          {/* Funnel */}
          <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white p-[20px] shadow-premium">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">REVENUE ATTRIBUTION FUNNEL</div>
            <div className="mt-5 space-y-2.5">
              <div className="flex justify-between items-center text-[12px] p-2.5 rounded-[10px] bg-[#F9FAFB] border"><span className="font-[500]">{analyses.length} opportunities</span><span className="font-[700] font-mono-financial">100%</span></div>
              <div className="flex justify-between items-center text-[12px] p-2.5 rounded-[10px] border"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#3B82F6]" />{contactedCount} contacted</span><span className="font-[700] font-mono-financial">{analyses.length ? Math.round((contactedCount / analyses.length) * 100) : 0}%</span></div>
              <div className="flex justify-between items-center text-[12px] p-2.5 rounded-[10px] border"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#F59E0B]" />{repliedCount} replied</span><span className="font-[700] font-mono-financial">{analyses.length ? Math.round((repliedCount / analyses.length) * 100) : 0}%</span></div>
              <div className="flex justify-between items-center text-[12px] p-2.5 rounded-[10px] bg-[#ECFDF5] border border-[#A7F3D0]"><span className="flex items-center gap-2 font-[600]"><span className="h-2 w-2 rounded-full bg-[#10B981]" />{recoveredCount} recovered</span><span className="font-[700] font-mono-financial">{analyses.length ? Math.round((recoveredCount / analyses.length) * 100) : 0}%</span></div>
              <div className="border-t pt-3 mt-3 flex justify-between items-center"><span className="font-[700] font-mono-financial text-[13px]">₽{Math.round(confirmedRevenue).toLocaleString("ru-RU")} recovered</span><span className="text-[10px] font-[600] px-2 py-0.5 rounded-full bg-[#0A0A0B] text-white">ATTRIBUTED</span></div>
            </div>
          </div>

          {/* How scoring */}
          <div className="rounded-[20px] bg-[#0A0A0B] text-white p-[20px] shadow-premium-dark">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-white/50">HOW SCORING WORKS</div>
            <div className="mt-4 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between"><span className="text-white/80">+20 explicit intent</span><span className="text-white/40">purchase</span></div>
              <div className="flex justify-between"><span className="text-white/80">+15 product relevance</span><span className="text-white/40">specific</span></div>
              <div className="flex justify-between"><span className="text-white/80">+15 price requested</span><span className="text-white/40">quotation</span></div>
              <div className="flex justify-between"><span className="text-white/80">+10 proposal sent</span><span className="text-white/40">follow-up</span></div>
              <div className="flex justify-between"><span className="text-white/80">+10 high value</span><span className="text-white/40">deal</span></div>
              <div className="flex justify-between text-[#FCA5A5]"><span>-50 already won</span><span>exclude</span></div>
              <div className="flex justify-between text-[#FCA5A5]"><span>-40 explicit rejection</span><span>exclude</span></div>
              <div className="border-t border-white/10 pt-3 mt-3 font-[700] text-white text-[11px]">Explainable • Auditable • No black box</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
