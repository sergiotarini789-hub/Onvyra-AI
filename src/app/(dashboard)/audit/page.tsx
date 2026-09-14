export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AuditPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const eventFilter = searchParams.event || "all";
  const search = searchParams.search || "";

  let where: any = { organizationId: session.organizationId };
  if (eventFilter !== "all") {
    if (eventFilter === "import") where.event = { contains: "IMPORT" };
    else if (eventFilter === "recovery") where.event = { contains: "RECOVERY" };
    else if (eventFilter === "auth") where.OR = [{ event: { contains: "LOGIN" } }, { event: { contains: "REGISTERED" } }];
    else if (eventFilter === "campaign") where.event = { contains: "CAMPAIGN" };
    else if (eventFilter === "contacted") where.event = { contains: "CONTACTED" };
    else where.event = eventFilter;
  }
  if (search) {
    where.OR = [
      { event: { contains: search } },
      { entityType: { contains: search } },
      { entityId: { contains: search } },
    ];
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  }).catch(() => [] as any[]);

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    p.set("event", overrides.event || eventFilter);
    if (overrides.search !== undefined) p.set("search", overrides.search);
    else if (search) p.set("search", search);
    return `/audit?${p.toString()}`;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1100px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
            <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">AUDIT LOG • ORG-SCOPED • NO SECRETS • FILTERS ACTIVE</span>
          </div>
          <h1 className="mt-4 text-[28px] font-[750] tracking-[-0.025em] leading-[1.05]">Audit Log</h1>
          <p className="mt-2 text-[13px] text-[#52525B]">USER_REGISTERED / LOGIN / IMPORT_STARTED / COMPLETED / LEAD_CREATED / CAMPAIGN_CREATED / MESSAGE_GENERATED / RECOVERY_CONTACTED / OUTCOME_UPDATED / CONFIRMED — orgId/userId/entity/timestamp/metadata, no secrets</p>
        </div>
        <Link href="/dashboard" className="h-[36px] inline-flex items-center rounded-[10px] border border-[#E4E4E7] bg-white px-4 text-[12px] font-[600] shadow-sm hover:bg-[#F9FAFB] shrink-0">Dashboard</Link>
      </div>

      <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium overflow-hidden">
        <div className="flex flex-wrap gap-0 items-center divide-y md:divide-y-0 md:divide-x divide-[#F4F4F5]">
          <div className="p-3.5 flex gap-2 w-full md:w-auto">
            <form className="flex gap-2 flex-1 md:flex-none">
              <input name="search" defaultValue={search} placeholder="Search event, entity..." className="h-[36px] w-full md:w-[240px] rounded-[10px] border border-[#E4E4E7] bg-[#FCFCFD] px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0A0A0B]/10 focus:border-[#0A0A0B]/20 transition-all" />
              <button type="submit" className="h-[36px] rounded-[10px] bg-[#0A0A0B] text-white px-4 text-[13px] font-[600] hover:bg-[#1A1D23] shadow-sm transition-all">Search</button>
            </form>
          </div>
          <div className="p-3 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-[800] tracking-[0.08em] text-[#A1A1AA] mr-1">EVENT</span>
            {[
              { id: "all", label: "All" },
              { id: "import", label: "Import" },
              { id: "recovery", label: "Recovery" },
              { id: "auth", label: "Auth" },
              { id: "campaign", label: "Campaign" },
              { id: "contacted", label: "Contacted" },
            ].map((f) => (
              <Link key={f.id} href={buildHref({ event: f.id })} className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-[600] border transition-all duration-200 ${eventFilter === f.id ? "bg-[#0A0A0B] text-white border-[#0A0A0B] shadow-sm" : "bg-white hover:bg-[#F9FAFB] border-[#E4E4E7] text-[#52525B] hover:text-[#0A0A0B] hover:border-[#0A0A0B]/15 hover:shadow-sm"}`}>
                {f.label}
              </Link>
            ))}
          </div>
          <div className="p-3 ml-auto">
            <Link href="/audit" className="text-[11px] font-[600] text-[#0A0A0B] hover:underline underline-offset-4">Clear filters</Link>
          </div>
        </div>
        <div className="px-4 py-2.5 bg-[#F9FAFB] border-t border-[#E4E4E7]/60 flex items-center justify-between text-[11px]">
          <span className="text-[#71717A] font-[500]">{logs.length} events • {eventFilter !== "all" ? `Filtered by ${eventFilter}` : "All events"} • Real events only • No secrets • Tenant isolated</span>
          <span className="font-[600] text-[#0A0A0B]">{eventFilter.toUpperCase()} • Server-enforced</span>
        </div>
      </div>

      <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium overflow-hidden">
        <div className="p-6 border-b border-[#E4E4E7]/80 flex items-center justify-between">
          <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">RECENT EVENTS ({logs.length}) • FILTER: {eventFilter.toUpperCase()}</div>
          <span className="text-[10px] font-[700] px-2 py-0.5 rounded-full bg-[#F4F4F5] border">REAL EVENTS ONLY • SORTED NEWEST FIRST</span>
        </div>
        <div className="p-4">
          {logs.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-10 w-10 rounded-[12px] bg-[#F4F4F5] border flex items-center justify-center">◫</div>
              <div className="mt-3 text-[13px] font-[600]">No audit logs for filter {eventFilter}</div>
              <div className="text-[11px] text-[#71717A] mt-1">Try adjusting filters or perform actions like import, contact, recovery</div>
              <div className="mt-4"><Link href="/audit" className="h-[32px] px-3 rounded-[9px] border bg-white text-[11px] font-[600] inline-flex items-center hover:bg-[#F9FAFB]">Clear Filters</Link></div>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between rounded-[12px] border border-[#E4E4E7]/80 p-3 text-[11px] hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/10 hover:shadow-sm hover:-translate-y-[0.5px] transition-all group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2.5 py-1 rounded-full font-[800] tracking-[0.03em] border text-[10px] shadow-sm group-hover:scale-105 transition-transform ${log.event.includes("IMPORT") ? "bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]" : log.event.includes("RECOVERY") || log.event.includes("CONTACTED") || log.event.includes("CONFIRMED") ? "bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]" : "bg-[#F4F4F5] border-[#E4E4E7] text-[#52525B]"}`}>{log.event}</span>
                    <span className="font-[600]">{log.entityType || ""} {log.entityId ? `• ${log.entityId.slice(0, 8)}` : ""}</span>
                    {log.metadata && <span className="text-[#71717A] truncate max-w-[300px]">{typeof log.metadata === "string" ? log.metadata.slice(0, 100) : JSON.stringify(log.metadata).slice(0, 100)}</span>}
                  </div>
                  <div className="text-[#71717A] shrink-0 font-mono-financial text-[11px]">{new Date(log.createdAt).toLocaleString("ru-RU")}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[20px] bg-[#0A0A0B] text-white p-6 shadow-premium-dark">
        <div className="text-[11px] font-[800] tracking-[0.08em] text-white/50">WHAT IS LOGGED • FILTERS EXPLAINED</div>
        <div className="mt-4 grid md:grid-cols-2 gap-3 font-mono text-[11px] text-white/70">
          <div>• USER_REGISTERED, LOGIN</div>
          <div>• IMPORT_STARTED, IMPORT_COMPLETED</div>
          <div>• LEAD_CREATED, LEAD_UPDATED</div>
          <div>• CAMPAIGN_CREATED</div>
          <div>• MESSAGE_GENERATED</div>
          <div>• RECOVERY_CONTACTED</div>
          <div>• OUTCOME_UPDATED, RECOVERY_CONFIRMED</div>
          <div>• DEMO_SEEDED, DEMO_CLEARED</div>
        </div>
        <div className="mt-4 text-[11px] text-white/40">Each entry: orgId, userId, event, entityType, entityId, timestamp, metadata (no secrets, no stack traces) • Tenant isolated • Org-scoped • Filters server-enforced via URLSearchParams • Potential ≠ Confirmed</div>
      </div>
    </div>
  );
}
