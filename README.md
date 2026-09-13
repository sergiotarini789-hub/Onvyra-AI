# Onvyra v1.0 — AI Revenue Recovery Platform

> **Find the customers your business is leaving behind.**

Onvyra analyzes your existing leads, customers and deals to identify opportunities worth recovering — and helps your team act on them.

**Not** a generic CRM, chatbot, AI wrapper, lead-gen, or fake analytics dashboard. Onvyra is a revenue recovery system.

Core loop: **DATA → ANALYSIS → RECOVERABLE OPPORTUNITIES → PRIORITIZATION → EXPLANATION → ACTION → FOLLOW-UP → OUTCOME → RECOVERED REVENUE**

---

## Sprint 4 - Production Launch Readiness

This release focuses on **production launch readiness** - real integrations, real billing, real security.

### What's New in Sprint 4

- **PostgreSQL Production**: Schema migrated to `postgresql` provider with `Decimal(15,2)` for monetary fields, comprehensive indexes, migrations, transaction support
- **HubSpot OAuth 2.0**: Real READ-ONLY integration with state verification (CSRF), token encryption at rest (AES-256-GCM), idempotent sync via externalId, failure handling
- **Billing Production**: Stripe Checkout + Webhook with signature verification (HMAC SHA256 timingSafeEqual), idempotency, plan enforcement server-side, usage accounting per period
- **OpenAI Hardening**: Timeout (30s), retry with exponential backoff, rate limit handling (Retry-After), token tracking, caching per org, cost control
- **Security Hardening**: CSP, HSTS, rate limiting (in-memory + Redis ready), import security (formula injection, malicious content), CSRF protection
- **Financial Correctness**: Decimal handling, validation, safe calculations avoiding float errors, distinction estimated vs confirmed
- **Observability**: Structured logging with sanitization, audit trail, performance logging, health endpoint
- **Production Docs**: `docs/PRODUCTION.md` with architecture, DB, auth, security, deployment checklist

---

## What Onvyra Is

- **B2B SaaS v1.0**, production-oriented, credible commercial product
- Next.js 14 App Router, TypeScript, Tailwind, Zod, Prisma, PostgreSQL (prod) / SQLite fallback (dev)
- Tenant isolation enforced everywhere (org A cannot access org B)
- Recovery Engine 2.0 deterministic, explainable factors array {type, signal, points, explanation, raw}
- Transparent probability with breakdown {base, adjustments[], final}, null if insufficient, never invents
- AI Analyst structured JSON validated via Zod, never invents prices/discounts/deadlines, says "Not enough information" when missing
- Product philosophy: Onvyra sells business outcome FIND LOST REVENUE, AI is enabling tech

---

## Architecture

```
Frontend (Next.js App Router, Tailwind, Server Components)
  ↓
API Routes (Route Handlers, Zod validation, auth, RBAC, tenant scope, rate limit, billing check)
  ↓
Business Logic (recovery/score, probability, revenue, import/security/normalization/duplicate, ai/service, crm/hubspot, billing/stripe)
  ↓
Database (Prisma PostgreSQL prod, SQLite fallback dev, Decimal monetary, indexes, transactions, idempotency)
  ↓
External Services (OpenAI with timeout/retry/caching, HubSpot OAuth READ-ONLY, Stripe Checkout/Webhook)
  ↓
Observability (structured logging, audit, health check)
```

**Key decisions:**
- AI isolated behind AIService with hardening (timeout, retry, cache, token tracking)
- Recovery Score deterministic, unit-tested, explainable
- PostgreSQL prod with Decimal, SQLite fallback for sandbox (Prisma binary blocked)
- Financial calculations: Potential = DealValue × Probability (integer arithmetic), Confirmed = explicit recorded, never mixed
- Imported text treated as DATA not instructions (prompt injection filtered)
- Every query includes organizationId (IDOR prevention)

---

## Database Models (Production)

