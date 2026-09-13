export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function CampaignsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: session.organizationId },
    include: { _count: { select: { campaignLeads: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totalRevenue = await prisma.campaignLead.aggregate({
    where: { organizationId: session.organizationId, outcome: "won" },
    _sum: { revenue: true },
  });

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-slate-600">Group recovery opportunities and track outcomes.</p>
        </div>
        <Link href="/leads"><Button>Select Leads for Campaign</Button></Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-slate-500">Total Campaigns</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{campaigns.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-slate-500">Total Leads in Campaigns</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{campaigns.reduce((s, c) => s + c._count.campaignLeads, 0)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-slate-500">Revenue from Campaigns</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">₽{Math.round(totalRevenue._sum.revenue || 0).toLocaleString("ru-RU")}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Campaigns</CardTitle></CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No campaigns yet. Select leads from the Leads page and create a recovery campaign.
              <div className="mt-4"><Link href="/leads" className="text-slate-900 underline">Go to Leads →</Link></div>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center justify-between rounded-lg border p-4 hover:bg-slate-50">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-slate-500">{c.description || "No description"} • {c._count.campaignLeads} leads • {new Date(c.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-full bg-slate-100">{c.status}</div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
