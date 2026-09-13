export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuditPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  }).catch(() => [] as any[]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1100px] mx-auto">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
          <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">AUDIT LOG • ORG-SCOPED • NO SECRETS</span>
        </div>
        <h1 className="mt-4 text-[28px] font-[750] tracking-[-0.025em] leading-[1.05]">Audit Log</h1>
        <p className="mt-2 text-[13px] text-[#52525B]">USER_REGISTERED / LOGIN / IMPORT_STARTED / COMPLETED / LEAD_CREATED / CAMPAIGN_CREATED / MESSAGE_GENERATED / RECOVERY_CONTACTED / OUTCOME_UPDATED / CONFIRMED — orgId/userId/entity/timestamp/metadata, no secrets</p>
      </div>

      <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white shadow-premium overflow-hidden">
        <div className="p-6 border-b border-[#E4E4E7]/80 flex items-center justify-between">
          <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">RECENT EVENTS ({logs.length})</div>
          <span className="text-[10px] font-[700] px-2 py-0.5 rounded-full bg-[#F4F4F5] border">REAL EVENTS ONLY</span>
        </div>
        <div className="p-4">
          {logs.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-10 w-10 rounded-[12px] bg-[#F4F4F5] border flex items-center justify-center">◫</div>
              <div className="mt-3 text-[13px] font-[600]">No audit logs yet</div>
              <div className="text-[11px] text-[#71717A] mt-1">Actions like import, contact, recovery will appear here</div>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between rounded-[12px] border border-[#E4E4E7]/80 p-3 text-[11px] hover:bg-[#F9FAFB] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2.5 py-1 rounded-full font-[800] tracking-[0.03em] border text-[10px] ${log.event.includes("IMPORT") ? "bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]" : log.event.includes("RECOVERY") || log.event.includes("CONTACTED") || log.event.includes("CONFIRMED") ? "bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]" : "bg-[#F4F4F5] border-[#E4E4E7] text-[#52525B]"}`}>{log.event}</span>
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
        <div className="text-[11px] font-[800] tracking-[0.08em] text-white/50">WHAT IS LOGGED</div>
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
        <div className="mt-4 text-[11px] text-white/40">Each entry: orgId, userId, event, entityType, entityId, timestamp, metadata (no secrets, no stack traces) • Tenant isolated • Org-scoped</div>
      </div>
    </div>
  );
}