- **User** (id, email unique, passwordHash, name)
- **Organization** (id, name, slug unique, billingPlan FREE/PRO/BUSINESS, stripeCustomerId, stripeSubscriptionId)
- **OrganizationMember** (userId, orgId, role OWNER/ADMIN/MEMBER, unique user+org)
- **Lead** (orgId, externalId + provider for idempotency, name, phone, email, company, manager, product, dealValue Decimal(15,2), dealStage, status, lastContactAt, source, rawData, lastMessage, isDemo, indexes on orgId+status, orgId+isDemo, orgId+createdAt, orgId+lastContactAt)
- **Conversation, Message, Deal** (Deal has externalId, provider, value Decimal, indexes)
- **AIAnalysis** (leadId, leadStatus, buyingIntent, lossReason, recoveryScore, recoveryProbability, confidence, recommendedAction, reasoningSummary, recommendedMessageGoal, generatedMessage, modelVersion, factors JSON, missingInformation JSON, tokensUsed, indexes on orgId+score, orgId+createdAt)
- **RecoveryOpportunity** (orgId, leadId, dealId, score, category CRITICAL/HIGH/MEDIUM/LOW, probability, confidence, potentialRevenue Decimal, status open/contacted/replied/recovered/lost/not_recoverable, factors JSON, reasoningSummary, recommendedAction, indexes on orgId+status, orgId+category, orgId+score, potentialRevenue)
- **Campaign** (orgId, name, description, status DRAFT/ACTIVE/PAUSED/COMPLETED, targetCriteria JSON, createdById, indexes on orgId+status)
- **CampaignLead** (orgId, campaignId, leadId unique, status, messageGenerated, messageEdited, messageStatus, contactedAt, response, outcome, revenue Decimal, indexes on orgId+campaignId, orgId+status, revenue)
- **RecoveryEvent** (orgId, leadId, opportunityId, campaignId, userId, type, outcome CONTACTED/REPLIED/INTERESTED/NEGOTIATING/RECOVERED/REJECTED/NO_RESPONSE/CANCELLED/NOT_RECOVERABLE, revenue Decimal, recoveredAt, source, note, indexes on orgId+outcome, orgId+recoveredAt, orgId+createdAt)
- **ImportJob** (orgId, fileName, status pending/processing/completed/failed, totalRows, processedRows, createdCount, updatedCount, duplicateCount, skippedCount, errorCount, errors, mapping, summary, indexes)
- **AuditLog** (orgId, userId, event USER_REGISTERED/LOGIN/IMPORT_STARTED/COMPLETED/LEAD_CREATED/UPDATED/OPPORTUNITY_VIEWED/AI_GENERATED/MESSAGE_GENERATED/CAMPAIGN_CREATED/UPDATED/RECOVERY_CONTACTED/OUTCOME_UPDATED/CONFIRMED, entityType, entityId, metadata JSON, indexes on orgId+event, orgId+createdAt)
- **Integration** (orgId, provider HUBSPOT/MOCK unique per org, status NOT_CONNECTED/CONNECTED/ERROR/DISCONNECTED, accessToken encrypted, refreshToken encrypted, externalAccountId, lastSyncAt, lastSyncStatus, lastSyncError, metadata JSON)
- **Subscription** (orgId, plan FREE/PRO/BUSINESS, status ACTIVE/TRIALING/PAST_DUE/CANCELED/INCOMPLETE/FREE, stripeCustomerId, stripeSubscriptionId unique, stripePriceId, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd)
- **Usage** (orgId, period YYYY-MM unique, aiAnalyses, aiMessages, imports, leads, campaigns, tokensUsed, indexes on orgId+period)

---

## Routes / Pages

**Public:**
- `/` Landing v2.0 — Hero, Problem, How Works, Screens, Example, Features, Security, Pricing, FAQ, CTA — no fake logos/testimonials
- `/pricing` — FREE/PRO/BUSINESS with limits, configurable, honest "not configured" if Stripe missing
- `/security` — Tenant isolation, transport, auth, RBAC, audit, AI handling, headers, no false certs
- `/login`, `/register`
- `/api/health` — Health check (DB, env, memory), 200 ok or 503 degraded, no auth

