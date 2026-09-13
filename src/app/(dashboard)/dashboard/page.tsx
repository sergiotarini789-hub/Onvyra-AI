export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ] = await Promise.all([
    prisma.lead.count({ where: { organizationId: orgId } }),
    prisma.lead.count({ where: { organizationId: orgId, isDemo: true } }),
    prisma.aIAnalysis.findMany({
      where: { organizationId: orgId },
      orderBy: { recoveryScore: "desc" },
      take: 1000,
      include: { lead: true },
    }),
    prisma.recoveryEvent.findMany({
      where: { organizationId: orgId, outcome: "won" },
    }),
  ]);

  // Calculate metrics
  const potentialRevenue = analyses.reduce((sum, a) => {
    if (a.recoveryProbability && a.lead.dealValue) {
      return sum + (a.lead.dealValue * a.recoveryProbability);
    }
    return sum;
  }, 0);

  const highConfidenceRevenue = analyses
    .filter((a) => a.confidence === "high" && a.recoveryProbability && a.recoveryProbability >= 0.6)
    .reduce((sum, a) => sum + (a.lead.dealValue || 0) * (a.recoveryProbability || 0), 0);

  const confirmedRevenue = recoveryEvents.reduce((sum, e) => sum + (e.revenue || 0), 0);

  const priorityLeads = analyses
    .filter((a) => a.recoveryScore >= 60)
    .slice(0, 10);

  const criticalCount = analyses.filter((a) => a.recoveryScore >= 80).length;
  const highCount = analyses.filter((a) => a.recoveryScore >= 60 && a.recoveryScore < 80).length;

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Where should I recover revenue today?</h1>
          <p className="text-sm text-slate-600 mt-1">Prioritized by Recovery Score, probability, and potential revenue.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/import" className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">Import Leads</Link>
          <Link href="/leads" className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium hover:bg-slate-50">View All Leads</Link>
        </div>
      </div>

      {demoLeadsCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm flex items-center justify-between">
          <div><span className="font-semibold">DEMO DATA</span> — {demoLeadsCount} demo leads loaded. Potential revenue shown is not real revenue.</div>
          <Link href="/leads" className="text-xs font-medium underline">View demo leads</Link>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">Potential Recoverable</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₽{Math.round(potentialRevenue).toLocaleString("ru-RU")}</div>
            <div className="text-xs text-slate-500 mt-1">Est. • Not guaranteed</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">High Confidence</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₽{Math.round(highConfidenceRevenue).toLocaleString("ru-RU")}</div>
            <div className="text-xs text-emerald-600 mt-1">High confidence • 60%+ prob</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">Priority Leads</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalCount + highCount}</div>
            <div className="text-xs text-slate-500 mt-1">{criticalCount} critical • {highCount} high</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">Leads Analyzed</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyses.length}</div>
            <div className="text-xs text-slate-500 mt-1">of {totalLeads} total</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Confirmed Recovered</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">₽{Math.round(confirmedRevenue).toLocaleString("ru-RU")}</div>
            <div className="text-xs text-emerald-700 mt-1">{recoveryEvents.length} deals won</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority list */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Priority Opportunities</CardTitle>
            <Link href="/leads?category=critical" className="text-xs font-medium text-slate-600 hover:text-slate-900">View critical →</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {priorityLeads.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-sm text-slate-500">No priority leads yet.</div>
                <div className="mt-2 text-xs text-slate-400">Import your CRM data or seed demo to see recovery opportunities.</div>
                <div className="mt-4 flex justify-center gap-2">
                  <Link href="/import" className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white">Import CSV/XLSX</Link>
                  <form action="/api/demo/seed" method="post">
                    <button className="text-xs px-3 py-1.5 rounded-lg border">Load Demo (1,000 leads)</button>
                  </form>
                </div>
              </div>
            ) : (
              priorityLeads.map((a) => (
                <Link key={a.id} href={`/leads/${a.leadId}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium">
                      {(a.lead.name || "U")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        {a.lead.name || "Unnamed"}
                        {a.lead.isDemo && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">DEMO</span>}
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-[260px]">{a.reasoningSummary}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-sm font-semibold">₽{a.lead.dealValue ? Math.round(a.lead.dealValue).toLocaleString("ru-RU") : "—"}</div>
                      <div className="text-xs text-slate-500">{a.recoveryProbability ? `${Math.round(a.recoveryProbability * 100)}% probability` : "no prob"}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={a.recoveryScore >= 80 ? "critical" : a.recoveryScore >= 60 ? "high" : "medium"}>{a.recoveryScore}</Badge>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${a.confidence === "high" ? "bg-emerald-100 text-emerald-700" : a.confidence === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{a.confidence.toUpperCase()}</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Breakdown */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Score Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-600"></span>Critical (80-100)</span><span className="font-medium">{criticalCount}</span></div>
              <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-500"></span>High (60-79)</span><span className="font-medium">{highCount}</span></div>
              <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500"></span>Medium (40-59)</span><span className="font-medium">{analyses.filter(a=>a.recoveryScore>=40 && a.recoveryScore<60).length}</span></div>
              <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-300"></span>Low (0-39)</span><span className="font-medium">{analyses.filter(a=>a.recoveryScore<40).length}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Next Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Follow up now</span><span className="font-medium">{analyses.filter(a=>a.recommendedAction==="follow_up_now").length}</span></div>
              <div className="flex justify-between"><span>Follow up later</span><span className="font-medium">{analyses.filter(a=>a.recommendedAction==="follow_up_later").length}</span></div>
              <div className="flex justify-between"><span>No action</span><span className="font-medium">{analyses.filter(a=>a.recommendedAction==="no_action").length}</span></div>
              <div className="pt-3">
                <Link href="/leads?category=no_follow_up" className="text-xs font-medium text-slate-900 underline">View no follow-up leads →</Link>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 text-white border-slate-900">
            <CardContent className="pt-6">
              <div className="text-sm font-medium">How scoring works</div>
              <div className="mt-3 space-y-1.5 text-xs text-slate-300 font-mono">
                <div>+20 explicit interest</div>
                <div>+15 product mentioned</div>
                <div>+15 price requested</div>
                <div>+10 proposal sent</div>
                <div>+10 replied after proposal</div>
                <div>+10 high value</div>
                <div className="text-red-300">-50 already won</div>
                <div className="text-red-300">-40 explicit rejection</div>
                <div className="border-t border-white/20 pt-2 mt-2 text-white">Clamped 0–100 • Auditable</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
