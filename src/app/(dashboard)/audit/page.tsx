export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AuditPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  }).catch(() => [] as any[]);

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-slate-600 mt-1">USER_REGISTERED / LOGIN / IMPORT_STARTED / COMPLETED / LEAD_CREATED / CAMPAIGN_CREATED / MESSAGE_GENERATED / RECOVERY_CONTACTED / OUTCOME_UPDATED / CONFIRMED — orgId/userId/entity/timestamp/metadata, no secrets</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Recent Events ({logs.length})</CardTitle></CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No audit logs yet — actions like import, contact, recovery will appear here</div>
          ) : (
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between rounded-xl border p-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2 py-1 rounded-full font-bold border text-[10px] ${log.event.includes("IMPORT") ? "bg-blue-100 text-blue-700" : log.event.includes("RECOVERY") || log.event.includes("CONTACTED") || log.event.includes("CONFIRMED") ? "bg-emerald-100 text-emerald-700" : "bg-slate-100"}`}>{log.event}</span>
                    <span className="font-medium">{log.entityType || ""} {log.entityId ? `• ${log.entityId.slice(0, 8)}` : ""}</span>
                    {log.metadata && <span className="text-slate-500 truncate max-w-[300px]">{typeof log.metadata === "string" ? log.metadata.slice(0, 100) : JSON.stringify(log.metadata).slice(0, 100)}</span>}
                  </div>
                  <div className="text-slate-500 shrink-0">{new Date(log.createdAt).toLocaleString("ru-RU")}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900 text-white border-slate-900">
        <CardContent className="pt-6 text-xs">
          <div className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">What is logged</div>
          <div className="mt-3 grid md:grid-cols-2 gap-4 font-mono text-slate-300">
            <div>• USER_REGISTERED, LOGIN</div>
            <div>• IMPORT_STARTED, IMPORT_COMPLETED</div>
            <div>• LEAD_CREATED, LEAD_UPDATED</div>
            <div>• CAMPAIGN_CREATED</div>
            <div>• MESSAGE_GENERATED</div>
            <div>• RECOVERY_CONTACTED</div>
            <div>• OUTCOME_UPDATED, RECOVERY_CONFIRMED</div>
            <div>• DEMO_SEEDED, DEMO_CLEARED</div>
          </div>
          <div className="mt-4 text-[11px] text-slate-400">Each entry: orgId, userId, event, entityType, entityId, timestamp, metadata (no secrets, no stack traces)</div>
        </CardContent>
      </Card>
    </div>
  );
}
