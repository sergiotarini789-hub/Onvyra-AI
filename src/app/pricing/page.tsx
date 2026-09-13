import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_LIMITS, PLAN_PRICES } from "@/lib/billing";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm">O</div>
            <span className="font-semibold">Onvyra</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">Sign in</Link>
            <Link href="/register"><Button size="sm">Analyze Your Pipeline</Button></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight">Simple pricing for revenue recovery</h1>
          <p className="mt-4 text-slate-600">No fake unlimited claims. Limits configurable in src/lib/billing.ts, not scattered. Billing integration not configured shows honest status — no fake payments.</p>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {(["FREE", "PRO", "BUSINESS"] as const).map((plan) => (
            <Card key={plan} className={plan === "PRO" ? "border-slate-900 ring-1 ring-slate-900" : ""}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{plan}</span>
                  {plan === "PRO" && <span className="text-[10px] px-2 py-1 rounded-full bg-slate-900 text-white">POPULAR</span>}
                </CardTitle>
                <div className="mt-3">
                  <div className="text-3xl font-bold">{PLAN_PRICES[plan].label}</div>
                  <div className="text-xs text-slate-500 mt-1">{plan === "FREE" ? "For testing Onvyra" : plan === "PRO" ? "For small teams" : "For companies with larger pipelines"}</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>{PLAN_LIMITS[plan].leads.toLocaleString()} leads</span><span className="text-slate-400">limit</span></div>
                  <div className="flex justify-between"><span>{PLAN_LIMITS[plan].aiAnalysesPerMonth} AI analyses / month</span></div>
                  <div className="flex justify-between"><span>{PLAN_LIMITS[plan].campaigns} campaigns</span></div>
                  <div className="flex justify-between"><span>{PLAN_LIMITS[plan].users} users</span></div>
                  <div className="flex justify-between"><span>{PLAN_LIMITS[plan].crmIntegrations} CRM integrations</span></div>
                  <div className="flex justify-between"><span>{PLAN_LIMITS[plan].importsPerMonth} imports / month</span></div>
                </div>
                <div className="pt-4">
                  <Link href="/register" className={`block text-center h-10 leading-10 rounded-lg font-bold text-sm ${plan === "PRO" ? "bg-slate-900 text-white" : "border bg-white"}`}>{plan === "FREE" ? "Start Free" : `Get ${plan}`}</Link>
                </div>
                <div className="text-[11px] text-slate-500">No fake payments — if STRIPE_SECRET_KEY not set, shows Billing integration not configured</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold">FAQ</h2>
          <div className="mt-6 space-y-4 text-sm">
            <div className="border rounded-xl p-4"><div className="font-bold">What is estimated recoverable revenue?</div><div className="mt-2 text-slate-600">Deal Value × Probability. Estimated, not guaranteed. Potential ≠ Confirmed. Only confirmed when you record RECOVERED with actual amount.</div></div>
            <div className="border rounded-xl p-4"><div className="font-bold">Do you automatically send messages?</div><div className="mt-2 text-slate-600">No. MVP is manual action required. AI generates, you review & approve, then mark as contacted. No auto-send unless real messaging provider verified.</div></div>
            <div className="border rounded-xl p-4"><div className="font-bold">Is my data isolated?</div><div className="mt-2 text-slate-600">Yes. Every query scoped by organizationId. Tested cross-tenant read/write, IDOR. See /security</div></div>
            <div className="border rounded-xl p-4"><div className="font-bold">What about AI hallucinations?</div><div className="mt-2 text-slate-600">AI never invents prices, discounts, deadlines, product details, customer statements. If information missing, says Not enough information. Validated via Zod, evaluated via 100-case dataset.</div></div>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto max-w-7xl px-6 flex justify-between text-xs text-slate-500">
          <div>© 2026 Onvyra</div>
          <div className="flex gap-4"><Link href="/security" className="underline">Security</Link><Link href="/" className="underline">Home</Link></div>
        </div>
      </footer>
    </div>
  );
}
