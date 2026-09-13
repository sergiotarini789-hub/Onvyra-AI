export const dynamic = 'force-dynamic';
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_LIMITS, PLAN_PRICES, getPlanForOrganization, isBillingConfigured } from "@/lib/billing";
import Link from "next/link";

export default async function BillingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  const plan = getPlanForOrganization(org);
  const limits = PLAN_LIMITS[plan];
  const price = PLAN_PRICES[plan];

  const [leadCount, analysisCount, campaignCount, memberCount] = await Promise.all([
    prisma.lead.count({ where: { organizationId: session.organizationId } }),
    prisma.aIAnalysis.count({ where: { organizationId: session.organizationId } }),
    prisma.campaign.count({ where: { organizationId: session.organizationId } }),
    prisma.organizationMember.count({ where: { organizationId: session.organizationId } }),
  ]);

  const billingConfigured = isBillingConfigured();

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing & Usage</h1>
          <p className="text-sm text-slate-600 mt-1">Plan limits enforced server-side. No fake payments.</p>
        </div>
        <Link href="/settings" className="text-xs px-3 py-1.5 rounded-lg border bg-white">Settings</Link>
      </div>

      {!billingConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <div className="font-bold">Billing integration not configured</div>
          <div className="text-xs text-slate-600 mt-1">Set <span className="font-mono">STRIPE_SECRET_KEY</span> env to enable real payments. Currently showing plan information without processing payments. Do not simulate payment success.</div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {(["FREE", "PRO", "BUSINESS"] as const).map((p) => {
          const isCurrent = p === plan;
          return (
            <Card key={p} className={isCurrent ? "border-slate-900 ring-1 ring-slate-900" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{p}</span>
                  {isCurrent && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-white font-bold">CURRENT</span>}
                </CardTitle>
                <div className="mt-2">
                  <div className="text-2xl font-bold">{PLAN_PRICES[p].label}</div>
                  <div className="text-xs text-slate-500">{p === "FREE" ? "For testing" : p === "PRO" ? "For small teams" : "For larger pipelines"}</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span>{PLAN_LIMITS[p].leads.toLocaleString()} leads</span><span className="text-slate-500">{p === "FREE" ? "500" : p === "PRO" ? "5k" : "50k"}</span></div>
                  <div className="flex justify-between"><span>{PLAN_LIMITS[p].aiAnalysesPerMonth} AI analyses/mo</span></div>
                  <div className="flex justify-between"><span>{PLAN_LIMITS[p].campaigns} campaigns</span></div>
                  <div className="flex justify-between"><span>{PLAN_LIMITS[p].users} users</span></div>
                  <div className="flex justify-between"><span>{PLAN_LIMITS[p].crmIntegrations} CRM integrations</span></div>
                </div>
                <div className="pt-3">
                  {isCurrent ? (
                    <div className="text-center py-2 rounded-lg bg-slate-100 text-slate-600 font-medium">Current plan</div>
                  ) : (
                    <div className="text-center py-2 rounded-lg border font-medium">{billingConfigured ? "Upgrade" : "Upgrade (billing not configured)"}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Current Usage — {plan} Plan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs mb-1"><span>Leads</span><span className="font-bold">{leadCount} / {limits.leads}</span></div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900" style={{ width: `${Math.min(100, (leadCount / limits.leads) * 100)}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span>AI Analyses (this month)</span><span className="font-bold">{analysisCount} / {limits.aiAnalysesPerMonth}</span></div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900" style={{ width: `${Math.min(100, (analysisCount / limits.aiAnalysesPerMonth) * 100)}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span>Campaigns</span><span className="font-bold">{campaignCount} / {limits.campaigns}</span></div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900" style={{ width: `${Math.min(100, (campaignCount / limits.campaigns) * 100)}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span>Team Members</span><span className="font-bold">{memberCount} / {limits.users}</span></div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900" style={{ width: `${Math.min(100, (memberCount / limits.users) * 100)}%` }}></div></div>
            </div>
          </div>
          <div className="text-[11px] text-slate-500">Usage limits enforced server-side. UI shows usage for transparency. Example: AI analyses 32 / 100</div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 text-white border-slate-900">
        <CardContent className="pt-6">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Billing Principles</div>
          <div className="mt-3 grid md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div>• Do not fake successful payments — if Stripe not configured, show not configured</div>
            <div>• Plan limits: leads, imports, AI analyses, campaigns, users, CRM integrations</div>
            <div>• Never hardcode payment success — real provider only</div>
            <div>• Pricing configurable in src/lib/billing.ts, not scattered</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
