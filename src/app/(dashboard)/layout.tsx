export const dynamic = 'force-dynamic';
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });

  return (
    <div className="min-h-screen bg-[#FCFCFD] text-[#0A0A0B]">
      {/* Premium Header - Command Style */}
      <header className="sticky top-0 z-40 border-b border-[#0A0A0B]/[0.06] bg-[#FCFCFD]/80 backdrop-blur-[16px]">
        <div className="flex h-[52px] items-center justify-between px-5 lg:px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="h-[30px] w-[30px] rounded-[9px] bg-[#0A0A0B] text-white flex items-center justify-center font-[800] text-[13px] tracking-[-0.02em] shadow-[0_1px_2px_rgba(0,0,0,0.08)] group-hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)] group-hover:-translate-y-[0.5px] transition-all">O</div>
              <span className="font-[650] text-[14px] tracking-[-0.02em]">Onvyra</span>
              <span className="ml-1 hidden md:inline-flex h-[18px] items-center rounded-full bg-[#0A0A0B] px-1.5 text-[9px] font-[800] tracking-[0.04em] text-white">OS v1.0</span>
              <span className="hidden xl:inline-flex ml-2 h-[20px] items-center gap-1 rounded-full border border-[#0A0A0B]/10 bg-white px-2 text-[10px] font-[650] shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-[pulse-subtle_2s_ease-in-out_infinite]" /> AI ENGINE ACTIVE
              </span>
            </Link>
            
            <div className="hidden lg:flex items-center">
              <div className="h-4 w-px bg-[#E4E4E7] mr-4" />
              <nav className="flex items-center gap-0.5 rounded-[10px] bg-[#F4F4F5] p-1 border border-[#0A0A0B]/[0.04]">
                <Link href="/dashboard" className="px-3 py-1.5 rounded-[7px] text-[12.5px] font-[600] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] text-[#0A0A0B]">Dashboard</Link>
                <Link href="/inbox" className="px-3 py-1.5 rounded-[7px] text-[12.5px] font-[500] text-[#52525B] hover:text-[#0A0A0B] hover:bg-white/60 transition-colors flex items-center gap-1.5">Inbox <span className="h-[16px] min-w-[16px] px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-[700] flex items-center justify-center">8</span></Link>
                <Link href="/leads" className="px-3 py-1.5 rounded-[7px] text-[12.5px] font-[500] text-[#52525B] hover:text-[#0A0A0B] hover:bg-white/60 transition-colors">Opportunities</Link>
                <Link href="/campaigns" className="px-3 py-1.5 rounded-[7px] text-[12.5px] font-[500] text-[#52525B] hover:text-[#0A0A0B] hover:bg-white/60 transition-colors">Campaigns</Link>
                <Link href="/analytics" className="px-3 py-1.5 rounded-[7px] text-[12.5px] font-[500] text-[#52525B] hover:text-[#0A0A0B] hover:bg-white/60 transition-colors">Analytics</Link>
                <Link href="/integrations" className="px-3 py-1.5 rounded-[7px] text-[12.5px] font-[500] text-[#52525B] hover:text-[#0A0A0B] hover:bg-white/60 transition-colors">CRM</Link>
                <Link href="/billing" className="px-3 py-1.5 rounded-[7px] text-[12.5px] font-[500] text-[#52525B] hover:text-[#0A0A0B] hover:bg-white/60 transition-colors">Billing</Link>
              </nav>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-3 rounded-[10px] border border-[#E4E4E7]/80 bg-white px-3 py-1.5 shadow-sm">
              <div className="h-6 w-6 rounded-full bg-[#0A0A0B] text-white flex items-center justify-center text-[10px] font-[700]">{(org?.name || "O")[0].toUpperCase()}</div>
              <div className="text-left hidden lg:block">
                <div className="text-[11px] font-[600] leading-none tracking-[-0.01em]">{org?.name || "Organization"}</div>
                <div className="text-[10px] text-[#71717A] leading-none mt-1">{session.email} • {session.role}</div>
              </div>
            </div>
            <Link href="/onboarding" className="hidden md:inline-flex h-[30px] items-center justify-center rounded-[9px] border border-[#E4E4E7] bg-white px-3 text-[11px] font-[600] hover:bg-[#F9FAFB] transition-colors">Onboarding</Link>
            <Link href="/settings" className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[9px] border border-[#E4E4E7] bg-white text-[#52525B] hover:text-[#0A0A0B] hover:bg-[#F9FAFB] transition-colors">⚙</Link>
            <form action="/api/auth/logout" method="post" className="inline">
              <button type="submit" className="inline-flex h-[30px] items-center justify-center rounded-[9px] border border-[#E4E4E7] bg-white px-3 text-[11px] font-[600] hover:bg-[#FEF2F2] hover:border-[#FECACA] hover:text-[#EF4444] transition-colors">Sign out</button>
            </form>
          </div>
        </div>

        {/* Status bar - KPI ribbon */}
        <div className="flex h-[32px] items-center justify-between border-t border-[#0A0A0B]/[0.04] bg-[#F9FAFB]/80 px-5 lg:px-6 text-[11px]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-[500] text-[#52525B]"><span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" /> System operational</span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-[#71717A]"><span className="h-3 w-px bg-[#E4E4E7]" /> Potential ≠ Confirmed • Est. not guaranteed • Tenant isolated</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-[#71717A]">FREE plan • 500 leads • 3 imports • 100 AI • 2 campaigns</span>
            <Link href="/billing" className="font-[600] text-[#0A0A0B] hover:underline underline-offset-4">Upgrade →</Link>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="lg:hidden border-t border-[#0A0A0B]/[0.06] flex overflow-x-auto px-2 py-2 gap-1 bg-white/80 backdrop-blur">
          <Link href="/dashboard" className="shrink-0 px-3 py-1.5 rounded-[8px] text-[12px] font-[600] bg-[#0A0A0B] text-white">Dashboard</Link>
          <Link href="/inbox" className="shrink-0 px-3 py-1.5 rounded-[8px] text-[12px] font-[500] bg-[#F4F4F5]">Inbox • 8</Link>
          <Link href="/leads" className="shrink-0 px-3 py-1.5 rounded-[8px] text-[12px] font-[500] hover:bg-[#F4F4F5]">Opps</Link>
          <Link href="/campaigns" className="shrink-0 px-3 py-1.5 rounded-[8px] text-[12px] font-[500] hover:bg-[#F4F4F5]">Campaigns</Link>
          <Link href="/analytics" className="shrink-0 px-3 py-1.5 rounded-[8px] text-[12px] font-[500] hover:bg-[#F4F4F5]">Analytics</Link>
          <Link href="/integrations" className="shrink-0 px-3 py-1.5 rounded-[8px] text-[12px] font-[500] hover:bg-[#F4F4F5]">CRM</Link>
          <Link href="/billing" className="shrink-0 px-3 py-1.5 rounded-[8px] text-[12px] font-[500] hover:bg-[#F4F4F5]">Billing</Link>
          <Link href="/audit" className="shrink-0 px-3 py-1.5 rounded-[8px] text-[12px] font-[500] hover:bg-[#F4F4F5]">Audit</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px]">{children}</main>
    </div>
  );
}
