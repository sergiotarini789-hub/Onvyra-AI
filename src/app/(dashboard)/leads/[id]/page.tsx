export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LeadDetailActions from "./actions";
import { logAudit } from "@/lib/audit";

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && v.toNumber) return v.toNumber();
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function calcPotential(dealValue: any, prob: any): number | null {
  const dv = toNum(dealValue);
  if (dv === null || prob === null || prob === undefined) return null;
  if (dv < 0 || prob < 0 || prob > 1) return null;
  const cents = Math.round(dv * 100);
  return Math.round(cents * prob) / 100;
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const lead = await prisma.lead.findFirst({
    where: { id: params.id, organizationId: session.organizationId },
    include: {
      aiAnalyses: { orderBy: { createdAt: "desc" }, take: 1 },
      recoveryEvents: { orderBy: { createdAt: "desc" } },
      campaignLeads: { include: { campaign: true } },
      recoveryOpportunities: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!lead) notFound();

  await logAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    event: "RECOVERY_OPPORTUNITY_VIEWED",
    entityType: "Lead",
    entityId: lead.id,
  });

  const analysis = lead.aiAnalyses[0];
  const dealAge = lead.createdAt ? Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : null;
  const lastContactDays = lead.lastContactAt ? Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / (1000 * 60 * 60 * 24)) : null;

  const factors = (analysis?.factors as any[]) || [];
  const positiveFactors = factors.filter((f: any) => f.type === "positive" || !f.type);
  const negativeFactors = factors.filter((f: any) => f.type === "negative");

  const timeline: Array<{ date: Date; actor: string; event: string; metadata?: string; type: string }> = [];

  timeline.push({
    date: new Date(lead.createdAt),
    actor: "System",
    event: `Imported${lead.isDemo ? " (DEMO DATA)" : ""}`,
    metadata: lead.source ? `Source: ${lead.source}` : undefined,
    type: "imported",
  });

  if (analysis) {
    timeline.push({
      date: new Date(analysis.createdAt),
      actor: "AI Analyst",
      event: `AI analyzed — Score ${analysis.recoveryScore}, ${analysis.confidence} confidence`,
      metadata: analysis.reasoningSummary,
      type: "analyzed",
    });
    if (analysis.generatedMessage) {
      timeline.push({
        date: new Date(analysis.createdAt),
        actor: "AI",
        event: "Recovery message generated",
        metadata: `Goal: ${analysis.recommendedMessageGoal}`,
        type: "message_generated",
      });
    }
  }

  for (const ev of lead.recoveryEvents) {
    timeline.push({
      date: new Date(ev.createdAt),
      actor: ev.userId ? `User ${ev.userId.slice(0, 6)}` : "System",
      event: ev.outcome,
      metadata: `${ev.revenue ? `₽${ev.revenue.toLocaleString()} ` : ""}${ev.note || ""}${ev.source ? ` • Source: ${ev.source}` : ""}`.trim(),
      type: ev.outcome.toLowerCase(),
    });
  }

  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  const dealValueNum = toNum(lead.dealValue);
  const potential = analysis ? calcPotential(lead.dealValue, analysis.recoveryProbability) : null;

  // P1-4: Use latest per lead for confirmed revenue
  const latestByLead = new Map<string, any>();
  for (const ev of lead.recoveryEvents.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())) {
    latestByLead.set(ev.leadId, ev);
  }
  const latestEvents = Array.from(latestByLead.values());
  const confirmedTotal = latestEvents.filter((e: any) => e.outcome === "RECOVERED" || e.outcome === "won").reduce((s: number, e: any) => s + (e.revenue || 0), 0);

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/inbox" className="hover:text-slate-900">Recovery Inbox</Link>
        <span>/</span>
        <Link href="/leads" className="hover:text-slate-900">Opportunities</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{lead.name || "Opportunity"}</span>
        {lead.isDemo && <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 font-bold">DEMO DATA</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Opportunity — Customer & Deal</span>
                <div className="flex gap-2">
                  {lead.status && <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 border">{lead.status}</span>}
                  {analysis && <Badge variant={analysis.recoveryScore >= 80 ? "critical" : analysis.recoveryScore >= 60 ? "high" : "medium"}>Score {analysis.recoveryScore}</Badge>}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Customer</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><div className="text-xs text-slate-500">Name</div><div className="font-medium">{lead.name || "—"}</div></div>
                  <div><div className="text-xs text-slate-500">Company</div><div className="font-medium">{lead.company || "—"}</div></div>
                  <div><div className="text-xs text-slate-500">Email</div><div className="font-medium">{lead.email || "—"}</div></div>
                  <div><div className="text-xs text-slate-500">Phone</div><div className="font-medium">{lead.phone || "—"}</div></div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Deal</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><div className="text-xs text-slate-500">Product</div><div className="font-medium">{lead.product || "—"}</div></div>
                  <div><div className="text-xs text-slate-500">Manager</div><div className="font-medium">{lead.manager || "—"}</div></div>
                  <div><div className="text-xs text-slate-500">Deal Value</div><div className="font-bold text-base">₽{dealValueNum ? Math.round(dealValueNum).toLocaleString("ru-RU") : "—"}</div></div>
                  <div><div className="text-xs text-slate-500">Deal Stage</div><div className="font-medium">{lead.dealStage || "—"}</div></div>
                  <div><div className="text-xs text-slate-500">Source</div><div className="font-medium">{lead.source || "—"}</div></div>
                  <div><div className="text-xs text-slate-500">Deal Age</div><div className="font-medium">{dealAge !== null ? `${dealAge} days` : "—"}</div></div>
                  <div><div className="text-xs text-slate-500">Last Contact</div><div className="font-medium">{lead.lastContactAt ? new Date(lead.lastContactAt).toLocaleString("ru-RU") : "—"} {lastContactDays !== null ? `(${lastContactDays}d ago)` : ""}</div></div>
                  <div><div className="text-xs text-slate-500">Status</div><div className="font-medium">{lead.status || "—"}</div></div>
                  <div className="col-span-2"><div className="text-xs text-slate-500">Last Message / Conversation</div><div className="mt-1 p-3 rounded-lg bg-slate-50 border text-sm whitespace-pre-wrap">{lead.lastMessage || "—"}</div></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {analysis && (
            <Card>
              <CardHeader><CardTitle>Recovery Score — Why This Matters</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl border p-4 bg-white">
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Recovery Score</div>
                    <div className="text-2xl font-bold mt-1">{analysis.recoveryScore} <span className="text-xs font-normal text-slate-500">/ 100</span></div>
                    <div className="mt-2"><span className={`text-[10px] px-2 py-1 rounded-full font-bold ${analysis.recoveryScore >= 80 ? "bg-red-600 text-white" : analysis.recoveryScore >= 60 ? "bg-orange-500 text-white" : analysis.recoveryScore >= 40 ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-700"}`}>{analysis.recoveryScore >= 80 ? "CRITICAL" : analysis.recoveryScore >= 60 ? "HIGH" : analysis.recoveryScore >= 40 ? "MEDIUM" : "LOW"}</span></div>
                  </div>
                  <div className="rounded-xl border p-4 bg-white">
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Est. Probability</div>
                    <div className="text-2xl font-bold mt-1">{analysis.recoveryProbability ? `${Math.round(analysis.recoveryProbability * 100)}%` : "—"}</div>
                    <div className="text-[11px] text-slate-500 mt-2">Est. • Not guaranteed</div>
                  </div>
                  <div className="rounded-xl border p-4 bg-white">
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Confidence</div>
                    <div className="text-xl font-bold mt-1 capitalize">{analysis.confidence}</div>
                    <div className="text-xs mt-1 text-slate-600">{analysis.buyingIntent} buying intent</div>
                  </div>
                </div>

                {potential !== null && (
                  <div className="rounded-xl bg-slate-900 text-white p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Estimated Recoverable Revenue</div>
                        <div className="text-3xl font-bold mt-2">₽{Math.round(potential).toLocaleString("ru-RU")}</div>
                        <div className="text-xs text-slate-400 mt-2">₽{dealValueNum ? Math.round(dealValueNum).toLocaleString() : "—"} × {Math.round((analysis.recoveryProbability || 0) * 100)}% • Estimated, not guaranteed</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-slate-400 uppercase">Potential</div>
                        <div className="text-xs text-slate-300 mt-1">≠ Confirmed</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10 text-[11px] text-slate-400">Never treat potential as actual. Only count confirmed when outcome is RECOVERED with actual amount.</div>
                  </div>
                )}

                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Why this opportunity?</div>
                  <div className="text-sm text-slate-700 bg-slate-50 border rounded-xl p-4 leading-relaxed">{analysis.reasoningSummary}</div>
                </div>

                <div className="rounded-xl border p-4 bg-white">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">Score Explanation — Business Language</div>
                  <div className="space-y-2 text-xs font-mono">
                    {factors.length > 0 ? factors.map((f: any, i: number) => (
                      <div key={i} className="flex justify-between"><span>{f.type === "positive" ? "+" : ""}{f.points} {f.explanation}</span><span className={f.type === "positive" ? "text-emerald-600" : "text-red-500"}>{f.signal}</span></div>
                    )) : <div className="text-slate-500">No factors stored — using summary</div>}
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold"><span>Total: {analysis.recoveryScore}</span><span>{analysis.recoveryScore >= 80 ? "Critical" : analysis.recoveryScore >= 60 ? "High" : "Medium"}</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-2">Positive Signals</div>
                    <div className="space-y-2">
                      {positiveFactors.length > 0 ? positiveFactors.map((f: any, i: number) => (
                        <div key={i} className="flex gap-2 text-xs border border-emerald-100 bg-emerald-50/50 rounded-lg p-2.5">
                          <span className="text-emerald-600 font-bold">+{f.points}</span>
                          <span className="flex-1"><span className="font-medium">{f.explanation}</span> <span className="text-slate-500">({f.signal})</span></span>
                        </div>
                      )) : <div className="text-xs text-slate-500">No strong positive signals</div>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-2">Negative Signals / Risks</div>
                    <div className="space-y-2">
                      {negativeFactors.length > 0 ? negativeFactors.map((f: any, i: number) => (
                        <div key={i} className="flex gap-2 text-xs border border-red-100 bg-red-50/50 rounded-lg p-2.5">
                          <span className="text-red-600 font-bold">{f.points}</span>
                          <span className="flex-1"><span className="font-medium">{f.explanation}</span> <span className="text-slate-500">({f.signal})</span></span>
                        </div>
                      )) : <div className="text-xs text-slate-500">No major negative signals</div>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                  <div><span className="text-slate-500">Loss Reason:</span> <span className="font-medium ml-1">{analysis.lossReason}</span></div>
                  <div><span className="text-slate-500">Lead Status:</span> <span className="font-medium ml-1">{analysis.leadStatus}</span></div>
                  <div><span className="text-slate-500">Buying Intent:</span> <span className="font-medium ml-1">{analysis.buyingIntent}</span></div>
                  <div><span className="text-slate-500">Recommended:</span> <span className="font-medium ml-1 bg-slate-900 text-white px-2 py-0.5 rounded text-xs">{analysis.recommendedAction.replace("_", " ")}</span></div>
                  <div className="col-span-2"><span className="text-slate-500">Message Goal:</span> <span className="font-medium ml-1">{analysis.recommendedMessageGoal}</span></div>
                </div>

                {analysis.missingInformation && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs">
                    <div className="font-bold text-amber-800">Missing Information</div>
                    <div className="mt-1 text-amber-700">{typeof analysis.missingInformation === "string" ? analysis.missingInformation : JSON.parse(analysis.missingInformation as any).join(", ")}</div>
                    <div className="mt-1 text-[11px] text-amber-600">AI says: Not enough information to determine where data missing — never invents</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {analysis?.generatedMessage && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>AI Recommendation & Recovery Message</CardTitle>
                <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-600 border">Goal: {analysis.recommendedMessageGoal}</span>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-slate-900 text-white p-4 text-xs">
                  <div className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">AI Recommendation</div>
                  <div className="mt-2"><span className="font-bold">Recommended action:</span> {analysis.recommendedAction.replace("_", " ")}</div>
                  <div className="mt-1"><span className="font-bold">Reason:</span> {analysis.reasoningSummary}</div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-[11px] text-slate-400">AI uses deterministic Recovery Engine as context, does not override financial calculations. Financial calculations remain authoritative.</div>
                </div>
                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  <span className="font-bold">AI-generated • Human approval required</span> — No automatic sending in Sprint 3 unless real messaging provider verified.
                </div>
                <LeadDetailActions leadId={lead.id} message={analysis.generatedMessage} />
              </CardContent>
            </Card>
          )}

          {!analysis && (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-sm font-bold">No AI analysis yet</div>
                <div className="text-xs text-slate-500 mt-1">Run analysis from import or wait for processing.</div>
                <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-slate-900 animate-pulse w-3/4"></div></div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Activity Timeline — Real Events Only</CardTitle></CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">No activity yet</div>
              ) : (
                <div className="space-y-3">
                  {timeline.map((item, idx) => (
                    <div key={idx} className="flex gap-3 text-xs">
                      <div className="flex flex-col items-center">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${item.type.includes("recovered") || item.type === "won" ? "bg-emerald-600 text-white" : item.type.includes("contacted") ? "bg-blue-600 text-white" : item.type === "analyzed" ? "bg-slate-900 text-white" : "bg-slate-100"}`}>{item.type[0].toUpperCase()}</div>
                        {idx < timeline.length - 1 && <div className="w-px h-full bg-slate-200 mt-1"></div>}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex justify-between items-start gap-2">
                          <div className="font-bold">{item.event}</div>
                          <div className="text-[11px] text-slate-500 shrink-0">{new Date(item.date).toLocaleString("ru-RU")}</div>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{item.actor} • {item.type}</div>
                        {item.metadata && <div className="mt-1 text-slate-600 bg-slate-50 border rounded-lg p-2">{item.metadata.slice(0, 300)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-900">
            <CardHeader><CardTitle className="text-sm">Outcome Workflow</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <form action={`/api/leads/${lead.id}/outcome`} method="post" className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500">Outcome</label>
                  <select name="outcome" className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm bg-white">
                    <option value="CONTACTED">Contacted</option>
                    <option value="REPLIED">Replied</option>
                    <option value="INTERESTED">Interested</option>
                    <option value="NEGOTIATING">Negotiating</option>
                    <option value="RECOVERED">Recovered (Won)</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="NO_RESPONSE">No Response</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="NOT_RECOVERABLE">Not Recoverable</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500">Recovered Amount (required if Recovered)</label>
                  <input name="revenue" type="number" step="0.01" placeholder="e.g. 150000" className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm" />
                  <div className="text-[10px] text-slate-500 mt-1">Do not default recovered amount to deal value without explicit user confirmation.</div>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500">Recovery Date</label>
                  <input name="recoveredAt" type="date" className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500">Notes</label>
                  <input name="note" placeholder="What happened?" className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-sm" />
                </div>
                <button type="submit" className="w-full rounded-lg bg-slate-900 text-white py-2.5 text-sm font-medium hover:bg-slate-800">Record Outcome</button>
              </form>

              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-[11px] text-emerald-800">
                <div className="font-bold">After saving, updates:</div>
                <div className="mt-1 space-y-1">
                  <div>• Confirmed Recovered Revenue</div>
                  <div>• Recovery rate</div>
                  <div>• Campaign statistics</div>
                  <div>• Dashboard</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Revenue — Estimated vs Confirmed</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-3">
              <div className="flex justify-between"><span className="text-slate-500">Deal Value</span><span className="font-medium">₽{dealValueNum ? Math.round(dealValueNum).toLocaleString() : "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Est. Probability</span><span className="font-medium">{analysis?.recoveryProbability ? `${Math.round(analysis.recoveryProbability * 100)}%` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Est. Recoverable</span><span className="font-bold">₽{potential ? Math.round(potential).toLocaleString() : "—"}</span></div>
              <div className="border-t pt-2 flex justify-between"><span className="text-slate-500">Confirmed Recovered</span><span className="font-bold text-emerald-700">₽{confirmedTotal.toLocaleString()}</span></div>
              <div className="text-[10px] text-slate-500">Deal value × probability = estimated. Confirmed = explicit recorded recovered amount.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Campaigns</CardTitle></CardHeader>
            <CardContent>
              {lead.campaignLeads.length === 0 ? (
                <div className="text-xs text-slate-500">Not in any campaign</div>
              ) : (
                <div className="space-y-2">
                  {lead.campaignLeads.map((cl: any) => (
                    <Link key={cl.id} href={`/campaigns/${cl.campaignId}`} className="block text-xs border rounded-lg p-2.5 hover:bg-slate-50">
                      <div className="font-medium">{cl.campaign.name}</div>
                      <div className="text-slate-500 mt-1 flex gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100">{cl.status}</span>
                        {cl.messageStatus && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{cl.messageStatus}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Raw Data — Untrusted</CardTitle></CardHeader>
            <CardContent>
              <div className="text-[11px] text-slate-500 mb-2">Customer-provided text is UNTRUSTED DATA</div>
              <pre className="text-[11px] bg-slate-50 border rounded-lg p-3 overflow-auto max-h-64">{JSON.stringify(lead.rawData ? JSON.parse(lead.rawData) : {}, null, 2)}</pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
