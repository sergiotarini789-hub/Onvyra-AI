export const dynamic = 'force-dynamic';
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getPlanForOrganization, PLAN_LIMITS, isBillingConfigured } from "@/lib/billing";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  const members = await prisma.organizationMember.findMany({ where: { organizationId: session.organizationId }, include: { user: true } });

  const [stats, leadCount, analysisCount, campaignCount] = await Promise.all([
    prisma.lead.groupBy({ by: ["isDemo"], where: { organizationId: session.organizationId }, _count: true }),
    prisma.lead.count({ where: { organizationId: session.organizationId } }),
    prisma.aIAnalysis.count({ where: { organizationId: session.organizationId } }),
    prisma.campaign.count({ where: { organizationId: session.organizationId } }),
  ]);

  const plan = getPlanForOrganization(org);
  const limits = PLAN_LIMITS[plan];
  const billingConfigured = isBillingConfigured();

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
            <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">SETTINGS • ORGANIZATION</span>
          </div>
          <h1 className="mt-4 text-[28px] font-[750] tracking-[-0.025em] leading-[1.05]">Settings</h1>
          <p className="mt-2 text-[13px] text-[#52525B]">Organization, profile, team, integrations, AI, billing, security — no settings that do nothing.</p>
        </div>
        <Link href="/dashboard" className="h-[36px] inline-flex items-center rounded-[10px] border border-[#E4E4E7] bg-white px-4 text-[12px] font-[600] shadow-sm hover:bg-[#F9FAFB]">Dashboard</Link>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-6 shadow-premium">
          <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">ORGANIZATION</div>
          <div className="mt-4 space-y-3 text-[13px]">
            <div className="flex justify-between"><span className="text-[#71717A]">Name</span><span className="font-[600]">{org?.name}</span></div>
            <div className="flex justify-between"><span className="text-[#71717A]">Slug</span><span className="font-mono text-[11px]">{org?.slug}</span></div>
            <div className="flex justify-between"><span className="text-[#71717A]">Created</span><span>{org?.createdAt ? new Date(org.createdAt).toLocaleDateString("ru-RU") : "—"}</span></div>
            <div className="flex justify-between"><span className="text-[#71717A]">Plan</span><span className="font-[700]">{plan} {billingConfigured ? "" : "(billing not configured)"}</span></div>
            <div className="pt-3"><Link href="/billing" className="text-[12px] font-[700] underline underline-offset-4">Manage billing & usage →</Link></div>
          </div>
        </div>

        <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-6 shadow-premium">
          <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">PROFILE</div>
          <div className="mt-4 space-y-3 text-[13px]">
            <div className="flex justify-between"><span className="text-[#71717A]">Email</span><span className="font-[600]">{session.email}</span></div>
            <div className="flex justify-between"><span className="text-[#71717A]">Role</span><span className="text-[11px] px-2.5 py-1 rounded-full bg-[#F4F4F5] border font-[700]">{session.role}</span></div>
            <div className="flex justify-between"><span className="text-[#71717A]">User ID</span><span className="font-mono text-[11px]">{session.userId.slice(0, 8)}…</span></div>
            <div className="text-[11px] text-[#71717A] pt-2 bg-[#F9FAFB] border border-[#E4E4E7]/60 rounded-[10px] p-3">Secure authentication: bcrypt, httpOnly JWT, SameSite lax, secure in production, 7d expiration</div>
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white p-6 shadow-premium">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">TEAM — {members.length} MEMBERS</div>
          <span className="text-[11px] text-[#71717A]">OWNER full access, ADMIN operational, MEMBER recovery workflow</span>
        </div>
        <div className="mt-5 space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex justify-between items-center text-[13px] border border-[#E4E4E7]/80 rounded-[12px] p-3.5 bg-white hover:bg-[#F9FAFB] transition-colors">
              <div><div className="font-[600]">{m.user.email} {m.user.name ? `(${m.user.name})` : ""}</div><div className="text-[11px] text-[#71717A] mt-0.5">Joined {new Date(m.createdAt).toLocaleDateString("ru-RU")} • ID {m.userId.slice(0, 8)}</div></div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-[800] tracking-[0.04em] border ${m.role === "OWNER" ? "bg-[#0A0A0B] text-white" : m.role === "ADMIN" ? "bg-[#F4F4F5] border-[#E4E4E7]" : "bg-white border-[#E4E4E7]"}`}>{m.role}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-6 shadow-premium">
          <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">INTEGRATIONS — CRM STATUS</div>
          <div className="mt-4 space-y-3 text-[13px]">
            <div className="flex justify-between"><span>Mock CRM</span><span className="text-[#059669] font-[700]">Available</span></div>
            <div className="flex justify-between"><span>HubSpot READ-ONLY</span><span className={process.env.HUBSPOT_API_KEY ? "text-[#059669] font-[700]" : "text-[#92400E] font-[700]"}>{process.env.HUBSPOT_API_KEY ? "Configured" : "Not configured"}</span></div>
            <Link href="/integrations" className="text-[12px] font-[700] underline underline-offset-4 mt-2 inline-block">View integrations →</Link>
          </div>
        </div>

        <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-6 shadow-premium">
          <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">AI — PROVIDER STATUS</div>
          <div className="mt-4 space-y-3 text-[13px]">
            <div className="flex justify-between"><span className="text-[#71717A]">Provider</span><span className="font-[600]">{process.env.OPENAI_API_KEY ? "OpenAI" : "Mock (deterministic fallback)"}</span></div>
            <div className="flex justify-between"><span className="text-[#71717A]">Model</span><span className="font-mono text-[11px]">{process.env.OPENAI_API_KEY ? "gpt-4o-mini or configured" : "fallback-v1"}</span></div>
            <div className="flex justify-between"><span className="text-[#71717A]">Analyses</span><span className="font-[700]">{analysisCount}</span></div>
            <Link href="/analytics" className="text-[12px] font-[700] underline underline-offset-4 mt-2 inline-block">View analytics →</Link>
          </div>
        </div>

        <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-6 shadow-premium">
          <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">BILLING — {plan}</div>
          <div className="mt-4 space-y-2.5 text-[13px]">
            <div className="flex justify-between"><span className="text-[#71717A]">Leads</span><span className="font-[700] font-mono-financial">{leadCount} / {limits.leads}</span></div>
            <div className="flex justify-between"><span className="text-[#71717A]">Campaigns</span><span className="font-[700] font-mono-financial">{campaignCount} / {limits.campaigns}</span></div>
            <div className="flex justify-between"><span className="text-[#71717A]">AI Analyses</span><span className="font-[700] font-mono-financial">{analysisCount} / {limits.aiAnalysesPerMonth}</span></div>
            <Link href="/billing" className="text-[12px] font-[700] underline underline-offset-4 mt-2 inline-block">Billing & usage →</Link>
          </div>
        </div>

        <div className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-6 shadow-premium">
          <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">DATA — IMPORT & DEMO</div>
          <div className="mt-4 space-y-3 text-[13px]">
            {stats.map((s) => (<div key={String(s.isDemo)} className="flex justify-between"><span className="text-[#71717A]">{s.isDemo ? "Demo leads" : "Real leads"}</span><span className="font-[700]">{s._count}</span></div>))}
            <div className="pt-3 flex gap-2">
              <form action="/api/demo/seed" method="post"><button className="h-[32px] px-3 rounded-[9px] bg-[#0A0A0B] text-white text-[11px] font-[700]">Seed Demo Again</button></form>
              <Link href="/import" className="h-[32px] px-3 rounded-[9px] border bg-white text-[11px] font-[600] inline-flex items-center">Import Data</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
