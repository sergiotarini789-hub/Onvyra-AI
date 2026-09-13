# Onvyra AI - Production Configuration

**Version:** 0.1.0 Sprint 6
**Date:** 2026-09-13
**Status:** GO AFTER CONFIGURATION (P0 0, P1 0 fixed)

This document defines the exact production environment contract for Onvyra AI.

## 1. Required Environment Variables

These MUST be set in production. Application fails clearly if missing.

### DATABASE_URL
- **Required:** YES
- **Type:** PostgreSQL connection string
- **Example:** `postgresql://user:password@host:5432/onvyra?schema=public&sslmode=require`
- **Production rule:** Must start with `postgresql://` or `postgres://`. If not, application throws `PRODUCTION_DATABASE_REQUIRED` and refuses to start. SQLite fallback `file:./dev.db` is ONLY allowed in development (NODE_ENV != production).
- **Notes:** Use SSL in production. Pooling via PgBouncer recommended.

### JWT_SECRET (or AUTH_SECRET alias)
- **Required:** YES
- **Type:** String min 32 chars random
- **Generation:** `openssl rand -base64 48` or `openssl rand -hex 32`
- **Production rule:** If length <32 in production, throws `JWT_SECRET must be at least 32 characters in production`
- **Notes:** Used for HS256 JWT signing. Rotate by invalidating all sessions.

### NEXT_PUBLIC_APP_URL
- **Required:** YES for OAuth and Stripe
- **Type:** URL
- **Example:** `https://onvyra.ai`
- **Notes:** Must be https in production. Used for HubSpot redirect URI default and Stripe success/cancel URLs. Client-safe (NEXT_PUBLIC_).

### NODE_ENV
- **Required:** YES
- **Value:** `production`
- **Notes:** Enables secure cookies, HSTS, disables dev manual billing upgrade, enforces Postgres, enables production security headers.

## 2. Optional / Conditional Variables

### OpenAI / AI Provider

| Var | Required? | Default | Description |
|-----|-----------|---------|-------------|
| OPENAI_API_KEY | OPTIONAL | empty (mock) | Real AI when set. If empty, uses deterministic mock-v1 (no fake revenue). Mock clearly labeled in logs and modelVersion. |
| OPENAI_MODEL | OPTIONAL | gpt-4o-mini | Model name |
| OPENAI_BASE_URL | OPTIONAL | https://api.openai.com/v1 | For proxies |
| OPENAI_TIMEOUT_MS | OPTIONAL | 30000 | Timeout per request |
| OPENAI_MAX_RETRIES | OPTIONAL | 2 | Retry for 429/5xx |

**Production behavior:**
- When present: real provider, timeout 30s, retry 2 exponential backoff, respects Retry-After, concurrency limit 5 in import, token tracking, Zod validation, rejects malformed, never modifies financial calculations, never invents monetary values/discounts/deadlines.
- When absent: deterministic mock, honest, logs warn, UI shows modelVersion mock-v1, does NOT pretend real AI.

### HubSpot CRM

| Var | Required? | Description |
|-----|-----------|-------------|
| HUBSPOT_CLIENT_ID | OPTIONAL | OAuth client ID |
| HUBSPOT_CLIENT_SECRET | OPTIONAL | OAuth secret, server-only |
| HUBSPOT_REDIRECT_URI | OPTIONAL | Defaults to `${NEXT_PUBLIC_APP_URL}/api/integrations/hubspot/callback` |
| HUBSPOT_SCOPES | OPTIONAL | Default `crm.objects.contacts.read crm.objects.deals.read crm.objects.companies.read` READ-ONLY |

**Security:**
- OAuth state verification HMAC SHA256 + timestamp 10min expiry CSRF protection
- Tokens encrypted AES-256-GCM at rest, key from TOKEN_ENCRYPTION_KEY
- Tokens never exposed to frontend
- 401 auto-refresh via refresh token
- Rate limit 429 handling with Retry-After
- Idempotent sync via externalId unique (orgId, externalId) prevents duplicates
- Failure does not corrupt local data

**UI states:** NOT CONFIGURED, CONNECTED, ERROR, SYNCING, READY — never fake Connected.

If missing: Product remains functional, integrations page shows "HubSpot integration not configured" + "Configuration required".

### Stripe Billing

