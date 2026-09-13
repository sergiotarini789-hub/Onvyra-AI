export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function LeadsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const orgId = session.organizationId;

  const search = searchParams.search || "";
  const category = searchParams.category || "all";
  const sortBy = searchParams.sortBy || "recoveryScore";
  const sortOrder = searchParams.sortOrder || "desc";
  const page = parseInt(searchParams.page || "1", 10);
  const pageSize = 20;

  // Build where clause for leads with analyses
  let whereLead: any = { organizationId: orgId };
  if (search) {
    whereLead.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { company: { contains: search } },
      { product: { contains: search } },
    ];
  }

  // For category filters, we need to filter on AIAnalysis
  let analysisWhere: any = { organizationId: orgId };
  if (category === "critical") analysisWhere.recoveryScore = { gte: 80 };
  else if (category === "high") analysisWhere.recoveryScore = { gte: 60, lt: 80 };
  else if (category === "medium") analysisWhere.recoveryScore = { gte: 40, lt: 60 };
  else if (category === "high_confidence") analysisWhere.confidence = "high";
  else if (category === "no_follow_up") analysisWhere.lossReason = "no_follow_up";
  else if (category === "high_value") {
    // will filter via lead.dealValue later
  } else if (category === "no_response") analysisWhere.lossReason = "no_response";

  // Get analyses with lead
  const orderFieldMap: Record<string, string> = {
    recoveryScore: "recoveryScore",
    potentialRevenue: "recoveryScore", // fallback, we sort by score then calculate
    dealValue: "lead.dealValue",
    lastContactAt: "lead.lastContactAt",
    createdAt: "createdAt",
  };

  let orderBy: any = { recoveryScore: "desc" };
  if (sortBy === "dealValue") orderBy = { lead: { dealValue: sortOrder } };
  else if (sortBy === "lastContactAt") orderBy = { lead: { lastContactAt: sortOrder } };
  else if (sortBy === "createdAt") orderBy = { createdAt: sortOrder };
  else orderBy = { [sortBy]: sortOrder };

  // For high_value category, need lead dealValue >=100k
  if (category === "high_value") {
    whereLead.dealValue = { gte: 100000 };
  }

  const [analyses, total] = await Promise.all([
    prisma.aIAnalysis.findMany({
      where: {
        ...analysisWhere,
        lead: whereLead,
      },
      include: { lead: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.aIAnalysis.count({
      where: {
        ...analysisWhere,
        lead: whereLead,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-slate-600">{total} opportunities • Page {page} of {totalPages || 1}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/import"><Button variant="outline" size="sm">Import</Button></Link>
          <Link href="/campaigns"><Button size="sm">Create Campaign</Button></Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "All" },
          { id: "critical", label: "Critical" },
          { id: "high", label: "High" },
          { id: "medium", label: "Medium" },
          { id: "high_confidence", label: "High Confidence" },
          { id: "no_follow_up", label: "No Follow-up" },
          { id: "high_value", label: "High Value" },
          { id: "no_response", label: "No Response" },
        ].map((f) => (
          <Link key={f.id} href={`/leads?category=${f.id}&sortBy=${sortBy}&sortOrder=${sortOrder}`} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${category === f.id ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50"}`}>{f.label}</Link>
        ))}
      </div>

      {/* Sorting */}
      <div className="flex gap-2 text-xs">
        <span className="text-slate-500 py-1.5">Sort by:</span>
        {[
          { id: "recoveryScore", label: "Recovery Score" },
          { id: "dealValue", label: "Deal Value" },
          { id: "lastContactAt", label: "Last Contact" },
          { id: "createdAt", label: "Analyzed" },
        ].map((s) => (
          <Link key={s.id} href={`/leads?category=${category}&sortBy=${s.id}&sortOrder=${sortBy === s.id && sortOrder === "desc" ? "asc" : "desc"}`} className={`px-2.5 py-1.5 rounded-lg border text-xs ${sortBy === s.id ? "bg-slate-100 border-slate-300 font-medium" : "bg-white"}`}>{s.label} {sortBy === s.id ? (sortOrder === "desc" ? "↓" : "↑") : ""}</Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="text-left p-3 font-medium">Lead</th>
                <th className="text-left p-3 font-medium">Company</th>
                <th className="text-right p-3 font-medium">Deal Value</th>
                <th className="text-center p-3 font-medium">Score</th>
                <th className="text-center p-3 font-medium">Probability</th>
                <th className="text-center p-3 font-medium">Confidence</th>
                <th className="text-left p-3 font-medium">Reason</th>
                <th className="text-left p-3 font-medium">Last Contact</th>
                <th className="text-left p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analyses.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <Link href={`/leads/${a.leadId}`} className="font-medium hover:underline flex items-center gap-2">
                      {a.lead.name || "Unnamed"}
                      {a.lead.isDemo && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-800">DEMO</span>}
                    </Link>
                    <div className="text-xs text-slate-500">{a.lead.email || a.lead.phone || ""}</div>
                  </td>
                  <td className="p-3 text-xs">{a.lead.company || "—"}</td>
                  <td className="p-3 text-right font-medium">₽{a.lead.dealValue ? Math.round(a.lead.dealValue).toLocaleString("ru-RU") : "—"}</td>
                  <td className="p-3 text-center"><Badge variant={a.recoveryScore >= 80 ? "critical" : a.recoveryScore >= 60 ? "high" : a.recoveryScore >= 40 ? "medium" : "low"}>{a.recoveryScore}</Badge></td>
                  <td className="p-3 text-center text-xs">{a.recoveryProbability ? `${Math.round(a.recoveryProbability * 100)}%` : "—"}</td>
                  <td className="p-3 text-center"><span className={`text-[10px] px-2 py-1 rounded-full font-bold ${a.confidence === "high" ? "bg-emerald-100 text-emerald-700" : a.confidence === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{a.confidence.toUpperCase()}</span></td>
                  <td className="p-3 text-xs max-w-[200px] truncate" title={a.reasoningSummary}>{a.lossReason} • {a.reasoningSummary.slice(0, 60)}</td>
                  <td className="p-3 text-xs text-slate-500">{a.lead.lastContactAt ? new Date(a.lead.lastContactAt).toLocaleDateString("ru-RU") : "—"}</td>
                  <td className="p-3 text-xs"><span className={`px-2 py-1 rounded-full text-[11px] ${a.recommendedAction === "follow_up_now" ? "bg-slate-900 text-white" : "bg-slate-100"}`}>{a.recommendedAction.replace("_", " ")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {analyses.length === 0 && <div className="p-12 text-center text-sm text-slate-500">No leads found for this filter.</div>}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-slate-500">{total} total • {pageSize} per page</div>
        <div className="flex gap-2">
          {page > 1 && <Link href={`/leads?category=${category}&sortBy=${sortBy}&sortOrder=${sortOrder}&page=${page - 1}`} className="px-3 py-1.5 rounded-lg border bg-white text-xs">Previous</Link>}
          {page < totalPages && <Link href={`/leads?category=${category}&sortBy=${sortBy}&sortOrder=${sortOrder}&page=${page + 1}`} className="px-3 py-1.5 rounded-lg border bg-white text-xs">Next</Link>}
        </div>
      </div>
    </div>
  );
}
