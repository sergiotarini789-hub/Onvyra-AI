export const dynamic = 'force-dynamic';
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCRMProvider } from "@/lib/crm";
import Link from "next/link";

export default async function IntegrationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const providers = [
    { id: "mock", name: "Mock CRM", description: "Development provider with sample data", status: "available", docs: "Always available for testing" },
    { id: "hubspot", name: "HubSpot", description: "Read-only sync: contacts, deals, activities", status: process.env.HUBSPOT_API_KEY ? "configured" : "not_configured", docs: "Requires HUBSPOT_API_KEY env" },
  ];

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-slate-600 mt-1">Connect your CRM for read-only sync. No auto-send, no fake synchronization. Imported data treated as DATA, not instructions.</p>
      </div>

      <Card className="border-slate-900">
        <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">CRM Providers</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {providers.map((p) => {
            let providerInstance: any = null;
            try { providerInstance = getCRMProvider(p.id as any); } catch {}
            const configured = providerInstance?.isConfigured?.() ?? (p.status === "available" || p.status === "configured");
            return (
              <div key={p.id} className="rounded-xl border p-5 flex justify-between items-start gap-4">
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">{p.name[0]}</div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-2">
                      {p.name}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${configured ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>{configured ? "READY" : "NOT CONFIGURED"}</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{p.description}</div>
                    <div className="text-[11px] text-slate-500 mt-2">{p.docs}</div>
                    {p.id === "hubspot" && !configured && (
                      <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-800">
                        <div className="font-bold">HubSpot integration not configured</div>
                        <div className="mt-1">Set <span className="font-mono">HUBSPOT_API_KEY</span> env variable. Implementation is READ-ONLY, no write operations, no auto-send. See <span className="font-mono">src/lib/crm/hubspot.ts</span> for API mapping.</div>
                      </div>
                    )}
                    {p.id === "hubspot" && configured && (
                      <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-[11px] text-emerald-800">
                        <div className="font-bold">HubSpot READ-ONLY provider configured</div>
                        <div className="mt-1">Capabilities: Connect, Test connection, Fetch contacts/deals/activities, Map fields, Import/sync, Show sync status. No automatic message sending.</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {configured ? (
                    <Link href="/import" className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-center">Import via CRM</Link>
                  ) : (
                    <span className="text-xs px-3 py-1.5 rounded-lg border bg-slate-50 text-slate-500 text-center">Not configured</span>
                  )}
                  <Link href="/settings" className="text-[11px] text-slate-500 underline text-center">Settings</Link>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">How CRM Sync Works (READ-ONLY)</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-6 text-xs">
          <div>
            <div className="font-bold">1. Connect</div>
            <div className="mt-2 text-slate-600 leading-relaxed">Test connection with API key, verify read permissions. No OAuth tokens stored insecurely, no secrets logged.</div>
          </div>
          <div>
            <div className="font-bold">2. Fetch & Map</div>
            <div className="mt-2 text-slate-600 leading-relaxed">Fetch contacts, deals, activities. Map fields to Onvyra standard fields. Preview before import. Treat CRM data as DATA not instructions.</div>
          </div>
          <div>
            <div className="font-bold">3. Sync Status</div>
            <div className="mt-2 text-slate-600 leading-relaxed">Show sync status, last sync time, records fetched, errors. No automatic message sending. Human approval required for all outreach.</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 text-white border-slate-900">
        <CardContent className="pt-6">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Security & Principles</div>
          <div className="mt-3 grid md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div>• READ-ONLY in MVP — no write operations to CRM</div>
            <div>• No auto-send — you review and approve all messages</div>
            <div>• No secrets in logs — API keys never logged</div>
            <div>• Prompt injection protection — customer content treated as DATA</div>
            <div>• Tenant isolation — sync scoped by organizationId</div>
            <div>• Do not claim live sync if not configured — honest UI</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
