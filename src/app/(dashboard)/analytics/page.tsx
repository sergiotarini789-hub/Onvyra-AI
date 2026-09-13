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
    <div className="p-6 lg:p-8 space-y-6 max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
            <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">ANALYTICS • REAL DATA ONLY</span>
          </div>
          <h1 className="mt-4 text-[28px] font-[750] tracking-[-0.025em] leading-[1.05]">Analytics</h1>
          <p className="mt-2 text-[13px] text-[#52525B]">Real data only — no fake historical charts. Estimated vs confirmed clearly separated. Potential ≠ Confirmed.</p>
        </div>
        <Link href="/dashboard" className="h-[36px] inline-flex items-center rounded-[10px] border border-[#E4E4E7] bg-white px-4 text-[12px] font-[600] shadow-sm hover:bg-[#F9FAFB]">Back to Dashboard</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-5 shadow-premium"><div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">TOTAL OPPORTUNITIES</div><div className="mt-2 text-[26px] font-[800] tracking-[-0.02em]">{totalOpportunities}</div><div className="text-[11px] text-[#71717A] mt-1">{leads.length} leads total</div></div>
        <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-5 shadow-premium"><div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">CONTACTED</div><div className="mt-2 text-[26px] font-[800] tracking-[-0.02em]">{contacted}</div><div className="text-[11px] text-[#71717A] mt-1">{totalOpportunities ? Math.round((contacted / totalOpportunities) * 100) : 0}% of opportunities</div></div>
        <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-5 shadow-premium"><div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">RESPONSE RATE</div><div className="mt-2 text-[26px] font-[800] tracking-[-0.02em]">{responseRate.toFixed(1)}%</div><div className="text-[11px] text-[#71717A] mt-1">{responded} responded</div></div>
        <div className="rounded-[16px] border border-[#059669]/20 bg-[#059669] p-5 text-white shadow-[0_8px_24px_rgba(5,150,105,0.2)]"><div className="text-[10px] font-[800] tracking-[0.08em] text-white/70">RECOVERY RATE</div><div className="mt-2 text-[26px] font-[800] tracking-[-0.02em]">{recoveryRate.toFixed(1)}%</div><div className="text-[11px] text-white/70 mt-1">{recovered} recovered</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-[20px] border border-[#0A0A0B] bg-white shadow-premium overflow-hidden">
          <div className="bg-[#0A0A0B] text-white p-5 flex items-center justify-between">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-white/50">REVENUE — ESTIMATED vs CONFIRMED</div>
            <span className="text-[10px] font-[700] px-2 py-0.5 rounded-full bg-white text-[#0A0A0B]">FINANCIAL HONESTY</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[14px] bg-[#0A0A0B] text-white p-4"><div className="text-[10px] uppercase font-[800] tracking-[0.08em] text-white/50">Estimated Recoverable</div><div className="font-mono-financial text-[22px] font-[850] tracking-[-0.02em] mt-2">₽{Math.round(potentialRevenue).toLocaleString("ru-RU")}</div><div className="text-[10px] text-white/50 mt-1">Est. • Not guaranteed</div></div>
              <div className="rounded-[14px] bg-[#059669] text-white p-4"><div className="text-[10px] uppercase font-[800] tracking-[0.08em] text-white/70">Confirmed Recovered</div><div className="font-mono-financial text-[22px] font-[850] tracking-[-0.02em] mt-2">₽{Math.round(confirmedRevenue).toLocaleString("ru-RU")}</div><div className="text-[10px] text-white/70 mt-1">Attributed • Actual</div></div>
            </div>
            <div className="text-[11px] text-[#71717A] bg-[#F9FAFB] border border-[#E4E4E7]/60 rounded-[10px] p-3">Potential ≠ Confirmed. Only counted when you record RECOVERED with actual amount. Onvyra finds, your team recovers.</div>
          </div>
        </div>

        <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium">
          <div className="p-6">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">RECOVERY FUNNEL — REAL DATA</div>
            <div className="mt-5 space-y-2.5">
              <div className="flex justify-between items-center p-3 rounded-[12px] bg-[#F9FAFB] border border-[#E4E4E7]/80 text-[12px]"><span className="flex items-center gap-2 font-[500]"><span className="h-2 w-2 rounded-full bg-[#71717A]" />{totalOpportunities} opportunities</span><span className="font-[700] font-mono-financial">100%</span></div>
              <div className="flex justify-between items-center p-3 rounded-[12px] bg-[#EFF6FF] border border-[#BFDBFE] text-[12px]"><span className="flex items-center gap-2 font-[500]"><span className="h-2 w-2 rounded-full bg-[#3B82F6]" />{contacted} contacted</span><span className="font-[700] font-mono-financial">{totalOpportunities ? Math.round((contacted / totalOpportunities) * 100) : 0}%</span></div>
              <div className="flex justify-between items-center p-3 rounded-[12px] bg-[#FFFBEB] border border-[#FDE68A] text-[12px]"><span className="flex items-center gap-2 font-[500]"><span className="h-2 w-2 rounded-full bg-[#F59E0B]" />{responded} responded</span><span className="font-[700] font-mono-financial">{contacted ? Math.round((responded / contacted) * 100) : 0}% of contacted</span></div>
              <div className="flex justify-between items-center p-3 rounded-[12px] bg-[#ECFDF5] border border-[#A7F3D0] text-[12px]"><span className="flex items-center gap-2 font-[600]"><span className="h-2 w-2 rounded-full bg-[#10B981]" />{recovered} recovered</span><span className="font-[700] font-mono-financial">{responded ? Math.round((recovered / responded) * 100) : 0}% of responded</span></div>
            </div>
            {totalOpportunities === 0 && <div className="text-[12px] text-[#71717A] py-6 text-center">No opportunities yet — import data to see funnel</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {[
          { title: "By Priority", data: byPriority, empty: "No priority data" },
          { title: "By Source", data: bySource, empty: "No source data" },
          { title: "By Campaign", data: Object.fromEntries(campaigns.slice(0, 8).map(c => [c.name, campaignLeads.filter(cl => cl.campaignId === c.id).length])), empty: "No campaigns" },
          { title: "By Deal Stage", data: byStage, empty: "No stage data" },
          { title: "By Product", data: byProduct, empty: "No product data" },
          { title: "By Manager", data: byManager, empty: "No manager data" },
        ].map((section) => (
          <div key={section.title} className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-5 shadow-premium">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">{section.title.toUpperCase()}</div>
            <div className="mt-4 space-y-2">
              {Object.keys(section.data).length === 0 ? <div className="text-[12px] text-[#71717A]">{section.empty}</div> : Object.entries(section.data).slice(0, 8).map(([k, v]: any) => (
                <div key={k} className="flex justify-between text-[12px] py-1 border-b border-[#F4F4F5] last:border-0"><span className="truncate font-[500]">{k}</span><span className="font-[700] font-mono-financial">{v}</span></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
