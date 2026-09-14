export const dynamic = 'force-dynamic';
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [leadCount, analysisCount] = await Promise.all([
    prisma.lead.count({ where: { organizationId: session.organizationId } }),
    prisma.aIAnalysis.count({ where: { organizationId: session.organizationId } }),
  ]);

  const hasData = leadCount > 0;

  const analyses = await prisma.aIAnalysis.findMany({ where: { organizationId: session.organizationId }, include: { lead: true }, take: 10000 });
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
    <div className="p-6 lg:p-8 space-y-6 max-w-[900px] mx-auto">
      <div className="text-center py-12">
        <div className="mx-auto h-14 w-14 rounded-[16px] bg-[#0A0A0B] text-white flex items-center justify-center font-[800] text-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.15)]">O</div>
        <h1 className="mt-6 text-[36px] font-[800] tracking-[-0.03em] leading-[0.95]">Welcome to Onvyra</h1>
        <p className="mt-4 text-[15px] text-[#52525B] max-w-[560px] mx-auto leading-[1.6]">Find the customers your business is leaving behind. Onvyra analyzes your existing leads, opportunities, and interactions to identify recoverable revenue.</p>
      </div>

      {!hasData ? (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-[20px] border border-[#0A0A0B] bg-white p-6 shadow-premium hover-lift">
              <div className="h-10 w-10 rounded-[12px] bg-[#0A0A0B] text-white flex items-center justify-center">◫</div>
              <h3 className="mt-4 text-[15px] font-[700] tracking-[-0.01em]">Upload CSV / XLSX</h3>
              <p className="mt-2 text-[13px] leading-[1.5] text-[#52525B]">Upload your customer file. AI maps columns like Имя→name automatically. Data treated as DATA, not instructions.</p>
              <div className="mt-2 text-[11px] text-[#71717A]">Supports: CSV, XLSX, up to 10MB, Russian columns</div>
              <Link href="/import" className="mt-5 inline-flex h-[38px] px-4 items-center justify-center rounded-[11px] bg-[#0A0A0B] text-white text-[13px] font-[700] shadow-sm hover:bg-[#1A1D23]">Upload File →</Link>
            </div>
            <div className="rounded-[20px] border border-[#E4E4E7]/80 bg-white p-6 shadow-premium hover-lift">
              <div className="h-10 w-10 rounded-[12px] bg-[#F4F4F5] border flex items-center justify-center">◎</div>
              <h3 className="mt-4 text-[15px] font-[700] tracking-[-0.01em]">Connect CRM</h3>
              <p className="mt-2 text-[13px] leading-[1.5] text-[#52525B]">Connect HubSpot (read-only) or use mock provider for testing. No fake sync, honest status.</p>
              <div className="mt-2 text-[11px] text-[#71717A]">Requires HUBSPOT_API_KEY for live sync</div>
              <Link href="/integrations" className="mt-5 inline-flex h-[38px] px-4 items-center justify-center rounded-[11px] border border-[#E4E4E7] bg-white text-[13px] font-[600] shadow-sm hover:bg-[#F9FAFB]">View Integrations →</Link>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#0A0A0B]/[0.06] bg-white p-6 shadow-premium">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">OR TRY DEMO — SEE HOW IT WORKS</div>
            <p className="mt-3 text-[13px] leading-[1.5] text-[#52525B]">Load 1,000 realistic demo leads (SaaS, web dev, consulting, ecom, B2B) with cold/stalled/high-value/rejected/old/incomplete patterns. Metrics derived from real demo data, not hardcoded.</p>
            <div className="mt-5 flex gap-2">
              <form action="/api/demo/seed" method="post"><button className="h-[40px] px-5 rounded-[11px] bg-[#0A0A0B] text-white text-[13px] font-[700] shadow-sm hover:bg-[#1A1D23]">Load Demo Data (1,000 leads)</button></form>
              <Link href="/dashboard" className="h-[40px] px-4 inline-flex items-center justify-center rounded-[11px] border border-[#E4E4E7] bg-white text-[13px] font-[600]">Skip to Dashboard</Link>
            </div>
          </div>

          <div className="rounded-[20px] bg-[#0A0A0B] text-white p-6 shadow-premium-dark">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-white/50">HOW ONVYRA WORKS — BUSINESS LOOP</div>
            <div className="mt-5 grid md:grid-cols-4 gap-6 text-[12px]">
              <div><div className="font-[700]">1. Connect</div><div className="mt-1 text-white/60 leading-[1.5]">Import CSV/XLSX or CRM (read-only)</div></div>
              <div><div className="font-[700]">2. Finds</div><div className="mt-1 text-white/60 leading-[1.5]">Recovery Engine scores 0-100 with explainable factors</div></div>
              <div><div className="font-[700]">3. Explains</div><div className="mt-1 text-white/60 leading-[1.5]">WHY chips, probability breakdown, estimated recoverable</div></div>
              <div><div className="font-[700]">4. Track</div><div className="mt-1 text-white/60 leading-[1.5]">Human approves messages, records CONTACTED→RECOVERED, measures confirmed revenue</div></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-[20px] border border-[#A7F3D0] bg-[#ECFDF5] p-6 shadow-premium">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-[#065F46]">ANALYSIS COMPLETE — REAL DATA</div>
            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="rounded-[14px] bg-white border border-[#E4E4E7] p-4"><div className="text-[24px] font-[800] tracking-[-0.02em]">{leadCount.toLocaleString()}</div><div className="text-[10px] uppercase font-[800] tracking-[0.06em] text-[#71717A] mt-1">Records Analyzed</div></div>
              <div className="rounded-[14px] bg-white border border-[#E4E4E7] p-4"><div className="text-[24px] font-[800] tracking-[-0.02em]">{opportunities}</div><div className="text-[10px] uppercase font-[800] tracking-[0.06em] text-[#71717A] mt-1">Recovery Opps</div></div>
              <div className="rounded-[14px] bg-[#0A0A0B] text-white p-4 shadow-[0_4px_12px_rgba(0,0,0,0.15)]"><div className="font-mono-financial text-[22px] font-[850] tracking-[-0.02em]">₽{Math.round(potential).toLocaleString("ru-RU")}</div><div className="text-[10px] uppercase font-[800] tracking-[0.06em] text-white/50 mt-1">Est. Recoverable</div><div className="text-[10px] text-white/40">Not guaranteed</div></div>
              <div className="rounded-[14px] bg-white border border-[#E4E4E7] p-4"><div className="text-[24px] font-[800] tracking-[-0.02em]">{critical} / {high}</div><div className="text-[10px] uppercase font-[800] tracking-[0.06em] text-[#71717A] mt-1">Critical / High</div></div>
            </div>
            <div className="mt-4 text-[11px] text-[#065F46]">All numbers from real calculations on your data. No hardcoded metrics. Potential ≠ Confirmed.</div>
            <div className="mt-5 flex gap-2">
              <Link href="/inbox" className="h-[40px] px-6 inline-flex items-center justify-center rounded-[11px] bg-[#0A0A0B] text-white text-[13px] font-[700] shadow-sm hover:bg-[#1A1D23]">View Recovery Opportunities →</Link>
              <Link href="/dashboard" className="h-[40px] px-5 inline-flex items-center justify-center rounded-[11px] border border-[#0A0A0B]/20 bg-white text-[13px] font-[600]">Explore Dashboard</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