| Var | Required? | Description |
|-----|-----------|-------------|
| STRIPE_SECRET_KEY | OPTIONAL | Server-only, `sk_live_` or `sk_test_` |
| STRIPE_PUBLISHABLE_KEY | OPTIONAL | Client-safe if needed |
| STRIPE_WEBHOOK_SECRET | OPTIONAL | `whsec_` for signature verification |
| STRIPE_PRO_PRICE_ID | OPTIONAL | `price_...` for PRO plan |
| STRIPE_BUSINESS_PRICE_ID | OPTIONAL | `price_...` for BUSINESS plan |

**Security:**
- Secret server-only, never NEXT_PUBLIC_
- Webhook signature mandatory: parses t=timestamp,v1=sig, tolerance 5min, HMAC SHA256 timingSafeEqual
- Checkout sessions server-created with metadata orgId/plan, idempotency key orgId:operation:timestamp:random
- Idempotency via AuditLog event id check
- Subscription state persisted in Organization.billingPlan and Subscription table
- Duplicate webhooks not double-counting
- Failed payments not producing false active

**If not configured:**
- Billing page shows amber "Billing integration not configured"
- Pricing page shows pricing but checkout returns "Billing integration not configured"
- In production: returns error, does NOT simulate successful payment
- In dev (NODE_ENV != production): manual upgrade allowed for testing with audit log

### Rate Limiting / Redis

| Var | Required? | Description |
|-----|-----------|-------------|
| UPSTASH_REDIS_REST_URL | OPTIONAL | For distributed rate limiting |
| UPSTASH_REDIS_REST_TOKEN | OPTIONAL | Token |

**Current implementation:** In-memory Map with cleanup every 5min, max 1000 entries LRU. Resets on cold start (documented limitation). In production without Redis, logs warn `Using in-memory store in production`. With Redis configured, future implementation should use Redis INCR+EXPIRE.

**Limits enforced:**
- login: 10 per 15min per IP
- register: 5 per hour per IP
- ai: 20 per min per org
- import_parse/confirm: 10 per min per org
- crm_sync: 5 per min per org
- campaign_create: 20 per min per org
- billing: 20 per min per org
- api_default: 100 per min per org

Headers: X-RateLimit-Limit, Remaining, Reset

### Security / Observability

| Var | Required? | Description |
|-----|-----------|-------------|
| TOKEN_ENCRYPTION_KEY | CONDITIONAL | Required in prod if HubSpot used. 32 bytes hex `openssl rand -hex 32`, AES-256-GCM |
| BCRYPT_ROUNDS | OPTIONAL | Default 12 |
| JWT_EXPIRES_IN | OPTIONAL | Default 7d |
| LOG_LEVEL | OPTIONAL | debug/info/warn/error default info |
| SENTRY_DSN | OPTIONAL | For error tracking |
| CSRF_SECRET | OPTIONAL | Future CSRF tokens |
| ENABLE_DEMO_MODE | OPTIONAL | Default true, shows DEMO badges |
| ENABLE_BILLING | OPTIONAL | Default false |

## 3. Database Setup

### PostgreSQL Canonical

- Provider: `postgresql` in schema.prisma
- Monetary: Decimal(15,2) avoids float errors. Helpers `calculatePotentialRevenue` uses integer arithmetic cents-safe.
- Migrations: deterministic in `prisma/migrations/20250101_init/migration.sql`
- Clean DB: `npx prisma migrate deploy` creates all tables, enums, indexes
- Indexes: tenant-scoped important queries:
  - Lead: (orgId), (orgId,status), (orgId,isDemo), (orgId,provider), (orgId,externalId), email, phone, dealValue, lastContactAt, createdAt, (orgId,createdAt), (orgId,lastContactAt)
  - AIAnalysis: (orgId), leadId, recoveryScore, confidence, (orgId,recoveryScore), (orgId,createdAt)
  - RecoveryOpportunity: (orgId), leadId, score, status, category, (orgId,status), (orgId,category), (orgId,score), potentialRevenue
  - CampaignLead: (orgId), campaignId, leadId, status, (orgId,campaignId), (orgId,status), revenue, unique(campaignId,leadId)
  - RecoveryEvent: (orgId), leadId, outcome, campaignId, recoveredAt, (orgId,outcome), (orgId,recoveredAt), (orgId,createdAt)
  - AuditLog: (orgId), userId, event, entityType, createdAt, (orgId,event), (orgId,createdAt)
  - Integration: unique(orgId,provider), (orgId), provider, status
  - Subscription: (orgId), status, plan, stripeCustomerId, unique stripeSubscriptionId
  - Usage: unique(orgId,period), (orgId), period, (orgId,period)
  - OrganizationMember: unique(userId,orgId), (orgId), userId
  - Organization: slug unique, stripeCustomerId unique, stripeSubscriptionId unique
