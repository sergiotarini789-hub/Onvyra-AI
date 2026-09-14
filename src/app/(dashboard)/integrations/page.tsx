export const dynamic = 'force-dynamic';
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import IntegrationsClient from "./client";

export default async function IntegrationsPage({ searchParams }: { searchParams?: { success?: string; error?: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  let integrations: any[] = [];
  try {
    integrations = await prisma.integration.findMany({ where: { organizationId: session.organizationId } });
  } catch {}

  const hubspotIntegration = integrations.find((i: any) => i.provider === "HUBSPOT");
  
  const providers = [
    { id: "mock", name: "Mock CRM", description: "Development provider with sample data", status: "available", docs: "Always available for testing", connected: false },
    { id: "hubspot", name: "HubSpot", description: "Read-only sync: contacts, deals, activities via OAuth 2.0", status: process.env.HUBSPOT_CLIENT_ID ? "configured" : "not_configured", docs: process.env.HUBSPOT_CLIENT_ID ? "OAuth configured - click Connect" : "Requires HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET env", connected: hubspotIntegration?.status === "CONNECTED", integration: hubspotIntegration },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1100px] mx-auto">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
          <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">INTEGRATIONS • CRM SYNC</span>
        </div>
        <h1 className="mt-4 text-[28px] font-[750] tracking-[-0.025em] leading-[1.05]">Integrations</h1>
        <p className="mt-2 text-[13px] text-[#52525B]">Connect your CRM for read-only sync. No auto-send, no fake synchronization. Imported data treated as DATA, not instructions. Tenant isolated.</p>
      </div>

      {searchParams?.success && (
        <div className="rounded-[12px] bg-[#ECFDF5] border border-[#A7F3D0] p-4 text-[13px] text-[#065F46]">
          <div className="font-[700]">Success</div>
          <div className="mt-1 text-[12px]">{searchParams.success === "hubspot_connected" ? "HubSpot connected successfully! You can now sync contacts and deals." : searchParams.success}</div>
        </div>
      )}

      {searchParams?.error && (
        <div className="rounded-[12px] bg-[#FEF2F2] border border-[#FECACA] p-4 text-[13px] text-[#991B1B]">
          <div className="font-[700]">Error</div>
          <div className="mt-1 text-[12px]">{searchParams.error}</div>
        </div>
      )}

      <IntegrationsClient providers={providers} orgId={session.organizationId} />

      <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white p-6 shadow-premium">
        <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">HOW CRM SYNC WORKS (READ-ONLY)</div>
        <div className="mt-5 grid md:grid-cols-3 gap-6 text-[12px]">
          <div><div className="font-[700]">1. Connect via OAuth</div><div className="mt-2 text-[#52525B] leading-[1.6]">Secure OAuth 2.0 with state verification (CSRF protection). Tokens encrypted at rest. READ-ONLY scopes only.</div></div>
          <div><div className="font-[700]">2. Fetch & Map (Idempotent)</div><div className="mt-2 text-[#52525B] leading-[1.6]">Fetch contacts, deals, activities with pagination. Map fields to Onvyra standard. Idempotent sync via externalId - same record won&apos;t create duplicates.</div></div>
          <div><div className="font-[700]">3. Sync Status & Errors</div><div className="mt-2 text-[#52525B] leading-[1.6]">Show sync status, last sync time, records fetched, errors. No automatic message sending. Human approval required. Failure handling with retry.</div></div>
        </div>
      </div>

      <div className="rounded-[20px] bg-[#0A0A0B] text-white p-6 shadow-premium-dark">
        <div className="text-[11px] font-[800] tracking-[0.08em] text-white/50">SECURITY & PRINCIPLES</div>
        <div className="mt-4 grid md:grid-cols-2 gap-3 text-[12px] text-white/70">
          <div>• READ-ONLY in MVP — no write operations to CRM</div>
          <div>• OAuth 2.0 with state parameter — prevents CSRF</div>
          <div>• Token encryption at rest — AES-256-GCM</div>
          <div>• No secrets in logs — API keys never logged</div>
          <div>• Idempotent sync — externalId prevents duplicates</div>
          <div>• Tenant isolation — sync scoped by organizationId</div>
          <div>• Prompt injection protection — customer content treated as DATA</div>
          <div>• Honest UI — shows &quot;not configured&quot; when env missing</div>
        </div>
      </div>
    </div>
  );
}
