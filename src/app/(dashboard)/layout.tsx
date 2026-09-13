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
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">O</div>
              <span className="font-semibold text-sm">Onvyra</span>
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-white font-bold">v1.0</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-1">
              <Link href="/dashboard" className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-100">Dashboard</Link>
              <Link href="/inbox" className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-100">Recovery Inbox</Link>
              <Link href="/leads" className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-100">Opportunities</Link>
              <Link href="/campaigns" className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-100">Campaigns</Link>
              <Link href="/analytics" className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-100">Analytics</Link>
              <Link href="/integrations" className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-100">Integrations</Link>
              <Link href="/billing" className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-100">Billing</Link>
              <Link href="/settings" className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-100">Settings</Link>
            </nav>
            <nav className="hidden md:flex lg:hidden items-center gap-1">
              <Link href="/dashboard" className="px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100">Dashboard</Link>
              <Link href="/inbox" className="px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100">Inbox</Link>
              <Link href="/leads" className="px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100">Opps</Link>
              <Link href="/campaigns" className="px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100">Campaigns</Link>
              <Link href="/analytics" className="px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100">Analytics</Link>
              <Link href="/settings" className="px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100">Settings</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <div className="text-xs font-medium">{org?.name || "Organization"}</div>
              <div className="text-[11px] text-slate-500">{session.email} • {session.role}</div>
            </div>
            <Link href="/onboarding" className="hidden md:inline-flex text-xs px-3 py-1.5 rounded-lg border hover:bg-slate-50">Onboarding</Link>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="text-xs px-3 py-1.5 rounded-lg border hover:bg-slate-50">Sign out</button>
            </form>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="md:hidden border-t border-slate-200 flex overflow-x-auto px-2 py-2 gap-1">
          <Link href="/dashboard" className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100">Dashboard</Link>
          <Link href="/inbox" className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100">Inbox</Link>
          <Link href="/leads" className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100">Opps</Link>
          <Link href="/campaigns" className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100">Campaigns</Link>
          <Link href="/analytics" className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100">Analytics</Link>
          <Link href="/integrations" className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100">Integrations</Link>
          <Link href="/billing" className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100">Billing</Link>
          <Link href="/audit" className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100">Audit</Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