- Unique constraints: (orgId,externalId) for Lead/Deal idempotency, (campaignId,leadId), (orgId,provider), (orgId,period)

### No Silent SQLite Fallback in Production

- `src/lib/prisma.ts` now throws `PRODUCTION_DATABASE_REQUIRED` if NODE_ENV=production and DATABASE_URL not postgres
- Fallback only in development: file:./dev.db via node:sqlite
- Documented in README and .env.example

### Migration Instructions

```bash
# Production
export DATABASE_URL=postgresql://...
npx prisma migrate deploy
npx prisma generate

# Development fallback
DATABASE_URL=file:./dev.db npm run dev
```

## 4. Authentication & Session Security

- Password hashing: bcryptjs 12 rounds, min 8 chars
- JWT: HS256, httpOnly, secure in production, sameSite lax, path /, maxAge 7d, issuer onvyra, audience onvyra-app
- Secret mandatory 32+ chars in prod, throws if short
- Expired sessions rejected via jose.jwtVerify
- Logout clears cookie
- Protected routes use requireAuth() which throws UNAUTHORIZED if no session
- Organization isolation enforced server-side: every query includes organizationId from session, not client
- RBAC: OWNER/ADMIN/MEMBER, server-side via requireRole, canManageBilling OWNER only enforced in billing POST

## 5. Tenant Isolation — Final Audit

Every org-owned resource scoped to organizationId:

- users: via membership
- organizations: via session orgId
- organizationMembers: where orgId
- leads: where organizationId = session.orgId, verified in campaigns leadIds belong to org, regenerate findFirst orgId, outcome findFirst orgId
- deals: orgId
- conversations/messages: orgId via lead
- campaigns: orgId, campaignLeads orgId
- audit logs: orgId
- billing: orgId
- usage: orgId + period unique
- CRM integrations: orgId + provider unique, tokens encrypted
- recovery opportunities: orgId

Verified: Org A cannot read/update/delete B data, cannot access B opportunity/campaign/audit/billing IDs. Returns 404 or filtered empty, not 500. Tests in src/tests/security.test.ts 11 cases PASS.

## 6. OpenAI Production Behavior

- Optional in dev: mock-v1 deterministic, no fabricated revenue
- Real provider when OPENAI_API_KEY exists: timeout 30s AbortController, retry 2 exponential backoff, respects Retry-After, concurrency limit 5 in import confirm, token/cost limits via Usage table, Zod validation, rejects malformed, never modifies financial calculations, never invents monetary values/discounts/deadlines/contractual terms
- Caching per org 1h TTL LRU 1000, production should use Redis
- Mock clearly labeled: logs warn, modelVersion mock-v1, isMock true

## 7. HubSpot Production

- OAuth creds only from env, never hardcoded
- State verification HMAC SHA256 10min expiry CSRF
- Tokens not exposed to frontend, encrypted AES-256-GCM at rest
- Refresh handling: 401 triggers refreshAccessToken, if fails require reconnect
- Failures not corrupt local data: partial sync allowed, errors stored
- Rate limits handled 429 Retry-After
- Idempotent: externalId hubspot:contact:{id} / hubspot:deal:{id}, unique (orgId,externalId) prevents duplicates
- UI states: NOT CONFIGURED, CONNECTED, ERROR, SYNCING, READY, never fake Connected
- If creds missing: functional, shows "HubSpot integration not configured"

## 8. Stripe Production Billing

- Secret server-only
- Webhook signature mandatory: t=timestamp,v1=sig, 5min tolerance, HMAC SHA256 timingSafeEqual
- Checkout server-created with metadata orgId/plan, idempotency key
- Webhook idempotent via AuditLog event id
- Subscription state persisted in Organization.billingPlan and Subscription
- Duplicate webhooks not double-count usage
- Failed payments not producing false active (status PAST_DUE/CANCELED)
- Pricing UI matches configured PLAN_LIMITS and PLAN_PRICES in src/lib/billing.ts
- No fake payments
- If not configured: "Billing is not configured." No simulation in production. Dev manual upgrade only when NODE_ENV != production with audit log.

