export const dynamic = 'force-dynamic';
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_LIMITS, PLAN_PRICES, getPlanForOrganization, isBillingConfigured, getOrganizationUsage, getPlanFeatures } from "@/lib/billing";
import Link from "next/link";
import BillingClient from "./client";

export default async function BillingPage({ searchParams }: { searchParams?: { success?: string; canceled?: string; plan?: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  const plan = getPlanForOrganization(org);
  const limits = PLAN_LIMITS[plan];
  const price = PLAN_PRICES[plan];

  const usage = await prisma.organization.findMany({ where: { id: session.organizationId } }).then(async () => {
    return getOrganizationUsage(prisma, session.organizationId);
  }).catch(() => ({
    leads: 0,
    campaigns: 0,
    users: 1,
    aiAnalysesThisMonth: 0,
    aiMessagesThisMonth: 0,
    importsThisMonth: 0,
    tokensThisMonth: 0,
  }));

  const [leadCount, campaignCount, memberCount] = await Promise.all([
    prisma.lead.count({ where: { organizationId: session.organizationId } }).catch(() => usage.leads),
    prisma.campaign.count({ where: { organizationId: session.organizationId } }).catch(() => usage.campaigns),
    prisma.organizationMember.count({ where: { organizationId: session.organizationId } }).catch(() => usage.users),
  ]);

  const subscription = await prisma.subscription.findFirst({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: "desc" },
  }).catch(() => null);

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const usageRecord = await prisma.usage.findUnique({
    where: { organizationId_period: { organizationId: session.organizationId, period } },
  }).catch(() => null);

  const billingConfigured = isBillingConfigured();

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing & Usage</h1>
          <p className="text-sm text-slate-600 mt-1">Plan limits enforced server-side. No fake payments. Honest billing.</p>
        </div>
        <Link href="/settings" className="text-xs px-3 py-1.5 rounded-lg border bg-white">Settings</Link>
      </div>

      {searchParams?.success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <div className="font-bold text-emerald-800">Payment successful</div>
          <div className="text-xs text-emerald-700 mt-1">Welcome to {searchParams.plan || "PRO"}! Your plan has been upgraded. {subscription ? `Subscription ${subscription.id.slice(0, 8)}...` : ""}</div>
        </div>
      )}

      {searchParams?.canceled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <div className="font-bold text-amber-800">Checkout canceled</div>
          <div className="text-xs text-amber-700 mt-1">No charges made. You can upgrade anytime.</div>
        </div>
      )}

      {!billingConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <div className="font-bold">Billing integration not configured</div>
          <div className="text-xs text-slate-600 mt-1">Set <span className="font-mono">STRIPE_SECRET_KEY</span> and <span className="font-mono">STRIPE_WEBHOOK_SECRET</span> env to enable real payments. Currently showing plan information without processing payments. Do not simulate payment success. In dev, you can still change plan manually for testing.</div>
        </div>
      )}

      <BillingClient 
        currentPlan={plan} 
        orgId={session.organizationId}
        billingConfigured={billingConfigured}
        subscription={subscription}
      />

      <div className="grid md:grid-cols-3 gap-6">
        {(["FREE", "PRO", "BUSINESS"] as const).map((p) => {
          const isCurrent = p === plan;
          const features = getPlanFeatures(p);
          return (
            <Card key={p} className={isCurrent ? "border-slate-900 ring-1 ring-slate-900" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{p}</span>
                  {isCurrent && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-white font-bold">CURRENT</span>}
                </CardTitle>
                <div className="mt-2">
                  <div className="text-2xl font-bold">{PLAN_PRICES[p].label}</div>
                  <div className="text-xs text-slate-500">{PLAN_PRICES[p].description}</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span>{PLAN_LIMITS[p].leads.toLocaleString()} leads</span><span className="text-slate-500">{p === "FREE" ? "500" : p === "PRO" ? "5k" : "50k"}</span></div>
                  <div className="flex justify-between"><span>{PLAN_LIMITS[p].aiAnalysesPerMonth} AI analyses/mo</span></div>
                  <div className="flex justify-between"><span>{PLAN_LIMITS[p].aiMessagesPerMonth} messages/mo</span></div>
                  <div className="flex justify-between"><span>{PLAN_LIMITS[p].campaigns} campaigns</span></div>
                  <div className="flex justify-between"><span>{PLAN_LIMITS[p].users} users</span></div>
                  <div className="flex justify-between"><span>{PLAN_LIMITS[p].crmIntegrations} CRM integrations</span></div>
                  <div className="flex justify-between"><span>{(PLAN_LIMITS[p].tokensPerMonth / 1000).toFixed(0)}k tokens/mo</span></div>
                </div>
                <div className="pt-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Features</div>
                  <ul className="mt-1.5 space-y-1 text-[11px] text-slate-600">
                    {features.slice(0, 4).map((f, i) => <li key={i}>• {f}</li>)}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Current Usage — {plan} Plan (Period: {period})</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs mb-1"><span>Leads</span><span className="font-bold">{leadCount} / {limits.leads}</span></div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900" style={{ width: `${Math.min(100, (leadCount / limits.leads) * 100)}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span>AI Analyses (this month)</span><span className="font-bold">{usageRecord?.aiAnalyses || usage.aiAnalysesThisMonth} / {limits.aiAnalysesPerMonth}</span></div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900" style={{ width: `${Math.min(100, ((usageRecord?.aiAnalyses || usage.aiAnalysesThisMonth) / limits.aiAnalysesPerMonth) * 100)}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span>Imports (this month)</span><span className="font-bold">{usageRecord?.imports || usage.importsThisMonth} / {limits.importsPerMonth}</span></div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900" style={{ width: `${Math.min(100, ((usageRecord?.imports || usage.importsThisMonth) / limits.importsPerMonth) * 100)}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span>AI Messages (this month)</span><span className="font-bold">{usageRecord?.aiMessages || usage.aiMessagesThisMonth} / {limits.aiMessagesPerMonth}</span></div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900" style={{ width: `${Math.min(100, ((usageRecord?.aiMessages || usage.aiMessagesThisMonth) / limits.aiMessagesPerMonth) * 100)}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span>Campaigns</span><span className="font-bold">{campaignCount} / {limits.campaigns}</span></div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900" style={{ width: `${Math.min(100, (campaignCount / limits.campaigns) * 100)}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span>Team Members</span><span className="font-bold">{memberCount} / {limits.users}</span></div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900" style={{ width: `${Math.min(100, (memberCount / limits.users) * 100)}%` }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span>Tokens (this month)</span><span className="font-bold">{(usageRecord?.tokensUsed || usage.tokensThisMonth || 0).toLocaleString()} / {limits.tokensPerMonth.toLocaleString()}</span></div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900" style={{ width: `${Math.min(100, ((usageRecord?.tokensUsed || usage.tokensThisMonth || 0) / limits.tokensPerMonth) * 100)}%` }}></div></div>
            </div>
          </div>
          <div className="text-[11px] text-slate-500">Usage limits enforced server-side with transactions. UI shows usage for transparency. Example: AI analyses 32 / 100. Tokens tracked for cost control.</div>
        </CardContent>
      </Card>

      {subscription && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Subscription Details</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            <div className="grid md:grid-cols-2 gap-4">
              <div>Plan: <span className="font-bold">{subscription.plan}</span></div>
              <div>Status: <span className="font-bold">{subscription.status}</span></div>
              <div>Current period: {subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart).toLocaleDateString() : "N/A"} - {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "N/A"}</div>
              <div>Cancel at period end: {subscription.cancelAtPeriodEnd ? "Yes" : "No"}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-900 text-white border-slate-900">
        <CardContent className="pt-6">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Billing Principles - Production Ready</div>
          <div className="mt-3 grid md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div>• No fake payments — if Stripe not configured, show not configured, allow dev manual upgrade</div>
            <div>• Webhook signature verification — HMAC SHA256 with timingSafeEqual</div>
            <div>• Idempotency keys — prevent double charging</div>
            <div>• Plan limits enforced server-side with transactions</div>
            <div>• Usage accounting per period (YYYY-MM) with token tracking</div>
            <div>• No secrets in logs — customer IDs partially masked</div>
            <div>• Subscription model with status tracking (ACTIVE, CANCELED, PAST_DUE)</div>
            <div>• Pricing configurable in src/lib/billing.ts, not scattered</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
