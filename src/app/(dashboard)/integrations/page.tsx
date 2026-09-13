export const dynamic = 'force-dynamic';
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import IntegrationsClient from "./client";

export default async function IntegrationsPage({ searchParams }: { searchParams?: { success?: string; error?: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Fetch integrations for this org
  let integrations: any[] = [];
  try {
    integrations = await prisma.integration.findMany({
      where: { organizationId: session.organizationId },
    });
  } catch {}

  const hubspotIntegration = integrations.find((i: any) => i.provider === "HUBSPOT");
  
  const providers = [
    { 
      id: "mock", 
      name: "Mock CRM", 
      description: "Development provider with sample data", 
      status: "available", 
      docs: "Always available for testing",
      connected: false,
    },
    { 
      id: "hubspot", 
      name: "HubSpot", 
      description: "Read-only sync: contacts, deals, activities via OAuth 2.0", 
      status: process.env.HUBSPOT_CLIENT_ID ? "configured" : "not_configured", 
      docs: process.env.HUBSPOT_CLIENT_ID ? "OAuth configured - click Connect" : "Requires HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET env",
      connected: hubspotIntegration?.status === "CONNECTED",
      integration: hubspotIntegration,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-slate-600 mt-1">Connect your CRM for read-only sync. No auto-send, no fake synchronization. Imported data treated as DATA, not instructions.</p>
      </div>

      {searchParams?.success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
          <div className="font-bold">Success</div>
          <div className="mt-1">{searchParams.success === "hubspot_connected" ? "HubSpot connected successfully! You can now sync contacts and deals." : searchParams.success}</div>
        </div>
      )}

      {searchParams?.error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          <div className="font-bold">Error</div>
          <div className="mt-1">{searchParams.error}</div>
        </div>
      )}

      <IntegrationsClient providers={providers} orgId={session.organizationId} />

      <Card>
        <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">How CRM Sync Works (READ-ONLY)</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-6 text-xs">
          <div>
            <div className="font-bold">1. Connect via OAuth</div>
            <div className="mt-2 text-slate-600 leading-relaxed">Secure OAuth 2.0 with state verification (CSRF protection). Tokens encrypted at rest. READ-ONLY scopes only.</div>
          </div>
          <div>
            <div className="font-bold">2. Fetch & Map (Idempotent)</div>
            <div className="mt-2 text-slate-600 leading-relaxed">Fetch contacts, deals, activities with pagination. Map fields to Onvyra standard. Idempotent sync via externalId - same record won&apos;t create duplicates.</div>
          </div>
          <div>
            <div className="font-bold">3. Sync Status & Errors</div>
            <div className="mt-2 text-slate-600 leading-relaxed">Show sync status, last sync time, records fetched, errors. No automatic message sending. Human approval required. Failure handling with retry.</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 text-white border-slate-900">
        <CardContent className="pt-6">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Security & Principles</div>
          <div className="mt-3 grid md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div>• READ-ONLY in MVP — no write operations to CRM</div>
            <div>• OAuth 2.0 with state parameter — prevents CSRF</div>
            <div>• Token encryption at rest — AES-256-GCM</div>
            <div>• No secrets in logs — API keys never logged</div>
            <div>• Idempotent sync — externalId prevents duplicates</div>
            <div>• Tenant isolation — sync scoped by organizationId</div>
            <div>• Prompt injection protection — customer content treated as DATA</div>
            <div>• Honest UI — shows &quot;not configured&quot; when env missing</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Production Readiness</CardTitle></CardHeader>
        <CardContent className="text-xs text-slate-600 space-y-3">
          <div><span className="font-bold">OAuth Flow:</span> Authorization code flow with state verification, token exchange server-side, refresh token handling, 401 auto-refresh.</div>
          <div><span className="font-bold">Rate Limits:</span> Respects HubSpot rate limits (Retry-After header), exponential backoff, max 5 sync/min per org.</div>
          <div><span className="font-bold">Idempotency:</span> Uses externalId = hubspot:contact:id or hubspot:deal:id for deduplication. Unique constraint on (orgId, externalId).</div>
          <div><span className="font-bold">Failure Handling:</span> Partial sync allowed (contacts ok, deals fail), errors stored in lastSyncError, retry available, never blocks existing data.</div>
          <div><span className="font-bold">Billing:</span> CRM integrations limited by plan - FREE 0, PRO 1, BUSINESS 5. Server-side enforcement.</div>
        </CardContent>
      </Card>
    </div>
  );
}
