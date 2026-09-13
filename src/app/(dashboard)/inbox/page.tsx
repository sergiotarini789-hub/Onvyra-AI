export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logAudit } from "@/lib/audit";

export default async function InboxPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const orgId = session.organizationId;

  await logAudit({
    organizationId: orgId,
    userId: session.userId,
    event: "RECOVERY_INBOX_VIEWED",
    metadata: { filters: searchParams },
  });

  const category = searchParams.category || "all";
  const search = searchParams.search || "";
  const sortBy = searchParams.sortBy || "score";
  const statusFilter = searchParams.status || "all";
  const page = parseInt(searchParams.page || "1", 10);
  const pageSize = 20;

  // Build where for opportunities
  // We use AIAnalysis as primary source, but also check RecoveryOpportunity if exists
  let analysisWhere: any = { organizationId: orgId };
  if (category === "critical") analysisWhere.recoveryScore = { gte: 80 };
  else if (category === "high") analysisWhere.recoveryScore = { gte: 60, lt: 80 };
  else if (category === "medium") analysisWhere.recoveryScore = { gte: 40, lt: 60 };
  else if (category === "low") analysisWhere.recoveryScore = { lt: 40 };

  if (statusFilter === "contacted") analysisWhere.recommendedAction = { contains: "contacted" }; // simplified
  // For contacted/not contacted, we need to check recoveryEvents
  // We'll handle in JS

  let whereLead: any = { organizationId: orgId };
  if (search) {
    whereLead.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { company: { contains: search } },
      { product: { contains: search } },
    ];
  }

  let orderBy: any = { recoveryScore: "desc" };
  if (sortBy === "dealValue") orderBy = { lead: { dealValue: "desc" } };
  else if (sortBy === "potentialRevenue") orderBy = { recoveryScore: "desc" }; // we sort by score as proxy, revenue calc in JS
  else if (sortBy === "lastContactAt") orderBy = { lead: { lastContactAt: "asc" } };
  else if (sortBy === "score") orderBy = { recoveryScore: "desc" };

  const [analyses, total] = await Promise.all([
    prisma.aIAnalysis.findMany({
      where: { ...analysisWhere, lead: whereLead },
      include: { lead: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.aIAnalysis.count({ where: { ...analysisWhere, lead: whereLead } }),
  ]);

  // Fetch recovery events to determine contacted status
  const leadIds = analyses.map((a: any) => a.leadId);
  const events = await prisma.recoveryEvent.findMany({
    where: { organizationId: orgId, leadId: { in: leadIds } },
  });
  const contactedMap = new Map<string, boolean>();
  const recoveredMap = new Map<string, boolean>();
  for (const ev of events) {
    if (["CONTACTED", "REPLIED", "INTERESTED", "NEGOTIATING", "RECOVERED", "contacted", "responded", "interested", "negotiation", "won"].includes(ev.outcome)) {
      contactedMap.set(ev.leadId, true);
    }
    if (["RECOVERED", "won"].includes(ev.outcome)) {
      recoveredMap.set(ev.leadId, true);
    }
  }

  let filtered = analyses;
  if (statusFilter === "contacted") filtered = analyses.filter((a: any) => contactedMap.has(a.leadId));
  if (statusFilter === "not_contacted") filtered = analyses.filter((a: any) => !contactedMap.has(a.leadId));
  if (statusFilter === "recovered") filtered = analyses.filter((a: any) => recoveredMap.has(a.leadId));
  if (statusFilter === "not_recovered") filtered = analyses.filter((a: any) => !recoveredMap.has(a.leadId));

  // Group by category for default view
  const critical = filtered.filter((a: any) => a.recoveryScore >= 80);
  const high = filtered.filter((a: any) => a.recoveryScore >= 60 && a.recoveryScore < 80);
  const medium = filtered.filter((a: any) => a.recoveryScore >= 40 && a.recoveryScore < 60);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recovery Inbox</h1>
          <p className="text-sm text-slate-600 mt-1">Who should I contact first? Prioritized by score, potential revenue, and inactivity.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard" className="inline-flex h-9 items-center justify-center rounded-lg border bg-white px-4 text-sm">Dashboard</Link>
          <Link href="/leads" className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 text-white px-4 text-sm">View All Leads</Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-center">
            <form className="flex gap-2">
              <input name="search" defaultValue={search} placeholder="Search name, company, product..." className="h-9 w-64 rounded-lg border border-slate-200 px-3 text-sm" />
              <button type="submit" className="h-9 rounded-lg bg-slate-900 text-white px-4 text-sm">Search</button>
            </form>
            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { id: "all", label: "All" },
                { id: "critical", label: "Critical" },
                { id: "high", label: "High" },
                { id: "medium", label: "Medium" },
              ].map((f) => (
                <Link key={f.id} href={`/inbox?category=${f.id}&search=${search}&status=${statusFilter}&sortBy=${sortBy}`} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${category === f.id ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50"}`}>{f.label}</Link>
              ))}
            </div>
            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { id: "all", label: "All Status" },
                { id: "not_contacted", label: "Not Contacted" },
                { id: "contacted", label: "Contacted" },
                { id: "recovered", label: "Recovered" },
              ].map((f) => (
                <Link key={f.id} href={`/inbox?category=${category}&search=${search}&status=${f.id}&sortBy=${sortBy}`} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${statusFilter === f.id ? "bg-slate-900 text-white border-slate-900" : "bg-white"}`}>{f.label}</Link>
              ))}
            </div>
            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
            <div className="flex gap-1.5">
              {[
                { id: "score", label: "Score" },
                { id: "dealValue", label: "Deal Value" },
                { id: "lastContactAt", label: "Inactivity" },
              ].map((s) => (
                <Link key={s.id} href={`/inbox?category=${category}&search=${search}&status=${statusFilter}&sortBy=${s.id}`} className={`px-2.5 py-1.5 rounded-lg border text-xs ${sortBy === s.id ? "bg-slate-100 border-slate-300 font-medium" : "bg-white"}`}>{s.label}</Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Section */}
      {category === "all" || category === "critical" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-600"></div>
            <h2 className="font-bold text-sm tracking-wider uppercase">Critical — Contact Now</h2>
            <span className="text-xs text-slate-500">({critical.length} opportunities)</span>
          </div>
          {critical.length === 0 ? (
            <div className="text-xs text-slate-500 py-4">No critical opportunities for current filters.</div>
          ) : (
            <div className="grid gap-3">
              {critical.map((a: any) => (
                <InboxCard key={a.id} analysis={a} contacted={contactedMap.has(a.leadId)} recovered={recoveredMap.has(a.leadId)} />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* High Section */}
      {category === "all" || category === "high" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-orange-500"></div>
            <h2 className="font-bold text-sm tracking-wider uppercase">High Priority</h2>
            <span className="text-xs text-slate-500">({high.length})</span>
          </div>
          <div className="grid gap-3">
            {high.map((a: any) => (
              <InboxCard key={a.id} analysis={a} contacted={contactedMap.has(a.leadId)} recovered={recoveredMap.has(a.leadId)} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Medium or All list */}
      {(category === "all" || category === "medium") && medium.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500"></div>
            <h2 className="font-bold text-sm tracking-wider uppercase">Medium Priority</h2>
            <span className="text-xs text-slate-500">({medium.length})</span>
          </div>
          <div className="grid gap-3">
            {medium.slice(0, category === "medium" ? 20 : 5).map((a: any) => (
              <InboxCard key={a.id} analysis={a} contacted={contactedMap.has(a.leadId)} recovered={recoveredMap.has(a.leadId)} />
            ))}
          </div>
        </div>
      ) : null}

      {filtered.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-sm font-medium">No opportunities found</div>
            <div className="text-xs text-slate-500 mt-1">Try adjusting filters or import more data.</div>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/import" className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white">Import Data</Link>
              <Link href="/inbox" className="text-xs px-3 py-1.5 rounded-lg border">Clear Filters</Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center text-xs text-slate-500">
        <div>{total} total opportunities • Page {page} of {totalPages || 1}</div>
        <div className="flex gap-2">
          {page > 1 && <Link href={`/inbox?category=${category}&search=${search}&status=${statusFilter}&sortBy=${sortBy}&page=${page - 1}`} className="px-3 py-1.5 rounded-lg border bg-white">Previous</Link>}
          {page < totalPages && <Link href={`/inbox?category=${category}&search=${search}&status=${statusFilter}&sortBy=${sortBy}&page=${page + 1}`} className="px-3 py-1.5 rounded-lg border bg-white">Next</Link>}
        </div>
      </div>
    </div>
  );
}

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && v.toNumber) return v.toNumber();
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function calcPotential(dealValue: any, prob: any): number | null {
  const dv = toNum(dealValue);
  if (dv === null || prob === null || prob === undefined) return null;
  if (dv < 0 || prob < 0 || prob > 1) return null;
  const cents = Math.round(dv * 100);
  return Math.round(cents * prob) / 100;
}

function InboxCard({ analysis, contacted, recovered }: { analysis: any; contacted: boolean; recovered: boolean }) {
  const lead = analysis.lead;
  const factors = analysis.factors || [];
  const potentialRevenue = calcPotential(lead.dealValue, analysis.recoveryProbability);

  return (
    <Card className={`hover:shadow-md transition ${recovered ? "border-emerald-200 bg-emerald-50/30" : contacted ? "border-blue-200 bg-blue-50/20" : ""}`}>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/leads/${lead.id}`} className="font-semibold text-sm hover:underline">{lead.name || "Unnamed"}</Link>
              {lead.isDemo && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border">DEMO</span>}
              <Badge variant={analysis.recoveryScore >= 80 ? "critical" : analysis.recoveryScore >= 60 ? "high" : "medium"}>{analysis.recoveryScore}</Badge>
              {contacted && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">CONTACTED</span>}
              {recovered && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">RECOVERED</span>}
              <span className="text-xs text-slate-500">{lead.company || ""}</span>
            </div>

            <div className="mt-2 flex flex-wrap gap-4 text-xs">
              <span><span className="text-slate-500">Deal:</span> <span className="font-medium">₽{toNum(lead.dealValue) ? Math.round(toNum(lead.dealValue)!).toLocaleString("ru-RU") : "—"}</span></span>
              <span><span className="text-slate-500">Estimated recoverable:</span> <span className="font-bold">{potentialRevenue ? `₽${Math.round(potentialRevenue).toLocaleString("ru-RU")}` : "—"}</span> <span className="text-[10px] text-slate-400">Est. not guaranteed</span></span>
              <span><span className="text-slate-500">Prob:</span> {analysis.recoveryProbability ? `${Math.round(analysis.recoveryProbability * 100)}%` : "—"} • {analysis.confidence}</span>
              <span><span className="text-slate-500">Last contact:</span> {lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleDateString("ru-RU") : "—"}</span>
            </div>

            <div className="mt-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Why:</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(factors.length > 0 ? factors : [{ explanation: analysis.reasoningSummary }]).slice(0, 4).map((f: any, i: number) => (
                  <span key={i} className={`text-[11px] px-2 py-1 rounded-full border ${f.type === "negative" ? "bg-red-50 border-red-200 text-red-700" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
                    {f.explanation || f.raw || "Signal"}
                  </span>
                ))}
              </div>
              {analysis.reasoningSummary && factors.length === 0 && (
                <div className="mt-2 text-xs text-slate-600 bg-slate-50 border rounded p-2">{analysis.reasoningSummary}</div>
              )}
            </div>

            <div className="mt-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Recommended Action:</div>
              <div className="mt-1 text-xs font-medium">{analysis.recommendedAction?.replace("_", " ")} • {analysis.recommendedMessageGoal}</div>
            </div>
          </div>

          <div className="flex md:flex-col gap-2 shrink-0">
            <Link href={`/leads/${lead.id}`} className="h-8 px-3 inline-flex items-center justify-center rounded-lg bg-slate-900 text-white text-xs font-medium">View</Link>
            <form action={`/api/leads/${lead.id}/outcome`} method="post" className="inline">
              <input type="hidden" name="outcome" value="CONTACTED" />
              <button type="submit" className="h-8 px-3 rounded-lg border bg-white text-xs font-medium hover:bg-slate-50">Mark Contacted</button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
