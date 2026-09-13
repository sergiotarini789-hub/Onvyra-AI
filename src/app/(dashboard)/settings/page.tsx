export const dynamic = 'force-dynamic';
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: session.organizationId },
    include: { user: true },
  });

  const stats = await prisma.lead.groupBy({
    by: ["isDemo"],
    where: { organizationId: session.organizationId },
    _count: true,
  });

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader><CardTitle>Organization</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="text-slate-500">Name:</span> <span className="font-medium">{org?.name}</span></div>
          <div><span className="text-slate-500">Slug:</span> <span className="font-mono">{org?.slug}</span></div>
          <div><span className="text-slate-500">Created:</span> {org?.createdAt.toLocaleDateString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Members</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex justify-between text-sm border-b py-2">
              <span>{m.user.email} {m.user.name ? `(${m.user.name})` : ""}</span>
              <span className="text-xs px-2 py-1 rounded bg-slate-100">{m.role}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Data</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {stats.map((s) => (
            <div key={String(s.isDemo)} className="flex justify-between">
              <span>{s.isDemo ? "Demo leads" : "Real leads"}</span>
              <span className="font-medium">{s._count}</span>
            </div>
          ))}
          <div className="pt-3 flex gap-2">
            <form action="/api/demo/seed" method="post">
              <button className="text-xs px-3 py-1.5 rounded-lg border">Seed Demo Again</button>
            </form>
            <form action="/api/demo/seed" method="delete">
              <button formMethod="delete" className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600">Delete Demo Data</button>
            </form>
          </div>
          <div className="text-xs text-slate-500">Demo data is clearly marked as DEMO DATA and never counted as real revenue.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Security</CardTitle></CardHeader>
        <CardContent className="text-xs text-slate-600 space-y-2">
          <div>✓ Tenant isolation enforced on every query</div>
          <div>✓ Passwords hashed with bcrypt</div>
          <div>✓ Sessions stored as httpOnly cookies, JWT signed</div>
          <div>✓ Zod validation on all inputs</div>
          <div>✓ File validation, 10MB limit, CSV/XLSX only</div>
          <div>✓ No secrets in Git, env only</div>
        </CardContent>
      </Card>
    </div>
  );
}
