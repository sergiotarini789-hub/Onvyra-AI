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
    <div className="p-6 lg:p-8 space-y-6 max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
            <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">RECOVERY CAMPAIGNS • {campaigns.length} TOTAL</span>
          </div>
          <h1 className="mt-4 text-[28px] font-[750] tracking-[-0.025em] leading-[1.05]">Recovery Campaigns</h1>
          <p className="mt-2 text-[13px] text-[#52525B]">Group opportunities, track actions, measure attributed recovered revenue. Manual action required — MVP does not auto-send.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inbox" className="h-[36px] inline-flex items-center rounded-[10px] border border-[#E4E4E7] bg-white px-4 text-[13px] font-[600] shadow-sm hover:bg-[#F9FAFB]">Recovery Inbox</Link>
          <Link href="/leads" className="h-[36px] inline-flex items-center rounded-[10px] bg-[#0A0A0B] px-4 text-[13px] font-[600] text-white shadow-sm hover:bg-[#1A1D23]">Select Leads →</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-5 shadow-premium"><div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">TOTAL CAMPAIGNS</div><div className="mt-2 text-[24px] font-[800] tracking-[-0.02em]">{campaigns.length}</div><div className="text-[11px] text-[#71717A] mt-1">{byStatus.DRAFT} draft • {byStatus.ACTIVE} active • {byStatus.COMPLETED} done</div></div>
        <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-5 shadow-premium"><div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">TARGET OPPORTUNITIES</div><div className="mt-2 text-[24px] font-[800] tracking-[-0.02em]">{campaignLeads.length}</div><div className="text-[11px] text-[#71717A] mt-1">Across all campaigns</div></div>
        <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-5 shadow-premium"><div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">CONTACTED</div><div className="mt-2 text-[24px] font-[800] tracking-[-0.02em]">{contacted}</div><div className="text-[11px] text-[#71717A] mt-1">{campaignLeads.length ? Math.round((contacted / campaignLeads.length) * 100) : 0}% of targets</div></div>
        <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-5 shadow-premium"><div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">RECOVERED</div><div className="mt-2 text-[24px] font-[800] tracking-[-0.02em]">{recovered}</div><div className="text-[11px] text-[#71717A] mt-1">{contacted ? Math.round((recovered / contacted) * 100) : 0}% of contacted</div></div>
        <div className="rounded-[16px] border border-[#059669]/20 bg-[#059669] p-5 text-white shadow-[0_8px_24px_rgba(5,150,105,0.2)]"><div className="text-[10px] font-[800] tracking-[0.08em] text-white/70">ATTRIBUTED REVENUE</div><div className="mt-2 font-mono-financial text-[22px] font-[850] tracking-[-0.02em]">₽{Math.round(totalRevenue).toLocaleString("ru-RU")}</div><div className="text-[11px] text-white/70 mt-1">Confirmed recovered</div></div>
      </div>

      <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium overflow-hidden">
        <div className="p-6 flex items-center justify-between border-b border-[#E4E4E7]/80">
          <h2 className="text-[14px] font-[700]">Campaigns</h2>
          <div className="text-[11px] text-[#71717A]">Manual action required — MVP does not auto-send</div>
        </div>
        <div className="p-4">
          {campaigns.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-12 w-12 rounded-[14px] bg-[#0A0A0B] text-white flex items-center justify-center font-[800]">C</div>
              <div className="mt-4 text-[14px] font-[700]">No campaigns yet</div>
              <div className="mt-2 text-[12px] text-[#71717A] max-w-[420px] mx-auto">Create a campaign from Recovery Inbox. Example: September dormant customers — category HIGH or CRITICAL, inactivity &gt;14 days, potential &gt;₽10k.</div>
              <div className="mt-6 flex justify-center gap-2">
                <Link href="/inbox" className="h-[36px] px-4 rounded-[10px] bg-[#0A0A0B] text-white text-[12px] font-[600] inline-flex items-center">Open Recovery Inbox</Link>
                <Link href="/leads" className="h-[36px] px-4 rounded-[10px] border bg-white text-[12px] font-[600] inline-flex items-center">View Leads</Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => {
                const targetCriteria = c.targetCriteria ? (typeof c.targetCriteria === "string" ? (()=>{try{return JSON.parse(c.targetCriteria)}catch{return null}})() : c.targetCriteria) : null;
                return (
                  <Link key={c.id} href={`/campaigns/${c.id}`} className="group flex items-center justify-between rounded-[14px] border border-[#E4E4E7]/80 p-4 hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/15 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-[650] text-[13px] tracking-[-0.01em] truncate">{c.name}</div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-[800] tracking-[0.04em] border ${c.status === "ACTIVE" || c.status === "active" ? "bg-[#059669] text-white border-[#059669]" : c.status === "COMPLETED" ? "bg-[#0A0A0B] text-white" : c.status === "PAUSED" ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-[#F4F4F5] text-[#52525B] border-[#E4E4E7]"}`}>{c.status.toUpperCase()}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-[#71717A] truncate">{c.description || "No description"} • {c._count.campaignLeads} leads • {new Date(c.createdAt).toLocaleDateString("ru-RU")}</div>
                      {targetCriteria && <div className="mt-2 flex gap-1.5 flex-wrap">{Object.entries(targetCriteria).slice(0, 3).map(([k, v]) => <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] text-[#52525B] font-[500]">{k}: {String(v)}</span>)}</div>}
                    </div>
                    <div className="text-[12px] text-[#A1A1AA] group-hover:text-[#0A0A0B] font-[600] ml-4">View →</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[20px] bg-[#0A0A0B] text-white p-6 shadow-premium-dark">
        <div className="grid md:grid-cols-3 gap-6 text-[12px]">
          <div><div className="font-[800] tracking-[0.08em] text-white/50 text-[10px]">CAMPAIGN WORKFLOW</div><div className="mt-3 space-y-1.5 font-mono text-white/70"><div>AI generates message →</div><div>User reviews & edits →</div><div>Mark as ready / manual send →</div><div>Record outcome →</div><div className="text-white font-[700]">Measure recovered revenue</div></div></div>
          <div><div className="font-[800] tracking-[0.08em] text-white/50 text-[10px]">SELECTION CRITERIA EXAMPLE</div><div className="mt-3 space-y-1 text-white/70"><div>• Category = HIGH or CRITICAL</div><div>• Inactivity &gt; 14 days</div><div>• Potential &gt; ₽10,000</div><div>• Not yet contacted</div></div></div>
          <div><div className="font-[800] tracking-[0.08em] text-white/50 text-[10px]">METRICS CALCULATED</div><div className="mt-3 space-y-1 text-white/70"><div>• Target opportunities</div><div>• Total deal value</div><div>• Est. recoverable revenue</div><div>• Contacted / Response / Recovered</div><div>• Confirmed recovered revenue</div></div></div>
        </div>
      </div>
    </div>
  );
}