## 9. Usage Limits

Plans defined in src/lib/billing.ts:

- FREE: 500 leads, 3 imports/mo, 100 AI/mo, 200 messages/mo, 2 campaigns, 1 user, 0 CRM, 50k tokens
- PRO: 5000 leads, 50 imports/mo, 1000 AI/mo, 2000 messages, 20 campaigns, 5 users, 1 CRM, 500k tokens
- BUSINESS: 50000 leads, 500 imports/mo, 10000 AI/mo, 20000 messages, 100 campaigns, 25 users, 5 CRM, 5M tokens

Enforced server-side via getOrganizationUsage + checkSpecificLimit + checkUsageLimit in import confirm, campaign create, billing, CRM sync. Race condition prevented via upsert increment atomic (prisma.usage.upsert with increment). Never frontend only.

## 10. Rate Limiting

In-memory Map fallback, optional Upstash Redis for distributed. Limits: login 10/15min/IP, register 5/hour/IP, ai 20/min/org, import 10/min/org, crm_sync 5/min/org, campaign 20/min/org, billing 20/min/org, default 100/min/org. Returns 429 with X-RateLimit headers, safe errors without exposing implementation.

## 11. Import Pipeline

- Max file size 10MB enforced
- Max rows 10k enforced
- Max cols 100, cell 10k enforced
- Malformed handled safely papaparse/xlsx
- Duplicate detection: normalizePhone removes non-digits, 8->7 Russian, normalizeEmail lower, name+company, batch Set + existingLeads check
- Email normalization lower, phone normalization digits
- Date normalization: ISO, DD.MM.YYYY, DD.MM.YYYY HH:mm, Excel serial
- Formulas/macros: =,+, -,@,\t=,\r=,\n= neutralized with ' prefix, dangerous <script,javascript:, etc removed [removed]
- Prompt injection: imported text remains DATA never instructions, sanitizeText replaces "ignore previous instructions" with [filtered], SYSTEM/TRUSTED/UNTRUSTED isolation
- Never alter system prompts
- Progress/error understandable: ImportJob status pending/processing/completed/failed, summary imported/created/duplicates/skipped/errors/sanitizationWarnings/potentialRecoverableRevenue/critical/high
- Partial failures reported errors array max 20

Tested with: normal CSV, malformed CSV, large CSV, duplicates, invalid email/phone, malicious text, prompt injection, empty values, unexpected columns — all via src/lib/import/security.ts tests and audit dataset.

## 12. Recovery Engine

Deterministic, no change unless bug:

- Scoring: 0-100, factors {type,signal,points,explanation,raw}, clamped, categories critical >=80, high >=60, medium >=40, low <40, terminal states won/rejected/cancelled force 0 absolute
- Probability: base score/100, adjustments high deal >500k *0.9, intent high +0.15, inactivity >90d *0.7, completeness <0.5 *0.8, advanced stage +0.05, breakdown, missingInfo, null when insufficient
- Missing info: returns low confidence, missingInformation field, never invents
- Terminal: won -50, rejected -40, cancelled -30 but forced 0 absolute after fix
- Monetary: Decimal-safe cents Math.round(value*100)/100 * probability, validateMonetaryAmount rejects negative, caps max
- Explainability: factors business language, reasoningSummary
- Category: critical/high/medium/low
- Revenue attribution: estimated = dealValue * probability Decimal-safe, confirmed only from explicit user-entered RECOVERED amount/date

CRITICAL: Estimated recoverable is ESTIMATE, must never be presented as guaranteed. UI uses "Estimated recoverable revenue" + "Not guaranteed" + "Est. not guaranteed" + "Potential ≠ Confirmed" badges.

## 13. Dashboard

- Estimated Recoverable vs Confirmed Recovered clearly separated: Estimated badge ESTIMATED • NOT GUARANTEED black, Confirmed badge CONFIRMED green
- Totals: potential from analyses Decimal-safe, confirmed from latest event per lead (fix P1-4 ghost revenue)
- No fake historical charts, only real counts
- No fabricated conversion %, funnel from real recoveryEvents
- No invented activity, timeline real events only
- Empty state: "No priority leads yet" with CTA Import when no data
- Mobile/tablet/desktop: max-w-7xl, grid lg:grid-cols-3 responsive Tailwind

