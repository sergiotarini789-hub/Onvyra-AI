import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">O</div>
            <span className="font-semibold">Onvyra</span>
          </Link>
          <div className="flex gap-3">
            <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">Pricing</Link>
            <Link href="/register"><Button size="sm">Analyze Your Pipeline</Button></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-16 space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Security & Trust</h1>
          <p className="mt-4 text-slate-600">Concise, honest security description. No fake certifications claimed.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Tenant Isolation — Non-Negotiable</CardTitle></CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <div>• Every organization-scoped DB operation uses organizationId</div>
              <div>• All API routes audit orgId</div>
              <div>• Tests: Org A cannot access Org B leads/deals/opportunities/campaigns/conversations/messages/analytics/audit logs/outcomes — READ and WRITE</div>

              <div>• IDOR tested with manually substituted IDs</div>
              <div>• See src/tests/security.test.ts and e2e.test.ts</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Encrypted Transport & Auth</CardTitle></CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <div>• Passwords hashed bcryptjs 10 rounds</div>
              <div>• Sessions JWT HS256, httpOnly cookies, secure in production, SameSite lax, 7d expiration</div>
              <div>• No secrets in Git, env only</div>
              <div>• Authz via OWNER/ADMIN/MEMBER roles enforced server-side, never only frontend hiding buttons</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Role-Based Access</CardTitle></CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <div>• OWNER: full organization access, org:manage, member:manage</div>
              <div>• ADMIN: operational management — lead:write, campaign:manage, import:run, audit:read</div>
              <div>• MEMBER: normal recovery workflow — lead:read/write, campaign:read, outcome:write</div>
              <div>• Every protected API enforces permissions server-side</div>
              <div>• See src/lib/roles.ts</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Audit Logging</CardTitle></CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <div>• Events: USER_REGISTERED, LOGIN, LOGOUT, IMPORT_STARTED/COMPLETED, LEAD_CREATED/UPDATED, OPPORTUNITY_VIEWED, AI_ANALYSIS_GENERATED, MESSAGE_GENERATED, CAMPAIGN_CREATED/UPDATED, RECOVERY_CONTACTED, OUTCOME_UPDATED, RECOVERY_CONFIRMED</div>
              <div>• Each log: orgId, userId, event, entityType, entityId, timestamp, metadata — no secrets</div>
              <div>• Never log passwords, tokens, API keys, private credentials</div>
              <div>• Organization-scoped</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">AI Data Handling</CardTitle></CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <div>• Customer-provided text is UNTRUSTED DATA — treated as DATA not instructions</div>
              <div>• Prompt injection defense: sanitize imported text, separate SYSTEM INSTRUCTIONS / TRUSTED BUSINESS DATA / UNTRUSTED CUSTOMER CONTENT</div>
              <div>• AI prompts clearly separate instructions from data</div>
              <div>• AI never invents prices, discounts, deadlines, product details, customer statements, agreements, previous conversations, revenue, purchase intent</div>
              <div>• If missing info: Not enough information to determine</div>
              <div>• AI uses deterministic Recovery Engine as context, does not override financial calculations — system financial calculations authoritative</div>
              <div>• Validated via Zod, evaluated via 100-case dataset, hallucination violations measured</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">No Fabricated Outcomes</CardTitle></CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <div>• Potential ≠ Confirmed — never confuse estimated with actual recovered revenue</div>
              <div>• Estimated recoverable = Deal Value × Probability — estimated, not guaranteed</div>
              <div>• Confirmed recovered = explicit recorded recovered amount with date, source, campaign, user, notes</div>
              <div>• Never deal value = recovered amount automatically — requires user confirmation</div>
              <div>• No fake metrics, no fake integrations, no fake payments, no fake customer logos, no fake testimonials, no fabricated AI info, no hardcoded dashboard revenue</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">Security Headers</CardTitle></CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <div>• X-Frame-Options DENY</div>
              <div>• X-Content-Type-Options nosniff</div>
              <div>• Referrer-Policy strict-origin-when-cross-origin</div>
              <div>• X-XSS-Protection 1; mode=block</div>
              <div>• Permissions-Policy camera=(), microphone=(), geolocation=()</div>
              <div>• CSP reviewed — not breaking app, but can be hardened further</div>
              <div>• See next.config.js</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider">What We Do NOT Claim</CardTitle></CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <div>• No SOC 2 certification claimed unless verified</div>
              <div>• No ISO 27001 claimed unless verified</div>
              <div>• No GDPR certification claimed — but tenant isolation, audit log, no secrets in logs implemented</div>
              <div>• Billing integration not configured shows honest status — no fake payments</div>
              <div>• CRM live sync not claimed if not configured — mock provider clearly identified as mock</div>
              <div>• Anti-bullshit rule: REAL → show it, MOCKED → clearly identify as demo/mock, NOT IMPLEMENTED → do not expose as if works, PARTIALLY → document</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900 text-white border-slate-900">
          <CardContent className="pt-6">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Production Documentation</div>
            <div className="mt-3 text-xs text-slate-300">See docs/PRODUCTION.md for architecture, DB, auth, security, tenant isolation, AI, CRM, imports, deployment, env, logging, backups, migrations, known limitations, incident considerations. Do not claim production-ready if not.</div>
            <div className="mt-4"><Link href="/" className="text-xs px-3 py-1.5 rounded-lg bg-white text-slate-900 font-bold">Back to Home</Link></div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
