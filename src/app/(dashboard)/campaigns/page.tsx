export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function CampaignsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: session.organizationId },
    include: { _count: { select: { campaignLeads: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Enhanced metrics
  const campaignLeads = await prisma.campaignLead.findMany({
    where: { organizationId: session.organizationId },
  });

  const totalRevenue = campaignLeads.filter((cl) => cl.outcome === "RECOVERED" || cl.outcome === "won").reduce((s, cl) => s + (cl.revenue || 0), 0);
  const contacted = campaignLeads.filter((cl) => cl.status === "contacted" || cl.contactedAt).length;
  const responded = campaignLeads.filter((cl) => cl.response || cl.status === "response").length;
  const recovered = campaignLeads.filter((cl) => cl.outcome === "RECOVERED" || cl.outcome === "won").length;

  const byStatus = {
    DRAFT: campaigns.filter((c) => c.status === "DRAFT" || c.status === "draft").length,
    ACTIVE: campaigns.filter((c) => c.status === "ACTIVE" || c.status === "active").length,
    PAUSED: campaigns.filter((c) => c.status === "PAUSED").length,
    COMPLETED: campaigns.filter((c) => c.status === "COMPLETED").length,
  };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recovery Campaigns</h1>
          <p className="text-sm text-slate-600 mt-1">Group opportunities, track actions, measure attributed recovered revenue.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inbox"><Button variant="outline">Recovery Inbox</Button></Link>
          <Link href="/leads"><Button>Select Leads</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-slate-500">Total Campaigns</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{campaigns.length}</div><div className="text-[11px] text-slate-500 mt-1">{byStatus.DRAFT} draft • {byStatus.ACTIVE} active • {byStatus.COMPLETED} completed</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-slate-500">Target Opportunities</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{campaignLeads.length}</div><div className="text-[11px] text-slate-500 mt-1">Across all campaigns</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-slate-500">Contacted</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{contacted}</div><div className="text-[11px] text-slate-500 mt-1">{campaignLeads.length ? Math.round((contacted / campaignLeads.length) * 100) : 0}% of targets</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-slate-500">Recovered</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{recovered}</div><div className="text-[11px] text-slate-500 mt-1">{contacted ? Math.round((recovered / contacted) * 100) : 0}% of contacted</div></CardContent></Card>
        <Card className="border-emerald-200 bg-emerald-50/50"><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-emerald-700">Attributed Revenue</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-900">₽{Math.round(totalRevenue).toLocaleString("ru-RU")}</div><div className="text-[11px] text-emerald-700 mt-1">Confirmed recovered</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Campaigns</CardTitle>
          <div className="text-[11px] text-slate-500">Manual action required — MVP does not auto-send</div>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto max-w-md">
                <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto font-bold">C</div>
                <div className="mt-4 text-sm font-bold">No campaigns yet</div>
                <div className="mt-2 text-xs text-slate-500">Create a campaign from Recovery Inbox. Example: September dormant customers — category HIGH or CRITICAL, inactivity &gt;14 days, potential &gt;₽10k.</div>
                <div className="mt-6 flex justify-center gap-2">
                  <Link href="/inbox" className="text-xs px-4 py-2 rounded-lg bg-slate-900 text-white font-medium">Open Recovery Inbox</Link>
                  <Link href="/leads" className="text-xs px-4 py-2 rounded-lg border font-medium">View Leads</Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => {
                const targetCriteria = c.targetCriteria ? (typeof c.targetCriteria === "string" ? (()=>{try{return JSON.parse(c.targetCriteria)}catch{return null}})() : c.targetCriteria) : null;
                return (
                  <Link key={c.id} href={`/campaigns/${c.id}`} className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:bg-slate-50 hover:border-slate-300 transition">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-sm truncate">{c.name}</div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${c.status === "ACTIVE" || c.status === "active" ? "bg-emerald-600 text-white border-emerald-600" : c.status === "COMPLETED" ? "bg-slate-900 text-white" : c.status === "PAUSED" ? "bg-amber-500 text-white border-amber-500" : "bg-slate-100 text-slate-600"}`}>{c.status.toUpperCase()}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 truncate">{c.description || "No description"} • {c._count.campaignLeads} leads • {new Date(c.createdAt).toLocaleDateString("ru-RU")}</div>
                      {targetCriteria && <div className="mt-2 flex gap-1.5 flex-wrap">{Object.entries(targetCriteria).slice(0, 3).map(([k, v]) => <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border">{k}: {String(v)}</span>)}</div>}
                    </div>
                    <div className="text-xs text-slate-400 group-hover:text-slate-900">View →</div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900 text-white border-slate-900">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-6 text-xs">
            <div>
              <div className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">Campaign Workflow</div>
              <div className="mt-3 space-y-1.5 font-mono text-slate-300">
                <div>AI generates message →</div>
                <div>User reviews & edits →</div>
                <div>Mark as ready / manual send →</div>
                <div>Record outcome →</div>
                <div className="text-white font-bold">Measure recovered revenue</div>
              </div>
            </div>
            <div>
              <div className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">Selection Criteria Example</div>
              <div className="mt-3 space-y-1 text-slate-300">
                <div>• Category = HIGH or CRITICAL</div>
                <div>• Inactivity &gt; 14 days</div>
                <div>• Potential &gt; ₽10,000</div>
                <div>• Not yet contacted</div>
              </div>
            </div>
            <div>
              <div className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">Metrics Calculated</div>
              <div className="mt-3 space-y-1 text-slate-300">
                <div>• Target opportunities</div>
                <div>• Total deal value</div>
                <div>• Est. recoverable revenue</div>
                <div>• Contacted / Response / Recovered</div>
                <div>• Confirmed recovered revenue</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
