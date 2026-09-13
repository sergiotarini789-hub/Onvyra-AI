export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { logAudit } from "@/lib/audit";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const orgId = session.organizationId;

  const [
    totalLeads,
    demoLeadsCount,
    analyses,
    recoveryEvents,
    opportunities,
    campaigns,
    auditLogs,
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
    prisma.recoveryOpportunity.findMany({ where: { organizationId: orgId }, include: { lead: true } }).catch(() => [] as any[]),
    prisma.campaign.findMany({ where: { organizationId: orgId } }),
    prisma.auditLog.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, take: 10 }).catch(() => [] as any[]),
  ]);

  const potentialRevenue = analyses.reduce((sum, a) => {
    if (a.recoveryProbability && a.lead.dealValue) return sum + a.lead.dealValue * a.recoveryProbability;
    return sum;
  }, 0);

  const highConfidenceRevenue = analyses
    .filter((a) => a.confidence === "high" && a.recoveryProbability && a.recoveryProbability >= 0.6)
    .reduce((sum, a) => sum + (a.lead.dealValue || 0) * (a.recoveryProbability || 0), 0);

  const confirmedRevenue = recoveryEvents
    .filter((e) => e.outcome === "RECOVERED" || e.outcome === "won")
    .reduce((sum, e) => sum + (e.revenue || 0), 0);

  const recoveredCount = recoveryEvents.filter((e) => e.outcome === "RECOVERED" || e.outcome === "won").length;
  const contactedCount = recoveryEvents.filter((e) => ["CONTACTED", "REPLIED", "INTERESTED", "NEGOTIATING", "RECOVERED", "contacted", "responded", "interested", "negotiation", "won"].includes(e.outcome)).length;
  const repliedCount = recoveryEvents.filter((e) => ["REPLIED", "INTERESTED", "NEGOTIATING", "RECOVERED", "responded", "interested", "negotiation", "won"].includes(e.outcome)).length;

  const criticalCount = analyses.filter((a) => a.recoveryScore >= 80).length;
  const highCount = analyses.filter((a) => a.recoveryScore >= 60 && a.recoveryScore < 80).length;
  const mediumCount = analyses.filter((a) => a.recoveryScore >= 40 && a.recoveryScore < 60).length;
  const lowCount = analyses.filter((a) => a.recoveryScore < 40).length;

  const priorityLeads = analyses.filter((a) => a.recoveryScore >= 60).slice(0, 8);

  const recoveryRate = totalLeads > 0 ? (recoveredCount / totalLeads) * 100 : 0;
  const contactRate = analyses.length > 0 ? (contactedCount / analyses.length) * 100 : 0;

  // Funnel
  const funnel = {
    opportunities: analyses.length,
    contacted: contactedCount,
    replied: repliedCount,
    recovered: recoveredCount,
    revenue: confirmedRevenue,
  };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Where should I recover revenue today?</h1>
          <p className="text-sm text-slate-600 mt-1">Prioritized by Recovery Score, probability, and estimated recoverable revenue. Potential ≠ Confirmed.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inbox" className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">Recovery Inbox</Link>
          <Link href="/import" className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium hover:bg-slate-50">Import</Link>
        </div>
      </div>

      {demoLeadsCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm flex items-center justify-between">
          <div><span className="font-bold">DEMO DATA</span> — {demoLeadsCount} demo leads. Metrics calculated from actual demo dataset, not hardcoded. Potential ≠ real revenue.</div>
          <Link href="/leads" className="text-xs font-bold underline">View demo leads</Link>
        </div>
      )}

      {/* Primary business outcome metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Recoverable Revenue</span>
              <span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">ESTIMATED • NOT GUARANTEED</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <div className="text-4xl font-bold tracking-tight">₽{Math.round(potentialRevenue).toLocaleString("ru-RU")}</div>
              <div className="text-sm text-slate-500">{analyses.length} opportunities</div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
              <div className="rounded-lg bg-slate-50 border p-3">
                <div className="text-slate-500 uppercase text-[11px] font-bold">High Confidence</div>
                <div className="mt-1 font-bold text-sm">₽{Math.round(highConfidenceRevenue).toLocaleString("ru-RU")}</div>
                <div className="text-emerald-600 text-[11px] mt-1">60%+ prob • High confidence</div>
              </div>
              <div className="rounded-lg bg-slate-50 border p-3">
                <div className="text-slate-500 uppercase text-[11px] font-bold">Avg Probability</div>
                <div className="mt-1 font-bold text-sm">{analyses.length > 0 ? Math.round(analyses.reduce((s, a) => s + (a.recoveryProbability || 0), 0) / analyses.length * 100) : 0}%</div>
                <div className="text-slate-500 text-[11px] mt-1">Across analyzed</div>
              </div>
              <div className="rounded-lg bg-slate-50 border p-3">
                <div className="text-slate-500 uppercase text-[11px] font-bold">Priority</div>
                <div className="mt-1 font-bold text-sm">{criticalCount + highCount} leads</div>
                <div className="text-slate-500 text-[11px] mt-1">{criticalCount} critical • {highCount} high</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-300 bg-emerald-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between">
              <span>Recovered Revenue</span>
              <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-600 text-white">CONFIRMED</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <div className="text-4xl font-bold tracking-tight text-emerald-900">₽{Math.round(confirmedRevenue).toLocaleString("ru-RU")}</div>
              <div className="text-sm text-emerald-700">{recoveredCount} recovered</div>
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-600">Recovery Rate</span><span className="font-bold">{recoveryRate.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Contact Rate</span><span className="font-bold">{contactRate.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Campaigns</span><span className="font-bold">{campaigns.length}</span></div>
              <div className="pt-3 mt-3 border-t border-emerald-200">
                <div className="text-[11px] text-emerald-700 font-medium">Attributed recovered revenue — only counted when you record RECOVERED with actual amount. Onvyra finds, your team recovers.</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">Priority Opportunities <span className="text-xs font-normal text-slate-500">— Who should I contact first?</span></CardTitle>
            <Link href="/inbox" className="text-xs font-bold text-slate-900 underline">Open Recovery Inbox →</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {priorityLeads.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-sm font-medium">No priority leads yet</div>
                <div className="mt-2 text-xs text-slate-500">Import your pipeline or load demo to see where you are leaving money behind.</div>
                <div className="mt-4 flex justify-center gap-2">
                  <Link href="/import" className="text-xs px-4 py-2 rounded-lg bg-slate-900 text-white font-medium">Import CSV/XLSX</Link>
                  <Link href="/inbox" className="text-xs px-4 py-2 rounded-lg border font-medium">Recovery Inbox</Link>
                </div>
              </div>
            ) : (
              priorityLeads.map((a) => (
                <Link key={a.id} href={`/leads/${a.leadId}`} className="group flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:bg-slate-50 hover:border-slate-300 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">{(a.lead.name || "U")[0].toUpperCase()}</div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <span className="truncate">{a.lead.name || "Unnamed"}</span>
                        {a.lead.isDemo && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border">DEMO</span>}
                        <span className="hidden md:inline text-xs font-normal text-slate-500">• {a.lead.company || ""}</span>
                      </div>
                      <div className="text-xs text-slate-600 truncate max-w-[320px] mt-0.5">{a.reasoningSummary}</div>
                      <div className="mt-1.5 flex gap-1.5 flex-wrap">
                        {(a.factors ? (typeof a.factors === "string" ? (()=>{try{return JSON.parse(a.factors)}catch{return []}})() : a.factors) : []).slice(0, 2).map((f: any, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border text-slate-600">{f.explanation || f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <div className="text-sm font-bold">₽{a.lead.dealValue ? Math.round(a.lead.dealValue).toLocaleString("ru-RU") : "—"}</div>
                      <div className="text-[11px] text-slate-500">Est. recoverable: <span className="font-bold text-slate-700">₽{a.lead.dealValue && a.recoveryProbability ? Math.round(a.lead.dealValue * a.recoveryProbability).toLocaleString() : "—"}</span></div>
                      <div className="text-[11px] text-slate-500">{a.recoveryProbability ? `${Math.round(a.recoveryProbability * 100)}% prob` : "no prob"} • {a.confidence}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={a.recoveryScore >= 80 ? "critical" : a.recoveryScore >= 60 ? "high" : "medium"}>{a.recoveryScore}</Badge>
                      <span className="text-[10px] font-medium text-slate-500">{a.recoveryScore >= 80 ? "CRITICAL" : a.recoveryScore >= 60 ? "HIGH" : "MEDIUM"}</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Recovery Pipeline</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-600"></span>Critical (80-100)</span><span className="font-bold">{criticalCount}</span></div>
                <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-red-600 h-1.5 rounded-full" style={{ width: `${totalLeads ? (criticalCount / totalLeads) * 100 : 0}%` }}></div></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-orange-500"></span>High (60-79)</span><span className="font-bold">{highCount}</span></div>
                <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${totalLeads ? (highCount / totalLeads) * 100 : 0}%` }}></div></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>Medium (40-59)</span><span className="font-bold">{mediumCount}</span></div>
                <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${totalLeads ? (mediumCount / totalLeads) * 100 : 0}%` }}></div></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-300"></span>Low (0-39)</span><span className="font-bold">{lowCount}</span></div>
                <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-slate-300 h-1.5 rounded-full" style={{ width: `${totalLeads ? (lowCount / totalLeads) * 100 : 0}%` }}></div></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Revenue Attribution Funnel</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs space-y-2">
                <div className="flex justify-between items-center"><span>{funnel.opportunities} opportunities</span><span className="font-bold">100%</span></div>
                <div className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-500"></span>{funnel.contacted} contacted</span><span className="font-bold">{funnel.opportunities ? Math.round((funnel.contacted / funnel.opportunities) * 100) : 0}%</span></div>
                <div className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500"></span>{funnel.replied} replied</span><span className="font-bold">{funnel.opportunities ? Math.round((funnel.replied / funnel.opportunities) * 100) : 0}%</span></div>
                <div className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500"></span>{funnel.recovered} recovered</span><span className="font-bold">{funnel.opportunities ? Math.round((funnel.recovered / funnel.opportunities) * 100) : 0}%</span></div>
                <div className="border-t pt-2 mt-2 flex justify-between items-center font-bold"><span>₽{Math.round(funnel.revenue).toLocaleString()} recovered</span><span className="text-[10px] font-normal text-slate-500">Attributed</span></div>
              </div>
              <div className="text-[11px] text-slate-500">Funnel from potential → contacted → recovered. We track what you record, not what we assume.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Next Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span>Follow up now</span><span className="font-bold">{analyses.filter((a) => a.recommendedAction === "follow_up_now").length}</span></div>
              <div className="flex justify-between"><span>Follow up later</span><span className="font-bold">{analyses.filter((a) => a.recommendedAction === "follow_up_later").length}</span></div>
              <div className="flex justify-between"><span>Qualify</span><span className="font-bold">{analyses.filter((a) => a.recommendedAction === "qualify").length}</span></div>
              <div className="flex justify-between"><span>No action</span><span className="font-bold text-slate-500">{analyses.filter((a) => a.recommendedAction === "no_action").length}</span></div>
              <div className="pt-3 space-y-2">
                <Link href="/inbox?category=critical" className="block text-xs font-bold text-white bg-slate-900 rounded-lg px-3 py-2 text-center">Open Recovery Inbox →</Link>
                <Link href="/leads?category=no_follow_up" className="block text-xs font-medium text-slate-700 underline text-center">View no follow-up leads</Link>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-white border-slate-900">
            <CardContent className="pt-6">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">How Scoring Works</div>
              <div className="mt-3 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between"><span>+20 explicit intent</span><span className="text-slate-500">purchase</span></div>
                <div className="flex justify-between"><span>+15 product relevance</span><span className="text-slate-500">specific</span></div>
                <div className="flex justify-between"><span>+15 price requested</span><span className="text-slate-500">quotation</span></div>
                <div className="flex justify-between"><span>+10 proposal sent</span><span className="text-slate-500">follow-up</span></div>
                <div className="flex justify-between"><span>+10 high value</span><span className="text-slate-500">deal</span></div>
                <div className="flex justify-between"><span>+5 think signal</span><span className="text-slate-500">timing</span></div>
                <div className="flex justify-between text-red-300"><span>-50 already won</span><span>exclude</span></div>
                <div className="flex justify-between text-red-300"><span>-40 explicit rejection</span><span>exclude</span></div>
                <div className="border-t border-white/20 pt-2 mt-2 text-white font-bold">Explainable • Auditable • No black box</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