**Authenticated (Dashboard):**
- `/dashboard` — Financial command center: Estimated Recoverable vs Confirmed Recovered, Opportunities, Rate, funnel OPPORTUNITIES→CONTACTED→RESPONDED→NEGOTIATING→RECOVERED, priority list, pipeline, next actions
- `/inbox` — Recovery Inbox 2.0: sorted highest priority, Customer/Company/Deal/value/score/priority/probability/estimated/last contact/inactivity/reason/action/status, filters, search, pagination
- `/leads` — Opportunities list, filters All/Critical/High/Medium/High Confidence/No Follow-up/High Value/No Response, sorting, pagination
- `/leads/[id]` — Opportunity Detail 2.0: Customer, Deal, Score, Why This Matters, Recommended Action, AI Insight, Message (AI RECOMMENDATION+Regenerate/Edit/Copy/Mark Ready, human approval), Activity Timeline (real persisted), Outcome Workflow (CONTACTED/REPLIED/INTERESTED/NEGOTIATING/RECOVERED/REJECTED/NO_RESPONSE/CANCELLED/NOT_RECOVERABLE, RECOVERED requires amount/date), Revenue Attribution (Deal value, Est probability, Est recoverable, Confirmed recovered — distinguish estimates vs actuals)
- `/campaigns` — Campaigns 2.0: Name/Desc/Status/Target/Opportunities/Total deal/Est/Contacted/Responses/Recovered/Confirmed, DRAFT/ACTIVE/PAUSED/COMPLETED
- `/campaigns/[id]` — Campaign detail with 6 metrics, opportunities, message workflow
- `/import` — Import 2.0: Upload→Detect→Map→Preview→Validate→Import→Analyze→Results with Imported/Created/Updated/Duplicates/Skipped/Errors, security hardening
- `/analytics` — Total/Contacted/Response/Recovered/Rate/Estimated/Confirmed, breakdowns priority/campaign/source/stage/product/manager
- `/integrations` — CRM: Mock + HubSpot OAuth 2.0 READ-ONLY with Connect/Test/Sync/Disconnect, status, last sync, errors, honest "not configured" when env missing, idempotent sync
- `/billing` — Billing: FREE/PRO/BUSINESS, limits, usage bars per period, subscription details, checkout, webhook status, honest "not configured"
- `/settings` — Org/Profile/Team/Roles/Integrations/AI/Billing/Security
- `/onboarding` — REGISTER→ORG→WELCOME→IMPORT/CONNECT→MAP→ANALYZE→RESULT with real calculations
- `/audit` — Audit Log org-scoped

**API:**
- `/api/auth/*` — register, login, logout with rate limiting, bcrypt 12 rounds, JWT httpOnly secure
- `/api/import/parse` — file validation, security checks, AI mapping, rate limit 10/min/org
- `/api/import/confirm` — normalization, dedup, sanitization, RecoveryOpportunity, billing check, usage accounting, transaction
- `/api/demo/seed` — seed 1000 realistic demo, creates opportunities, audit
- `/api/campaigns` — create, list with tenant isolation
- `/api/leads/[id]/outcome` — outcome workflow with financial validation, tenant isolation, transaction
- `/api/leads/[id]/regenerate` — AI message regeneration with rate limiting
- `/api/integrations/hubspot` — GET status, POST connect/disconnect/sync with rate limiting, OAuth state, encryption
- `/api/integrations/hubspot/callback` — OAuth callback with state verification, token exchange, encryption, audit
- `/api/billing` — GET usage, POST checkout with idempotency, billing check
- `/api/billing/webhook` — Stripe webhook with signature verification, idempotency, handles checkout.session.completed, subscription.updated/deleted
- `/api/health` — Health check

---

## AI Components (Production Hardened)

**Recovery Engine 2.0** (`src/lib/recovery/score.ts`):
- Deterministic +20 explicit interest, +15 product relevance, +15 price requested, +10 proposal sent, +10 replied after proposal, +10 high value, +10 no follow-up, +5 think, +5 inactivity, -50 won, -40 rejection, -30 cancelled, +5 completeness, -10 very long inactivity
- Clamped 0-100, categories, factors array {type, signal, points, explanation, raw}

**Probability** (`src/lib/recovery/probability.ts`):
- Base = score/100, adjustments with delta and explanation, handles high deal >500k *0.9, intent high +0.15, inactivity >90d *0.7, completeness <0.5 *0.8, advanced stage +0.05, breakdown, missingInfo, null when insufficient

**Revenue** (`src/lib/recovery/revenue.ts`):
- Potential = DealValue × Probability via integer arithmetic to avoid float errors, null handling, formatting