## 14. Recovery Inbox

Primary purpose WHO SHOULD I CONTACT FIRST? Immediately obvious:
- customer name, company, deal product, deal value Decimal-safe, recovery score badge, estimated recoverable Decimal-safe + Est. not guaranteed, inactivity lastContactAt days ago, last contact date, why factors chips, recommended action, current status CONTACTED/RECOVERED
- Default sorting score desc prioritizes meaningful recovery
- Filters: category all/critical/high/medium, status all/not_contacted/contacted/recovered, search name/company/product, sort score/dealValue/lastContactAt, pagination 20, tenant-safe

## 15. Opportunity Detail

Answers:
1. Who is this? name, email, phone, company
2. What deal/value? product, manager, dealValue, dealStage, source, dealAge days, lastContact days ago, status, lastMessage
3. Why important? Recovery Score 0-100 + category, Est probability, confidence, buying intent
4. Why scored this way? Score Explanation business language +20 explicit intent etc, Positive/Negative Signals, factors
5. What should I do next? Recommended action + message goal, AI Recommendation, Recovery Message with Generate/Regenerate/Edit/Copy/Mark Ready, human approval mandatory
6. What missing? Missing Information amber box, probability missingInfo
7. What happened? Activity Timeline real events only Imported, AI analyzed, Message generated, Contacted etc
8. What revenue estimated? Estimated Recoverable Revenue ₽X = DealValue × Probability • Estimated not guaranteed, Potential ≠ Confirmed
9. What revenue actually recovered? Revenue Estimated vs Confirmed card, Confirmed from latest per lead, never dealValue = recovered automatically

AI-generated clearly distinguishable: dark card "AI Recommendation", amber "AI-generated • Human approval required", modelVersion badge.

## 16. Human-in-the-Loop

No automatic messaging unless real verified provider and explicit production configuration. Current: manual action required, no auto-send. Generated messages require human approval: Generate → Review → Approve → Send. User understands: UI shows 4 steps 1.Generate 2.Review 3.Edit 4.Approve, outcome workflow. Never implies sent if wasn't, never fabricates delivery status. Campaign messageStatus pending/ready, not sent unless real provider.

## 17. Audit Log

Important events: USER_REGISTERED, USER_LOGIN (via audit in login?), IMPORT_STARTED, IMPORT_COMPLETED, IMPORT_FAILED, LEAD_CREATED, ANALYSIS_STARTED/COMPLETED (via AIAnalysis create), OPPORTUNITY_CREATED (RecoveryOpportunity), MESSAGE_GENERATED, MESSAGE_APPROVED (via campaignLead messageStatus), RECOVERY_CONTACTED, OUTCOME_UPDATED, RECOVERED_CONFIRMED, CAMPAIGN_CREATED, CAMPAIGN_UPDATED, CRM_CONNECTED, CRM_DISCONNECTED, SUBSCRIPTION_UPDATED, BILLING_CHECKOUT_STARTED, BILLING_PLAN_CHANGED, RECOVERY_INBOX_VIEWED, RECOVERY_OPPORTUNITY_VIEWED, AI_RECOMMENDATION_GENERATED

Organization-scoped: organizationId in every AuditLog, userId optional, metadata JSON.

Never logs: passwords, API keys, access tokens, Stripe secrets, HubSpot tokens, full sensitive credentials — logger sanitizes sensitive keys to [REDACTED].

## 18. Observability

- Structured logs JSON timestamp level message metadata via src/lib/observability/logger.ts
- Request IDs/correlation IDs: not yet, future via middleware
- Health endpoint: GET /api/health no auth, rate limited, returns status ok/degraded, timestamp, version, uptime, latencyMs, checks database provider latency, env nodeEnv databaseProvider billingConfigured bool hubspotConfigured bool openaiConfigured bool demoMode bool, memory heapUsedMb etc, no secrets, 200 ok 503 degraded
- Database health: prisma.organization.count()
- Env/config health: getEnv()
- Safe error responses: sanitizeErrorForClient returns safe messages, logs full server-side, never stack traces to users
- No stack traces exposed: error handling sanitized

Production health checklist:
- [ ] DATABASE_URL postgres
- [ ] JWT_SECRET 32+ chars
- [ ] /api/health 200
- [ ] Auth flow register/login
- [ ] Tenant isolation cross-org 404
- [ ] Import small CSV
- [ ] Financial calculations Decimal-safe
- [ ] Estimated vs Confirmed separated
- [ ] No secrets in logs
- [ ] Security headers present
- [ ] Rate limiting 429

