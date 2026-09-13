import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm">O</div>
            <span className="font-semibold text-slate-900">Onvyra</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">Sign in</Link>
            <Link href="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            <span className="mr-2 h-2 w-2 rounded-full bg-emerald-500"></span>
            B2B Revenue Recovery Platform
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
            Find the customers your business is leaving behind.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Onvyra analyzes your existing leads and customer data to identify stalled opportunities, estimate recoverable revenue, and show your team who to contact next.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 text-base">Analyze My Leads</Button>
            </Link>
            <Link href="/login?demo=1">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">Try Demo</Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">No credit card required • 1,000 demo leads available</p>
        </div>

        {/* Mock Dashboard Preview */}
        <div className="mx-auto mt-20 max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-400"></div>
              <div className="h-3 w-3 rounded-full bg-amber-400"></div>
              <div className="h-3 w-3 rounded-full bg-green-400"></div>
            </div>
            <div className="text-xs text-slate-500">dashboard.onvyra.ai</div>
          </div>
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="rounded-xl border border-slate-200 p-5">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Potential Recoverable Revenue</div>
                <div className="mt-2 text-2xl font-bold">₽3,740,000</div>
                <div className="mt-1 text-xs text-slate-500">Across 127 priority leads</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-5">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">High Confidence</div>
                <div className="mt-2 text-2xl font-bold">₽1,280,000</div>
                <div className="mt-1 text-xs text-emerald-600">42 leads • 70%+ probability</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-5">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Confirmed Recovered</div>
                <div className="mt-2 text-2xl font-bold">₽317,000</div>
                <div className="mt-1 text-xs text-slate-500">12 deals won</div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { name: "Ivan Petrov", value: "₽185,000", score: 92, prob: "74%", conf: "HIGH", reason: "Quotation sent • No follow-up" },
                { name: "Maria Sokolova", value: "₽240,000", score: 88, prob: "68%", conf: "HIGH", reason: "Price requested • Think signal" },
                { name: "Alexey Kuznetsov", value: "₽120,000", score: 81, prob: "62%", conf: "MEDIUM", reason: "Product specified • No response 14d" },
              ].map((lead, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium">{lead.name[0]}</div>
                    <div>
                      <div className="font-medium text-sm">{lead.name}</div>
                      <div className="text-xs text-slate-500">{lead.reason}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <div className="text-sm font-semibold">{lead.value}</div>
                      <div className="text-xs text-slate-500">{lead.prob} probability</div>
                    </div>
                    <div className="text-xs font-bold px-2 py-1 rounded bg-slate-900 text-white">{lead.score}</div>
                    <div className={`text-[10px] font-bold px-2 py-1 rounded ${lead.conf === "HIGH" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{lead.conf}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight">How Onvyra recovers revenue</h2>
            <p className="mt-3 text-slate-600">Turn your forgotten leads into revenue without new ad spend.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Import your data", desc: "Upload CSV/XLSX from your CRM, spreadsheets, or call logs. AI maps columns automatically." },
              { title: "AI identifies opportunities", desc: "Deterministic scoring + AI analysis finds stalled deals, estimates probability and recoverable revenue." },
              { title: "Recover with context", desc: "Get personalized follow-up messages and campaign tools. Track outcomes to confirmed revenue." },
            ].map((f, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="h-10 w-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm mb-4">{i + 1}</div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-slate-200 p-8 md:p-12 bg-white">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-xl font-bold">Built for sales teams who hate wasting leads</h3>
              <p className="mt-3 text-sm text-slate-600">Onvyra never invents data, never guarantees revenue, and keeps your data isolated per organization. Every insight is explainable.</p>
              <ul className="mt-6 space-y-2 text-sm">
                <li className="flex gap-2"><span className="text-emerald-600">✓</span> Tenant isolation & secure auth</li>
                <li className="flex gap-2"><span className="text-emerald-600">✓</span> Deterministic scoring, auditable</li>
                <li className="flex gap-2"><span className="text-emerald-600">✓</span> No auto-messaging — you stay in control</li>
              </ul>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6">
              <div className="text-xs font-medium text-slate-500 uppercase">Recovery Score Logic</div>
              <div className="mt-4 space-y-2 text-xs font-mono">
                <div className="flex justify-between"><span>+20 explicit interest</span><span className="text-slate-500">detected</span></div>
                <div className="flex justify-between"><span>+15 product mentioned</span><span className="text-slate-500">detected</span></div>
                <div className="flex justify-between"><span>+15 price requested</span><span className="text-slate-500">detected</span></div>
                <div className="flex justify-between"><span>+10 quotation sent</span><span className="text-slate-500">detected</span></div>
                <div className="flex justify-between"><span>-50 already won</span><span className="text-red-600">excluded</span></div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold"><span>Score: 92 Critical</span><span>₽130k potential</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto max-w-7xl px-6 flex justify-between items-center text-xs text-slate-500">
          <div>© 2026 Onvyra. All rights reserved.</div>
          <div>Potential revenue ≠ guaranteed revenue. Always verify.</div>
        </div>
      </footer>
    </div>
  );
}
