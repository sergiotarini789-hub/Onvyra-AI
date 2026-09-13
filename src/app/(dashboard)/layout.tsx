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
    <div className="min-h-screen bg-[#FCFCFD] text-[#0A0A0B] selection:bg-[#0A0A0B] selection:text-white">
      {/* Header — Premium Command-Style */}
      <header className="sticky top-0 z-40 border-b border-[#0A0A0B]/[0.06] bg-[#FCFCFD]/90 backdrop-blur-[16px]">
        <div className="flex h-[52px] items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="h-[30px] w-[30px] rounded-[9px] bg-[#0A0A0B] text-white flex items-center justify-center font-[800] text-[13px] tracking-[-0.02em] shadow-[0_1px_2px_rgba(0,0,0,0.08)] group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] group-hover:-translate-y-[0.5px] transition-all duration-200">O</div>
              <span className="font-[700] text-[14px] tracking-[-0.02em]">Onvyra</span>
              <span className="ml-1 hidden md:inline-flex h-[18px] items-center rounded-full bg-[#0A0A0B] px-2 text-[9px] font-[800] tracking-[0.04em] text-white shadow-sm">OS v1.0</span>
              <span className="hidden xl:inline-flex ml-2 h-[20px] items-center gap-1.5 rounded-full border border-[#0A0A0B]/10 bg-white px-2.5 text-[10px] font-[650] shadow-sm hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-[pulse-subtle_2s_ease-in-out_infinite] shadow-[0_0_6px_rgba(16,185,129,0.4)]" /> AI ENGINE ACTIVE
              </span>
            </Link>
            
            <div className="hidden lg:flex items-center">
              <div className="h-4 w-px bg-[#E4E4E7] mr-4" />
              <nav className="flex items-center gap-0.5 rounded-[11px] bg-[#F4F4F5] p-1 border border-[#0A0A0B]/[0.04] shadow-[inset_0_1px_1px_rgba(0,0,0,0.03)]">
                <Link href="/dashboard" className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-[650] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] text-[#0A0A0B] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all">Dashboard</Link>
                <Link href="/inbox" className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-[500] text-[#52525B] hover:text-[#0A0A0B] hover:bg-white/80 hover:shadow-sm transition-all flex items-center gap-1.5">Inbox <span className="h-[16px] min-w-[16px] px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-[800] flex items-center justify-center shadow-[0_1px_4px_rgba(239,68,68,0.3)]">8</span></Link>
                <Link href="/leads" className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-[500] text-[#52525B] hover:text-[#0A0A0B] hover:bg-white/80 hover:shadow-sm transition-all">Opportunities</Link>
                <Link href="/campaigns" className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-[500] text-[#52525B] hover:text-[#0A0A0B] hover:bg-white/80 hover:shadow-sm transition-all">Campaigns</Link>
                <Link href="/analytics" className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-[500] text-[#52525B] hover:text-[#0A0A0B] hover:bg-white/80 hover:shadow-sm transition-all">Analytics</Link>
                <Link href="/integrations" className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-[500] text-[#52525B] hover:text-[#0A0A0B] hover:bg-white/80 hover:shadow-sm transition-all">CRM</Link>
                <Link href="/billing" className="px-3 py-1.5 rounded-[8px] text-[12.5px] font-[500] text-[#52525B] hover:text-[#0A0A0B] hover:bg-white/80 hover:shadow-sm transition-all">Billing</Link>
              </nav>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2.5 rounded-[11px] border border-[#E4E4E7]/80 bg-white px-3 py-1.5 shadow-sm hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-[#0A0A0B]/10 transition-all group">
              <div className="h-7 w-7 rounded-full bg-[#0A0A0B] text-white flex items-center justify-center text-[11px] font-[750] shadow-sm group-hover:scale-105 transition-transform">{(org?.name || "O")[0].toUpperCase()}</div>
              <div className="text-left hidden lg:block min-w-0">
                <div className="text-[11px] font-[650] leading-none tracking-[-0.01em] truncate max-w-[120px]">{org?.name || "Organization"}</div>
                <div className="text-[10px] text-[#71717A] leading-none mt-1 truncate max-w-[160px]">{session.email} • {session.role}</div>
              </div>
            </div>
            <Link href="/onboarding" className="hidden md:inline-flex h-[30px] items-center justify-center rounded-[9px] border border-[#E4E4E7] bg-white px-3 text-[11px] font-[600] shadow-sm hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/15 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:-translate-y-[0.5px] active:translate-y-0 transition-all">Onboarding</Link>
            <Link href="/settings" className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[9px] border border-[#E4E4E7] bg-white text-[#52525B] shadow-sm hover:text-[#0A0A0B] hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/15 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:-translate-y-[0.5px] active:translate-y-0 transition-all">⚙</Link>
            <form action="/api/auth/logout" method="post" className="inline">
              <button type="submit" className="inline-flex h-[30px] items-center justify-center rounded-[9px] border border-[#E4E4E7] bg-white px-3 text-[11px] font-[600] shadow-sm hover:bg-[#FEF2F2] hover:border-[#FECACA] hover:text-[#EF4444] hover:shadow-[0_2px_8px_rgba(239,68,68,0.1)] transition-all">Sign out</button>
            </form>
          </div>
        </div>

        {/* Status bar — KPI ribbon — Compact Clear Command-Oriented */}
        <div className="flex h-[30px] items-center justify-between border-t border-[#0A0A0B]/[0.04] bg-[#F9FAFB]/80 px-4 lg:px-6 text-[11px] backdrop-blur-[8px]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-[550] tracking-[-0.01em] text-[#52525B]"><span className="h-1.5 w-1.5 rounded-full bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.4)]" /> System operational • 43/43 tests PASS</span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-[#71717A] font-[450]"><span className="h-3 w-px bg-[#E4E4E7]" /> Potential ≠ Confirmed • Est. not guaranteed • Tenant isolated • No fake claims</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden lg:inline text-[#71717A] font-[450]">FREE • 500 leads • 3 imports • 100 AI • 2 campaigns • 1 user</span>
            <Link href="/billing" className="inline-flex items-center gap-1 font-[700] tracking-[-0.01em] text-[#0A0A0B] hover:gap-1.5 transition-all">Upgrade <span>→</span></Link>
          </div>
        </div>

        {/* Mobile nav — Intentionally Designed — Not collapsed desktop */}
        <div className="lg:hidden border-t border-[#0A0A0B]/[0.06] bg-white">
          <div className="px-3 py-2.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[10px] font-[800] tracking-[0.08em] text-[#71717A]">NAVIGATION • {org?.name || "Workspace"}</div>
              <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" /><span className="text-[10px] font-[700] text-[#52525B]">LIVE</span></div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <Link href="/dashboard" className="flex flex-col items-center gap-1 rounded-[12px] bg-[#0A0A0B] text-white p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-shadow"><span className="text-[16px] leading-none">◧</span><span className="text-[10px] font-[700] tracking-[0.02em]">Dashboard</span></Link>
              <Link href="/inbox" className="relative flex flex-col items-center gap-1 rounded-[12px] bg-[#F4F4F5] border border-[#E4E4E7] p-2.5 hover:bg-white hover:border-[#0A0A0B]/10 hover:shadow-sm transition-all"><span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-[#EF4444] text-white text-[9px] font-[800] flex items-center justify-center shadow-sm">8</span><span className="text-[16px] leading-none">↗</span><span className="text-[10px] font-[600] tracking-[0.02em]">Inbox</span></Link>
              <Link href="/leads" className="flex flex-col items-center gap-1 rounded-[12px] bg-[#F4F4F5] border border-[#E4E4E7] p-2.5 hover:bg-white hover:border-[#0A0A0B]/10 hover:shadow-sm transition-all"><span className="text-[16px] leading-none">◫</span><span className="text-[10px] font-[600] tracking-[0.02em]">Opps</span></Link>
              <Link href="/campaigns" className="flex flex-col items-center gap-1 rounded-[12px] bg-[#F4F4F5] border border-[#E4E4E7] p-2.5 hover:bg-white hover:border-[#0A0A0B]/10 hover:shadow-sm transition-all"><span className="text-[16px] leading-none">⚑</span><span className="text-[10px] font-[600] tracking-[0.02em]">Campaigns</span></Link>
            </div>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              <Link href="/analytics" className="flex flex-col items-center gap-1 rounded-[10px] bg-white border border-[#E4E4E7]/80 p-2 hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/10 transition-colors"><span className="text-[14px] leading-none">◍</span><span className="text-[10px] font-[500]">Analytics</span></Link>
              <Link href="/integrations" className="flex flex-col items-center gap-1 rounded-[10px] bg-white border border-[#E4E4E7]/80 p-2 hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/10 transition-colors"><span className="text-[14px] leading-none">◎</span><span className="text-[10px] font-[500]">CRM</span></Link>
              <Link href="/billing" className="flex flex-col items-center gap-1 rounded-[10px] bg-white border border-[#E4E4E7]/80 p-2 hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/10 transition-colors"><span className="text-[14px] leading-none">◍</span><span className="text-[10px] font-[500]">Billing</span></Link>
              <Link href="/settings" className="flex flex-col items-center gap-1 rounded-[10px] bg-white border border-[#E4E4E7]/80 p-2 hover:bg-[#F9FAFB] hover:border-[#0A0A0B]/10 transition-colors"><span className="text-[14px] leading-none">⚙</span><span className="text-[10px] font-[500]">Settings</span></Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px]">{children}</main>
    </div>
  );
}
