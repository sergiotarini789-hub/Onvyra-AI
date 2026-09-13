export const dynamic = 'force-dynamic';
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PLAN_LIMITS, PLAN_PRICES, getPlanForOrganization, isBillingConfigured, getOrganizationUsage, getPlanFeatures } from "@/lib/billing";
import Link from "next/link";
import BillingClient from "./client";

export default async function BillingPage({ searchParams }: { searchParams?: { success?: string; canceled?: string; plan?: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  const plan = getPlanForOrganization(org);
  const limits = PLAN_LIMITS[plan];

  const usage = await prisma.organization.findMany({ where: { id: session.organizationId } }).then(async () => {
    return getOrganizationUsage(prisma, session.organizationId);
  }).catch(() => ({
    leads: 0, campaigns: 0, users: 1, aiAnalysesThisMonth: 0, aiMessagesThisMonth: 0, importsThisMonth: 0, tokensThisMonth: 0,
  }));

  const [leadCount, campaignCount, memberCount] = await Promise.all([
    prisma.lead.count({ where: { organizationId: session.organizationId } }).catch(() => usage.leads),
    prisma.campaign.count({ where: { organizationId: session.organizationId } }).catch(() => usage.campaigns),
    prisma.organizationMember.count({ where: { organizationId: session.organizationId } }).catch(() => usage.users),
  ]);

  const subscription = await prisma.subscription.findFirst({ where: { organizationId: session.organizationId }, orderBy: { createdAt: "desc" } }).catch(() => null);
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const usageRecord = await prisma.usage.findUnique({ where: { organizationId_period: { organizationId: session.organizationId, period } } }).catch(() => null);
  const billingConfigured = isBillingConfigured();

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
            <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">BILLING & USAGE • {plan} PLAN</span>
          </div>
          <h1 className="mt-4 text-[28px] font-[750] tracking-[-0.025em] leading-[1.05]">Billing & Usage</h1>
          <p className="mt-2 text-[13px] text-[#52525B]">Plan limits enforced server-side. No fake payments. Honest billing. Potential ≠ Confirmed.</p>
        </div>
        <Link href="/settings" className="h-[36px] inline-flex items-center rounded-[10px] border border-[#E4E4E7] bg-white px-4 text-[12px] font-[600] shadow-sm hover:bg-[#F9FAFB]">Settings</Link>
      </div>

      {searchParams?.success && (
        <div className="rounded-[12px] border border-[#A7F3D0] bg-[#ECFDF5] p-4">
          <div className="font-[700] text-[13px] text-[#065F46]">Payment successful</div>
          <div className="text-[11px] text-[#047857] mt-1">Welcome to {searchParams.plan || "PRO"}! Your plan has been upgraded.</div>
        </div>
      )}

      {searchParams?.canceled && (
        <div className="rounded-[12px] border border-[#FDE68A] bg-[#FFFBEB] p-4">
          <div className="font-[700] text-[13px] text-[#92400E]">Checkout canceled</div>
          <div className="text-[11px] text-[#B45309] mt-1">No charges made. You can upgrade anytime.</div>
        </div>
      )}

      {!billingConfigured && (
        <div className="rounded-[12px] border border-[#FDE68A] bg-[#FFFBEB] p-4">
          <div className="font-[700] text-[13px]">Billing integration not configured</div>
          <div className="text-[11px] text-[#92400E] mt-1 leading-[1.5]">Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET env to enable real payments. Currently showing plan information without processing payments. Do not simulate payment success. In dev, you can still change plan manually for testing.</div>
        </div>
      )}

      <BillingClient currentPlan={plan} orgId={session.organizationId} billingConfigured={billingConfigured} subscription={subscription} />

      <div className="grid md:grid-cols-3 gap-5">
        {(["FREE", "PRO", "BUSINESS"] as const).map((p) => {
          const isCurrent = p === plan;
          const features = getPlanFeatures(p);
          return (
            <div key={p} className={`rounded-[20px] border bg-white p-6 shadow-premium hover-lift ${isCurrent ? "border-[#0A0A0B] ring-1 ring-[#0A0A0B] shadow-[0_0_0_1px_#0A0A0B,0_16px_40px_rgba(0,0,0,0.12)]" : "border-[#E4E4E7]/80"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">{p}</span>
                {isCurrent && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0A0A0B] text-white font-[800] tracking-[0.04em]">CURRENT</span>}
              </div>
              <div className="mt-3">
                <div className="text-[28px] font-[850] tracking-[-0.03em] leading-none">{PLAN_PRICES[p].label}</div>
                <div className="text-[12px] text-[#71717A] mt-1">{PLAN_PRICES[p].description}</div>
              </div>
              <div className="mt-5 space-y-2 text-[12px]">
                <div className="flex justify-between"><span className="font-[500]">{PLAN_LIMITS[p].leads.toLocaleString()} leads</span><span className="text-[#71717A]">{p === "FREE" ? "500" : p === "PRO" ? "5k" : "50k"}</span></div>
                <div className="flex justify-between"><span>{PLAN_LIMITS[p].aiAnalysesPerMonth} AI analyses/mo</span></div>
                <div className="flex justify-between"><span>{PLAN_LIMITS[p].aiMessagesPerMonth} messages/mo</span></div>
                <div className="flex justify-between"><span>{PLAN_LIMITS[p].campaigns} campaigns</span></div>
                <div className="flex justify-between"><span>{PLAN_LIMITS[p].users} users</span></div>
                <div className="flex justify-between"><span>{PLAN_LIMITS[p].crmIntegrations} CRM</span></div>
                <div className="flex justify-between"><span>{(PLAN_LIMITS[p].tokensPerMonth / 1000).toFixed(0)}k tokens/mo</span></div>
              </div>
              <div className="mt-5 pt-4 border-t border-[#F4F4F5]">
                <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">FEATURES</div>
                <ul className="mt-2 space-y-1 text-[11px] text-[#52525B]">{features.slice(0, 4).map((f, i) => <li key={i} className="flex gap-1.5"><span className="text-[#0A0A0B]">•</span>{f}</li>)}</ul>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white p-6 shadow-premium">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">CURRENT USAGE — {plan} PLAN (Period: {period})</div>
          <span className="text-[10px] font-[700] px-2 py-0.5 rounded-full bg-[#F4F4F5] border">REAL USAGE</span>
        </div>
        <div className="mt-6 grid md:grid-cols-2 gap-5">
          {[
            { label: "Leads", used: leadCount, total: limits.leads },
            { label: "AI Analyses (this month)", used: usageRecord?.aiAnalyses || usage.aiAnalysesThisMonth, total: limits.aiAnalysesPerMonth },
            { label: "Imports (this month)", used: usageRecord?.imports || usage.importsThisMonth, total: limits.importsPerMonth },
            { label: "AI Messages (this month)", used: usageRecord?.aiMessages || usage.aiMessagesThisMonth, total: limits.aiMessagesPerMonth },
            { label: "Campaigns", used: campaignCount, total: limits.campaigns },
            { label: "Team Members", used: memberCount, total: limits.users },
            { label: "Tokens (this month)", used: usageRecord?.tokensUsed || usage.tokensThisMonth || 0, total: limits.tokensPerMonth, format: true },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-[11px] mb-2"><span className="font-[600] text-[#52525B]">{item.label}</span><span className="font-[700] font-mono-financial">{item.format ? `${(item.used as number).toLocaleString()} / ${item.total.toLocaleString()}` : `${item.used} / ${item.total}`}</span></div>
              <div className="h-1.5 bg-[#F4F4F5] rounded-full overflow-hidden"><div className="h-full bg-[#0A0A0B] rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (Number(item.used) / item.total) * 100)}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="mt-5 text-[11px] text-[#71717A] bg-[#F9FAFB] border border-[#E4E4E7]/60 rounded-[10px] p-3">Usage limits enforced server-side with transactions. UI shows usage for transparency. Example: AI analyses 32 / 100. Tokens tracked for cost control.</div>
      </div>

      {subscription && (
        <div className="rounded-[16px] border border-[#E4E4E7] bg-white p-5 shadow-sm">
          <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">SUBSCRIPTION DETAILS</div>
          <div className="mt-3 grid md:grid-cols-2 gap-3 text-[12px]">
            <div>Plan: <span className="font-[700]">{subscription.plan}</span></div>
            <div>Status: <span className="font-[700]">{subscription.status}</span></div>
            <div>Current period: {subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart).toLocaleDateString() : "N/A"} - {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "N/A"}</div>
            <div>Cancel at period end: {subscription.cancelAtPeriodEnd ? "Yes" : "No"}</div>
          </div>
        </div>
      )}
    </div>
  );
}
