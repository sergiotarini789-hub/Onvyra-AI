export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LeadDetailActions from "./actions";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, organizationId: session.organizationId },
    include: {
      aiAnalyses: { orderBy: { createdAt: "desc" }, take: 1 },
      recoveryEvents: { orderBy: { createdAt: "desc" } },
      campaignLeads: { include: { campaign: true } },
    },
  });

  if (!lead) notFound();

  const analysis = lead.aiAnalyses[0];

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/leads" className="hover:text-slate-900">Leads</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{lead.name || "Lead"}</span>
        {lead.isDemo && <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 font-bold">DEMO DATA</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Customer & Deal</span>
                {analysis && <Badge variant={analysis.recoveryScore >= 80 ? "critical" : analysis.recoveryScore >= 60 ? "high" : "medium"}>Score {analysis.recoveryScore}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><div className="text-xs text-slate-500">Name</div><div className="font-medium">{lead.name || "—"}</div></div>
                <div><div className="text-xs text-slate-500">Company</div><div className="font-medium">{lead.company || "—"}</div></div>
                <div><div className="text-xs text-slate-500">Email</div><div className="font-medium">{lead.email || "—"}</div></div>
                <div><div className="text-xs text-slate-500">Phone</div><div className="font-medium">{lead.phone || "—"}</div></div>
                <div><div className="text-xs text-slate-500">Product</div><div className="font-medium">{lead.product || "—"}</div></div>
                <div><div className="text-xs text-slate-500">Manager</div><div className="font-medium">{lead.manager || "—"}</div></div>
                <div><div className="text-xs text-slate-500">Deal Value</div><div className="font-bold text-base">₽{lead.dealValue ? Math.round(lead.dealValue).toLocaleString("ru-RU") : "—"}</div></div>
                <div><div className="text-xs text-slate-500">Deal Stage</div><div className="font-medium">{lead.dealStage || "—"}</div></div>
                <div><div className="text-xs text-slate-500">Status</div><div className="font-medium">{lead.status || "—"}</div></div>
                <div><div className="text-xs text-slate-500">Last Contact</div><div className="font-medium">{lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleString("ru-RU") : "—"}</div></div>
                <div className="col-span-2"><div className="text-xs text-slate-500">Last Message</div><div className="mt-1 p-3 rounded-lg bg-slate-50 border text-sm">{lead.lastMessage || "—"}</div></div>
              </div>
            </CardContent>
          </Card>

          {analysis && (
            <Card>
              <CardHeader><CardTitle>Why this lead?</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-slate-500 uppercase">Recovery Score</div>
                    <div className="text-xl font-bold mt-1">{analysis.recoveryScore} <span className="text-xs font-normal text-slate-500">/ 100</span></div>
                    <div className="text-xs mt-1 capitalize">{analysis.recoveryScore >= 80 ? "Critical" : analysis.recoveryScore >= 60 ? "High" : analysis.recoveryScore >= 40 ? "Medium" : "Low"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-slate-500 uppercase">Probability</div>
                    <div className="text-xl font-bold mt-1">{analysis.recoveryProbability ? `${Math.round(analysis.recoveryProbability * 100)}%` : "—"}</div>
                    <div className="text-xs mt-1">Est. • Not guaranteed</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-slate-500 uppercase">Confidence</div>
                    <div className="text-xl font-bold mt-1 capitalize">{analysis.confidence}</div>
                    <div className="text-xs mt-1">{analysis.buyingIntent} intent</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Reasoning</div>
                  <div className="text-sm text-slate-700 bg-slate-50 border rounded-lg p-3">{analysis.reasoningSummary}</div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500">Loss Reason:</span> <span className="font-medium">{analysis.lossReason}</span></div>
                  <div><span className="text-slate-500">Lead Status:</span> <span className="font-medium">{analysis.leadStatus}</span></div>
                  <div><span className="text-slate-500">Buying Intent:</span> <span className="font-medium">{analysis.buyingIntent}</span></div>
                  <div><span className="text-slate-500">Recommended:</span> <span className="font-medium">{analysis.recommendedAction.replace("_", " ")}</span></div>
                  <div className="col-span-2"><span className="text-slate-500">Message Goal:</span> <span className="font-medium">{analysis.recommendedMessageGoal}</span></div>
                </div>

                {lead.dealValue && analysis.recoveryProbability && (
                  <div className="rounded-lg bg-slate-900 text-white p-4">
                    <div className="text-xs text-slate-400 uppercase">Potential Recoverable Revenue</div>
                    <div className="text-2xl font-bold mt-1">₽{Math.round(lead.dealValue * analysis.recoveryProbability).toLocaleString("ru-RU")}</div>
                    <div className="text-xs text-slate-400 mt-1">₽{Math.round(lead.dealValue).toLocaleString()} × {Math.round(analysis.recoveryProbability * 100)}% • Est. not guaranteed</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {analysis?.generatedMessage && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>AI-generated message</CardTitle>
                <span className="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-600">Goal: {analysis.recommendedMessageGoal}</span>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-white p-4 text-sm leading-6 whitespace-pre-wrap">{analysis.generatedMessage}</div>
                <LeadDetailActions leadId={lead.id} message={analysis.generatedMessage} />
              </CardContent>
            </Card>
          )}

          {!analysis && (
            <Card>
              <CardContent className="p-6 text-sm text-slate-500">No AI analysis yet. Run analysis from import or wait for processing.</CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Outcome Tracking</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <form action={`/api/leads/${lead.id}/outcome`} method="post" className="space-y-3">
                <select name="outcome" className="w-full rounded-lg border border-slate-200 p-2 text-sm">
                  <option value="no_response">No response</option>
                  <option value="responded">Responded</option>
                  <option value="interested">Interested</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                  <option value="not_interested">Not interested</option>
                </select>
                <input name="revenue" type="number" placeholder="Actual revenue if won" className="w-full rounded-lg border border-slate-200 p-2 text-sm" />
                <input name="note" placeholder="Note" className="w-full rounded-lg border border-slate-200 p-2 text-sm" />
                <button type="submit" className="w-full rounded-lg bg-slate-900 text-white py-2 text-sm font-medium">Record Outcome</button>
              </form>

              <div className="pt-3 border-t space-y-2">
                <div className="text-xs font-medium text-slate-500 uppercase">History</div>
                {lead.recoveryEvents.length === 0 ? (
                  <div className="text-xs text-slate-400">No events yet</div>
                ) : (
                  lead.recoveryEvents.map((ev) => (
                    <div key={ev.id} className="text-xs border rounded-lg p-2">
                      <div className="flex justify-between"><span className="font-medium">{ev.outcome}</span><span className="text-slate-500">{new Date(ev.createdAt).toLocaleDateString()}</span></div>
                      {ev.revenue && <div className="text-emerald-700 font-medium">₽{ev.revenue.toLocaleString()}</div>}
                      {ev.note && <div className="text-slate-600 mt-1">{ev.note}</div>}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Raw Data</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-[11px] bg-slate-50 border rounded-lg p-3 overflow-auto max-h-64">{JSON.stringify(lead.rawData ? JSON.parse(lead.rawData) : {}, null, 2)}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Campaigns</CardTitle></CardHeader>
            <CardContent>
              {lead.campaignLeads.length === 0 ? (
                <div className="text-xs text-slate-500">Not in any campaign</div>
              ) : (
                <div className="space-y-2">
                  {lead.campaignLeads.map((cl) => (
                    <Link key={cl.id} href={`/campaigns/${cl.campaignId}`} className="block text-xs border rounded-lg p-2 hover:bg-slate-50">
                      <div className="font-medium">{cl.campaign.name}</div>
                      <div className="text-slate-500">{cl.status}</div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
