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

  function buildHref(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    params.set("category", overrides.category || category);
    params.set("search", overrides.search !== undefined ? overrides.search : search);
    params.set("status", overrides.status || statusFilter);
    params.set("sortBy", overrides.sortBy || sortBy);
    if (overrides.page) params.set("page", overrides.page);
    return `/inbox?${params.toString()}`;
  }

  return (
    <div className="p-5 lg:p-6 space-y-5 max-w-[1440px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B] animate-[pulse-subtle_2s_ease-in-out_infinite]" />
              <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">RECOVERY INBOX • WHO SHOULD I CONTACT FIRST? • {total} TOTAL</span>
            </div>
            <span className="hidden md:inline-flex text-[10px] font-[700] tracking-[0.05em] px-2 py-0.5 rounded-full bg-[#0A0A0B] text-white">{critical.length + high.length} PRIORITY</span>
          </div>
          <h1 className="mt-3.5 text-[26px] md:text-[30px] font-[800] leading-[1.05] tracking-[-0.03em]">Recovery Inbox</h1>
          <p className="mt-1.5 text-[13px] leading-[1.5] tracking-[-0.01em] text-[#52525B] max-w-[560px]">Prioritized by score, deal value, estimated recoverable, why, recommended action. <span className="font-[650] text-[#0A0A0B]">Potential ≠ Confirmed</span> • Est. not guaranteed • Tenant isolated.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/dashboard" className="inline-flex h-[36px] items-center justify-center rounded-[10px] border border-[#E4E4E7] bg-white px-4 text-[12.5px] font-[600] shadow-sm hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/15 hover:-translate-y-[0.5px] transition-all">Dashboard</Link>
          <Link href="/leads" className="inline-flex h-[36px] items-center justify-center rounded-[10px] bg-[#0A0A0B] px-4 text-[12.5px] font-[650] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:bg-[#1A1D23] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] transition-all">All Opportunities</Link>
        </div>
      </div>

      {/* Filters — Premium Technical */}
      <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium overflow-hidden">
        <div className="flex flex-wrap gap-0 items-center divide-y md:divide-y-0 md:divide-x divide-[#F4F4F5]">
          <div className="p-3.5 flex gap-2 w-full md:w-auto">
            <form className="flex gap-2 flex-1 md:flex-none">
              <input name="search" defaultValue={search} placeholder="Search name, company, product..." className="h-[36px] w-full md:w-[260px] rounded-[10px] border border-[#E4E4E7] bg-[#FCFCFD] px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0A0A0B]/10 focus:border-[#0A0A0B]/20 transition-all" />
              <button type="submit" className="h-[36px] rounded-[10px] bg-[#0A0A0B] text-white px-4 text-[13px] font-[600] hover:bg-[#1A1D23] shadow-sm hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-all">Search</button>
            </form>
          </div>

          <div className="p-3 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-[800] tracking-[0.08em] text-[#A1A1AA] mr-1">PRIORITY</span>
            {[{ id: "all", label: "All" }, { id: "critical", label: "Critical", dot: "bg-[#EF4444]" }, { id: "high", label: "High", dot: "bg-[#F97316]" }, { id: "medium", label: "Medium", dot: "bg-[#F59E0B]" }].map((f) => (
              <Link key={f.id} href={buildHref({ category: f.id })} className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-[600] border transition-all duration-200 ${category === f.id ? "bg-[#0A0A0B] text-white border-[#0A0A0B] shadow-[0_2px_8px_rgba(0,0,0,0.12)]" : "bg-white hover:bg-[#F9FAFB] border-[#E4E4E7] text-[#52525B] hover:text-[#0A0A0B] hover:border-[#0A0A0B]/15 hover:shadow-sm hover:-translate-y-[0.5px]"}`}>
                {f.dot && <span className={`h-1.5 w-1.5 rounded-full ${f.dot} ${category === f.id ? "" : "group-hover:scale-125"} transition-transform`} />}
                {f.label}
              </Link>
            ))}
          </div>

          <div className="p-3 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-[800] tracking-[0.08em] text-[#A1A1AA] mr-1">STATUS</span>
            {[{ id: "all", label: "All" }, { id: "not_contacted", label: "Not Contacted" }, { id: "contacted", label: "Contacted" }, { id: "recovered", label: "Recovered", dot: "bg-[#10B981]" }].map((f) => (
              <Link key={f.id} href={buildHref({ status: f.id })} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-[600] border transition-all duration-200 ${statusFilter === f.id ? "bg-[#0A0A0B] text-white border-[#0A0A0B] shadow-sm" : "bg-[#F4F4F5] border-transparent text-[#52525B] hover:bg-white hover:border-[#E4E4E7] hover:shadow-sm"}`}>{f.label}</Link>
            ))}
          </div>

          <div className="p-3 flex items-center gap-2 flex-wrap ml-auto">
            <span className="text-[10px] font-[800] tracking-[0.08em] text-[#A1A1AA] mr-1">SORT</span>
            {[{ id: "score", label: "Score ↓" }, { id: "dealValue", label: "Deal Value" }, { id: "lastContactAt", label: "Inactivity" }].map((s) => (
              <Link key={s.id} href={buildHref({ sortBy: s.id })} className={`px-2.5 py-1.5 rounded-[8px] border text-[11px] font-[650] transition-all duration-200 ${sortBy === s.id ? "bg-[#0A0A0B] text-white border-[#0A0A0B] shadow-sm" : "bg-white border-[#E4E4E7] text-[#52525B] hover:border-[#0A0A0B]/20 hover:shadow-sm"}`}>{s.label}</Link>
            ))}
          </div>
        </div>

        <div className="px-4 py-2.5 bg-[#F9FAFB] border-t border-[#E4E4E7]/60 flex items-center justify-between text-[11px]">
          <span className="text-[#71717A] font-[500]">{total} opportunities • {critical.length} critical • {high.length} high • Potential ≠ Confirmed • Est. not guaranteed • Filters server-enforced</span>
          <Link href="/inbox" className="font-[600] text-[#0A0A0B] hover:underline underline-offset-4">Clear filters</Link>
        </div>
      </div>

      {/* Critical */}
      {(category === "all" || category === "critical") && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-[#EF4444] animate-[pulse-subtle_2s_ease-in-out_infinite] shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
            <h2 className="font-[800] text-[11px] tracking-[0.08em] uppercase">Critical — Contact Now</h2>
            <span className="text-[11px] font-[600] px-2 py-0.5 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]">{critical.length} opportunities • Est. not guaranteed</span>
            <div className="h-px flex-1 bg-[#F4F4F5] ml-2 hidden md:block" />
          </div>
          {critical.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[#E4E4E7] bg-[#F9FAFB] p-6 text-center text-[12px] text-[#71717A]">No critical opportunities for current filters. Potential ≠ Confirmed.</div>
          ) : (
            <div className="grid gap-3">
              {critical.map((a: any) => (
                <InboxCard key={a.id} analysis={a} contacted={contactedMap.has(a.leadId)} recovered={recoveredMap.has(a.leadId)} priority />
              ))}
            </div>
          )}
        </div>
      )}

      {(category === "all" || category === "high") && high.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-[#F97316] shadow-[0_0_8px_rgba(249,115,22,0.3)]" />
            <h2 className="font-[800] text-[11px] tracking-[0.08em] uppercase">High Priority</h2>
            <span className="text-[11px] font-[600] px-2 py-0.5 rounded-full bg-[#FFF7ED] border border-[#FDBA74] text-[#9A3412]">{high.length}</span>
            <div className="h-px flex-1 bg-[#F4F4F5] ml-2 hidden md:block" />
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
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-[#F59E0B]" />
            <h2 className="font-[800] text-[11px] tracking-[0.08em] uppercase">Medium Priority</h2>
            <span className="text-[11px] font-[600] px-2 py-0.5 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E]">{medium.length}</span>
            <div className="h-px flex-1 bg-[#F4F4F5] ml-2 hidden md:block" />
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
          <div className="mx-auto h-12 w-12 rounded-[14px] bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center text-[16px]">◫</div>
          <div className="mt-4 text-[14px] font-[700] tracking-[-0.01em]">No opportunities found</div>
          <div className="text-[12px] text-[#71717A] mt-1.5 max-w-[360px] mx-auto leading-[1.5]">Try adjusting filters or import more data. Potential ≠ Confirmed • Est. not guaranteed • Tenant isolated.</div>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/import" className="h-[36px] px-4 rounded-[10px] bg-[#0A0A0B] text-white text-[12px] font-[650] inline-flex items-center shadow-sm hover:bg-[#1A1D23] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all">Import Data</Link>
            <Link href="/inbox" className="h-[36px] px-4 rounded-[10px] border bg-white text-[12px] font-[600] inline-flex items-center hover:bg-[#F9FAFB]">Clear Filters</Link>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center text-[11px] text-[#71717A] pt-3 border-t border-[#E4E4E7]/60">
        <div className="font-[500]">{total} total • Page {page} of {totalPages || 1} • Potential ≠ Confirmed • Est. not guaranteed • Server-enforced filters • Tenant isolated</div>
        <div className="flex gap-2">
          {page > 1 && <Link href={buildHref({ page: String(page - 1) })} className="px-3 py-1.5 rounded-[8px] border bg-white font-[650] hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/15 shadow-sm transition-all">Previous</Link>}
          {page < totalPages && <Link href={buildHref({ page: String(page + 1) })} className="px-3 py-1.5 rounded-[8px] border bg-white font-[650] hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/15 shadow-sm transition-all">Next →</Link>}
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

function InboxCard({ analysis, contacted, recovered, priority = false }: { analysis: any; contacted: boolean; recovered: boolean; priority?: boolean }) {
  const lead = analysis.lead;
  const factors = analysis.factors || [];
  const potentialRevenue = calcPotential(lead.dealValue, analysis.recoveryProbability);

  return (
    <div className={`group relative rounded-[16px] border bg-white p-[18px] shadow-premium transition-all duration-200 hover:-translate-y-[1px] ${priority ? "border-[#0A0A0B] ring-1 ring-[#0A0A0B] shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.14)]" : recovered ? "border-[#059669]/30 bg-[#ECFDF5]/40 hover:border-[#059669]/40 hover:shadow-[0_8px_24px_rgba(5,150,105,0.12)]" : contacted ? "border-[#3B82F6]/20 bg-[#EFF6FF]/40 hover:border-[#3B82F6]/30" : "border-[#E4E4E7]/80 hover:border-[#0A0A0B]/15 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"}`}>
      {priority && <div className="absolute -top-2 -right-2 rounded-full bg-[#EF4444] text-white text-[9px] font-[800] tracking-[0.05em] px-2 py-1 shadow-[0_2px_8px_rgba(239,68,68,0.3)] animate-[pulse-subtle_2s_ease-in-out_infinite]">TOP PRIORITY</div>}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/leads/${lead.id}`} className="flex items-center gap-2.5 group/name">
              <div className="h-[36px] w-[36px] rounded-full bg-[#0A0A0B] text-white flex items-center justify-center text-[12px] font-[750] shadow-sm group-hover/name:shadow-[0_4px_12px_rgba(0,0,0,0.15)] group-hover/name:scale-105 transition-all">{(lead.name || "U")[0].toUpperCase()}</div>
              <span className="font-[700] text-[13.5px] tracking-[-0.01em] group-hover/name:underline underline-offset-4">{lead.name || "Unnamed"}</span>
            </Link>
            {lead.isDemo && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] font-[700]">DEMO</span>}
            <Badge variant={analysis.recoveryScore >= 80 ? "critical" : analysis.recoveryScore >= 60 ? "high" : "medium"} className="group-hover:scale-105 transition-transform">{analysis.recoveryScore}</Badge>
            {contacted && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1D4ED8] font-[700] border border-[#BFDBFE]">CONTACTED</span>}
            {recovered && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#065F46] font-[700] border border-[#A7F3D0]">RECOVERED</span>}
            <span className="text-[12px] text-[#71717A]">• {lead.company || ""}</span>
            <span className="hidden lg:inline text-[10px] font-[500] text-[#A1A1AA]">• {lead.product || ""}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px]">
            <span className="inline-flex items-center gap-1.5"><span className="text-[#71717A]">Deal:</span> <span className="font-[700] font-mono-financial">₽{toNum(lead.dealValue) ? Math.round(toNum(lead.dealValue)!).toLocaleString("ru-RU") : "—"}</span></span>
            <span className="inline-flex items-center gap-1.5"><span className="text-[#71717A]">Est.:</span> <span className="font-[800] font-mono-financial">{potentialRevenue ? `₽${Math.round(potentialRevenue).toLocaleString("ru-RU")}` : "—"}</span> <span className="text-[10px] text-[#A1A1AA]">Est. not guaranteed</span></span>
            <span className="inline-flex items-center gap-1.5"><span className="text-[#71717A]">Prob:</span> <span className="font-[650]">{analysis.recoveryProbability ? `${Math.round(analysis.recoveryProbability * 100)}%` : "—"}</span> <span className="h-1 w-1 rounded-full bg-[#D4D4D8]" /> {analysis.confidence}</span>
            <span className="inline-flex items-center gap-1.5"><span className="text-[#71717A]">Last:</span> {lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleDateString("ru-RU") : "—"}</span>
          </div>

          <div className="mt-3.5">
            <div className="flex items-center gap-2"><div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">WHY THIS OPPORTUNITY?</div><div className="h-px flex-1 bg-[#F4F4F5] hidden md:block" /></div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(factors.length > 0 ? factors : [{ explanation: analysis.reasoningSummary, type: "positive" }]).slice(0, 4).map((f: any, i: number) => (
                <span key={i} className={`group/chip text-[11px] px-2.5 py-1 rounded-full border font-[500] transition-all hover:-translate-y-[0.5px] hover:shadow-sm ${f.type === "negative" ? "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B] hover:bg-white hover:border-[#EF4444]/30" : "bg-[#F9FAFB] border-[#E4E4E7] text-[#18181B] hover:bg-white hover:border-[#0A0A0B]/15"}`}>
                  {f.explanation || f.raw || "Signal"}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2.5 flex-wrap">
            <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">RECOMMENDED:</div>
            <span className="text-[11px] font-[800] px-2.5 py-1 rounded-full bg-[#0A0A0B] text-white shadow-sm group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.15)] group-hover:scale-105 transition-all">{analysis.recommendedAction?.replace(/_/g, " ").toUpperCase()}</span>
            <span className="text-[11px] font-[500] tracking-[-0.01em] text-[#52525B]">• {analysis.recommendedMessageGoal}</span>
          </div>
        </div>

        <div className="flex lg:flex-col gap-2 shrink-0 lg:w-[160px]">
          <Link href={`/leads/${lead.id}`} className="flex-1 lg:flex-none h-[36px] px-4 inline-flex items-center justify-center gap-1 rounded-[10px] bg-[#0A0A0B] text-white text-[12px] font-[650] shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:bg-[#1A1D23] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] transition-all">View →</Link>
          <div className="flex-1 lg:flex-none text-center lg:text-right">
            <div className="text-[10px] font-[800] tracking-[0.06em] text-[#71717A]">EST. RECOVERABLE</div>
            <div className="font-mono-financial font-[750] text-[13px] tracking-[-0.02em]">{potentialRevenue ? `₽${Math.round(potentialRevenue).toLocaleString("ru-RU")}` : "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