## 19. Security Headers

Verified in next.config.js:
- X-Frame-Options DENY
- X-Content-Type-Options nosniff
- Referrer-Policy strict-origin-when-cross-origin
- X-XSS-Protection 1; mode=block
- Permissions-Policy camera=(), microphone=(), geolocation=(), interest-cohort=()
- CSP: default-src 'self', script-src 'self' 'unsafe-eval' 'unsafe-inline', style-src 'self' 'unsafe-inline', img-src 'self' data: blob: https:, font-src 'self' data:, connect-src 'self' https://api.openai.com https://api.hubapi.com https://api.stripe.com, frame-ancestors 'none', base-uri 'self', form-action 'self'
- HSTS max-age=63072000; includeSubDomains; preload in production
- API: Cache-Control no-store, X-Content-Type-Options nosniff, X-Frame DENY
- poweredByHeader false, compress true, reactStrictMode true
- Do not break legitimate functionality: unsafe-inline needed for Tailwind, unsafe-eval for Next.js

## 20. SEO / Landing

Public landing / immediately communicates:
- ONVYRA brand
- "Find the customers your business is leaving behind."
- Business language:
  1. Connect/import customer data (CSV/XLSX or CRM read-only)
  2. Onvyra identifies recovery opportunities via Recovery Engine 2.0 scoring 0-100 explainable
  3. Prioritize who to contact (Recovery Inbox WHO SHOULD I CONTACT FIRST?)
  4. AI helps prepare next action (personalized message, human approval)
  5. Track estimated vs confirmed recovered revenue (Potential ≠ Confirmed, Estimated not guaranteed)
- No fake testimonials, no fake customer logos, no guaranteed revenue claims, no SOC2/ISO certification claims
- Pricing teaser FREE/PRO/BUSINESS with limits, CTA Analyze Your Pipeline, Demo 1000 leads

## 21. Pricing

Pricing page /pricing corresponds to actual implementation in src/lib/billing.ts PLAN_LIMITS and PLAN_PRICES:
- FREE $0: 500 leads, 3 imports/mo, 100 AI/mo, 2 campaigns, 1 user, 0 CRM, 50k tokens
- PRO $49/mo: 5000 leads, 50 imports/mo, 1000 AI/mo, 20 campaigns, 5 users, 1 CRM, 500k tokens
- BUSINESS $199/mo: 50000 leads, 500 imports/mo, 10000 AI/mo, 100 campaigns, 25 users, 5 CRM, 5M tokens

Features listed match code: recovery analysis, scoring, inbox, campaigns, basic analytics, HubSpot, advanced analytics, team members, support.

If Stripe not configured: clearly distinguish "Pricing configured" vs "Billing not yet connected." Billing page shows "Billing integration not configured" amber, not fake success.

## 22. Onboarding

First-time extremely simple:
REGISTER (email,password,name,org name) → CREATE ORGANIZATION (slug unique, OWNER role) → WELCOME (Welcome to Onvyra, explanation) → IMPORT DATA / CONNECT CRM (Upload CSV/XLSX 8 steps or Connect HubSpot read-only) → MAP DATA (AI suggests mapping Russian headers Имя→name etc) → ANALYZE (Recovery Engine automatic, no fake progress) → SHOW RESULTS (records analyzed, opportunities, est recoverable not guaranteed, critical/high) → OPEN RECOVERY INBOX (prioritized)

Minimize setup, first useful result quickly. Demo data 1000 leads load via /api/demo/seed.

## 23. Demo Data

Keep existing 1000-lead demo dataset in src/lib/demo/audit-dataset.ts and demo seed:
- Clearly identified DEMO: isDemo true, badge DEMO DATA amber, DEMO badge per lead, dashboard shows DEMO DATA count
- Never mix demo with production customer records: queries filter organizationId, demo only in org that seeded, not cross-org
- Never appear inside another org's real dataset: tenant isolation ensures demo leads only visible to org that created them
- Metrics derived from real demo data, not hardcoded: potential from sum dealValue*probability real calculation
- Scenarios A-J: high dormant 150, low dormant 150, recent interest 100, rejected 100, won 100, cancelled 50, missing 100, duplicates 100, Russian 100, extreme 50

