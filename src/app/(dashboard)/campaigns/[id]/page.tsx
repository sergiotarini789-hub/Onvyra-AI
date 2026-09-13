export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, organizationId: session.organizationId },
    include: {
      campaignLeads: {
        include: {
          lead: { include: { aiAnalyses: { orderBy: { createdAt: "desc" }, take: 1 } } },
        },
      },
    },
  });

  if (!campaign) notFound();

  const stats = {
    selected: campaign.campaignLeads.filter((cl) => cl.status === "selected").length,
    contacted: campaign.campaignLeads.filter((cl) => cl.status === "contacted").length,
    response: campaign.campaignLeads.filter((cl) => cl.status === "response").length,
    won: campaign.campaignLeads.filter((cl) => cl.outcome === "won").length,
    revenue: campaign.campaignLeads.filter((cl) => cl.outcome === "won").reduce((s, cl) => s + (cl.revenue || 0), 0),
  };

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/campaigns" className="hover:text-slate-900">Campaigns</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{campaign.name}</span>
      </div>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="text-sm text-slate-600 mt-1">{campaign.description || "No description"}</p>
        </div>
        <div className="text-xs px-2 py-1 rounded-full bg-slate-100">{campaign.status}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-slate-500">Selected</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{stats.selected}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-slate-500">Contacted</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{stats.contacted}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-slate-500">Response</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{stats.response}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-slate-500">Won</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{stats.won}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-slate-500">Revenue</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">₽{Math.round(stats.revenue).toLocaleString()}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Leads in Campaign ({campaign.campaignLeads.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {campaign.campaignLeads.map((cl) => {
              const analysis = cl.lead.aiAnalyses[0];
              return (
                <div key={cl.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs">{(cl.lead.name || "U")[0]}</div>
                    <div>
                      <Link href={`/leads/${cl.leadId}`} className="font-medium text-sm hover:underline">{cl.lead.name || "Unnamed"}</Link>
                      <div className="text-xs text-slate-500">{cl.lead.company} • ₽{cl.lead.dealValue ? Math.round(cl.lead.dealValue).toLocaleString() : "—"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {analysis && <Badge variant={analysis.recoveryScore >= 80 ? "critical" : "high"}>{analysis.recoveryScore}</Badge>}
                    <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100">{cl.status}</span>
                    {cl.messageGenerated && <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">msg generated</span>}
                    <Link href={`/leads/${cl.leadId}`} className="text-xs underline">View</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Export Messages</CardTitle></CardHeader>
        <CardContent>
          <div className="text-xs text-slate-600 mb-3">MVP does NOT automatically send messages. Copy/export manually.</div>
          <div className="space-y-3">
            {campaign.campaignLeads.map((cl) => {
              const analysis = cl.lead.aiAnalyses[0];
              return (
                <div key={cl.id} className="rounded-lg border p-3">
                  <div className="text-sm font-medium">{cl.lead.name} — {cl.lead.company}</div>
                  <div className="mt-2 text-sm bg-slate-50 border rounded p-2 whitespace-pre-wrap">{analysis?.generatedMessage || cl.messageGenerated || "No message generated"}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
