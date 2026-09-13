export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const totalOpportunities = analyses.length;
  const contacted = events.filter((e) => ["CONTACTED", "REPLIED", "INTERESTED", "NEGOTIATING", "RECOVERED", "contacted", "responded", "interested", "negotiation", "won"].includes(e.outcome)).length;
  const responded = events.filter((e) => ["REPLIED", "INTERESTED", "NEGOTIATING", "RECOVERED", "responded", "interested", "negotiation", "won"].includes(e.outcome)).length;
  const recovered = events.filter((e) => e.outcome === "RECOVERED" || e.outcome === "won").length;
  const confirmedRevenue = events.filter((e) => e.outcome === "RECOVERED" || e.outcome === "won").reduce((s, e) => s + (e.revenue || 0), 0);
  const potentialRevenue = analyses.reduce((s, a) => {
    const lead = leads.find((l) => l.id === a.leadId);
    if (lead?.dealValue && a.recoveryProbability) return s + lead.dealValue * a.recoveryProbability;
    return s;
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
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-600 mt-1">Real data only — no fake historical charts. Estimated vs confirmed clearly separated.</p>
        </div>
        <Link href="/dashboard" className="text-xs px-3 py-1.5 rounded-lg border bg-white">Back to Dashboard</Link>
      </div>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-slate-500">Total Opportunities</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totalOpportunities}</div><div className="text-[11px] text-slate-500 mt-1">{leads.length} leads total</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-slate-500">Contacted</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{contacted}</div><div className="text-[11px] text-slate-500 mt-1">{totalOpportunities ? Math.round((contacted / totalOpportunities) * 100) : 0}% of opportunities</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-slate-500">Response Rate</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{responseRate.toFixed(1)}%</div><div className="text-[11px] text-slate-500 mt-1">{responded} responded</div></CardContent></Card>
        <Card className="border-emerald-200 bg-emerald-50/50"><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-emerald-700">Recovery Rate</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-900">{recoveryRate.toFixed(1)}%</div><div className="text-[11px] text-emerald-700 mt-1">{recovered} recovered</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-900">
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Revenue — Estimated vs Confirmed</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-slate-900 text-white p-4">
                <div className="text-[11px] uppercase font-bold text-slate-400">Estimated Recoverable</div>
                <div className="text-2xl font-bold mt-1">₽{Math.round(potentialRevenue).toLocaleString("ru-RU")}</div>
                <div className="text-[11px] text-slate-400 mt-1">Est. • Not guaranteed</div>
              </div>
              <div className="rounded-xl bg-emerald-600 text-white p-4">
                <div className="text-[11px] uppercase font-bold text-emerald-100">Confirmed Recovered</div>
                <div className="text-2xl font-bold mt-1">₽{Math.round(confirmedRevenue).toLocaleString("ru-RU")}</div>
                <div className="text-[11px] text-emerald-100 mt-1">Attributed • Actual</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500">Potential ≠ Confirmed. Only counted when you record RECOVERED with actual amount. Onvyra finds, your team recovers.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Recovery Funnel — Real Data</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-400"></span>{totalOpportunities} opportunities</span><span className="font-bold">100%</span></div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-blue-50 border border-blue-100"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-500"></span>{contacted} contacted</span><span className="font-bold">{totalOpportunities ? Math.round((contacted / totalOpportunities) * 100) : 0}%</span></div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-amber-50 border border-amber-100"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500"></span>{responded} responded</span><span className="font-bold">{contacted ? Math.round((responded / contacted) * 100) : 0}% of contacted</span></div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-emerald-50 border border-emerald-200"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-600"></span>{recovered} recovered</span><span className="font-bold">{responded ? Math.round((recovered / responded) * 100) : 0}% of responded</span></div>
            </div>
            {totalOpportunities === 0 && <div className="text-xs text-slate-500 py-4 text-center">No opportunities yet — import data to see funnel</div>}
            <div className="text-[11px] text-slate-500">Funnel from real recovery events. No invented trend data. If stage has no data, shows zero.</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">By Priority</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-600"></span>Critical</span><span className="font-bold">{byPriority.critical}</span></div>
            <div className="flex justify-between"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-500"></span>High</span><span className="font-bold">{byPriority.high}</span></div>
            <div className="flex justify-between"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500"></span>Medium</span><span className="font-bold">{byPriority.medium}</span></div>
            <div className="flex justify-between"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-300"></span>Low</span><span className="font-bold">{byPriority.low}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">By Source</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.keys(bySource).length === 0 ? <div className="text-xs text-slate-500">No source data</div> : Object.entries(bySource).slice(0, 8).map(([k, v]: any) => (
              <div key={k} className="flex justify-between"><span className="truncate">{k}</span><span className="font-bold">{v}</span></div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">By Campaign</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {campaigns.length === 0 ? <div className="text-xs text-slate-500">No campaigns yet</div> : campaigns.slice(0, 8).map((c) => {
              const count = campaignLeads.filter((cl) => cl.campaignId === c.id).length;
              return <div key={c.id} className="flex justify-between"><span className="truncate">{c.name}</span><span className="font-bold">{count}</span></div>;
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">By Deal Stage</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.keys(byStage).length === 0 ? <div className="text-xs text-slate-500">No stage data</div> : Object.entries(byStage).slice(0, 8).map(([k, v]: any) => (
              <div key={k} className="flex justify-between"><span className="truncate">{k}</span><span className="font-bold">{v}</span></div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">By Product</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.keys(byProduct).length === 0 ? <div className="text-xs text-slate-500">No product data</div> : Object.entries(byProduct).slice(0, 8).map(([k, v]: any) => (
              <div key={k} className="flex justify-between"><span className="truncate">{k}</span><span className="font-bold">{v}</span></div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">By Manager</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.keys(byManager).length === 0 ? <div className="text-xs text-slate-500 py-4 text-center">No manager data in imported records<br /><span className="text-[11px]">Add manager column to see breakdown</span></div> : Object.entries(byManager).slice(0, 8).map(([k, v]: any) => (
              <div key={k} className="flex justify-between"><span className="truncate">{k}</span><span className="font-bold">{v}</span></div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 text-white border-slate-900">
        <CardContent className="pt-6">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Analytics Principles</div>
          <div className="mt-3 grid md:grid-cols-3 gap-4 text-xs text-slate-300">
            <div>• Only real data from your organization — no fake charts, no invented trends</div>
            <div>• Estimated recoverable ≠ Confirmed recovered — clearly separated everywhere</div>
            <div>• If historical data insufficient: No historical trend available yet — not fake lines</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