**AIService** (`src/lib/ai/service.ts`):
- Real OpenAI with timeout 30s, retry 2 with exponential backoff, rate limit handling Retry-After, token tracking, caching per org 1h TTL LRU 1000, cost control
- Mock fallback when no API key, deterministic
- Zod validation: `AIAnalysisSchema` and `AIMessageSchema` prevent fabricated prices/discounts/deadlines

**AI Evaluation** (`src/lib/ai/evaluate.ts`):
- 100 cases: high_value, rejected, won, insufficient, think, injection, no_response, cancelled, low_value
- `npm run ai:evaluate` → 100 total 100 passed 0 hallucination

---

## Security (Production)

- **Tenant Isolation**: Every query includes organizationId, tested cross-tenant READ/WRITE, IDOR, helper `withTenant()`
- **Auth**: bcrypt 12 rounds, JWT HS256 httpOnly secure SameSite lax 7d, issuer/audience validation, session expiration
- **RBAC**: OWNER full, ADMIN operational, MEMBER workflow, server-side enforcement
- **Validation**: Zod all inputs, file validation, monetary precision Decimal, formula injection prevention, malicious content filtering
- **Prompt Injection**: UNTRUSTED DATA treated as DATA, sanitization, SYSTEM/TRUSTED/UNTRUSTED isolation in prompts
- **Audit Log**: Important actions, org-scoped, no secrets
- **Security Headers**: X-Frame DENY, X-Content-Type nosniff, Referrer-Policy strict-origin, X-XSS 1 mode=block, Permissions-Policy, CSP strict, HSTS in prod, Cache-Control no-store for API
- **Rate Limiting**: In-memory (dev) + Redis ready (UPSTASH_REDIS), limits per org/IP per endpoint, headers X-RateLimit-*
- **Encryption**: Token encryption at rest AES-256-GCM, OAuth state HMAC SHA256 with expiry 10min
- **Error Handling**: Sanitized for client, no stack traces/secrets, safe messages
- **CSRF**: OAuth state parameter, SameSite cookies

---

## Billing & Usage Limits (Production)

- **Plans**: FREE (500 leads, 3 imports/mo, 100 AI/mo, 200 messages/mo, 2 campaigns, 1 user, 0 CRM, 50k tokens), PRO (5k leads, 50 imports, 1000 AI, 2000 messages, 20 campaigns, 5 users, 1 CRM, 500k tokens, $49/mo), BUSINESS (50k leads, 500 imports, 10k AI, 20k messages, 100 campaigns, 25 users, 5 CRM, 5M tokens, $199/mo)
- **Enforcement**: Server-side via `getOrganizationUsage()` + `checkSpecificLimit()` + `checkUsageLimit()` with transactions
- **Usage Accounting**: `Usage` table per org per period YYYY-MM, increments via `incrementUsage()` - aiAnalyses, aiMessages, imports, leads, campaigns, tokensUsed
- **Stripe**: Checkout with idempotency keys, webhook signature verification HMAC SHA256 timingSafeEqual, handles checkout.session.completed, subscription.updated/deleted, no fake payments, honest "not configured"

---

## CRM Integration (Production)

- **HubSpot OAuth 2.0**: Authorization code flow, state verification (CSRF), token exchange server-side, refresh handling, 401 auto-refresh
- **READ-ONLY**: Scopes contacts.read, deals.read, companies.read only, no write operations
- **Token Security**: Encrypted at rest AES-256-GCM via TOKEN_ENCRYPTION_KEY, no secrets in logs
- **Idempotency**: externalId = hubspot:contact:{id} or hubspot:deal:{id}, unique constraint (orgId, externalId) prevents duplicates
- **Sync**: Pagination, rate limit handling 429 Retry-After, failure handling partial sync allowed, errors stored in lastSyncError, never deletes existing data
- **Billing**: CRM integrations limited by plan, server-side enforcement
- **Mock**: Always available for testing

---

## Import Pipeline (Production Hardened)

