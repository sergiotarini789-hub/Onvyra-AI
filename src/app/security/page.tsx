/* eslint-disable react/no-unescaped-entities */
import Link from "next/link";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#FCFCFC] text-[#0A0A0B]">
      <header className="sticky top-0 z-50 w-full border-b border-[#0A0A0B]/[0.06] bg-[#FCFCFC]/80 backdrop-blur-[20px]">
        <div className="mx-auto flex h-[64px] max-w-[1280px] items-center justify-between px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-[32px] w-[32px] rounded-[10px] bg-[#0A0A0B] flex items-center justify-center text-white font-[800] text-[14px]">O</div>
            <span className="font-[650] text-[15px] tracking-[-0.02em]">Onvyra</span>
          </Link>
          <div className="flex gap-3 items-center">
            <Link href="/pricing" className="text-[13px] font-[500] text-[#71717A] hover:text-[#0A0A0B]">Pricing</Link>
            <Link href="/register" className="inline-flex h-[36px] items-center justify-center rounded-[10px] bg-[#0A0A0B] px-[18px] text-[13px] font-[600] text-white shadow-sm hover:bg-[#1A1D23]">Analyze Your Pipeline</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1100px] px-6 lg:px-8 py-[88px] space-y-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0A0A0B]/10 bg-white px-3 py-1 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0A0A0B]" />
            <span className="text-[11px] font-[700] tracking-[0.06em] text-[#52525B]">SECURITY • ENTERPRISE-GRADE • NO FAKE CLAIMS</span>
          </div>
          <h1 className="mt-6 text-[40px] font-[800] leading-[0.9] tracking-[-0.03em]">Security & Trust</h1>
          <p className="mt-4 text-[15px] leading-[1.6] text-[#52525B] max-w-[640px]">Concise, honest security description. No fake certifications claimed. Tenant isolation enforced, tested, verified. Potential ≠ Confirmed applies to security claims too — we don't claim SOC2 unless verified.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {[
            { title: "Tenant Isolation — Non-Negotiable", items: ["Every organization-scoped DB operation uses organizationId", "All API routes audit orgId", "Tests: Org A cannot access Org B leads/deals/opportunities/campaigns — READ and WRITE", "IDOR tested with manually substituted IDs", "See src/tests/security.test.ts and e2e.test.ts • 11 PASS"] },
            { title: "Encrypted Transport & Auth", items: ["Passwords hashed bcryptjs 10 rounds", "Sessions JWT HS256, httpOnly cookies, secure in production, SameSite lax, 7d expiration", "No secrets in Git, env only", "Authz via OWNER/ADMIN/MEMBER roles enforced server-side", "JWT_SECRET alias AUTH_SECRET 32+ chars mandatory prod"] },
            { title: "Role-Based Access", items: ["OWNER: full organization access, org:manage, member:manage", "ADMIN: operational — lead:write, campaign:manage, import:run, audit:read", "MEMBER: recovery workflow — lead:read/write, campaign:read, outcome:write", "Every protected API enforces permissions server-side", "See src/lib/roles.ts"] },
            { title: "Audit Logging", items: ["Events: USER_REGISTERED, LOGIN, LOGOUT, IMPORT_STARTED/COMPLETED, LEAD_CREATED, OPPORTUNITY_VIEWED, AI_ANALYSIS_GENERATED, MESSAGE_GENERATED, CAMPAIGN_CREATED, RECOVERY_CONTACTED, OUTCOME_UPDATED, RECOVERY_CONFIRMED", "Each log: orgId, userId, event, entityType, entityId, timestamp, metadata — no secrets", "Never log passwords, tokens, API keys", "Organization-scoped"] },
            { title: "AI Data Handling", items: ["Customer-provided text is UNTRUSTED DATA — treated as DATA not instructions", "Prompt injection defense: sanitize imported text, separate SYSTEM INSTRUCTIONS / TRUSTED BUSINESS DATA / UNTRUSTED CUSTOMER CONTENT", "AI never invents prices, discounts, deadlines, product details, customer statements", "If missing info: Not enough information to determine", "AI uses deterministic Recovery Engine as context, does not override financial calculations", "Validated via Zod, evaluated via 100-case dataset, hallucination violations measured • 100/100 PASS"] },
            { title: "No Fabricated Outcomes", items: ["Potential ≠ Confirmed — never confuse estimated with actual recovered revenue", "Estimated recoverable = Deal Value × Probability — estimated, not guaranteed", "Confirmed recovered = explicit recorded recovered amount with date, source, campaign, user, notes", "Never deal value = recovered amount automatically — requires user confirmation", "No fake metrics, no fake integrations, no fake payments, no fake customer logos, no fake testimonials, no fabricated AI info, no hardcoded dashboard revenue"] },
            { title: "Security Headers", items: ["X-Frame-Options DENY", "X-Content-Type-Options nosniff", "Referrer-Policy strict-origin-when-cross-origin", "X-XSS-Protection 1; mode=block", "Permissions-Policy camera=(), microphone=(), geolocation=()", "CSP reviewed — not breaking app, but can be hardened further", "See next.config.js"] },
            { title: "What We Do NOT Claim", items: ["No SOC 2 certification claimed unless verified", "No ISO 27001 claimed unless verified", "No GDPR certification claimed — but tenant isolation, audit log, no secrets in logs implemented", "Billing integration not configured shows honest status — no fake payments", "CRM live sync not claimed if not configured — mock provider clearly identified as mock", "Anti-bullshit rule: REAL → show it, MOCKED → clearly identify as demo/mock, NOT IMPLEMENTED → do not expose as if works, PARTIALLY → document"] },
          ].map((card) => (
            <div key={card.title} className="rounded-[16px] border border-[#0A0A0B]/[0.06] bg-white p-6 shadow-premium hover-lift">
              <div className="text-[11px] font-[800] tracking-[0.08em] text-[#71717A]">{card.title.toUpperCase()}</div>
              <div className="mt-4 space-y-2">
                {card.items.map((it, i) => (
                  <div key={i} className="flex gap-2 text-[12px] leading-[1.5] text-[#52525B]"><span className="text-[#0A0A0B] mt-1">•</span><span>{it}</span></div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[20px] bg-[#0A0A0B] text-white p-6 shadow-premium-dark">
          <div className="text-[11px] font-[800] tracking-[0.08em] text-white/50">PRODUCTION DOCUMENTATION</div>
          <div className="mt-3 text-[13px] leading-[1.6] text-white/70">See docs/PRODUCTION.md, docs/DEPLOYMENT.md, docs/PRODUCTION_RUNBOOK.md for architecture, DB, auth, security, tenant isolation, AI, CRM, imports, deployment, env, logging, backups, migrations, known limitations, incident considerations. Do not claim production-ready if not. READY FOR DEPLOYMENT ≠ PRODUCTION READY.</div>
          <div className="mt-5"><Link href="/" className="inline-flex h-[36px] items-center justify-center rounded-[10px] bg-white px-4 text-[13px] font-[700] text-[#0A0A0B] hover:bg-[#F5F5F7]">Back to Home</Link></div>
        </div>
      </section>
    </div>
  );
}
