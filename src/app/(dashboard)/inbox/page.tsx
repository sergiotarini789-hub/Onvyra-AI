export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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

  let analysisWhere: any = { organizationId: orgId };
  if (category === "critical") analysisWhere.recoveryScore = { gte: 80 };
  else if (category === "high") analysisWhere.recoveryScore = { gte: 60, lt: 80 };
  else if (category === "medium") analysisWhere.recoveryScore = { gte: 40, lt: 60 };
  else if (category === "low") analysisWhere.recoveryScore = { lt: 40 };

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
  else if (sortBy === "lastContactAt") orderBy = { lead: { lastContactAt: "asc" } };

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

  const critical = filtered.filter((a: any) => a.recoveryScore >= 80);
  const high = filtered.filter((a: any) => a.recoveryScore >= 60 && a.recoveryScore < 80);
  const medium = filtered.filter((a: any) => a.recoveryScore >= 40 && a.recoveryScore < 60);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1280px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
            <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">RECOVERY INBOX • WHO SHOULD I CONTACT FIRST?</span>
          </div>
          <h1 className="mt-4 text-[28px] font-[750] leading-[1.05] tracking-[-0.025em]">Recovery Inbox</h1>
          <p className="mt-2 text-[13px] leading-[1.5] text-[#52525B]">Prioritized by score, deal value, estimated recoverable, why, recommended action. Potential ≠ Confirmed.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/dashboard" className="inline-flex h-[36px] items-center justify-center rounded-[10px] border border-[#E4E4E7] bg-white px-4 text-[13px] font-[600] shadow-sm hover:bg-[#F9FAFB] transition-colors">Dashboard</Link>
          <Link href="/leads" className="inline-flex h-[36px] items-center justify-center rounded-[10px] bg-[#0A0A0B] px-4 text-[13px] font-[600] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:bg-[#1A1D23] transition-colors">All Opportunities</Link>
        </div>
      </div>

      {/* Filters - Premium */}
      <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-4 shadow-premium">
        <div className="flex flex-wrap gap-3 items-center">
          <form className="flex gap-2">
            <input name="search" defaultValue={search} placeholder="Search name, company, product..." className="h-[36px] w-[260px] rounded-[10px] border border-[#E4E4E7] bg-[#FCFCFD] px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0A0A0B]/10 focus:border-[#0A0A0B]/20 transition-all" />
            <button type="submit" className="h-[36px] rounded-[10px] bg-[#0A0A0B] text-white px-4 text-[13px] font-[600] hover:bg-[#1A1D23] transition-colors">Search</button>
          </form>
          <div className="h-5 w-px bg-[#E4E4E7] hidden md:block" />
          <div className="flex gap-1.5 flex-wrap">
            {[{ id: "all", label: "All" }, { id: "critical", label: "Critical" }, { id: "high", label: "High" }, { id: "medium", label: "Medium" }].map((f) => (
              <Link key={f.id} href={`/inbox?category=${f.id}&search=${search}&status=${statusFilter}&sortBy=${sortBy}`} className={`px-3 py-1.5 rounded-full text-[12px] font-[600] border transition-all ${category === f.id ? "bg-[#0A0A0B] text-white border-[#0A0A0B] shadow-sm" : "bg-white hover:bg-[#F9FAFB] border-[#E4E4E7] text-[#52525B] hover:text-[#0A0A0B]"}`}>{f.label}</Link>
            ))}
          </div>
          <div className="h-5 w-px bg-[#E4E4E7] hidden md:block" />
          <div className="flex gap-1.5 flex-wrap">
            {[{ id: "all", label: "All Status" }, { id: "not_contacted", label: "Not Contacted" }, { id: "contacted", label: "Contacted" }, { id: "recovered", label: "Recovered" }].map((f) => (
              <Link key={f.id} href={`/inbox?category=${category}&search=${search}&status=${f.id}&sortBy=${sortBy}`} className={`px-3 py-1.5 rounded-full text-[12px] font-[500] border transition-all ${statusFilter === f.id ? "bg-[#0A0A0B] text-white border-[#0A0A0B]" : "bg-[#F4F4F5] border-transparent text-[#52525B]"}`}>{f.label}</Link>
            ))}
          </div>
          <div className="h-5 w-px bg-[#E4E4E7] hidden md:block" />
          <div className="flex gap-1">
            {[{ id: "score", label: "Score ↓" }, { id: "dealValue", label: "Deal Value" }, { id: "lastContactAt", label: "Inactivity" }].map((s) => (
              <Link key={s.id} href={`/inbox?category=${category}&search=${search}&status=${statusFilter}&sortBy=${s.id}`} className={`px-2.5 py-1.5 rounded-[8px] border text-[11px] font-[600] transition-all ${sortBy === s.id ? "bg-[#0A0A0B] text-white border-[#0A0A0B]" : "bg-white border-[#E4E4E7] text-[#52525B] hover:border-[#0A0A0B]/20"}`}>{s.label}</Link>
            ))}
          </div>
        </div>
      </div>

      {/* Sections */}
      {(category === "all" || category === "critical") && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#EF4444] animate-[pulse-subtle_2s_ease-in-out_infinite]" />
            <h2 className="font-[700] text-[12px] tracking-[0.08em] uppercase">Critical — Contact Now</h2>
            <span className="text-[11px] text-[#71717A] font-[500]">({critical.length} opportunities • Est. not guaranteed)</span>
          </div>
          {critical.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[#E4E4E7] bg-[#F9FAFB] p-6 text-center text-[12px] text-[#71717A]">No critical opportunities for current filters.</div>
          ) : (
            <div className="grid gap-3">
              {critical.map((a: any) => (
                <InboxCard key={a.id} analysis={a} contacted={contactedMap.has(a.leadId)} recovered={recoveredMap.has(a.leadId)} />
              ))}
            </div>
          )}
        </div>
      )}

      {(category === "all" || category === "high") && high.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#F97316]" />
            <h2 className="font-[700] text-[12px] tracking-[0.08em] uppercase">High Priority</h2>
            <span className="text-[11px] text-[#71717A] font-[500]">({high.length})</span>
          </div>
          <div className="grid gap-3">
            {high.map((a: any) => (
              <InboxCard key={a.id} analysis={a} contacted={contactedMap.has(a.leadId)} recovered={recoveredMap.has(a.leadId)} />
            ))}
          </div>
        </div>
      )}

      {(category === "all" || category === "medium") && medium.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#F59E0B]" />
            <h2 className="font-[700] text-[12px] tracking-[0.08em] uppercase">Medium Priority</h2>
            <span className="text-[11px] text-[#71717A] font-[500]">({medium.length})</span>
          </div>
          <div className="grid gap-3">
            {medium.slice(0, category === "medium" ? 20 : 5).map((a: any) => (
              <InboxCard key={a.id} analysis={a} contacted={contactedMap.has(a.leadId)} recovered={recoveredMap.has(a.leadId)} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white p-12 text-center shadow-premium">
          <div className="mx-auto h-12 w-12 rounded-[14px] bg-[#F4F4F5] border flex items-center justify-center">◫</div>
          <div className="mt-4 text-[14px] font-[600]">No opportunities found</div>
          <div className="text-[12px] text-[#71717A] mt-1">Try adjusting filters or import more data.</div>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/import" className="h-[36px] px-4 rounded-[10px] bg-[#0A0A0B] text-white text-[12px] font-[600] inline-flex items-center">Import Data</Link>
            <Link href="/inbox" className="h-[36px] px-4 rounded-[10px] border bg-white text-[12px] font-[600] inline-flex items-center">Clear Filters</Link>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center text-[11px] text-[#71717A] pt-2 border-t border-[#E4E4E7]/60">
        <div className="font-[500]">{total} total opportunities • Page {page} of {totalPages || 1} • Potential ≠ Confirmed</div>
        <div className="flex gap-2">
          {page > 1 && <Link href={`/inbox?category=${category}&search=${search}&status=${statusFilter}&sortBy=${sortBy}&page=${page - 1}`} className="px-3 py-1.5 rounded-[8px] border bg-white font-[600] hover:bg-[#F9FAFB]">Previous</Link>}
          {page < totalPages && <Link href={`/inbox?category=${category}&search=${search}&status=${statusFilter}&sortBy=${sortBy}&page=${page + 1}`} className="px-3 py-1.5 rounded-[8px] border bg-white font-[600] hover:bg-[#F9FAFB]">Next</Link>}
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
    <div className={`group rounded-[16px] border bg-white p-[18px] shadow-premium hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-[1px] hover:border-[#0A0A0B]/15 transition-all ${recovered ? "border-[#059669]/30 bg-[#ECFDF5]/30" : contacted ? "border-[#3B82F6]/20 bg-[#EFF6FF]/30" : "border-[#E4E4E7]/80"}`}>
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/leads/${lead.id}`} className="font-[650] text-[14px] tracking-[-0.01em] hover:underline underline-offset-4">{lead.name || "Unnamed"}</Link>
            {lead.isDemo && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] font-[700]">DEMO</span>}
            <Badge variant={analysis.recoveryScore >= 80 ? "critical" : analysis.recoveryScore >= 60 ? "high" : "medium"}>{analysis.recoveryScore}</Badge>
            {contacted && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1D4ED8] font-[700]">CONTACTED</span>}
            {recovered && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#065F46] font-[700]">RECOVERED</span>}
            <span className="text-[12px] text-[#71717A]">• {lead.company || ""}</span>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px]">
            <span><span className="text-[#71717A]">Deal:</span> <span className="font-[650] font-mono-financial">₽{toNum(lead.dealValue) ? Math.round(toNum(lead.dealValue)!).toLocaleString("ru-RU") : "—"}</span></span>
            <span><span className="text-[#71717A]">Est. recoverable:</span> <span className="font-[750] font-mono-financial">{potentialRevenue ? `₽${Math.round(potentialRevenue).toLocaleString("ru-RU")}` : "—"}</span> <span className="text-[10px] text-[#A1A1AA]">Est. not guaranteed</span></span>
            <span><span className="text-[#71717A]">Prob:</span> <span className="font-[600]">{analysis.recoveryProbability ? `${Math.round(analysis.recoveryProbability * 100)}%` : "—"}</span> • {analysis.confidence}</span>
            <span><span className="text-[#71717A]">Last contact:</span> {lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleDateString("ru-RU") : "—"}</span>
          </div>

          <div className="mt-3">
            <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">WHY THIS OPPORTUNITY?</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(factors.length > 0 ? factors : [{ explanation: analysis.reasoningSummary }]).slice(0, 4).map((f: any, i: number) => (
                <span key={i} className={`text-[11px] px-2.5 py-1 rounded-full border font-[500] ${f.type === "negative" ? "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]" : "bg-[#F9FAFB] border-[#E4E4E7] text-[#18181B]"}`}>
                  {f.explanation || f.raw || "Signal"}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">RECOMMENDED ACTION:</div>
            <span className="text-[11px] font-[700] px-2 py-0.5 rounded-full bg-[#0A0A0B] text-white">{analysis.recommendedAction?.replace(/_/g, " ").toUpperCase()}</span>
            <span className="text-[11px] text-[#52525B]">• {analysis.recommendedMessageGoal}</span>
          </div>
        </div>

        <div className="flex lg:flex-col gap-2 shrink-0">
          <Link href={`/leads/${lead.id}`} className="h-[34px] px-4 inline-flex items-center justify-center rounded-[10px] bg-[#0A0A0B] text-white text-[12px] font-[600] shadow-sm hover:bg-[#1A1D23] transition-colors">View Opportunity →</Link>
          <form action={`/api/leads/${lead.id}/outcome`} method="post" className="inline">
            <input type="hidden" name="outcome" value="CONTACTED" />
            <button type="submit" className="h-[34px] w-full px-4 rounded-[10px] border bg-white text-[12px] font-[600] hover:bg-[#F9FAFB] transition-colors">Mark Contacted</button>
          </form>
        </div>
      </div>
    </div>
  );
}
