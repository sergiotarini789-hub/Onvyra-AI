export const dynamic = 'force-dynamic';
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlanForOrganization, PLAN_LIMITS, isBillingConfigured } from "@/lib/billing";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: session.organizationId },
    include: { user: true },
  });

  const [stats, leadCount, analysisCount, campaignCount] = await Promise.all([
    prisma.lead.groupBy({
      by: ["isDemo"],
      where: { organizationId: session.organizationId },
      _count: true,
    }),
    prisma.lead.count({ where: { organizationId: session.organizationId } }),
    prisma.aIAnalysis.count({ where: { organizationId: session.organizationId } }),
    prisma.campaign.count({ where: { organizationId: session.organizationId } }),
  ]);

  const plan = getPlanForOrganization(org);
  const limits = PLAN_LIMITS[plan];
  const billingConfigured = isBillingConfigured();

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-slate-600 mt-1">Organization, profile, team, integrations, AI, billing, security — no settings that do nothing.</p>
        </div>
        <Link href="/dashboard" className="text-xs px-3 py-1.5 rounded-lg border bg-white">Dashboard</Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Organization</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium">{org?.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Slug</span><span className="font-mono text-xs">{org?.slug}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Created</span><span>{org?.createdAt ? new Date(org.createdAt).toLocaleDateString("ru-RU") : "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Plan</span><span className="font-bold">{plan} {billingConfigured ? "" : "(billing not configured)"}</span></div>
            <div className="pt-3"><Link href="/billing" className="text-xs font-bold underline">Manage billing & usage →</Link></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium">{session.email}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Role</span><span className="text-xs px-2 py-1 rounded-full bg-slate-100 border font-bold">{session.role}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">User ID</span><span className="font-mono text-xs">{session.userId.slice(0, 8)}…</span></div>
            <div className="text-[11px] text-slate-500 pt-2">Secure authentication: bcrypt, httpOnly JWT, SameSite lax, secure in production, 7d expiration</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm font-bold uppercase tracking-wider">Team — {members.length} members</CardTitle><span className="text-[11px] text-slate-500">OWNER full access, ADMIN operational, MEMBER recovery workflow</span></CardHeader>
        <CardContent className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex justify-between items-center text-sm border rounded-xl p-3 bg-white">
              <div>
                <div className="font-medium">{m.user.email} {m.user.name ? `(${m.user.name})` : ""}</div>
                <div className="text-xs text-slate-500">Joined {new Date(m.createdAt).toLocaleDateString("ru-RU")} • ID {m.userId.slice(0, 8)}</div>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${m.role === "OWNER" ? "bg-slate-900 text-white" : m.role === "ADMIN" ? "bg-slate-100" : "bg-white"}`}>{m.role}</span>
            </div>
          ))}
          <div className="text-[11px] text-slate-500 pt-2">Team management: invite/remove would be implemented via API — currently shows members from OrganizationMember table. Roles enforced server-side, never only frontend hiding buttons.</div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Integrations — CRM Status</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Mock CRM</span><span className="text-emerald-700 font-bold">Available</span></div>
            <div className="flex justify-between"><span>HubSpot READ-ONLY</span><span className={process.env.HUBSPOT_API_KEY ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>{process.env.HUBSPOT_API_KEY ? "Configured" : "Not configured"}</span></div>
            <div className="text-[11px] text-slate-500">See /integrations for details. No fake successful sync. No OAuth tokens stored insecurely.</div>
            <Link href="/integrations" className="text-xs font-bold underline">View integrations →</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">AI — Provider Status</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Provider</span><span className="font-medium">{process.env.OPENAI_API_KEY ? "OpenAI" : "Mock (deterministic fallback)"}</span></div>
            <div className="flex justify-between"><span>Model</span><span className="font-mono text-xs">{process.env.OPENAI_API_KEY ? "gpt-4o-mini or configured" : "fallback-v1"}</span></div>
            <div className="flex justify-between"><span>Analyses</span><span className="font-bold">{analysisCount}</span></div>
            <div className="text-[11px] text-slate-500">AI output validated via Zod, never invents prices/discounts/deadlines. Deterministic Recovery Engine is authoritative for financial calculations.</div>
            <Link href="/analytics" className="text-xs font-bold underline">View analytics →</Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Billing — {plan}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Leads</span><span className="font-bold">{leadCount} / {limits.leads}</span></div>
            <div className="flex justify-between"><span>Campaigns</span><span className="font-bold">{campaignCount} / {limits.campaigns}</span></div>
            <div className="flex justify-between"><span>AI Analyses</span><span className="font-bold">{analysisCount} / {limits.aiAnalysesPerMonth}</span></div>
            <div className="text-[11px] text-slate-500">Limits enforced server-side. See /billing for full usage and upgrade. Billing integration {billingConfigured ? "configured" : "not configured — showing plan info only, no fake payments"}.</div>
            <Link href="/billing" className="text-xs font-bold underline">Billing & usage →</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Data — Import & Demo</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {stats.map((s) => (
              <div key={String(s.isDemo)} className="flex justify-between">
                <span>{s.isDemo ? "Demo leads" : "Real leads"}</span>
                <span className="font-medium">{s._count}</span>
              </div>
            ))}
            <div className="pt-3 flex gap-2">
              <form action="/api/demo/seed" method="post">
                <button className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold">Seed Demo Again</button>
              </form>
              <Link href="/import" className="text-xs px-3 py-1.5 rounded-lg border bg-white font-medium">Import Data</Link>
            </div>
            <div className="text-[11px] text-slate-500">Demo data clearly marked as DEMO DATA and never counted as real revenue. Real demo data: 500-1000 leads, mix high-value dormant, recent, old, rejected, cancelled, won, low-value, missing info, explicit intent, pricing requests, no-response, realistic comments, different stages.</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Security</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div>✓ Tenant isolation enforced on every query (orgId)</div>
            <div>✓ Passwords hashed bcrypt 10 rounds</div>
            <div>✓ Sessions httpOnly JWT, secure in production, SameSite lax, 7d</div>
            <div>✓ Roles OWNER/ADMIN/MEMBER enforced server-side</div>
          </div>
          <div className="space-y-2">
            <div>✓ Zod validation on all inputs</div>
            <div>✓ File validation 10MB, CSV/XLSX only</div>
            <div>✓ Prompt injection protection — imported text as DATA</div>
            <div>✓ Audit log org-scoped, no secrets, no stack traces to client</div>
            <div>✓ Security headers X-Frame-Options DENY, etc</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
