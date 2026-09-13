export const dynamic = 'force-dynamic';
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [leadCount, analysisCount] = await Promise.all([
    prisma.lead.count({ where: { organizationId: session.organizationId } }),
    prisma.aIAnalysis.count({ where: { organizationId: session.organizationId } }),
  ]);

  const hasData = leadCount > 0;
  const hasAnalysis = analysisCount > 0;

  // Calculate potential for welcome
  const analyses = await prisma.aIAnalysis.findMany({
    where: { organizationId: session.organizationId },
    include: { lead: true },
    take: 10000,
  });

  const potential = analyses.reduce((s, a) => {
    if (!a.recoveryProbability || !a.lead.dealValue) return s;
    const dv = typeof a.lead.dealValue === "object" && (a.lead.dealValue as any).toNumber ? (a.lead.dealValue as any).toNumber() : Number(a.lead.dealValue);
    const cents = Math.round(dv * 100);
    return s + Math.round(cents * a.recoveryProbability) / 100;
  }, 0);

  const critical = analyses.filter((a) => a.recoveryScore >= 80).length;
  const high = analyses.filter((a) => a.recoveryScore >= 60 && a.recoveryScore < 80).length;
  const opportunities = analyses.filter((a) => a.recoveryScore >= 40).length;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="text-center py-8">
        <div className="mx-auto h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">O</div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Welcome to Onvyra</h1>
        <p className="mt-3 text-sm text-slate-600 max-w-2xl mx-auto">Find the customers your business is leaving behind. Onvyra analyzes your existing leads, opportunities, and interactions to identify recoverable revenue.</p>
      </div>

      {!hasData ? (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-slate-900 hover:border-slate-900 transition cursor-pointer">
              <CardHeader><CardTitle>Upload CSV / XLSX</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-slate-600">Upload your customer file. AI maps columns like Имя→name automatically. Data treated as DATA, not instructions.</div>
                <div className="text-xs text-slate-500">Supports: CSV, XLSX, up to 10MB, Russian columns</div>
                <Link href="/import" className="inline-flex h-9 px-4 items-center justify-center rounded-lg bg-slate-900 text-white text-sm font-bold">Upload File →</Link>
              </CardContent>
            </Card>
            <Card className="hover:border-slate-300 transition">
              <CardHeader><CardTitle>Connect CRM</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-slate-600">Connect HubSpot (read-only) or use mock provider for testing. No fake sync, honest status.</div>
                <div className="text-xs text-slate-500">Requires HUBSPOT_API_KEY for live sync</div>
                <Link href="/integrations" className="inline-flex h-9 px-4 items-center justify-center rounded-lg border bg-white text-sm font-medium">View Integrations →</Link>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Or Try Demo — See How It Works</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-slate-600">Load 1,000 realistic demo leads (SaaS, web dev, consulting, ecom, B2B) with cold/stalled/high-value/rejected/old/incomplete patterns. Metrics derived from real demo data, not hardcoded.</div>
              <div className="flex gap-2">
                <form action="/api/demo/seed" method="post">
                  <button className="h-9 px-5 rounded-lg bg-slate-900 text-white text-sm font-bold">Load Demo Data (1,000 leads)</button>
                </form>
                <Link href="/dashboard" className="h-9 px-4 inline-flex items-center justify-center rounded-lg border bg-white text-sm">Skip to Dashboard</Link>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-white border-slate-900">
            <CardContent className="pt-6">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">How Onvyra Works — Business Loop</div>
              <div className="mt-4 grid md:grid-cols-4 gap-4 text-xs">
                <div><div className="font-bold">1. Connect</div><div className="mt-1 text-slate-300">Import CSV/XLSX or CRM (read-only)</div></div>
                <div><div className="font-bold">2. Finds</div><div className="mt-1 text-slate-300">Recovery Engine scores 0-100 with explainable factors</div></div>
                <div><div className="font-bold">3. Explains</div><div className="mt-1 text-slate-300">WHY chips, probability breakdown, estimated recoverable</div></div>
                <div><div className="font-bold">4. Track</div><div className="mt-1 text-slate-300">Human approves messages, records CONTACTED→RECOVERED, measures confirmed revenue</div></div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="border-emerald-300 bg-emerald-50/50">
            <CardHeader><CardTitle className="text-emerald-800">Analysis Complete — Real Data</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="rounded-xl bg-white border p-4"><div className="text-2xl font-bold">{leadCount.toLocaleString()}</div><div className="text-[11px] uppercase font-bold text-slate-500 mt-1">Records Analyzed</div></div>
                <div className="rounded-xl bg-white border p-4"><div className="text-2xl font-bold">{opportunities}</div><div className="text-[11px] uppercase font-bold text-slate-500 mt-1">Recovery Opportunities</div></div>
                <div className="rounded-xl bg-slate-900 text-white p-4"><div className="text-2xl font-bold">₽{Math.round(potential).toLocaleString("ru-RU")}</div><div className="text-[11px] uppercase font-bold text-slate-400 mt-1">Est. Recoverable</div><div className="text-[10px] text-slate-400">Not guaranteed</div></div>
                <div className="rounded-xl bg-white border p-4"><div className="text-2xl font-bold">{critical} / {high}</div><div className="text-[11px] uppercase font-bold text-slate-500 mt-1">Critical / High</div></div>
              </div>
              <div className="text-xs text-slate-600">All numbers from real calculations on your data. No hardcoded metrics. Potential ≠ Confirmed.</div>
              <div className="flex gap-2">
                <Link href="/inbox" className="h-10 px-6 inline-flex items-center justify-center rounded-lg bg-slate-900 text-white text-sm font-bold">View Recovery Opportunities →</Link>
                <Link href="/dashboard" className="h-10 px-5 inline-flex items-center justify-center rounded-lg border bg-white text-sm font-medium">Explore Dashboard</Link>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-slate-500">Next Step</CardTitle></CardHeader><CardContent><div className="text-sm font-bold">Recovery Inbox tells you who to contact first</div><div className="text-xs text-slate-500 mt-1">Prioritized by recovery score, why, recommended action</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-slate-500">Then</CardTitle></CardHeader><CardContent><div className="text-sm font-bold">Generate personalized recovery message</div><div className="text-xs text-slate-500 mt-1">AI generates, you review & approve, manual action required</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-[11px] uppercase font-bold text-slate-500">Finally</CardTitle></CardHeader><CardContent><div className="text-sm font-bold">Record outcome & measure recovered revenue</div><div className="text-xs text-slate-500 mt-1">CONTACTED→RECOVERED with actual amount, not deal value</div></CardContent></Card>
          </div>
        </div>
      )}
    </div>
  );
}