1. Upload (CSV/XLSX, 10MB max, file type validation, block dangerous mime)
2. Detect columns (AI-assisted mapping)
3. Map columns (user confirms, rawData preserved)
4. Preview (sample rows, sanitized)
5. Validate (email/phone/name/value/date/duplicate, header validation, row/column count limits)
6. Security (formula injection prevention =+ - @, malicious content <script javascript: etc, cell length 10k max, sanitization warnings)
7. Import (normalization, duplicate detection via phone/email, transaction, billing check, usage accounting)
8. Analyze (Recovery Engine 2.0, probability breakdown, AI analysis with caching, token tracking, RecoveryOpportunity creation with Decimal)
9. Results (Imported/Created/Updated/Duplicates/Skipped/Errors, PotentialRecoverableRevenue/Critical/High, sanitization warnings)

---

## Observability

- **Structured Logging**: JSON with timestamp, level, message, metadata sanitized (no secrets), LOG_LEVEL env
- **Audit**: `logger.audit()` + DB AuditLog for business events
- **Security**: `logger.security()` for invalid OAuth state, webhook sig, etc
- **Performance**: `logger.performance()` for slow ops >1s, `withPerformanceLogging()` wrapper
- **Billing**: `logger.billing()` for checkout, webhook, plan changes
- **Health**: `/api/health` checks DB, env, memory, returns 200 or 503

---

## Tests

- **Unit**: scoring (10), probability (6), revenue (5), normalization (4), duplicate (6) — 31 tests
- **Security**: tenant isolation, cross-tenant rejection, Zod validation, file validation, prompt injection, IDOR, roles, auth bypass — 11 tests
- **E2E Mocked**: 21-step flow REGISTER→ORG→IMPORT DEMO→ANALYZE→DASHBOARD→INBOX→OPPORTUNITY→MESSAGE→CONTACTED→RESPONSE→RECOVERED→VERIFY→AUDIT→SECOND ORG→CROSS-TENANT DENIED — 1 test
- **AI Evaluation**: 100 synthetic cases — `npm run ai:evaluate` → 100 total 100 passed 0 hallucination
- **Total**: 43 tests passing

---

## How to Run Locally

```bash
git clone <repo> && cd Onvyra-AI
npm install
cp .env.example .env
# Edit .env:
# DATABASE_URL="file:./dev.db"  # SQLite fallback dev, or postgresql://... for prod
# JWT_SECRET="change-to-32+chars-random-minimum-32"
# OPENAI_API_KEY="" # optional, empty = mock AI
# OPENAI_MODEL="gpt-4o-mini"
# HUBSPOT_CLIENT_ID="" # optional, for OAuth
# HUBSPOT_CLIENT_SECRET="" # optional
# HUBSPOT_REDIRECT_URI="http://localhost:3000/api/integrations/hubspot/callback"
# TOKEN_ENCRYPTION_KEY="" # 32 bytes hex, generate: openssl rand -hex 32
# STRIPE_SECRET_KEY="" # optional
# STRIPE_WEBHOOK_SECRET="" # optional
# STRIPE_PRO_PRICE_ID="" # optional
# STRIPE_BUSINESS_PRICE_ID="" # optional

npm run dev          # http://localhost:3000
npm test             # 43 tests
npm run lint         # no errors
npm run build        # success 24+ routes
npm run ai:evaluate  # 100 cases

# Demo flow:
# 1. /register → create org
# 2. /onboarding → Welcome → Upload CSV/XLSX or Connect CRM or Load Demo
# 3. POST /api/demo/seed → 1000 leads + opportunities
# 4. /dashboard → Potential vs Confirmed real data
# 5. /inbox → Critical opportunities
# 6. /leads/[id] → Score, AI insight, message, timeline, outcome workflow
# 7. Record CONTACTED→REPLIED→INTERESTED→NEGOTIATING→RECOVERED with amount/date
# 8. /dashboard → Confirmed Recovered updated
# 9. /analytics → Breakdowns
# 10. /audit → Audit log
# 11. /api/health → Health check
```

**Sample CSV (Russian):**
```
Имя,Телефон,Сумма,Последний контакт,Товар,Комментарий
Иван Петров,+7 912 345-67-89,200000,15.03.2024,CRM,Интересует цена, хочу купить
```

---

## Environment Variables (Production)

See `.env.example` for full list. Key vars:

