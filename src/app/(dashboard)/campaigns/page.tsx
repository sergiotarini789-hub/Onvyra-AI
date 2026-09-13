export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function CampaignsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: session.organizationId },
    include: { _count: { select: { campaignLeads: true } } },
    orderBy: { createdAt: "desc" },
  });

  const campaignLeads = await prisma.campaignLead.findMany({ where: { organizationId: session.organizationId } });
  const totalRevenue = campaignLeads.filter((cl) => cl.outcome === "RECOVERED" || cl.outcome === "won").reduce((s, cl) => s + (cl.revenue || 0), 0);
  const contacted = campaignLeads.filter((cl) => cl.status === "contacted" || cl.contactedAt).length;
  const recovered = campaignLeads.filter((cl) => cl.outcome === "RECOVERED" || cl.outcome === "won").length;
  const byStatus = {
    DRAFT: campaigns.filter((c) => c.status === "DRAFT" || c.status === "draft").length,
    ACTIVE: campaigns.filter((c) => c.status === "ACTIVE" || c.status === "active").length,
    PAUSED: campaigns.filter((c) => c.status === "PAUSED").length,
    COMPLETED: campaigns.filter((c) => c.status === "COMPLETED").length,
  };

  return (
    <div className="p-5 lg:p-6 space-y-5 max-w-[1440px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
              <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">RECOVERY CAMPAIGNS • {campaigns.length} TOTAL • REAL DATA</span>
            </div>
            <span className="hidden md:inline-flex text-[10px] font-[700] tracking-[0.05em] px-2 py-0.5 rounded-full bg-[#0A0A0B] text-white">{campaignLeads.length} TARGETS • ₽{Math.round(totalRevenue).toLocaleString("ru-RU")} CONFIRMED</span>
          </div>
          <h1 className="mt-3.5 text-[26px] md:text-[30px] font-[800] leading-[1.05] tracking-[-0.03em]">Recovery Campaigns</h1>
          <p className="mt-1.5 text-[13px] leading-[1.5] tracking-[-0.01em] text-[#52525B] max-w-[560px]">Group opportunities, track actions, measure attributed recovered revenue. <span className="font-[650] text-[#0A0A0B]">Manual action required</span> — MVP does not auto-send • Potential ≠ Confirmed • Tenant isolated.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/inbox" className="h-[36px] inline-flex items-center justify-center rounded-[10px] border border-[#E4E4E7] bg-white px-4 text-[12.5px] font-[600] shadow-sm hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/15 hover:-translate-y-[0.5px] transition-all">Recovery Inbox</Link>
          <Link href="/leads" className="h-[36px] inline-flex items-center justify-center gap-1 rounded-[10px] bg-[#0A0A0B] px-4 text-[12.5px] font-[650] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:bg-[#1A1D23] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] transition-all">Select Leads <span>→</span></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-[14px] border border-[#0A0A0B]/[0.06] bg-white p-4 shadow-premium hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[0.5px] transition-all group">
          <div className="flex justify-between items-start"><div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">TOTAL CAMPAIGNS</div><div className="h-5 w-5 rounded-full bg-[#F4F4F5] border flex items-center justify-center text-[10px] group-hover:bg-[#0A0A0B] group-hover:text-white transition-colors">◧</div></div>
          <div className="mt-2 text-[22px] font-[800] tracking-[-0.03em] leading-none">{campaigns.length}</div>
          <div className="mt-1.5 text-[11px] text-[#71717A] font-[500]">{byStatus.DRAFT} draft • {byStatus.ACTIVE} active • {byStatus.COMPLETED} done</div>
          <div className="mt-2.5 h-1 w-full rounded-full bg-[#F4F4F5] overflow-hidden flex gap-px"><div className="h-full bg-[#71717A] rounded-full" style={{width:`${campaigns.length?byStatus.DRAFT/campaigns.length*100:0}%`}} /><div className="h-full bg-[#3B82F6] rounded-full" style={{width:`${campaigns.length?byStatus.ACTIVE/campaigns.length*100:0}%`}} /><div className="h-full bg-[#0A0A0B] rounded-full" style={{width:`${campaigns.length?byStatus.COMPLETED/campaigns.length*100:0}%`}} /></div>
        </div>
        <div className="rounded-[14px] border border-[#0A0A0B]/[0.06] bg-white p-4 shadow-premium hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[0.5px] transition-all group">
          <div className="flex justify-between items-start"><div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">TARGET OPPORTUNITIES</div><div className="h-5 w-5 rounded-full bg-[#F4F4F5] border flex items-center justify-center text-[10px] group-hover:bg-[#0A0A0B] group-hover:text-white transition-colors">◫</div></div>
          <div className="mt-2 text-[22px] font-[800] tracking-[-0.03em] leading-none font-mono-financial">{campaignLeads.length}</div>
          <div className="mt-1.5 text-[11px] text-[#71717A] font-[500]">Across all campaigns • Real data</div>
        </div>
        <div className="rounded-[14px] border border-[#0A0A0B]/[0.06] bg-white p-4 shadow-premium hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[0.5px] transition-all group">
          <div className="flex justify-between items-start"><div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">CONTACTED</div><div className="h-5 w-5 rounded-full bg-[#DBEAFE] border border-[#BFDBFE] flex items-center justify-center text-[10px] text-[#1D4ED8]">↗</div></div>
          <div className="mt-2 text-[22px] font-[800] tracking-[-0.03em] leading-none font-mono-financial">{contacted}</div>
          <div className="mt-1.5 text-[11px] font-[600] text-[#3B82F6]">{campaignLeads.length ? Math.round((contacted / campaignLeads.length) * 100) : 0}% of targets • Manual action</div>
        </div>
        <div className="rounded-[14px] border border-[#0A0A0B]/[0.06] bg-white p-4 shadow-premium hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[0.5px] transition-all group">
          <div className="flex justify-between items-start"><div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">RECOVERED</div><div className="h-5 w-5 rounded-full bg-[#D1FAE5] border border-[#A7F3D0] flex items-center justify-center text-[10px] text-[#065F46]">✓</div></div>
          <div className="mt-2 text-[22px] font-[800] tracking-[-0.03em] leading-none font-mono-financial">{recovered}</div>
          <div className="mt-1.5 text-[11px] font-[600] text-[#059669]">{contacted ? Math.round((recovered / contacted) * 100) : 0}% of contacted • Attributed</div>
        </div>
        <div className="rounded-[14px] border border-[#059669]/20 bg-[#059669] p-4 text-white shadow-[0_8px_24px_rgba(5,150,105,0.2)] hover:shadow-[0_12px_32px_rgba(5,150,105,0.25)] hover:-translate-y-[0.5px] transition-all group">
          <div className="flex justify-between items-start"><div className="text-[10px] font-[800] tracking-[0.08em] text-white/60">ATTRIBUTED REVENUE</div><div className="h-5 w-5 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-[10px] group-hover:bg-white group-hover:text-[#059669] transition-colors">₽</div></div>
          <div className="mt-2 font-mono-financial text-[20px] font-[850] tracking-[-0.03em] leading-none">₽{Math.round(totalRevenue).toLocaleString("ru-RU")}</div>
          <div className="mt-1.5 text-[11px] text-white/70 font-[500]">Confirmed recovered • Attributed only</div>
          <div className="mt-2.5 h-1 w-full rounded-full bg-white/20 overflow-hidden"><div className="h-full bg-white rounded-full" style={{width:`${campaignLeads.length?Math.min(100,(recovered/campaignLeads.length)*100*3):0}%`}} /></div>
        </div>
      </div>

      <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#E4E4E7]/80 bg-[#FCFCFD]">
          <div className="flex items-center gap-3"><h2 className="text-[13px] font-[700] tracking-[-0.01em]">Campaigns</h2><span className="text-[11px] font-[500] px-2 py-0.5 rounded-full bg-[#F4F4F5] border text-[#71717A]">{campaigns.length} total • Manual action required</span></div>
          <div className="text-[11px] text-[#71717A] font-[500] hidden md:block">Potential ≠ Confirmed • No auto-send • Human approval required</div>
        </div>
        <div className="p-3">
          {campaigns.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-12 w-12 rounded-[14px] bg-[#0A0A0B] text-white flex items-center justify-center font-[800] text-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.15)]">C</div>
              <div className="mt-4 text-[14px] font-[700] tracking-[-0.01em]">No campaigns yet</div>
              <div className="mt-2 text-[12px] text-[#71717A] max-w-[420px] mx-auto leading-[1.5]">Create a campaign from Recovery Inbox. Example: September dormant customers — category HIGH or CRITICAL, inactivity &gt;14 days, potential &gt;₽10k. Manual action required — MVP does not auto-send.</div>
              <div className="mt-6 flex justify-center gap-2">
                <Link href="/inbox" className="h-[36px] px-4 rounded-[10px] bg-[#0A0A0B] text-white text-[12px] font-[650] inline-flex items-center shadow-sm hover:bg-[#1A1D23] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all">Open Recovery Inbox</Link>
                <Link href="/leads" className="h-[36px] px-4 rounded-[10px] border bg-white text-[12px] font-[600] inline-flex items-center hover:bg-[#F9FAFB]">View Leads</Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => {
                const targetCriteria = c.targetCriteria ? (typeof c.targetCriteria === "string" ? (()=>{try{return JSON.parse(c.targetCriteria)}catch{return null}})() : c.targetCriteria) : null;
                return (
                  <Link key={c.id} href={`/campaigns/${c.id}`} className="group flex items-center justify-between rounded-[12px] border border-[#E4E4E7]/80 bg-white p-4 hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/15 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[0.5px] transition-all">
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-[10px] bg-[#0A0A0B] text-white flex items-center justify-center font-[750] text-[12px] shadow-sm group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] group-hover:scale-105 transition-all shrink-0">{c.name[0].toUpperCase()}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-[650] text-[13px] tracking-[-0.01em] truncate group-hover:underline underline-offset-4">{c.name}</div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-[800] tracking-[0.04em] border shadow-sm ${c.status === "ACTIVE" || c.status === "active" ? "bg-[#059669] text-white border-[#059669] shadow-[0_2px_8px_rgba(5,150,105,0.2)]" : c.status === "COMPLETED" ? "bg-[#0A0A0B] text-white border-[#0A0A0B]" : c.status === "PAUSED" ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-[#F4F4F5] text-[#52525B] border-[#E4E4E7]"}`}>{c.status.toUpperCase()}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-[#71717A] truncate font-[500]">{c.description || "No description"} • {c._count.campaignLeads} leads • {new Date(c.createdAt).toLocaleDateString("ru-RU")} • Potential ≠ Confirmed</div>
                        {targetCriteria && <div className="mt-2 flex gap-1.5 flex-wrap">{Object.entries(targetCriteria).slice(0, 3).map(([k, v]) => <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] text-[#52525B] font-[500] group-hover:bg-white transition-colors">{k}: {String(v)}</span>)}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <div className="hidden md:block text-right"><div className="text-[10px] font-[700] tracking-[0.06em] text-[#71717A]">LEADS</div><div className="font-mono-financial font-[700] text-[13px]">{c._count.campaignLeads}</div></div>
                      <div className="h-8 w-8 rounded-[10px] bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center text-[#71717A] group-hover:bg-[#0A0A0B] group-hover:text-white group-hover:border-[#0A0A0B] group-hover:shadow-sm group-hover:translate-x-0.5 transition-all text-[12px]">→</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[16px] bg-[#0A0A0B] text-white p-5 shadow-premium-dark overflow-hidden relative">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
        <div className="relative grid md:grid-cols-3 gap-6 text-[12px]">
          <div><div className="font-[800] tracking-[0.08em] text-white/40 text-[10px]">CAMPAIGN WORKFLOW • MANUAL ACTION</div><div className="mt-3 space-y-1.5 font-mono text-[11px]"><div className="flex items-center gap-2 text-white/70"><span className="h-1 w-1 rounded-full bg-white/30" />AI generates message →</div><div className="flex items-center gap-2 text-white/70"><span className="h-1 w-1 rounded-full bg-white/30" />User reviews & edits →</div><div className="flex items-center gap-2 text-white/70"><span className="h-1 w-1 rounded-full bg-white/30" />Mark as ready / manual send →</div><div className="flex items-center gap-2 text-white/70"><span className="h-1 w-1 rounded-full bg-white/30" />Record outcome →</div><div className="flex items-center gap-2 text-white font-[700]"><span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />Measure recovered revenue</div></div></div>
          <div><div className="font-[800] tracking-[0.08em] text-white/40 text-[10px]">SELECTION CRITERIA EXAMPLE • REAL</div><div className="mt-3 space-y-1.5 text-[11px] text-white/60"><div className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/20" />Category = HIGH or CRITICAL</div><div className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/20" />Inactivity &gt; 14 days</div><div className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/20" />Potential &gt; ₽10,000</div><div className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/20" />Not yet contacted • Tenant isolated</div></div></div>
          <div><div className="font-[800] tracking-[0.08em] text-white/40 text-[10px]">METRICS CALCULATED • REAL DATA ONLY</div><div className="mt-3 space-y-1.5 text-[11px] text-white/60"><div className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/20" />Target opportunities • Real count</div><div className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/20" />Total deal value • Mono-financial</div><div className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/20" />Est. recoverable • Potential≠Confirmed</div><div className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-white/20" />Contacted / Response / Recovered • Funnel</div><div className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-[#10B981]" />Confirmed recovered • Attributed only</div></div></div>
        </div>
      </div>
    </div>
  );
}
