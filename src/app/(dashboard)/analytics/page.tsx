export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const orgId = session.organizationId;

  const [leads, analyses, events, campaigns, campaignLeads] = await Promise.all([
    prisma.lead.findMany({ where: { organizationId: orgId } }),
    prisma.aIAnalysis.findMany({ where: { organizationId: orgId } }),
    prisma.recoveryEvent.findMany({ where: { organizationId: orgId } }),
    prisma.campaign.findMany({ where: { organizationId: orgId } }),
    prisma.campaignLead.findMany({ where: { organizationId: orgId } }),
  ]);

  const latestByLead = new Map<string, any>();
  for (const ev of events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())) {
    latestByLead.set(ev.leadId, ev);
  }
  const latestEvents = Array.from(latestByLead.values());

  const totalOpportunities = analyses.length;
  const contacted = latestEvents.filter((e) => ["CONTACTED", "REPLIED", "INTERESTED", "NEGOTIATING", "RECOVERED", "contacted", "responded", "interested", "negotiation", "won"].includes(e.outcome)).length;
  const responded = latestEvents.filter((e) => ["REPLIED", "INTERESTED", "NEGOTIATING", "RECOVERED", "responded", "interested", "negotiation", "won"].includes(e.outcome)).length;
  const recovered = latestEvents.filter((e) => e.outcome === "RECOVERED" || e.outcome === "won").length;
  const confirmedRevenue = latestEvents.filter((e) => e.outcome === "RECOVERED" || e.outcome === "won").reduce((s, e) => s + (e.revenue || 0), 0);
  
  function calcPotential(dealValue: any, prob: any): number {
    if (!dealValue || !prob) return 0;
    const dv = typeof dealValue === "object" && dealValue.toNumber ? dealValue.toNumber() : Number(dealValue);
    if (dv < 0 || prob < 0 || prob > 1) return 0;
    const cents = Math.round(dv * 100);
    return Math.round(cents * prob) / 100;
  }
  const potentialRevenue = analyses.reduce((s, a) => {
    const lead = leads.find((l) => l.id === a.leadId);
    return s + calcPotential(lead?.dealValue, a.recoveryProbability);
  }, 0);

  const responseRate = contacted ? (responded / contacted) * 100 : 0;
  const recoveryRate = totalOpportunities ? (recovered / totalOpportunities) * 100 : 0;

  const byPriority = {
    critical: analyses.filter((a) => a.recoveryScore >= 80).length,
    high: analyses.filter((a) => a.recoveryScore >= 60 && a.recoveryScore < 80).length,
    medium: analyses.filter((a) => a.recoveryScore >= 40 && a.recoveryScore < 60).length,
    low: analyses.filter((a) => a.recoveryScore < 40).length,
  };

  const bySource = leads.reduce((acc: any, l) => {
    const src = l.source || "unknown";
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});
  const byStage = leads.reduce((acc: any, l) => {
    const stage = l.dealStage || "unknown";
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});
  const byProduct = leads.reduce((acc: any, l) => {
    const prod = l.product || "unknown";
    acc[prod] = (acc[prod] || 0) + 1;
    return acc;
  }, {});
  const byManager = leads.reduce((acc: any, l) => {
    if (!l.manager) return acc;
    acc[l.manager] = (acc[l.manager] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-5 lg:p-6 space-y-5 max-w-[1440px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
              <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">ANALYTICS • REAL DATA ONLY • NO FAKE CHARTS</span>
            </div>
            <span className="hidden md:inline-flex text-[10px] font-[700] tracking-[0.05em] px-2 py-0.5 rounded-full bg-[#0A0A0B] text-white">{totalOpportunities} OPPORTUNITIES • {recovered} RECOVERED</span>
          </div>
          <h1 className="mt-3.5 text-[26px] md:text-[30px] font-[800] leading-[1.05] tracking-[-0.03em]">Analytics</h1>
          <p className="mt-1.5 text-[13px] leading-[1.5] tracking-[-0.01em] text-[#52525B] max-w-[560px]">Real data only — no fake historical charts. Estimated vs confirmed clearly separated. <span className="font-[650] text-[#0A0A0B]">Potential ≠ Confirmed</span> • Tenant isolated • No fake claims.</p>
        </div>
        <Link href="/dashboard" className="h-[36px] inline-flex items-center justify-center rounded-[10px] border border-[#E4E4E7] bg-white px-4 text-[12.5px] font-[600] shadow-sm hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/15 hover:-translate-y-[0.5px] transition-all shrink-0">Back to Dashboard</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-[14px] border border-[#0A0A0B]/[0.06] bg-white p-4 shadow-premium hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[0.5px] transition-all group">
          <div className="flex justify-between items-start"><div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">TOTAL OPPORTUNITIES</div><div className="h-5 w-5 rounded-full bg-[#F4F4F5] border flex items-center justify-center text-[10px] group-hover:bg-[#0A0A0B] group-hover:text-white transition-colors">◫</div></div>
          <div className="mt-2 text-[24px] font-[800] tracking-[-0.03em] leading-none font-mono-financial">{totalOpportunities}</div>
          <div className="mt-1.5 text-[11px] text-[#71717A] font-[500]">{leads.length} leads total • Real data</div>
          <div className="mt-2.5 h-1 w-full rounded-full bg-[#F4F4F5] overflow-hidden"><div className="h-full bg-[#0A0A0B] rounded-full" style={{width:`${leads.length?Math.min(100,totalOpportunities/leads.length*100):0}%`}} /></div>
        </div>
        <div className="rounded-[14px] border border-[#0A0A0B]/[0.06] bg-white p-4 shadow-premium hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[0.5px] transition-all group">
          <div className="flex justify-between items-start"><div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">CONTACTED</div><div className="h-5 w-5 rounded-full bg-[#DBEAFE] border border-[#BFDBFE] flex items-center justify-center text-[10px] text-[#1D4ED8]">↗</div></div>
          <div className="mt-2 text-[24px] font-[800] tracking-[-0.03em] leading-none font-mono-financial">{contacted}</div>
          <div className="mt-1.5 text-[11px] font-[600] text-[#3B82F6]">{totalOpportunities ? Math.round((contacted / totalOpportunities) * 100) : 0}% of opportunities • Manual action</div>
          <div className="mt-2.5 h-1 w-full rounded-full bg-[#DBEAFE] overflow-hidden"><div className="h-full bg-[#3B82F6] rounded-full" style={{width:`${totalOpportunities?contacted/totalOpportunities*100:0}%`}} /></div>
        </div>
        <div className="rounded-[14px] border border-[#0A0A0B]/[0.06] bg-white p-4 shadow-premium hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[0.5px] transition-all group">
          <div className="flex justify-between items-start"><div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">RESPONSE RATE</div><div className="h-5 w-5 rounded-full bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[10px] text-[#92400E]">%</div></div>
          <div className="mt-2 text-[24px] font-[800] tracking-[-0.03em] leading-none font-mono-financial">{responseRate.toFixed(1)}%</div>
          <div className="mt-1.5 text-[11px] text-[#71717A] font-[500]">{responded} responded • Real events</div>
          <div className="mt-2.5 h-1 w-full rounded-full bg-[#FFFBEB] overflow-hidden"><div className="h-full bg-[#F59E0B] rounded-full" style={{width:`${responseRate}%`}} /></div>
        </div>
        <div className="rounded-[14px] border border-[#059669]/20 bg-[#059669] p-4 text-white shadow-[0_8px_24px_rgba(5,150,105,0.2)] hover:shadow-[0_12px_32px_rgba(5,150,105,0.25)] hover:-translate-y-[0.5px] transition-all group">
          <div className="flex justify-between items-start"><div className="text-[10px] font-[800] tracking-[0.08em] text-white/60">RECOVERY RATE</div><div className="h-5 w-5 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-[10px] group-hover:bg-white group-hover:text-[#059669] transition-colors">✓</div></div>
          <div className="mt-2 text-[24px] font-[800] tracking-[-0.03em] leading-none font-mono-financial">{recoveryRate.toFixed(1)}%</div>
          <div className="mt-1.5 text-[11px] text-white/70 font-[500]">{recovered} recovered • Attributed only</div>
          <div className="mt-2.5 h-1 w-full rounded-full bg-white/20 overflow-hidden"><div className="h-full bg-white rounded-full" style={{width:`${recoveryRate}%`}} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[16px] border border-[#0A0A0B] bg-white shadow-[0_0_0_1px_#0A0A0B,0_12px_32px_rgba(0,0,0,0.12)] overflow-hidden hover:shadow-[0_0_0_1px_#0A0A0B,0_16px_40px_rgba(0,0,0,0.14)] transition-shadow">
          <div className="bg-[#0A0A0B] text-white p-4 flex items-center justify-between">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-white/50">REVENUE — ESTIMATED vs CONFIRMED • FINANCIAL HONESTY</div>
            <span className="text-[10px] font-[700] px-2.5 py-1 rounded-full bg-white text-[#0A0A0B] shadow-sm">POTENTIAL ≠ CONFIRMED</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[12px] bg-[#FFFBEB] border border-[#FDE68A] p-4 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start"><div className="text-[10px] uppercase font-[800] tracking-[0.08em] text-[#92400E]">Estimated Recoverable</div><span className="text-[9px] font-[800] tracking-[0.05em] px-2 py-0.5 rounded-full bg-[#FDE68A] text-[#92400E] border border-[#FCD34D]">EST.</span></div>
                <div className="font-mono-financial text-[20px] font-[850] tracking-[-0.03em] mt-2 leading-none text-[#92400E]">₽{Math.round(potentialRevenue).toLocaleString("ru-RU")}</div>
                <div className="text-[10px] text-[#B45309] mt-1.5 font-[500]">Est. • Not guaranteed • Decimal-safe</div>
                <div className="mt-2.5 h-1 w-full rounded-full bg-[#FDE68A] overflow-hidden"><div className="h-full bg-[#F59E0B] rounded-full" style={{width:`${potentialRevenue?Math.min(100,confirmedRevenue?confirmedRevenue/potentialRevenue*100*0.3:30):0}%`}} /></div>
              </div>
              <div className="rounded-[12px] bg-[#059669] text-white p-4 shadow-[0_4px_16px_rgba(5,150,105,0.2)] hover:shadow-[0_8px_24px_rgba(5,150,105,0.25)] transition-shadow">
                <div className="flex justify-between items-start"><div className="text-[10px] uppercase font-[800] tracking-[0.08em] text-white/70">Confirmed Recovered</div><span className="text-[9px] font-[800] tracking-[0.05em] px-2 py-0.5 rounded-full bg-white text-[#059669] shadow-sm">CONFIRMED</span></div>
                <div className="font-mono-financial text-[20px] font-[850] tracking-[-0.03em] mt-2 leading-none">₽{Math.round(confirmedRevenue).toLocaleString("ru-RU")}</div>
                <div className="text-[10px] text-white/70 mt-1.5 font-[500]">Attributed • Actual • Latest per lead</div>
                <div className="mt-2.5 h-1 w-full rounded-full bg-white/20 overflow-hidden"><div className="h-full bg-white rounded-full" style={{width:`${potentialRevenue?Math.min(100,confirmedRevenue/potentialRevenue*100):0}%`}} /></div>
              </div>
            </div>
            <div className="text-[11px] text-[#71717A] bg-[#F9FAFB] border border-[#E4E4E7]/60 rounded-[10px] p-3 leading-[1.5]"><span className="font-[700] text-[#0A0A0B]">Potential ≠ Confirmed</span> — Only counted when you record RECOVERED with actual amount. Onvyra finds, your team recovers. Latest per lead prevents ghost revenue. No auto default deal value.</div>
          </div>
        </div>

        <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium overflow-hidden">
          <div className="p-4 border-b border-[#E4E4E7]/80 bg-[#FCFCFD] flex items-center justify-between">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">RECOVERY FUNNEL — REAL DATA • NO FAKE TRENDS</div>
            <span className="text-[10px] font-[700] px-2 py-0.5 rounded-full bg-[#0A0A0B] text-white">REAL EVENTS</span>
          </div>
          <div className="p-4 space-y-2.5">
            <div className="flex justify-between items-center p-3 rounded-[12px] bg-[#F9FAFB] border border-[#E4E4E7]/80 text-[12px] hover:bg-white hover:border-[#0A0A0B]/10 hover:shadow-sm transition-all group"><span className="flex items-center gap-2 font-[500]"><span className="h-2 w-2 rounded-full bg-[#71717A] group-hover:scale-125 transition-transform" />{totalOpportunities} opportunities</span><span className="font-[700] font-mono-financial">100%</span></div>
            <div className="flex justify-between items-center p-3 rounded-[12px] bg-[#EFF6FF] border border-[#BFDBFE] text-[12px] hover:bg-white hover:border-[#3B82F6]/20 hover:shadow-sm transition-all group"><span className="flex items-center gap-2 font-[500]"><span className="h-2 w-2 rounded-full bg-[#3B82F6] group-hover:scale-125 transition-transform" />{contacted} contacted</span><span className="font-[700] font-mono-financial">{totalOpportunities ? Math.round((contacted / totalOpportunities) * 100) : 0}%</span></div>
            <div className="flex justify-between items-center p-3 rounded-[12px] bg-[#FFFBEB] border border-[#FDE68A] text-[12px] hover:bg-white hover:border-[#F59E0B]/20 hover:shadow-sm transition-all group"><span className="flex items-center gap-2 font-[500]"><span className="h-2 w-2 rounded-full bg-[#F59E0B] group-hover:scale-125 transition-transform" />{responded} responded</span><span className="font-[700] font-mono-financial">{contacted ? Math.round((responded / contacted) * 100) : 0}% of contacted</span></div>
            <div className="flex justify-between items-center p-3 rounded-[12px] bg-[#ECFDF5] border border-[#A7F3D0] text-[12px] hover:bg-white hover:border-[#059669]/20 hover:shadow-sm transition-all group"><span className="flex items-center gap-2 font-[650]"><span className="h-2 w-2 rounded-full bg-[#10B981] group-hover:scale-125 transition-transform" />{recovered} recovered</span><span className="font-[750] font-mono-financial">{responded ? Math.round((recovered / responded) * 100) : 0}% of responded</span></div>
          </div>
          {totalOpportunities === 0 && <div className="px-4 pb-4 text-[12px] text-[#71717A] py-6 text-center border-t border-[#F4F4F5]">No opportunities yet — import data to see funnel • Potential ≠ Confirmed</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: "By Priority", data: byPriority, empty: "No priority data • Import to see distribution", color: "bg-[#0A0A0B]" },
          { title: "By Source", data: bySource, empty: "No source data • Import with source field", color: "bg-[#71717A]" },
          { title: "By Campaign", data: Object.fromEntries(campaigns.slice(0, 8).map(c => [c.name, campaignLeads.filter(cl => cl.campaignId === c.id).length])), empty: "No campaigns • Create from inbox", color: "bg-[#059669]" },
          { title: "By Deal Stage", data: byStage, empty: "No stage data • Import with stage", color: "bg-[#3B82F6]" },
          { title: "By Product", data: byProduct, empty: "No product data • Import with product", color: "bg-[#F97316]" },
          { title: "By Manager", data: byManager, empty: "No manager data • Import with manager", color: "bg-[#F59E0B]" },
        ].map((section) => (
          <div key={section.title} className="group rounded-[14px] border border-[#0A0A0B]/[0.06] bg-white p-4 shadow-premium hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[0.5px] hover:border-[#0A0A0B]/10 transition-all">
            <div className="flex items-center justify-between"><div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">{section.title.toUpperCase()}</div><div className={`h-1.5 w-1.5 rounded-full ${section.color} group-hover:scale-125 transition-transform`} /></div>
            <div className="mt-3.5 space-y-0">
              {Object.keys(section.data).length === 0 ? <div className="text-[12px] text-[#71717A] py-4 text-center border border-dashed border-[#E4E4E7] rounded-[10px] bg-[#F9FAFB]">{section.empty}</div> : Object.entries(section.data).slice(0, 8).map(([k, v]: any) => (
                <div key={k} className="flex justify-between text-[12px] py-2 border-b border-[#F4F4F5] last:border-0 hover:bg-[#F9FAFB] hover:px-2 hover:-mx-2 hover:rounded-[8px] transition-all"><span className="truncate font-[500] tracking-[-0.01em] max-w-[140px]">{k}</span><span className="font-[700] font-mono-financial">{v}</span></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
