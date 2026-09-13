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
            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-white font-bold">v1.0</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="hidden md:inline text-sm font-medium text-slate-600 hover:text-slate-900">Pricing</Link>
            <Link href="/security" className="hidden md:inline text-sm font-medium text-slate-600 hover:text-slate-900">Security</Link>
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">Sign in</Link>
            <Link href="/register">
              <Button size="sm">Analyze Your Pipeline</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            <span className="mr-2 h-2 w-2 rounded-full bg-emerald-500"></span>
            AI Revenue Recovery Platform • No guaranteed revenue claims
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-6xl leading-[1.1]">
            Find the customers your business is leaving behind.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Onvyra analyzes your existing leads, customers and deals to identify opportunities worth recovering — and helps your team act on them.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 text-base font-bold">Analyze Your Pipeline</Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">See How It Works</Button>
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-500">Potential ≠ Confirmed • Estimated revenue is not guaranteed • You stay in control</p>
        </div>

        {/* Product Screens Mock */}
        <div className="mx-auto mt-20 max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-400"></div>
              <div className="h-3 w-3 rounded-full bg-amber-400"></div>
              <div className="h-3 w-3 rounded-full bg-green-400"></div>
            </div>
            <div className="text-xs text-slate-500">Recovery Inbox • onvyra.ai</div>
          </div>
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="rounded-xl border border-slate-900 p-5 bg-slate-900 text-white">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Estimated Recoverable</div>
                <div className="mt-2 text-2xl font-bold">₽3,740,000</div>
                <div className="mt-1 text-xs text-slate-400">127 priority • Est. not guaranteed</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">High Priority</div>
                <div className="mt-2 text-2xl font-bold">89</div>
                <div className="mt-1 text-xs text-slate-500">42 critical • 47 high</div>
              </div>
              <div className="rounded-xl border border-emerald-200 p-5 bg-emerald-50/50">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Confirmed Recovered</div>
                <div className="mt-2 text-2xl font-bold text-emerald-900">₽317,000</div>
                <div className="mt-1 text-xs text-emerald-700">12 recovered • Attributed</div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { name: "Ivan Petrov", company: "Acme LLC", value: "₽185,000", score: 92, prob: "74%", reason: "Pricing requested • Strong product match • No contact 18 days", action: "Follow up today" },
                { name: "Maria Sokolova", company: "Beta Corp", value: "₽240,000", score: 88, prob: "68%", reason: "Quotation sent • Think signal • Proposal stage", action: "Re-engage" },
                { name: "Alexey Kuznetsov", company: "Gamma LLC", value: "₽120,000", score: 81, prob: "62%", reason: "Product specified • No response 14d", action: "Follow up" },
              ].map((lead, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">{lead.name[0]}</div>
                    <div>
                      <div className="font-semibold text-sm">{lead.name} <span className="font-normal text-slate-500">• {lead.company}</span></div>
                      <div className="text-xs text-slate-600 mt-0.5">WHY: {lead.reason}</div>
                      <div className="text-[11px] font-bold mt-1 text-slate-900">→ {lead.action}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-sm font-bold">{lead.value}</div>
                      <div className="text-[11px] text-slate-500">{lead.prob} est. • Not guaranteed</div>
                    </div>
                    <div className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-600 text-white">{lead.score}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Most businesses lose revenue they already earned</h2>
              <p className="mt-4 text-sm text-slate-600 leading-relaxed">Leads go cold after pricing requests. Proposals sent but never followed up. Old customers forgotten. Your CRM has the data, but no one has time to analyze thousands of records to find who is worth contacting today.</p>
              <ul className="mt-6 space-y-2 text-sm">
                <li className="flex gap-2"><span className="text-red-500">•</span> Quotation sent, no follow-up for 18 days</li>
                <li className="flex gap-2"><span className="text-red-500">•</span> Customer said think about it and disappeared</li>
                <li className="flex gap-2"><span className="text-red-500">•</span> High-value deal stalled at proposal stage</li>
                <li className="flex gap-2"><span className="text-red-500">•</span> Old pipeline never reviewed systematically</li>
              </ul>
            </div>
            <div className="rounded-2xl border bg-white p-6">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Without Onvyra</div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between p-3 rounded-lg bg-red-50 border border-red-100"><span>1,284 leads in CRM</span><span className="text-slate-500">No prioritization</span></div>
                <div className="flex justify-between p-3 rounded-lg bg-red-50 border border-red-100"><span>43 potential recoveries</span><span className="text-slate-500">Hidden</span></div>
                <div className="flex justify-between p-3 rounded-lg bg-red-50 border border-red-100"><span>₽2.8M estimated</span><span className="text-slate-500">Left behind</span></div>
              </div>
              <div className="mt-6 text-[11px] font-bold uppercase tracking-wider text-slate-500">With Onvyra</div>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200"><span>43 opportunities found</span><span className="font-bold">Prioritized</span></div>
                <div className="flex justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200"><span>8 critical, 15 high</span><span className="font-bold">Why explained</span></div>
                <div className="flex justify-between p-3 rounded-lg bg-slate-900 text-white"><span>₽2.8M estimated • ₽186k confirmed</span><span>Tracked</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">How Onvyra Works</h2>
          <p className="mt-4 text-sm text-slate-600">DATA → ANALYSIS → RECOVERABLE OPPORTUNITIES → PRIORITIZATION → EXPLANATION → ACTION → FOLLOW-UP → OUTCOME → RECOVERED REVENUE</p>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: "1", title: "Connect", desc: "Upload CSV/XLSX or connect CRM (read-only). Russian columns like Имя→name auto-mapped. Data treated as DATA, not instructions." },
            { step: "2", title: "Finds", desc: "Recovery Engine 2.0 scores every lead 0-100 with explainable factors. No black box. Probability transparent with breakdown." },
            { step: "3", title: "Explains", desc: "WHY chips, positive/negative signals, estimated recoverable revenue (Deal Value × Probability). Clearly labeled estimated, not guaranteed." },
            { step: "4", title: "Track", desc: "AI generates message, human approves, marks CONTACTED→RECOVERED with actual amount. Confirmed revenue tracked separately from potential." },
          ].map((f) => (
            <div key={f.step} className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">{f.step}</div>
              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recovery Example */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-2xl bg-slate-900 text-white border border-slate-900 p-8">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Recovery Example — Explainable Score</div>
              <div className="mt-6 space-y-2.5 text-xs font-mono">
                <div className="flex justify-between"><span>+20 explicit intent (интересно, хочу купить)</span><span className="text-emerald-400">+20</span></div>
                <div className="flex justify-between"><span>+15 product relevance</span><span className="text-emerald-400">+15</span></div>
                <div className="flex justify-between"><span>+15 price requested (сколько стоит)</span><span className="text-emerald-400">+15</span></div>
                <div className="flex justify-between"><span>+10 proposal sent</span><span className="text-emerald-400">+10</span></div>
                <div className="flex justify-between"><span>+10 no follow-up (forgotten)</span><span className="text-emerald-400">+10</span></div>
                <div className="flex justify-between"><span>+10 high-value deal</span><span className="text-emerald-400">+10</span></div>
                <div className="flex justify-between text-red-300"><span>-10 18 days inactive</span><span>-10</span></div>
                <div className="border-t border-white/20 pt-3 mt-3 flex justify-between font-bold text-white"><span>Score 85 → Critical → ₽180k est. recoverable</span><span>Est.</span></div>
                <div className="pt-2 text-[11px] text-slate-400">Each factor has type, signal, points, explanation — business language, not tech jargon. No black box.</div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="rounded-2xl border bg-white p-8">
                <h3 className="font-bold">Features that matter</h3>
                <ul className="mt-4 space-y-3 text-sm">
                  <li className="flex gap-3"><span className="text-emerald-600 font-bold">✓</span><span><span className="font-bold">Recovery Inbox</span> — who to contact first, prioritized</span></li>
                  <li className="flex gap-3"><span className="text-emerald-600 font-bold">✓</span><span><span className="font-bold">Opportunity Detail</span> — decision-support workspace with WHY, recommended action, AI insight</span></li>
                  <li className="flex gap-3"><span className="text-emerald-600 font-bold">✓</span><span><span className="font-bold">AI Messages</span> — personalized, human approval required, no auto-send</span></li>
                  <li className="flex gap-3"><span className="text-emerald-600 font-bold">✓</span><span><span className="font-bold">Activity Timeline</span> — real events only: imported, analyzed, contacted, recovered</span></li>
                  <li className="flex gap-3"><span className="text-emerald-600 font-bold">✓</span><span><span className="font-bold">Campaigns</span> — group opportunities, track contacted/response/recovered, confirmed revenue</span></li>
                  <li className="flex gap-3"><span className="text-emerald-600 font-bold">✓</span><span><span className="font-bold">Analytics</span> — real data only, no fake charts, by priority/source/campaign/stage/product/manager</span></li>
                </ul>
              </div>
              <div className="rounded-2xl border bg-white p-6">
                <h3 className="font-bold text-sm">Security & Trust — No Fake Claims</h3>
                <ul className="mt-3 space-y-2 text-xs text-slate-600">
                  <li>• Tenant isolation — every query scoped orgId, tested cross-org READ/WRITE, IDOR</li>
                  <li>• Secure auth — bcrypt, httpOnly JWT, SameSite lax, secure in prod</li>
                  <li>• Audit log — org-scoped, no secrets, no stack traces to client</li>
                  <li>• Prompt injection defense — imported text as DATA not instructions</li>
                  <li>• Potential ≠ Confirmed — never confuse estimated with actual</li>
                </ul>
                <div className="mt-4"><Link href="/security" className="text-xs font-bold underline">Read security details →</Link></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold">Simple pricing, honest limits</h2>
          <p className="mt-3 text-sm text-slate-600">FREE for testing, PRO for small teams, BUSINESS for larger pipelines. Limits enforced server-side, configurable in code, no fake unlimited claims.</p>
        </div>
        <div className="mt-10 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { plan: "FREE", price: "Free", desc: "500 leads, 100 AI/mo, 2 campaigns" },
            { plan: "PRO", price: "$49/mo", desc: "5,000 leads, 1,000 AI/mo, 20 campaigns, 1 CRM", popular: true },
            { plan: "BUSINESS", price: "$199/mo", desc: "50,000 leads, 10,000 AI/mo, 100 campaigns, 5 CRM" },
          ].map((p) => (
            <div key={p.plan} className={`rounded-xl border p-6 ${p.popular ? "border-slate-900 ring-1 ring-slate-900" : ""}`}>
              <div className="flex justify-between items-center"><span className="font-bold">{p.plan}</span>{p.popular && <span className="text-[10px] px-2 py-1 rounded-full bg-slate-900 text-white">POPULAR</span>}</div>
              <div className="mt-3 text-2xl font-bold">{p.price}</div>
              <div className="mt-2 text-xs text-slate-600">{p.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center"><Link href="/pricing" className="text-sm font-bold underline">View full pricing →</Link></div>
      </section>

      {/* FAQ */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-2xl font-bold">FAQ</h2>
          <div className="mt-8 space-y-4">
            <div className="rounded-xl border bg-white p-5"><div className="font-bold text-sm">What does Onvyra actually do?</div><div className="mt-2 text-sm text-slate-600">Analyzes existing leads/deals to find commercially valuable opportunities that went cold, prioritizes who to contact first, explains WHY, helps generate recovery message, tracks CONTACTED→RECOVERED with confirmed revenue.</div></div>
            <div className="rounded-xl border bg-white p-5"><div className="font-bold text-sm">Does it automatically send messages?</div><div className="mt-2 text-sm text-slate-600">No. AI generates, you review & edit, mark ready, then manually contact. MVP is manual action required. No auto-send unless real messaging provider verified. We do not pretend Send works if no provider.</div></div>
            <div className="rounded-xl border bg-white p-5"><div className="font-bold text-sm">How is estimated recoverable calculated?</div><div className="mt-2 text-sm text-slate-600">Deal Value × Probability. Probability from Recovery Score, buying intent, inactivity, data completeness, deal stage. Estimated, not guaranteed. Potential ≠ Confirmed. Confirmed only when you record RECOVERED with actual amount.</div></div>
            <div className="rounded-xl border bg-white p-5"><div className="font-bold text-sm">Is it a generic CRM or AI wrapper?</div><div className="mt-2 text-sm text-slate-600">No. Onvyra is NOT generic CRM, chatbot, AI wrapper, lead-gen, fake analytics. It is revenue recovery system with deterministic engine, explainable scoring, audit log, tenant isolation.</div></div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-16 text-center">
        <h3 className="text-3xl font-bold tracking-tight">Ready to find where you are leaving money behind?</h3>
        <p className="mt-4 text-sm text-slate-600 max-w-2xl mx-auto">Register → Onboard → Import or Connect CRM → Analyze → See real recoverable revenue → Recovery Inbox → Opportunity → Action → Outcome → Confirmed Recovered Revenue</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/register"><Button size="lg" className="h-11 px-8 font-bold">Analyze Your Pipeline</Button></Link>
          <Link href="/login"><Button variant="outline" size="lg" className="h-11 px-8">View Demo (1,000 leads)</Button></Link>
        </div>
        <div className="mt-4 text-[11px] text-slate-500">No fake customer logos • No fake testimonials • No fabricated case studies • No guaranteed claims • Built for B2B teams • v1.0</div>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between gap-2 items-center text-xs text-slate-500">
          <div>© 2026 Onvyra v1.0 — AI Revenue Recovery Platform</div>
          <div className="flex gap-4"><Link href="/pricing" className="underline">Pricing</Link><Link href="/security" className="underline">Security</Link><span>Potential ≠ Confirmed</span><span>Est. not guaranteed</span></div>
        </div>
      </footer>
    </div>
  );
}
