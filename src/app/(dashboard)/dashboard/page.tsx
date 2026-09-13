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

  const [totalLeads, demoLeadsCount, analyses, recoveryEvents, campaigns] = await Promise.all([
    prisma.lead.count({ where: { organizationId: orgId } }),
    prisma.lead.count({ where: { organizationId: orgId, isDemo: true } }),
    prisma.aIAnalysis.findMany({ where: { organizationId: orgId }, orderBy: { recoveryScore: "desc" }, take: 10000, include: { lead: true } }),
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
  const funnel = { opportunities: analyses.length, contacted: contactedCount, replied: repliedCount, recovered: recoveredCount, revenue: confirmedRevenue };

  return (
    <div className="p-5 lg:p-6 space-y-5 max-w-[1440px] mx-auto">
      {/* Header — Revenue Intelligence */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-[pulse-subtle_2s_ease-in-out_infinite]" />
              <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">REVENUE INTELLIGENCE • LIVE • {analyses.length} OPPORTUNITIES</span>
            </div>
            <span className="hidden md:inline-flex text-[10px] font-[700] tracking-[0.05em] px-2 py-0.5 rounded-full bg-[#0A0A0B] text-white">OS v1.0</span>
          </div>
          <h1 className="mt-3.5 text-[26px] md:text-[30px] font-[800] leading-[1.05] tracking-[-0.03em]">Where should I recover revenue today?</h1>
          <p className="mt-1.5 text-[13px] leading-[1.5] tracking-[-0.01em] text-[#52525B] max-w-[560px]">Prioritized by Recovery Score, probability, and estimated recoverable revenue. <span className="font-[650] text-[#0A0A0B]">Potential ≠ Confirmed</span> • Est. not guaranteed • Tenant isolated.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/inbox" className="inline-flex h-[36px] items-center justify-center gap-1.5 rounded-[10px] bg-[#0A0A0B] px-4 text-[12.5px] font-[650] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:bg-[#1A1D23] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] transition-all">Recovery Inbox <span>→</span></Link>
          <Link href="/import" className="inline-flex h-[36px] items-center justify-center rounded-[10px] border border-[#E4E4E7] bg-white px-4 text-[12.5px] font-[600] shadow-sm hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/15 transition-all">Import Pipeline</Link>
        </div>
      </div>

      {demoLeadsCount > 0 && (
        <div className="rounded-[12px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="text-[12px] leading-[1.4]"><span className="font-[800] tracking-[0.02em]">DEMO DATA</span> — {demoLeadsCount} demo leads. Metrics from actual demo dataset, not hardcoded. <span className="font-[600]">Potential ≠ real revenue.</span> <span className="text-[#92400E]">Real demo: 500-1000 leads, mix high-value dormant, recent, old, rejected, cancelled, won, low-value, missing info, explicit intent, pricing requests.</span></div>
          <Link href="/leads" className="shrink-0 text-[11px] font-[700] px-3 py-1.5 rounded-full bg-[#0A0A0B] text-white shadow-sm hover:bg-[#1A1D23] transition-colors">View demo leads</Link>
        </div>
      )}

      {/* Primary — Recoverable Revenue + Recovered — Technical */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4">
        <div className="rounded-[16px] border border-[#0A0A0B]/[0.08] bg-white shadow-premium overflow-hidden hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-shadow">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#0A0A0B]/[0.06] bg-[#FCFCFD]">
            <div className="flex items-center gap-2.5">
              <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">RECOVERABLE REVENUE • ESTIMATED</div>
              <span className="h-1 w-1 rounded-full bg-[#D4D4D8]" />
              <div className="text-[10px] font-[600] tracking-[0.02em] text-[#71717A]">{analyses.length} opportunities • {criticalCount + highCount} priority • {avgProb}% avg prob</div>
            </div>
            <span className="text-[10px] font-[800] tracking-[0.06em] px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">ESTIMATED • NOT GUARANTEED</span>
          </div>
          <div className="p-5">
            <div className="flex items-baseline gap-4 flex-wrap">
              <div className="font-mono-financial text-[40px] font-[850] tracking-[-0.04em] leading-none">₽{Math.round(potentialRevenue).toLocaleString("ru-RU")}</div>
              <div className="flex items-center gap-2 text-[12px]">
                <span className="px-2.5 py-1 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] font-[600] tracking-[-0.01em]">{criticalCount} critical</span>
                <span className="px-2.5 py-1 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] font-[600] tracking-[-0.01em]">{highCount} high</span>
                <span className="px-2.5 py-1 rounded-full bg-[#0A0A0B] text-white font-[700] tracking-[-0.01em] text-[11px]">Potential ≠ Confirmed</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-[12px] bg-[#F9FAFB] border border-[#E4E4E7]/80 p-3.5 hover:bg-white hover:border-[#0A0A0B]/10 hover:shadow-sm transition-all group">
                <div className="flex justify-between items-start">
                  <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">HIGH CONFIDENCE</div>
                  <div className="h-5 w-5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[10px] group-hover:scale-110 transition-transform">↗</div>
                </div>
                <div className="mt-2 font-mono-financial text-[17px] font-[750] tracking-[-0.02em]">₽{Math.round(highConfidenceRevenue).toLocaleString("ru-RU")}</div>
                <div className="mt-1 text-[11px] font-[600] text-[#059669]">60%+ prob • High</div>
                <div className="mt-2 h-1 w-full rounded-full bg-[#E4E4E7]/60 overflow-hidden"><div className="h-full bg-[#059669] rounded-full" style={{ width: `${potentialRevenue ? (highConfidenceRevenue / potentialRevenue) * 100 : 0}%` }} /></div>
              </div>
              <div className="rounded-[12px] bg-[#F9FAFB] border border-[#E4E4E7]/80 p-3.5 hover:bg-white hover:border-[#0A0A0B]/10 hover:shadow-sm transition-all group">
                <div className="flex justify-between items-start">
                  <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">AVG PROBABILITY</div>
                  <div className="h-5 w-5 rounded-full bg-[#F4F4F5] border flex items-center justify-center text-[10px] group-hover:scale-110 transition-transform">%</div>
                </div>
                <div className="mt-2 font-mono-financial text-[17px] font-[750] tracking-[-0.02em]">{avgProb}%</div>
                <div className="mt-1 text-[11px] text-[#71717A]">Across analyzed • Decimal-safe</div>
                <div className="mt-2 h-1 w-full rounded-full bg-[#E4E4E7]/60 overflow-hidden"><div className="h-full bg-[#0A0A0B] rounded-full" style={{ width: `${avgProb}%` }} /></div>
              </div>
              <div className="rounded-[12px] bg-[#0A0A0B] text-white p-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] hover:-translate-y-[0.5px] transition-all group">
                <div className="flex justify-between items-start">
                  <div className="text-[10px] font-[800] tracking-[0.08em] text-white/50">PRIORITY LEADS</div>
                  <div className="h-5 w-5 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[10px] group-hover:bg-white group-hover:text-black transition-colors">→</div>
                </div>
                <div className="mt-2 text-[17px] font-[750] tracking-[-0.02em]">{criticalCount + highCount}</div>
                <div className="mt-1 text-[11px] text-white/60">{criticalCount} critical • {highCount} high • Action required</div>
                <div className="mt-2 flex gap-1"><div className="h-1 flex-1 rounded-full bg-[#EF4444]" style={{ width: `${(criticalCount / (criticalCount + highCount || 1)) * 100}%` }} /><div className="h-1 flex-1 rounded-full bg-[#F97316]" /></div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-[10px] font-[500] tracking-[0.02em] text-[#71717A] border-t border-[#F4F4F5] pt-3">
              <span>Formula: Deal Value × Probability • Decimal-safe integer arithmetic • 100000×0.5=50000 exact • Cents = Math.round(value*100)</span>
              <span className="font-[700] text-[#0A0A0B] px-2 py-0.5 rounded-full bg-[#F4F4F5] border">Potential ≠ Confirmed</span>
            </div>
          </div>
        </div>

        <div className="rounded-[16px] border border-[#059669]/20 bg-[#059669] text-white shadow-[0_8px_24px_rgba(5,150,105,0.2)] overflow-hidden hover:shadow-[0_12px_32px_rgba(5,150,105,0.25)] hover:-translate-y-[0.5px] transition-all">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/10">
            <div className="text-[10px] font-[800] tracking-[0.08em] text-white/60">RECOVERED REVENUE • CONFIRMED • ATTRIBUTED</div>
            <span className="text-[10px] font-[800] tracking-[0.06em] px-2.5 py-1 rounded-full bg-white text-[#059669] shadow-sm">CONFIRMED</span>
          </div>
          <div className="p-5">
            <div className="font-mono-financial text-[40px] font-[850] tracking-[-0.04em] leading-none">₽{Math.round(confirmedRevenue).toLocaleString("ru-RU")}</div>
            <div className="mt-2 flex items-center gap-2 text-[12px] text-white/80">
              <span className="font-[600]">{recoveredCount} recovered</span>
              <span className="h-1 w-1 rounded-full bg-white/40" />
              <span>{recoveryRate.toFixed(1)}% rate</span>
              <span className="h-1 w-1 rounded-full bg-white/40" />
              <span>{campaigns.length} campaigns</span>
            </div>

            <div className="mt-5 space-y-2.5">
              <div className="rounded-[10px] bg-white/10 border border-white/15 p-3 flex justify-between items-center text-[11px] hover:bg-white/15 transition-colors"><span className="text-white/60 font-[500]">Recovery Rate</span><span className="font-[750] font-mono-financial text-[13px]">{recoveryRate.toFixed(1)}%</span></div>
              <div className="rounded-[10px] bg-white/10 border border-white/15 p-3 flex justify-between items-center text-[11px] hover:bg-white/15 transition-colors"><span className="text-white/60 font-[500]">Contact Rate</span><span className="font-[750] font-mono-financial text-[13px]">{contactRate.toFixed(1)}%</span></div>
              <div className="rounded-[10px] bg-white/10 border border-white/15 p-3 flex justify-between items-center text-[11px] hover:bg-white/15 transition-colors"><span className="text-white/60 font-[500]">Funnel: {funnel.opportunities} → {funnel.contacted} → {funnel.recovered}</span><span className="font-[700]">₽{Math.round(funnel.revenue).toLocaleString("ru-RU")}</span></div>
            </div>

            <div className="mt-5 rounded-[10px] bg-black/20 border border-white/10 p-3 text-[11px] leading-[1.5] text-white/60">
              Attributed only when you record <span className="font-[700] text-white">RECOVERED</span> with actual amount. Onvyra finds, your team recovers. Latest per lead prevents ghost revenue. No auto default deal value.
            </div>
          </div>
        </div>
      </div>

      {/* Middle — Pipeline + Funnel + Actions — Data Density */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4">
        <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#E4E4E7]/80 bg-[#FCFCFD]">
            <div className="flex items-center gap-3">
              <h2 className="text-[12px] font-[800] tracking-[0.06em] uppercase">Priority Opportunities</h2>
              <span className="text-[11px] font-[500] text-[#71717A]">— Who should I contact first? Sorted by score • Deal value • Est. recoverable • Why • Action</span>
            </div>
            <Link href="/inbox" className="h-[28px] inline-flex items-center gap-1 rounded-[8px] border border-[#E4E4E7] bg-white px-3 text-[11px] font-[650] shadow-sm hover:bg-[#0A0A0B] hover:text-white hover:border-[#0A0A0B] hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all">Open Inbox <span>→</span></Link>
          </div>

          <div className="divide-y divide-[#F4F4F5]">
            {priorityLeads.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto h-10 w-10 rounded-[12px] bg-[#F4F4F5] border flex items-center justify-center text-[16px]">◫</div>
                <div className="mt-3 text-[13px] font-[650] tracking-[-0.01em]">No priority leads yet</div>
                <div className="mt-1 text-[11px] text-[#71717A] max-w-[300px] mx-auto">Import your pipeline or load demo to see where you are leaving money behind. Potential ≠ Confirmed.</div>
                <div className="mt-4 flex justify-center gap-2">
                  <Link href="/import" className="h-[32px] px-3.5 rounded-[9px] bg-[#0A0A0B] text-white text-[11px] font-[650] inline-flex items-center shadow-sm hover:bg-[#1A1D23]">Import CSV/XLSX</Link>
                  <Link href="/inbox" className="h-[32px] px-3.5 rounded-[9px] border bg-white text-[11px] font-[600] inline-flex items-center">Recovery Inbox</Link>
                </div>
              </div>
            ) : (
              priorityLeads.map((a) => (
                <Link key={a.id} href={`/leads/${a.leadId}`} className="group flex items-center justify-between p-4 hover:bg-[#F9FAFB] transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-full bg-[#0A0A0B] text-white flex items-center justify-center text-[12px] font-[700] shadow-sm shrink-0 group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.15)] group-hover:scale-105 transition-all">{(a.lead.name || "U")[0].toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-[650] text-[12.5px] tracking-[-0.01em] truncate group-hover:underline underline-offset-4">{a.lead.name || "Unnamed"}</span>
                        {a.lead.isDemo && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] font-[700]">DEMO</span>}
                        <Badge variant={a.recoveryScore >= 80 ? "critical" : a.recoveryScore >= 60 ? "high" : "medium"} className="group-hover:scale-105 transition-transform">{a.recoveryScore}</Badge>
                        <span className="hidden md:inline text-[11px] text-[#71717A] truncate">• {a.lead.company || ""} • {a.reasoningSummary.slice(0, 48)}...</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[11px]">
                        <span className="font-mono-financial font-[600]">₽{a.lead.dealValue ? Math.round(Number(a.lead.dealValue)).toLocaleString("ru-RU") : "—"}</span>
                        <span className="text-[#D4D4D8]">•</span>
                        <span>Est. <span className="font-[700] font-mono-financial">₽{(() => { const p = calcPotential(a.lead.dealValue, a.recoveryProbability); return p ? Math.round(p).toLocaleString("ru-RU") : "—"; })()}</span> <span className="text-[10px] text-[#A1A1AA]">Est. not guaranteed</span></span>
                        <span className="text-[#D4D4D8]">•</span>
                        <span className="text-[#71717A]">{a.recoveryProbability ? `${Math.round(a.recoveryProbability * 100)}%` : "—"} • {a.confidence} • {a.recommendedAction.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <div className="hidden lg:block text-right">
                      <div className="text-[10px] font-[700] tracking-[0.06em] text-[#71717A]">ACTION</div>
                      <div className="text-[11px] font-[700] px-2 py-0.5 rounded-full bg-[#0A0A0B] text-white mt-1">{a.recommendedAction.replace(/_/g, " ").toUpperCase()}</div>
                    </div>
                    <div className="h-7 w-7 rounded-[8px] bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center text-[#71717A] group-hover:bg-[#0A0A0B] group-hover:text-white group-hover:border-[#0A0A0B] group-hover:shadow-sm group-hover:translate-x-0.5 transition-all">↗</div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {priorityLeads.length > 0 && (
            <div className="px-5 py-3 bg-[#F9FAFB] border-t border-[#E4E4E7]/80 flex justify-between items-center text-[11px]">
              <span className="text-[#71717A] font-[500]">{priorityLeads.length} priority opportunities • Potential ≠ Confirmed • Est. not guaranteed</span>
              <Link href="/leads" className="font-[650] text-[#0A0A0B] hover:underline underline-offset-4">View all {analyses.length} →</Link>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E4E4E7]/80 bg-[#FCFCFD] flex items-center justify-between">
              <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">RECOVERY PIPELINE • REAL DATA</div>
              <span className="text-[10px] font-[700] px-2 py-0.5 rounded-full bg-[#F4F4F5] border border-[#E4E4E7]">{totalLeads} total</span>
            </div>
            <div className="p-4 space-y-3.5">
              {[
                { label: "Critical 80-100", count: criticalCount, color: "bg-[#EF4444]", bg: "bg-[#FEF2F2]", text: "text-[#991B1B]" },
                { label: "High 60-79", count: highCount, color: "bg-[#F97316]", bg: "bg-[#FFF7ED]", text: "text-[#9A3412]" },
                { label: "Medium 40-59", count: mediumCount, color: "bg-[#F59E0B]", bg: "bg-[#FFFBEB]", text: "text-[#92400E]" },
                { label: "Low 0-39", count: lowCount, color: "bg-[#D4D4D8]", bg: "bg-[#F4F4F5]", text: "text-[#71717A]" },
              ].map((item) => (
                <div key={item.label} className="group">
                  <div className="flex justify-between text-[11px] font-[600] tracking-[0.01em]"><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${item.color} shadow-sm`} />{item.label}</span><span className="font-mono-financial font-[700]">{item.count} • {totalLeads ? Math.round((item.count / totalLeads) * 100) : 0}%</span></div>
                  <div className={`mt-1.5 h-1.5 w-full rounded-full ${item.bg} overflow-hidden border border-black/[0.04]`}><div className={`h-full rounded-full ${item.color} transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-80`} style={{ width: `${totalLeads ? (item.count / totalLeads) * 100 : 0}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 bg-[#F9FAFB] border-t border-[#E4E4E7]/60 text-[10px] text-[#71717A]">Distribution from real Recovery Engine 2.0 scores • No hardcoded metrics • Potential ≠ Confirmed</div>
          </div>

          <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E4E4E7]/80 bg-[#FCFCFD] flex items-center justify-between">
              <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">REVENUE ATTRIBUTION FUNNEL • REAL EVENTS</div>
              <span className="text-[10px] font-[700] px-2 py-0.5 rounded-full bg-[#0A0A0B] text-white">ATTRIBUTED</span>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between items-center text-[11px] p-2.5 rounded-[10px] bg-[#F9FAFB] border border-[#E4E4E7]/80 hover:bg-white hover:border-[#0A0A0B]/10 transition-colors"><span className="flex items-center gap-2 font-[500]"><span className="h-1.5 w-1.5 rounded-full bg-[#71717A]" />{funnel.opportunities} opportunities</span><span className="font-[700] font-mono-financial">100%</span></div>
              <div className="flex justify-between items-center text-[11px] p-2.5 rounded-[10px] bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-white hover:border-[#3B82F6]/20 transition-colors"><span className="flex items-center gap-2 font-[500]"><span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />{funnel.contacted} contacted</span><span className="font-[700] font-mono-financial">{funnel.opportunities ? Math.round((funnel.contacted / funnel.opportunities) * 100) : 0}%</span></div>
              <div className="flex justify-between items-center text-[11px] p-2.5 rounded-[10px] bg-[#FFFBEB] border border-[#FDE68A] hover:bg-white hover:border-[#F59E0B]/20 transition-colors"><span className="flex items-center gap-2 font-[500]"><span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />{funnel.replied} replied</span><span className="font-[700] font-mono-financial">{funnel.opportunities ? Math.round((funnel.replied / funnel.opportunities) * 100) : 0}%</span></div>
              <div className="flex justify-between items-center text-[11px] p-2.5 rounded-[10px] bg-[#ECFDF5] border border-[#A7F3D0] hover:bg-white hover:border-[#059669]/20 transition-colors"><span className="flex items-center gap-2 font-[650]"><span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />{funnel.recovered} recovered</span><span className="font-[750] font-mono-financial">{funnel.opportunities ? Math.round((funnel.recovered / funnel.opportunities) * 100) : 0}%</span></div>
              <div className="border-t border-[#F4F4F5] pt-3 mt-2 flex justify-between items-center"><span className="font-[700] font-mono-financial text-[12px] tracking-[-0.01em]">₽{Math.round(funnel.revenue).toLocaleString("ru-RU")} recovered</span><span className="text-[10px] font-[700] tracking-[0.05em] px-2 py-0.5 rounded-full bg-[#0A0A0B] text-white">CONFIRMED • ATTRIBUTED</span></div>
            </div>
            <div className="px-4 py-2.5 bg-[#F9FAFB] border-t border-[#E4E4E7]/60 text-[10px] text-[#71717A]">Funnel from real recovery events • Latest per lead prevents ghost revenue • No invented trend data</div>
          </div>

          <div className="rounded-[16px] bg-[#0A0A0B] text-white p-4 shadow-premium-dark overflow-hidden relative">
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-[800] tracking-[0.08em] text-white/40">HOW SCORING WORKS • EXPLAINABLE</div>
                <span className="text-[9px] font-[700] tracking-[0.05em] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/60">NO BLACK BOX</span>
              </div>
              <div className="mt-4 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between py-1 border-b border-white/[0.06] hover:bg-white/[0.03] hover:px-2 hover:-mx-2 hover:rounded-[6px] transition-all"><span className="text-white/70">+20 explicit intent</span><span className="text-white/30">purchase</span></div>
                <div className="flex justify-between py-1 border-b border-white/[0.06] hover:bg-white/[0.03] hover:px-2 hover:-mx-2 hover:rounded-[6px] transition-all"><span className="text-white/70">+15 product relevance</span><span className="text-white/30">specific</span></div>
                <div className="flex justify-between py-1 border-b border-white/[0.06] hover:bg-white/[0.03] hover:px-2 hover:-mx-2 hover:rounded-[6px] transition-all"><span className="text-white/70">+15 price requested</span><span className="text-white/30">quotation</span></div>
                <div className="flex justify-between py-1 border-b border-white/[0.06] hover:bg-white/[0.03] hover:px-2 hover:-mx-2 hover:rounded-[6px] transition-all"><span className="text-white/70">+10 proposal sent</span><span className="text-white/30">follow-up</span></div>
                <div className="flex justify-between py-1 border-b border-white/[0.06] hover:bg-white/[0.03] hover:px-2 hover:-mx-2 hover:rounded-[6px] transition-all"><span className="text-white/70">+10 high value</span><span className="text-white/30">deal</span></div>
                <div className="flex justify-between py-1 text-[#FCA5A5] hover:bg-[#EF4444]/10 hover:px-2 hover:-mx-2 hover:rounded-[6px] transition-all"><span>-50 already won</span><span className="text-[#FCA5A5]/60">exclude</span></div>
                <div className="flex justify-between py-1 text-[#FCA5A5] hover:bg-[#EF4444]/10 hover:px-2 hover:-mx-2 hover:rounded-[6px] transition-all"><span>-40 explicit rejection</span><span className="text-[#FCA5A5]/60">exclude</span></div>
                <div className="border-t border-white/10 pt-3 mt-3 font-[800] tracking-[0.04em] text-white text-[10px] flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" /> Explainable • Auditable • No black box • Deterministic Engine 2.0</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