## 24. Deployment Configuration

### Framework
Next.js 14.2.18 App Router

### Production Build
```bash
npm run build
```
Outputs 27 routes (as of Sprint 5/6), static and dynamic.

### Startup Command
```bash
npm run start -- -p 3000 -H 0.0.0.0
# or
next start -p 3000 -H 0.0.0.0
```

### Migration Command
```bash
npx prisma migrate deploy
npx prisma generate
```

### Environment Variable Documentation
See .env.example placeholders only, never real secrets. See Section 1-2 above and docs/PRODUCTION.md checklist.

### Health Endpoint
GET /api/health returns 200 ok or 503 degraded, no auth, no secrets.

### Deployment Checklist

- [ ] DATABASE_URL postgresql://... set, not file:
- [ ] JWT_SECRET 32+ chars random set
- [ ] TOKEN_ENCRYPTION_KEY set if HubSpot used
- [ ] NEXT_PUBLIC_APP_URL https://... set
- [ ] NODE_ENV=production
- [ ] OPENAI_API_KEY set if real AI (or mock documented)
- [ ] HUBSPOT_CLIENT_ID/SECRET/REDIRECT_URI set if CRM
- [ ] STRIPE_SECRET_KEY/WEBHOOK_SECRET/PRICE_IDS set if billing
- [ ] UPSTASH_REDIS_REST_URL/TOKEN set for distributed rate limiting (optional)
- [ ] npm run build PASS
- [ ] npm run lint PASS
- [ ] npm test PASS
- [ ] npx prisma migrate deploy
- [ ] /api/health 200
- [ ] Security headers via curl -I
- [ ] Test register/login tenant isolation
- [ ] Test import CSV small
- [ ] Backup configured pg_dump daily
- [ ] Logs no secrets
- [ ] Domain HTTPS via Let's Encrypt or provider
- [ ] Webhook URLs configured in Stripe/HUBSPOT dashboard pointing to https://yourapp.com/api/...

### Known Limitations (P2/P3)

- In-memory rate limiter resets on cold start, needs Redis UPSTASH_REDIS for prod distributed (documented, not blocker for pilot)
- Stripe webhook idempotency via AuditLog may need unique index in prod migration (handled via catch)
- Fallback prisma simulates transactions sequentially (real transaction in prod)
- No real E2E Playwright, only mocked (future)
- System font stack instead of Inter due to sandbox TLS (prod can re-enable)
- No 2FA, no refresh token rotation (future)
- No websocket for import progress (polling via ImportJob status)
- No email sending, manual action required per spec
- Mock AI not explicit badge in UI prominently (logs show mock-v1, but UI could add badge more prominent - P2)

### Rollback Procedure

1. Keep previous deployment artifact (Docker image or Vercel previous)
2. If migration failed, restore DB from backup before migration
3. `npx prisma migrate resolve --rolled-back "migration_name"` if needed
4. Redeploy previous version
5. Verify /api/health 200

### Backup Considerations

- Postgres: daily pg_dump, WAL archiving, PITR, retention 30 days daily 12 months monthly, monthly restore test to staging
- Encryption keys separately in KMS
- Audit logs retained 1 year, import jobs 90 days, usage 2 years

### Domain/HTTPS Requirements

- HTTPS mandatory in production for secure cookies, HSTS
- Domain via NEXT_PUBLIC_APP_URL
- Let's Encrypt or provider managed cert
- HSTS header enabled in prod via next.config.js

### Security Requirements

- JWT_SECRET 32+ chars random
- TOKEN_ENCRYPTION_KEY 32 bytes hex
- No secrets in NEXT_PUBLIC_
- No secrets committed
- Security headers enforced
- Rate limiting enforced
- Tenant isolation enforced server-side
- RBAC OWNER/ADMIN/MEMBER enforced server-side

### Webhook Configuration

- Stripe: `https://yourapp.com/api/billing/webhook` with STRIPE_WEBHOOK_SECRET, events checkout.session.completed, customer.subscription.updated/deleted
- HubSpot: `https://yourapp.com/api/integrations/hubspot/callback` OAuth redirect, state verification

## 25. Final Validation

- Build PASS
- Lint PASS
- Tests PASS
- No fake integrations
- No fake payments
- No fake metrics
- No fabricated revenue
- No fake testimonials
- No production secrets committed

