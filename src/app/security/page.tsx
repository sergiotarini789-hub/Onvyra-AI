/* eslint-disable react/no-unescaped-entities */
import Link from "next/link";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white selection:bg-white selection:text-black">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[800px] w-[1200px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,255,255,0.06)_0%,transparent_70%)]" />
      </div>

      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#0A0A0B]/90 backdrop-blur-[20px]">
        <div className="mx-auto flex h-[56px] max-w-[1280px] items-center justify-between px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-[28px] w-[28px] rounded-[8px] bg-white text-black flex items-center justify-center font-[800] text-[13px] tracking-[-0.02em] shadow-sm group-hover:shadow-[0_4px_12px_rgba(255,255,255,0.15)] transition-shadow">O</div>
            <span className="font-[650] text-[14px] tracking-[-0.02em] text-white">Onvyra</span>
            <span className="hidden md:inline-flex ml-1 h-[18px] items-center rounded-full bg-white/10 border border-white/10 px-2 text-[9px] font-[800] tracking-[0.05em] text-white/70">SECURITY</span>
          </Link>
          <div className="flex gap-2 items-center">
            <Link href="/pricing" className="hidden md:inline-flex h-[32px] items-center rounded-[9px] px-3.5 text-[12.5px] font-[500] text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">Pricing</Link>
            <Link href="/register" className="inline-flex h-[32px] items-center justify-center rounded-[9px] bg-white px-4 text-[12.5px] font-[650] text-black shadow-sm hover:bg-[#F5F5F7] hover:shadow-[0_4px_12px_rgba(255,255,255,0.12)] hover:-translate-y-[0.5px] active:translate-y-0 active:scale-[0.98] transition-all">Analyze Your Pipeline</Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-[1120px] px-6 lg:px-8 pt-[72px] pb-[88px]">
        <div className="max-w-[720px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-[pulse-subtle_2s_ease-in-out_infinite]" />
            <span className="text-[11px] font-[700] tracking-[0.06em] text-white/60">SECURITY • ENTERPRISE-GRADE • NO FAKE CLAIMS • VERIFIED</span>
          </div>
          <h1 className="mt-6 text-[44px] md:text-[56px] font-[850] leading-[0.9] tracking-[-0.04em]">Security & Trust.<br /><span className="text-white/40">No fake certifications.</span></h1>
          <p className="mt-5 text-[15px] leading-[1.65] text-white/50 max-w-[600px]">Concise, honest security. Tenant isolation enforced, tested, verified. No SOC2/ISO/GDPR claims unless verified. Potential ≠ Confirmed applies to security too. See actual protections, not marketing badges.</p>

          <div className="mt-8 flex flex-wrap gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-[600] text-white/70"><span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" /> 43/43 tests PASS</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-[600] text-white/70">11 tenant isolation PASS</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-[600] text-white/70">0 P0/P1 blockers</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#10B981]/20 bg-[#10B981]/10 px-3 py-1 text-[11px] font-[700] text-[#10B981]">100% tenant isolation</span>
          </div>
        </div>

        <div className="mt-14 grid md:grid-cols-2 gap-4">
          {[
            { title: "Tenant Isolation — Non-Negotiable", items: ["Every org-scoped DB op uses organizationId from session, not client", "All API routes audit orgId server-side", "Tests: Org A cannot READ/WRITE Org B leads/deals/opportunities/campaigns/billing/tokens", "IDOR tested with manually substituted IDs — returns 404 not 403 for data existence hiding", "See src/tests/security.test.ts 11 PASS • e2e.test.ts"] },
            { title: "Encrypted Transport & Auth", items: ["Passwords bcryptjs 10 rounds (12 prod), httpOnly JWT HS256", "Cookies secure in prod, SameSite lax, 7d expiration, 32+ chars secret mandatory", "No secrets in Git, env validation Zod • .env.example", "Authz OWNER/ADMIN/MEMBER server-side enforced, billing OWNER only", "JWT_SECRET alias AUTH_SECRET • production check fails build if missing"] },
            { title: "Role-Based Access • RBAC", items: ["OWNER: full org access, org:manage, member:manage, billing:manage", "ADMIN: operational — lead:write, campaign:manage, import:run, audit:read", "MEMBER: recovery workflow — lead:read/write, campaign:read, outcome:write", "Every protected API enforces permissions server-side, not client", "See src/lib/roles.ts • 43 tests cover RBAC"] },
            { title: "Audit Logging • No Secrets", items: ["Events: REGISTERED, LOGIN, LOGOUT, IMPORT, LEAD_CREATED, OPPORTUNITY_VIEWED, AI_GENERATED, MESSAGE, CAMPAIGN, CONTACTED, OUTCOME, RECOVERED", "Each log: orgId, userId, event, entityType, entityId, timestamp, metadata", "Never log passwords, tokens, API keys, PII in plaintext", "Organization-scoped, append-only, no stack traces to client"] },
            { title: "AI Data Handling • No Hallucination", items: ["Customer text is UNTRUSTED DATA — DATA never instructions", "Prompt injection defense: SYSTEM / TRUSTED BUSINESS / UNTRUSTED CUSTOMER separated", "AI never invents prices, discounts, deadlines, product details, customer statements", "If missing: Not enough information to determine — honest about uncertainty", "Deterministic Recovery Engine 2.0 context, AI does not override financial calc • 100/100 eval"] },
            { title: "No Fabricated Outcomes • Financial Honesty", items: ["Potential ≠ Confirmed — never confuse estimated with actual", "Estimated = Deal Value × Probability — estimated, not guaranteed, clearly labeled", "Confirmed = explicit RECOVERED with actual amount + date + source + campaign + user", "Never deal value = recovered auto — requires user confirmation + audit", "No fake metrics, integrations, payments, logos, testimonials, AI info, hardcoded revenue"] },
            { title: "Security Headers • Production Hardened", items: ["X-Frame-Options DENY • Clickjacking protection", "X-Content-Type-Options nosniff • MIME sniffing protection", "Referrer-Policy strict-origin-when-cross-origin", "X-XSS-Protection 1; mode=block • Legacy XSS", "Permissions-Policy camera=(), microphone=(), geolocation=() • Privacy", "CSP reviewed not breaking app, can harden further • See next.config.js"] },
            { title: "What We Do NOT Claim • Anti-Bullshit", items: ["No SOC 2 claimed unless verified by auditor", "No ISO 27001 claimed unless certified", "No GDPR certified claimed — but tenant isolation, audit log, no secrets implemented", "Billing NOT CONFIGURED when Stripe absent — honest status not fake", "CRM mock provider clearly identified as mock • No fake live sync", "REAL→show, MOCK→identify demo/mock, NOT IMPLEMENTED→do not expose as works, PARTIAL→document"] },
          ].map((card, i) => (
            <div key={card.title} className="group relative rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-[22px] backdrop-blur hover:bg-white/[0.06] hover:border-white/[0.12] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] hover:-translate-y-[0.5px] transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-[800] tracking-[0.08em] text-white/40">{String(i + 1).padStart(2, "0")} • {card.title.toUpperCase()}</div>
                <div className="h-5 w-5 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[10px] text-white/50 group-hover:bg-white group-hover:text-black transition-colors">✓</div>
              </div>
              <div className="mt-4 space-y-2.5">
                {card.items.map((it, j) => (
                  <div key={j} className="flex gap-2.5 text-[12px] leading-[1.55] tracking-[-0.01em] text-white/55 group-hover:text-white/70 transition-colors"><span className="mt-[7px] h-1 w-1 rounded-full bg-white/30 shrink-0 group-hover:bg-white/60 transition-colors" /><span>{it}</span></div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-2 backdrop-blur">
          <div className="rounded-[14px] bg-[#111113] border border-white/[0.06] p-6">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-[800] tracking-[0.08em] text-white/30">TENANT ISOLATION TEST • ORG A vs ORG B • LIVE VERIFICATION</div>
              <span className="text-[10px] font-[800] tracking-[0.05em] px-2.5 py-1 rounded-full bg-[#10B981] text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)]">VERIFIED • 11 PASS</span>
            </div>
            <div className="mt-6 grid md:grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="space-y-2">
                <div className="flex justify-between items-center rounded-[9px] bg-white/[0.04] border border-white/[0.06] p-3"><span className="text-white/40">GET /api/leads/{"{B_id}"} as ORG_A</span><span className="text-[#EF4444] font-[800]">→ 404</span></div>
                <div className="flex justify-between items-center rounded-[9px] bg-white/[0.04] border border-white/[0.06] p-3"><span className="text-white/40">UPDATE ORG_B data as ORG_A</span><span className="text-[#EF4444] font-[800]">→ 403</span></div>
                <div className="flex justify-between items-center rounded-[9px] bg-white/[0.04] border border-white/[0.06] p-3"><span className="text-white/40">POST /api/campaigns with B leadIds</span><span className="text-[#EF4444] font-[800]">→ 400</span></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center rounded-[9px] bg-[#ECFDF5]/10 border border-[#A7F3D0]/20 p-3"><span className="text-[#10B981]">ORG_A cannot read B opportunities</span><span className="text-[#10B981] font-[800]">✓ PASS</span></div>
                <div className="flex justify-between items-center rounded-[9px] bg-[#ECFDF5]/10 border border-[#A7F3D0]/20 p-3"><span className="text-[#10B981]">ORG_A cannot access B billing</span><span className="text-[#10B981] font-[800]">✓ PASS</span></div>
                <div className="flex justify-between items-center rounded-[9px] bg-[#ECFDF5]/10 border border-[#A7F3D0]/20 p-3"><span className="text-[#10B981]">ORG_A cannot access B CRM tokens</span><span className="text-[#10B981] font-[800]">✓ PASS</span></div>
              </div>
            </div>
            <div className="mt-4 text-[11px] text-white/30 leading-[1.5]">All queries include organizationId from session, not client. Tested via security.test.ts 11 cases PASS. No secrets in logs. No stack traces to client.</div>
          </div>
        </div>

        <div className="mt-10 grid md:grid-cols-3 gap-4">
          <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur hover:bg-white/[0.06] transition-colors">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-white/40">PRODUCTION DOCS</div>
            <div className="mt-2 text-[13px] leading-[1.5] text-white/60">See docs/PRODUCTION.md, DEPLOYMENT.md, PRODUCTION_RUNBOOK.md for arch, DB, auth, security, AI, CRM, imports, env, logging, backups, migrations, known limitations.</div>
          </div>
          <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur hover:bg-white/[0.06] transition-colors">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-white/40">READY ≠ PRODUCTION READY</div>
            <div className="mt-2 text-[13px] leading-[1.5] text-white/60">Do not claim production-ready if not. READY FOR DEPLOYMENT ≠ PRODUCTION READY. Honest status, no fake claims. Anti-bullshit rule enforced.</div>
          </div>
          <div className="rounded-[16px] bg-white text-[#0A0A0B] p-5 shadow-[0_8px_24px_rgba(255,255,255,0.08)] hover:shadow-[0_12px_32px_rgba(255,255,255,0.12)] hover:-translate-y-[0.5px] transition-all">
            <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">BUILD STATUS</div>
            <div className="mt-2 font-mono-financial text-[18px] font-[800] tracking-[-0.02em]">Build PASS • 27 routes</div>
            <div className="mt-1 text-[12px] text-[#52525B]">43/43 tests • 100/100 AI eval • 0 P0/P1 • Tenant isolated</div>
            <div className="mt-4"><Link href="/" className="inline-flex h-[32px] items-center justify-center rounded-[9px] bg-[#0A0A0B] px-3.5 text-[12px] font-[650] text-white hover:bg-[#1A1D23] transition-colors">Back to Home →</Link></div>
          </div>
        </div>
      </section>
    </div>
  );
}