- `DATABASE_URL` — postgres for prod (`postgresql://user:pass@host:5432/onvyra`), file:./dev.db for dev fallback
- `JWT_SECRET` — min 32 chars random, required
- `JWT_EXPIRES_IN` — default 7d
- `BCRYPT_ROUNDS` — default 12
- `NEXT_PUBLIC_APP_URL` — prod URL for OAuth, Stripe
- `NODE_ENV` — development/production
- `OPENAI_API_KEY` — optional, mock fallback if missing
- `OPENAI_MODEL` — default gpt-4o-mini
- `OPENAI_TIMEOUT_MS` — default 30000
- `OPENAI_MAX_RETRIES` — default 2
- `HUBSPOT_CLIENT_ID/SECRET/REDIRECT_URI/SCOPES` — for HubSpot OAuth
- `TOKEN_ENCRYPTION_KEY` — 32 bytes hex for token encryption at rest, generate `openssl rand -hex 32`
- `STRIPE_SECRET_KEY/PUBLISHABLE_KEY/WEBHOOK_SECRET/PRO_PRICE_ID/BUSINESS_PRICE_ID` — for billing
- `UPSTASH_REDIS_REST_URL/TOKEN` — optional, for Redis rate limiting
- `LOG_LEVEL` — debug/info/warn/error
- `ENABLE_DEMO_MODE` — default true
- `ENABLE_BILLING` — default false

Never commit secrets. Never expose server-side env to client.

---

## Production Deployment Checklist

- [ ] `DATABASE_URL` is postgres, not sqlite
- [ ] `JWT_SECRET` 32+ chars random, not default
- [ ] `TOKEN_ENCRYPTION_KEY` set (32 bytes hex)
- [ ] `OPENAI_API_KEY` set if using real AI
- [ ] `HUBSPOT_CLIENT_ID/SECRET/REDIRECT_URI` set if using HubSpot
- [ ] `STRIPE_SECRET_KEY/WEBHOOK_SECRET/PRICE_IDS` set if using billing
- [ ] `NEXT_PUBLIC_APP_URL` set to production URL
- [ ] `NODE_ENV=production`
- [ ] Run `prisma migrate deploy`
- [ ] Test `/api/health` returns 200
- [ ] Test auth flow, org isolation
- [ ] Test import with small CSV
- [ ] Test HubSpot OAuth if configured
- [ ] Test Stripe webhook via `stripe listen --forward-to localhost:3000/api/billing/webhook`
- [ ] Verify security headers via `curl -I`
- [ ] Verify rate limiting
- [ ] Check logs no secrets
- [ ] Backup configured (daily pg_dump, WAL archiving, 30d retention)
- [ ] See `docs/PRODUCTION.md` for full guide

---

## Definition of Done — Sprint 4

- [x] No fake metrics — all from real calculations
- [x] No fake integrations — HubSpot OAuth real, mock clearly identified, honest "not configured" when env missing
- [x] No fake payments — Stripe Checkout/Webhook real, honest "not configured" when env missing, no fake success
- [x] No fake logos/testimonials
- [x] No fabricated AI info — Zod validation, no invented prices/discounts/deadlines
- [x] No hardcoded revenue — derived from DB with Decimal
- [x] No cross-tenant leakage — tenant isolation every query, IDOR tests
- [x] No broken workflow — full loop REGISTER→ONBOARD→IMPORT→ANALYZE→INBOX→OPPORTUNITY→MESSAGE→CONTACTED→RESPONSE→RECOVERED→DASHBOARD works
- [x] No placeholder screens — every screen meaningful + empty states
- [x] Build passes (24+ routes)
- [x] Lint passes (0 errors)
- [x] Tests pass (43)
- [x] AI eval passes (100/100)
- [x] Health endpoint exists
- [x] Production docs exist (docs/PRODUCTION.md)
- [x] PostgreSQL schema with Decimal, indexes, migrations
- [x] HubSpot OAuth with state verification, encryption, idempotency
- [x] Stripe with signature verification, idempotency, plan enforcement
- [x] OpenAI hardening with timeout/retry/caching/cost control
- [x] Security headers CSP/HSTS, rate limiting, import security
- [x] Observability structured logging, no secrets

---

## License

Proprietary — All rights reserved.
