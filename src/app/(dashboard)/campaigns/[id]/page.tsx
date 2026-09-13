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
    selected: campaign.campaignLeads.filter((cl: any) => cl.status === "selected").length,
    messageGenerated: campaign.campaignLeads.filter((cl: any) => cl.messageGenerated || cl.messageStatus === "ready").length,
    contacted: campaign.campaignLeads.filter((cl: any) => cl.status === "contacted" || cl.contactedAt).length,
    response: campaign.campaignLeads.filter((cl: any) => cl.status === "response" || cl.response).length,
    recovered: campaign.campaignLeads.filter((cl: any) => cl.outcome === "RECOVERED" || cl.outcome === "won").length,
    revenue: campaign.campaignLeads.filter((cl: any) => cl.outcome === "RECOVERED" || cl.outcome === "won").reduce((s: number, cl: any) => s + (cl.revenue || 0), 0),
    totalValue: campaign.campaignLeads.reduce((s: number, cl: any) => s + (cl.lead.dealValue || 0), 0),
    estimatedRecoverable: campaign.campaignLeads.reduce((s: number, cl: any) => {
      const a = cl.lead.aiAnalyses?.[0];
      if (a?.recoveryProbability && cl.lead.dealValue) return s + cl.lead.dealValue * a.recoveryProbability;
      return s;
    }, 0),
  };

  const targetCriteria = campaign.targetCriteria ? (typeof campaign.targetCriteria === "string" ? (()=>{try{return JSON.parse(campaign.targetCriteria)}catch{return null}})() : campaign.targetCriteria) : null;

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/campaigns" className="hover:text-slate-900">Campaigns</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{campaign.name}</span>
        <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold ${campaign.status === "ACTIVE" || campaign.status === "active" ? "bg-emerald-600 text-white" : campaign.status === "COMPLETED" ? "bg-slate-900 text-white" : "bg-slate-100"}`}>{campaign.status.toUpperCase()}</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
          <p className="text-sm text-slate-600 mt-1">{campaign.description || "No description"}</p>
          {targetCriteria && (
            <div className="mt-3 flex gap-1.5 flex-wrap">
              {Object.entries(targetCriteria).map(([k, v]) => (
                <span key={k} className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 border">{k}: {String(v)}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/inbox" className="h-9 px-4 inline-flex items-center justify-center rounded-lg border bg-white text-sm">Recovery Inbox</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-slate-500">Target</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{campaign.campaignLeads.length}</div><div className="text-[11px] text-slate-500">₽{Math.round(stats.totalValue).toLocaleString()} total value</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-slate-500">Est. Recoverable</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">₽{Math.round(stats.estimatedRecoverable).toLocaleString()}</div><div className="text-[11px] text-amber-600">Estimated</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-slate-500">Contacted</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{stats.contacted}</div><div className="text-[11px] text-slate-500">{campaign.campaignLeads.length ? Math.round((stats.contacted / campaign.campaignLeads.length) * 100) : 0}%</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-slate-500">Response</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{stats.response}</div><div className="text-[11px] text-slate-500">{stats.contacted ? Math.round((stats.response / stats.contacted) * 100) : 0}% of contacted</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-slate-500">Recovered</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{stats.recovered}</div><div className="text-[11px] text-slate-500">{stats.response ? Math.round((stats.recovered / stats.response) * 100) : 0}% of response</div></CardContent></Card>
        <Card className="border-emerald-200 bg-emerald-50/50"><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-emerald-700">Confirmed Revenue</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-emerald-900">₽{Math.round(stats.revenue).toLocaleString()}</div><div className="text-[11px] text-emerald-700">Attributed</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Opportunities in Campaign ({campaign.campaignLeads.length})</CardTitle>
          <span className="text-[11px] text-slate-500">Manual action required — no auto-send in MVP</span>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {campaign.campaignLeads.map((cl: any) => {
              const analysis = cl.lead.aiAnalyses[0];
              return (
                <div key={cl.id} className="flex items-center justify-between rounded-xl border p-3.5 hover:bg-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">{(cl.lead.name || "U")[0]}</div>
                    <div className="min-w-0">
                      <Link href={`/leads/${cl.leadId}`} className="font-semibold text-sm hover:underline truncate">{cl.lead.name || "Unnamed"}</Link>
                      <div className="text-xs text-slate-500 truncate">{cl.lead.company} • ₽{cl.lead.dealValue ? Math.round(cl.lead.dealValue).toLocaleString() : "—"} • {cl.lead.product || ""}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {analysis && <Badge variant={analysis.recoveryScore >= 80 ? "critical" : analysis.recoveryScore >= 60 ? "high" : "medium"}>{analysis.recoveryScore}</Badge>}
                    <span className={`text-[11px] px-2 py-1 rounded-full font-medium border ${cl.status === "contacted" ? "bg-blue-100 text-blue-700 border-blue-200" : cl.outcome === "RECOVERED" || cl.outcome === "won" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100"}`}>{cl.outcome || cl.status}</span>
                    {cl.messageStatus && <span className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{cl.messageStatus}</span>}
                    <Link href={`/leads/${cl.leadId}`} className="text-xs font-medium underline">View</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Message Workflow — Human Approval</CardTitle>
          <span className="text-[11px] px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">Manual action required</span>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg bg-slate-900 text-white p-4 text-xs grid md:grid-cols-4 gap-4">
            <div><div className="font-bold text-slate-400 uppercase text-[11px]">1. Generate</div><div className="mt-1">AI generates personalized message</div></div>
            <div><div className="font-bold text-slate-400 uppercase text-[11px]">2. Review</div><div className="mt-1">User reviews & edits</div></div>
            <div><div className="font-bold text-slate-400 uppercase text-[11px]">3. Approve</div><div className="mt-1">Mark as ready / manual send</div></div>
            <div><div className="font-bold text-slate-400 uppercase text-[11px]">4. Outcome</div><div className="mt-1">Record response & recovered revenue</div></div>
          </div>
          <div className="space-y-4">
            {campaign.campaignLeads.map((cl: any) => {
              const analysis = cl.lead.aiAnalyses[0];
              return (
                <div key={cl.id} className="rounded-xl border p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="text-sm font-bold">{cl.lead.name} — {cl.lead.company} • ₽{cl.lead.dealValue ? Math.round(cl.lead.dealValue).toLocaleString() : "—"}</div>
                    <div className="flex gap-1.5">
                      <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 border">{cl.messageStatus || "pending"}</span>
                      {cl.outcome && <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">{cl.outcome}</span>}
                    </div>
                  </div>
                  <div className="mt-3 grid md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase text-slate-500">Generated</div>
                      <div className="mt-1 text-sm bg-slate-50 border rounded-lg p-3 whitespace-pre-wrap leading-relaxed">{analysis?.generatedMessage || cl.messageGenerated || "No message"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase text-slate-500">Edited / Final (if any)</div>
                      <div className="mt-1 text-sm bg-white border rounded-lg p-3 whitespace-pre-wrap leading-relaxed">{cl.messageEdited || <span className="text-slate-400">No edit yet — user can edit before marking ready</span>}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
