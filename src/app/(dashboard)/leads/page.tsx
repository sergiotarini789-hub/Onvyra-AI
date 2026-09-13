export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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

  let whereLead: any = { organizationId: orgId };
  if (search) {
    whereLead.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { company: { contains: search } },
      { product: { contains: search } },
    ];
  }

  let analysisWhere: any = { organizationId: orgId };
  if (category === "critical") analysisWhere.recoveryScore = { gte: 80 };
  else if (category === "high") analysisWhere.recoveryScore = { gte: 60, lt: 80 };
  else if (category === "medium") analysisWhere.recoveryScore = { gte: 40, lt: 60 };
  else if (category === "high_confidence") analysisWhere.confidence = "high";
  else if (category === "no_follow_up") analysisWhere.lossReason = "no_follow_up";
  else if (category === "no_response") analysisWhere.lossReason = "no_response";

  if (category === "high_value") {
    whereLead.dealValue = { gte: 100000 };
  }

  let orderBy: any = { recoveryScore: "desc" };
  if (sortBy === "dealValue") orderBy = { lead: { dealValue: sortOrder } };
  else if (sortBy === "lastContactAt") orderBy = { lead: { lastContactAt: sortOrder } };
  else if (sortBy === "createdAt") orderBy = { createdAt: sortOrder };
  else orderBy = { [sortBy]: sortOrder };

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

  const totalPages = Math.ceil(total / pageSize);

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    p.set("category", overrides.category || category);
    p.set("sortBy", overrides.sortBy || sortBy);
    p.set("sortOrder", overrides.sortOrder || sortOrder);
    if (search) p.set("search", search);
    if (overrides.page) p.set("page", overrides.page);
    return `/leads?${p.toString()}`;
  }

  return (
    <div className="p-5 lg:p-6 space-y-5 max-w-[1440px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
              <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">OPPORTUNITIES • {total} TOTAL • REAL DATA</span>
            </div>
            <span className="hidden md:inline-flex text-[10px] font-[700] tracking-[0.05em] px-2 py-0.5 rounded-full bg-[#0A0A0B] text-white shadow-sm">{analyses.filter(a=>a.recoveryScore>=80).length} CRITICAL • {analyses.filter(a=>a.recoveryScore>=60&&a.recoveryScore<80).length} HIGH</span>
          </div>
          <h1 className="mt-3.5 text-[26px] md:text-[30px] font-[800] leading-[1.05] tracking-[-0.03em]">Opportunities</h1>
          <p className="mt-1.5 text-[13px] leading-[1.5] tracking-[-0.01em] text-[#52525B] max-w-[560px]">Professional revenue operations tool. Eye flow: <span className="font-[650] text-[#0A0A0B]">CUSTOMER → DEAL → SCORE → PROBABILITY → ACTION</span> • Potential ≠ Confirmed • Est. not guaranteed • Tenant isolated.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/import" className="h-[36px] inline-flex items-center justify-center rounded-[10px] border border-[#E4E4E7] bg-white px-4 text-[12.5px] font-[600] shadow-sm hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/15 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:-translate-y-[0.5px] transition-all">Import</Link>
          <Link href="/campaigns" className="h-[36px] inline-flex items-center justify-center gap-1 rounded-[10px] bg-[#0A0A0B] px-4 text-[12.5px] font-[650] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:bg-[#1A1D23] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] transition-all">Create Campaign <span>→</span></Link>
        </div>
      </div>

      <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium overflow-hidden">
        <div className="flex flex-wrap gap-0 items-center divide-y md:divide-y-0 md:divide-x divide-[#F4F4F5]">
          <div className="p-3 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-[800] tracking-[0.08em] text-[#A1A1AA] mr-1">FILTER</span>
            {[
              { id: "all", label: "All" },
              { id: "critical", label: "Critical", dot: "bg-[#EF4444]" },
              { id: "high", label: "High", dot: "bg-[#F97316]" },
              { id: "medium", label: "Medium", dot: "bg-[#F59E0B]" },
              { id: "high_confidence", label: "High Conf" },
              { id: "high_value", label: "High Value ₽100k+" },
            ].map((f) => (
              <Link key={f.id} href={buildHref({ category: f.id })} className={`group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-[600] border transition-all duration-200 ${category === f.id ? "bg-[#0A0A0B] text-white border-[#0A0A0B] shadow-[0_2px_8px_rgba(0,0,0,0.12)]" : "bg-[#F4F4F5] border-transparent text-[#52525B] hover:text-[#0A0A0B] hover:bg-white hover:border-[#E4E4E7] hover:shadow-sm hover:-translate-y-[0.5px]"}`}>
                {f.dot && <span className={`h-1.5 w-1.5 rounded-full ${f.dot} ${category === f.id ? "" : "group-hover:scale-125"} transition-transform`} />}
                {f.label}
              </Link>
            ))}
          </div>
          <div className="p-3 flex items-center gap-2 flex-wrap ml-auto">
            <span className="text-[10px] font-[800] tracking-[0.08em] text-[#A1A1AA] mr-1">SORT</span>
            {[
              { id: "recoveryScore", label: "Score" },
              { id: "dealValue", label: "Deal Value" },
              { id: "lastContactAt", label: "Last Contact" },
              { id: "createdAt", label: "Analyzed" },
            ].map((s) => (
              <Link key={s.id} href={buildHref({ sortBy: s.id, sortOrder: sortBy === s.id && sortOrder === "desc" ? "asc" : "desc" })} className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] border text-[11px] font-[650] transition-all ${sortBy === s.id ? "bg-[#0A0A0B] text-white border-[#0A0A0B] shadow-sm" : "bg-white border-[#E4E4E7] text-[#52525B] hover:border-[#0A0A0B]/20 hover:shadow-sm"}`}>{s.label} {sortBy === s.id ? (sortOrder === "desc" ? "↓" : "↑") : ""}</Link>
            ))}
          </div>
        </div>
        <div className="px-4 py-2.5 bg-[#F9FAFB] border-t border-[#E4E4E7]/60 flex items-center justify-between text-[11px]">
          <span className="text-[#71717A] font-[500]">{total} opportunities • Eye: CUSTOMER → DEAL → SCORE → PROBABILITY → ACTION • Potential ≠ Confirmed • Est. not guaranteed</span>
          <Link href="/leads" className="font-[600] text-[#0A0A0B] hover:underline underline-offset-4">Clear</Link>
        </div>
      </div>

      <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white overflow-hidden shadow-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead className="bg-[#FCFCFD] border-b border-[#0A0A0B]/[0.06] text-[10px] font-[800] tracking-[0.08em] text-[#71717A] uppercase sticky top-0">
              <tr>
                <th className="text-left p-3.5 pl-5 font-[800] tracking-[0.08em]">Customer</th>
                <th className="text-left p-3.5 font-[800]">Deal</th>
                <th className="text-center p-3.5 font-[800]">Score</th>
                <th className="text-center p-3.5 font-[800]">Probability</th>
                <th className="text-center p-3.5 font-[800]">Confidence</th>
                <th className="text-left p-3.5 font-[800]">Why</th>
                <th className="text-left p-3.5 font-[800]">Last Contact</th>
                <th className="text-left p-3.5 pr-5 font-[800]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F4F5]">
              {analyses.map((a) => (
                <tr key={a.id} className="group hover:bg-[#F9FAFB] transition-colors duration-150">
                  <td className="p-3.5 pl-5">
                    <Link href={`/leads/${a.leadId}`} className="flex items-center gap-2.5 group/link">
                      <div className="h-8 w-8 rounded-full bg-[#0A0A0B] text-white flex items-center justify-center text-[11px] font-[700] shadow-sm group-hover/link:shadow-[0_2px_8px_rgba(0,0,0,0.15)] group-hover/link:scale-105 transition-all shrink-0">{(a.lead.name || "U")[0].toUpperCase()}</div>
                      <div className="min-w-0">
                        <div className="font-[650] tracking-[-0.01em] text-[13px] leading-none group-hover/link:underline underline-offset-4 flex items-center gap-1.5">
                          <span className="truncate max-w-[140px]">{a.lead.name || "Unnamed"}</span>
                          {a.lead.isDemo && <span className="text-[8px] px-1 py-0.5 rounded-full bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] font-[800]">DEMO</span>}
                        </div>
                        <div className="text-[11px] text-[#71717A] mt-1 truncate max-w-[160px]">{a.lead.company || ""} • {a.lead.email || a.lead.phone || ""}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="p-3.5">
                    <div className="font-mono-financial font-[700] text-[13px] tracking-[-0.01em]">₽{a.lead.dealValue ? Math.round(Number(a.lead.dealValue)).toLocaleString("ru-RU") : "—"}</div>
                    <div className="text-[10px] text-[#71717A] mt-0.5 font-[500]">{a.lead.product || ""} • {a.lead.dealStage || ""}</div>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="inline-flex flex-col items-center">
                      <Badge variant={a.recoveryScore >= 80 ? "critical" : a.recoveryScore >= 60 ? "high" : a.recoveryScore >= 40 ? "medium" : "low"} className="group-hover:scale-105 transition-transform shadow-sm">{a.recoveryScore}</Badge>
                      <div className={`mt-1 h-1 w-8 rounded-full ${a.recoveryScore>=80?"bg-[#EF4444]":a.recoveryScore>=60?"bg-[#F97316]":a.recoveryScore>=40?"bg-[#F59E0B]":"bg-[#D4D4D8]"}`} />
                    </div>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="font-mono-financial text-[13px] font-[700] tracking-[-0.02em]">{a.recoveryProbability ? `${Math.round(a.recoveryProbability * 100)}%` : "—"}</div>
                    <div className="text-[10px] text-[#A1A1AA] font-[500]">Est. not guaranteed</div>
                  </td>
                  <td className="p-3.5 text-center"><span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-[700] tracking-[0.04em] border shadow-sm ${a.confidence === "high" ? "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]" : a.confidence === "medium" ? "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]" : "bg-[#F4F4F5] text-[#71717A] border-[#E4E4E7]"}`}><span className={`h-1 w-1 rounded-full ${a.confidence==="high"?"bg-[#059669]":a.confidence==="medium"?"bg-[#F59E0B]":"bg-[#71717A]"}`} />{a.confidence.toUpperCase()}</span></td>
                  <td className="p-3.5 text-[11px] max-w-[200px]">
                    <div className="truncate font-[500] tracking-[-0.01em] text-[#18181B]" title={a.reasoningSummary}>{a.lossReason?.replace(/_/g," ")} • {a.reasoningSummary.slice(0, 48)}</div>
                    <div className="flex gap-1 mt-1.5">
                      <span className="h-1 w-1 rounded-full bg-[#0A0A0B]" />
                      <span className="text-[10px] text-[#71717A] truncate">{a.buyingIntent} intent • {a.factors ? (a.factors as any[]).length : 0} factors</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-[11px]">
                    <div className="font-[600] font-mono-financial text-[12px]">{a.lead.lastContactAt ? `${Math.floor((Date.now()-new Date(a.lead.lastContactAt).getTime())/(1000*60*60*24))}d ago` : "—"}</div>
                    <div className="text-[10px] text-[#71717A] mt-0.5">{a.lead.lastContactAt ? new Date(a.lead.lastContactAt).toLocaleDateString("ru-RU") : ""}</div>
                  </td>
                  <td className="p-3.5 pr-5">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-[800] tracking-[0.04em] shadow-sm group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all ${a.recommendedAction === "follow_up_now" ? "bg-[#0A0A0B] text-white" : a.recommendedAction === "re_engage" ? "bg-[#F97316] text-white" : "bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E7]"}`}>{a.recommendedAction.replace(/_/g, " ").toUpperCase()}</span>
                      <Link href={`/leads/${a.leadId}`} className="h-7 w-7 rounded-[8px] bg-white border border-[#E4E4E7] flex items-center justify-center text-[#71717A] group-hover:bg-[#0A0A0B] group-hover:text-white group-hover:border-[#0A0A0B] group-hover:shadow-sm group-hover:translate-x-0.5 transition-all text-[12px]">↗</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {analyses.length === 0 && (
            <div className="p-16 text-center">
              <div className="mx-auto h-12 w-12 rounded-[14px] bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center text-[16px]">◫</div>
              <div className="mt-4 text-[14px] font-[700] tracking-[-0.01em]">No opportunities found</div>
              <div className="mt-1.5 text-[12px] text-[#71717A] max-w-[360px] mx-auto leading-[1.5]">Try adjusting filters or import more data. Potential ≠ Confirmed • Est. not guaranteed • Tenant isolated • No fake claims.</div>
              <div className="mt-6 flex justify-center gap-2">
                <Link href="/import" className="h-[36px] px-4 rounded-[10px] bg-[#0A0A0B] text-white text-[12px] font-[650] inline-flex items-center shadow-sm hover:bg-[#1A1D23] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all">Import Data</Link>
                <Link href="/leads" className="h-[36px] px-4 rounded-[10px] border bg-white text-[12px] font-[600] inline-flex items-center hover:bg-[#F9FAFB]">Clear Filters</Link>
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-3 bg-[#F9FAFB] border-t border-[#E4E4E7]/60 flex justify-between items-center text-[11px]">
          <span className="text-[#71717A] font-[500]">{total} total • 20 per page • CUSTOMER → DEAL → SCORE → PROBABILITY → ACTION • Potential ≠ Confirmed • Server-enforced • Tenant isolated</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={buildHref({ page: String(page - 1) })} className="px-3 py-1.5 rounded-[8px] border bg-white font-[650] hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/15 shadow-sm transition-all">Previous</Link>}
            {page < totalPages && <Link href={buildHref({ page: String(page + 1) })} className="px-3 py-1.5 rounded-[8px] border bg-white font-[650] hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/15 shadow-sm transition-all">Next →</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}
