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

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
            <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">OPPORTUNITIES • {total} TOTAL</span>
          </div>
          <h1 className="mt-4 text-[28px] font-[750] tracking-[-0.025em] leading-[1.05]">Opportunities</h1>
          <p className="mt-2 text-[13px] text-[#52525B]">{total} opportunities • Page {page} of {totalPages || 1} • Potential ≠ Confirmed • Est. not guaranteed</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/import" className="h-[36px] inline-flex items-center rounded-[10px] border border-[#E4E4E7] bg-white px-4 text-[13px] font-[600] shadow-sm hover:bg-[#F9FAFB]">Import</Link>
          <Link href="/campaigns" className="h-[36px] inline-flex items-center rounded-[10px] bg-[#0A0A0B] px-4 text-[13px] font-[600] text-white shadow-sm hover:bg-[#1A1D23]">Create Campaign →</Link>
        </div>
      </div>

      <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-4 shadow-premium flex flex-wrap gap-2">
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
          <Link key={f.id} href={`/leads?category=${f.id}&sortBy=${sortBy}&sortOrder=${sortOrder}`} className={`px-3.5 py-1.5 rounded-full text-[12px] font-[600] border transition-all ${category === f.id ? "bg-[#0A0A0B] text-white border-[#0A0A0B] shadow-sm" : "bg-[#F4F4F5] border-transparent text-[#52525B] hover:text-[#0A0A0B] hover:bg-white hover:border-[#E4E4E7]"}`}>{f.label}</Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center text-[11px]">
        <span className="text-[#71717A] font-[600] tracking-[0.05em]">SORT BY:</span>
        {[
          { id: "recoveryScore", label: "Recovery Score" },
          { id: "dealValue", label: "Deal Value" },
          { id: "lastContactAt", label: "Last Contact" },
          { id: "createdAt", label: "Analyzed" },
        ].map((s) => (
          <Link key={s.id} href={`/leads?category=${category}&sortBy=${s.id}&sortOrder=${sortBy === s.id && sortOrder === "desc" ? "asc" : "desc"}`} className={`px-2.5 py-1.5 rounded-[8px] border text-[11px] font-[600] transition-all ${sortBy === s.id ? "bg-[#0A0A0B] text-white border-[#0A0A0B]" : "bg-white border-[#E4E4E7] text-[#52525B] hover:border-[#0A0A0B]/20"}`}>{s.label} {sortBy === s.id ? (sortOrder === "desc" ? "↓" : "↑") : ""}</Link>
        ))}
      </div>

      <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white overflow-hidden shadow-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[#F9FAFB] border-b border-[#E4E4E7]/80 text-[10px] font-[800] tracking-[0.08em] text-[#71717A] uppercase">
              <tr>
                <th className="text-left p-3.5 font-[800]">Lead</th>
                <th className="text-left p-3.5 font-[800]">Company</th>
                <th className="text-right p-3.5 font-[800]">Deal Value</th>
                <th className="text-center p-3.5 font-[800]">Score</th>
                <th className="text-center p-3.5 font-[800]">Probability</th>
                <th className="text-center p-3.5 font-[800]">Confidence</th>
                <th className="text-left p-3.5 font-[800]">Reason</th>
                <th className="text-left p-3.5 font-[800]">Last Contact</th>
                <th className="text-left p-3.5 font-[800]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F4F5]">
              {analyses.map((a) => (
                <tr key={a.id} className="hover:bg-[#F9FAFB] group transition-colors">
                  <td className="p-3.5">
                    <Link href={`/leads/${a.leadId}`} className="font-[600] hover:underline underline-offset-4 flex items-center gap-2 tracking-[-0.01em]">
                      {a.lead.name || "Unnamed"}
                      {a.lead.isDemo && <span className="text-[9px] px-1 py-0.5 rounded-full bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] font-[700]">DEMO</span>}
                    </Link>
                    <div className="text-[11px] text-[#71717A] mt-0.5">{a.lead.email || a.lead.phone || ""}</div>
                  </td>
                  <td className="p-3.5 text-[12px] text-[#52525B]">{a.lead.company || "—"}</td>
                  <td className="p-3.5 text-right font-mono-financial font-[650]">₽{a.lead.dealValue ? Math.round(Number(a.lead.dealValue)).toLocaleString("ru-RU") : "—"}</td>
                  <td className="p-3.5 text-center"><Badge variant={a.recoveryScore >= 80 ? "critical" : a.recoveryScore >= 60 ? "high" : a.recoveryScore >= 40 ? "medium" : "low"}>{a.recoveryScore}</Badge></td>
                  <td className="p-3.5 text-center font-mono-financial text-[12px] font-[600]">{a.recoveryProbability ? `${Math.round(a.recoveryProbability * 100)}%` : "—"}</td>
                  <td className="p-3.5 text-center"><span className={`text-[10px] px-2 py-1 rounded-full font-[700] tracking-[0.04em] ${a.confidence === "high" ? "bg-[#D1FAE5] text-[#065F46]" : a.confidence === "medium" ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#F4F4F5] text-[#71717A]"}`}>{a.confidence.toUpperCase()}</span></td>
                  <td className="p-3.5 text-[11px] max-w-[220px] truncate text-[#52525B]" title={a.reasoningSummary}>{a.lossReason} • {a.reasoningSummary.slice(0, 60)}</td>
                  <td className="p-3.5 text-[11px] text-[#71717A]">{a.lead.lastContactAt ? new Date(a.lead.lastContactAt).toLocaleDateString("ru-RU") : "—"}</td>
                  <td className="p-3.5"><span className={`px-2 py-1 rounded-full text-[10px] font-[700] tracking-[0.03em] ${a.recommendedAction === "follow_up_now" ? "bg-[#0A0A0B] text-white" : "bg-[#F4F4F5] text-[#52525B]"}`}>{a.recommendedAction.replace(/_/g, " ").toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {analyses.length === 0 && <div className="p-16 text-center"><div className="text-[13px] font-[600]">No leads found for this filter.</div><div className="text-[12px] text-[#71717A] mt-1">Try adjusting category or import more data.</div></div>}
        </div>
      </div>

      <div className="flex justify-between items-center text-[11px] text-[#71717A]">
        <div className="font-[500]">{total} total • 20 per page • Potential ≠ Confirmed</div>
        <div className="flex gap-2">
          {page > 1 && <Link href={`/leads?category=${category}&sortBy=${sortBy}&sortOrder=${sortOrder}&page=${page - 1}`} className="px-3 py-1.5 rounded-[8px] border bg-white font-[600] hover:bg-[#F9FAFB]">Previous</Link>}
          {page < totalPages && <Link href={`/leads?category=${category}&sortBy=${sortBy}&sortOrder=${sortOrder}&page=${page + 1}`} className="px-3 py-1.5 rounded-[8px] border bg-white font-[600] hover:bg-[#F9FAFB]">Next</Link>}
        </div>
      </div>
    </div>
  );
}
