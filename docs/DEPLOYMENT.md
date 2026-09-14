# Onvyra AI - Deployment Guide

**Version:** 0.1.0 Sprint 7
**Date:** 2026-09-13
**Framework:** Next.js 14.2.18 App Router
**Status:** READY FOR DEPLOYMENT (P0 0, P1 0, Build PASS, Tests 43/43 PASS)

This document provides exact deployment instructions for Onvyra AI.

## 1. Deployment Platform

### Recommended: Simplest Reliable Production Architecture

Onvyra is a standard Next.js application. Most appropriate targets:

**Option A: Vercel (simplest for Next.js)**
- Build: `prisma generate && next build`
- Start: `next start`
- Migrations: `prisma migrate deploy` via Vercel Build Command or separate job
- Env vars via Vercel dashboard
- Health: `/api/health`
- Postgres: Vercel Postgres, Neon, or Supabase

**Option B: Docker + Any Cloud (Railway, Fly.io, Render, AWS ECS, GCP Cloud Run)**
- Build: Docker image with Node 18
- Start: `npm start`
- Migrations: run before start or as init container
- Env vars via platform secrets
- Health: `/api/health`

**Option C: Self-hosted VPS (Hetzner, DigitalOcean, AWS EC2)**
- Build: `npm ci && prisma generate && npm run build`
- Start: `pm2 start npm --name onvyra -- start` or systemd
- Migrations: `prisma migrate deploy`
- Reverse proxy: Nginx + Let's Encrypt
- Health: `/api/health`

**Current repository:** No hardcoded provider. Provider-neutral instructions provided. Uses standard Next.js build/start.

### Existing Deployment Configuration

- `package.json` scripts: `dev`, `build`, `start`, `lint`, `test`, `prisma:generate`, `prisma:migrate`, `ai:evaluate`
- `next.config.js`: security headers, production optimizations (poweredByHeader false, compress true, reactStrictMode true)
- `prisma/schema.prisma`: provider postgresql, Decimal(15,2), indexes, unique constraints
- `prisma/migrations/20250101_init/migration.sql`: deterministic initial migration
- `src/lib/prisma.ts`: production enforcement throws PRODUCTION_DATABASE_REQUIRED if not postgres in prod runtime
- `src/app/api/health/route.ts`: health endpoint 200/503 no secrets
- `.env.example`: placeholders only

## 2. Exact Commands

### Build Command

```bash
npm ci
npx prisma generate
npm run build
```

- Must PASS: Build produces 27 routes (as of Sprint 7), no TypeScript errors
- Lint: `npm run lint` must PASS 0 errors
- Tests: `npm test` must PASS 43/43
- AI eval: `npm run ai:evaluate` must PASS 100/100

### Database Migration Command

**Production (canonical):**

```bash
npx prisma migrate deploy
```

- Applies all pending migrations from `prisma/migrations/`
- Do NOT use `prisma db push` in production (only for prototyping)
- Run before starting application
- Backup before migrate in production

**Development fallback:**

```bash
# SQLite fallback only allowed in development
DATABASE_URL=file:./dev.db npx prisma migrate dev
# or auto-create via fallback
DATABASE_URL=file:./dev.db npm run dev
```

### Start Command

```bash
npm start
# which runs: next start -p 3000 -H 0.0.0.0
```

- Binds 0.0.0.0 for container compatibility
- Port 3000 default, configurable via PORT env
- Requires DATABASE_URL postgres and JWT_SECRET/AUTH_SECRET

### Other Commands

```bash
npm run lint          # ESLint, must PASS
npm test              # Vitest 43 tests, must PASS
npm run ai:evaluate   # 100 synthetic AI cases, must PASS 100%
npm run prisma:generate # prisma generate || fallback message
```

## 3. Required Environment Variables

**Must fail clearly if missing in production:**

| Var | Required | Example | Validation |
|-----|----------|---------|------------|
| DATABASE_URL | YES | `postgresql://user:password@host:5432/onvyra?schema=public&sslmode=require` | Must start with postgresql:// or postgres:// in prod, else throws PRODUCTION_DATABASE_REQUIRED |
| JWT_SECRET or AUTH_SECRET | YES | `openssl rand -base64 48` | Min 32 chars in prod, throws if short |
| NEXT_PUBLIC_APP_URL | YES | `https://onvyra.ai` | URL, https in prod, used for OAuth/Stripe callbacks |
| NODE_ENV | YES | `production` | Enables secure cookies, HSTS, disables dev manual billing |

**Generation:**

```bash
# JWT_SECRET / AUTH_SECRET
openssl rand -base64 48
# or
openssl rand -hex 32

# TOKEN_ENCRYPTION_KEY (if HubSpot used)
openssl rand -hex 32

# DATABASE_URL examples:
# Neon: postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
# Supabase: postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres
# Local Postgres: postgresql://postgres:postgres@localhost:5432/onvyra
```

## 4. Optional Environment Variables

| Var | Required? | Default | Purpose | UI when absent |
|-----|-----------|---------|---------|----------------|
| OPENAI_API_KEY | OPTIONAL | mock-v1 | Real OpenAI when set | Mock deterministic, logs warn, modelVersion mock-v1, honest |
| OPENAI_MODEL | OPTIONAL | gpt-4o-mini | Model | - |
| OPENAI_BASE_URL | OPTIONAL | https://api.openai.com/v1 | Proxy | - |
| OPENAI_TIMEOUT_MS | OPTIONAL | 30000 | Timeout | - |
| OPENAI_MAX_RETRIES | OPTIONAL | 2 | Retries | - |
| HUBSPOT_CLIENT_ID | OPTIONAL | - | OAuth ID | NOT CONFIGURED |
| HUBSPOT_CLIENT_SECRET | OPTIONAL | - | OAuth secret server-only | NOT CONFIGURED |
| HUBSPOT_REDIRECT_URI | OPTIONAL | ${NEXT_PUBLIC_APP_URL}/api/integrations/hubspot/callback | Redirect | - |
| HUBSPOT_SCOPES | OPTIONAL | crm.objects.contacts.read ... | READ-ONLY | - |
| TOKEN_ENCRYPTION_KEY | CONDITIONAL | - | AES-256-GCM key, required in prod if HubSpot used | Error if missing in prod with HubSpot |
| STRIPE_SECRET_KEY | OPTIONAL | - | sk_live_ server-only | Billing not configured |
| STRIPE_PUBLISHABLE_KEY | OPTIONAL | - | pk_live_ | - |
| STRIPE_WEBHOOK_SECRET | OPTIONAL | - | whsec_ | - |
| STRIPE_PRO_PRICE_ID | OPTIONAL | - | price_... | Also supports STRIPE_PRICE_ID_PRO alias |
| STRIPE_BUSINESS_PRICE_ID | OPTIONAL | - | price_... | Also STRIPE_PRICE_ID_BUSINESS alias |
| STRIPE_PRICE_ID_PRO | OPTIONAL | - | Alias for PRO | - |
| STRIPE_PRICE_ID_BUSINESS | OPTIONAL | - | Alias for BUSINESS | - |
| UPSTASH_REDIS_REST_URL | OPTIONAL | - | Redis URL | In-memory fallback with warning |
| UPSTASH_REDIS_REST_TOKEN | OPTIONAL | - | Redis token | - |
| BCRYPT_ROUNDS | OPTIONAL | 12 | Hash rounds | - |
| JWT_EXPIRES_IN | OPTIONAL | 7d | Session expiry | - |
| LOG_LEVEL | OPTIONAL | info | debug/info/warn/error | - |
| SENTRY_DSN | OPTIONAL | - | Error tracking | - |
| CSRF_SECRET | OPTIONAL | - | Future CSRF | - |
| ENABLE_DEMO_MODE | OPTIONAL | true | DEMO badges | - |
| ENABLE_BILLING | OPTIONAL | false | Billing feature flag | - |

**Rules:**
- Never expose secrets to client-side JS (only NEXT_PUBLIC_APP_URL is client-safe)
- Never commit secrets (verified via grep)
- Never log secrets (logger sanitizes to [REDACTED])
- Never silently substitute fake values (throws or shows NOT CONFIGURED)
- Production startup clearly reports missing mandatory config (throws with message)
- Optional integrations report NOT_CONFIGURED honestly
- Development mocks never silently become production (mock only when OPENAI_API_KEY absent, billing manual upgrade only when NODE_ENV != production)

## 5. Webhook URLs

**Placeholder domain:** `https://yourapp.com` — replace with real domain. Do not invent final domain until configured.

### Stripe Webhook

- URL: `https://yourapp.com/api/billing/webhook`
- Secret: `STRIPE_WEBHOOK_SECRET` (whsec_...)
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Verification: HMAC SHA256 timingSafeEqual, tolerance 5min
- Idempotency: via AuditLog event id
- Configure in: https://dashboard.stripe.com/webhooks

### HubSpot OAuth Callback

- URL: `https://yourapp.com/api/integrations/hubspot/callback`
- Configure in: https://developers.hubspot.com OAuth app settings
- State verification: HMAC SHA256 10min expiry CSRF
- Scopes: READ-ONLY `crm.objects.contacts.read`, `crm.objects.deals.read`, `crm.objects.companies.read`

## 6. Health-Check URL

- URL: `https://yourapp.com/api/health`
- Method: GET
- Auth: None, but rate limited
- Returns:
  - 200 ok if all checks pass
  - 503 degraded if any check fails
- Body: `{status, timestamp, version, uptime, latencyMs, checks: {database: {status, latencyMs, provider}, env: {status, details: {nodeEnv, databaseProvider, billingConfigured bool, hubspotConfigured bool, openaiConfigured bool, demoMode bool}}, memory: {status, heapUsedMb}}}`
- Never exposes: API keys, DB credentials, tokens, stack traces
- Use for: load balancer, Kubernetes liveness probe, uptime monitoring

## 7. Production Verification Steps

After deployment, verify:

1. **Health:**
   ```bash
   curl https://yourapp.com/api/health
   # Expect 200 {"status":"ok"}
   ```

2. **Security Headers:**
   ```bash
   curl -I https://yourapp.com
   # Expect: X-Frame-Options DENY, HSTS (prod), CSP, X-Content-Type-Options nosniff, etc
   ```

3. **Auth:**
   - REGISTER at /register creates user, org, OWNER membership, httpOnly secure sameSite lax cookie
   - LOGIN at /login valid credentials 200, invalid 401 safe message
   - LOGOUT clears cookie
   - PROTECTED ROUTE /dashboard without auth redirects to /login 401
   - SESSION EXPIRATION: JWT 7d, expired rejected
   - No password leakage in responses/logs
   - No token leakage

4. **Tenant Isolation:**
   - Create ORG_A and ORG_B via two registrations
   - Create lead in ORG_A
   - Attempt to GET /leads/{B_lead_id} as ORG_A → 404
   - Attempt to UPDATE ORG_B data as ORG_A → 404 or 403
   - Attempt direct API: POST /api/campaigns with B leadIds as A → error "Some leads not found or not in your organization"
   - Verify audit logs, billing, CRM scoped orgId

5. **Import:**
   - Small valid CSV 10 rows → success
   - 1000-row CSV (audit dataset) → success with concurrency 5, duplicates detected, potential revenue Decimal-safe
   - Large CSV >10MB → error File too large
   - Duplicate data → skipped count
   - Invalid emails/phones/dates → handled safely
   - Malicious strings <script>, javascript:, formula injection =SUM → sanitized [removed] or ' prefix
   - Prompt injection "Ignore previous instructions" → remains DATA [filtered], never alters system prompts

6. **Recovery Engine:**
   - Scoring deterministic 0-100, terminal states won/rejected/cancelled 0 absolute
   - Probability base score/100 adjustments
   - Missing info low confidence
   - Monetary Decimal-safe cents
   - Explainability factors business language
   - Category critical/high/medium/low
   - Estimated vs Confirmed separated badges

7. **Dashboard:**
   - Estimated Recoverable vs Confirmed Recovered clearly separated
   - No fake historical charts
   - Empty state useful when no data

8. **Recovery Inbox:**
   - WHO SHOULD I CONTACT FIRST? obvious customer/company/deal/value/score/estimated/inactivity/last contact/why/recommended action/status
   - Default sorting score desc
   - Search/filter/pagination works tenant-safe

9. **Opportunity Detail:**
   - Answers 9 questions: who, what deal/value, why important, why scored, what next, missing info, what happened, estimated revenue, actual recovered
   - AI distinguishable dark card + amber human approval

10. **Human-in-the-Loop:**
    - No auto messaging unless real verified provider
    - Generate→Review→Approve→Send, never implies sent if wasn't

11. **Billing Safety:**
    - FREE/PRO/BUSINESS limits enforced server-side
    - Lead limit, AI limit, campaign limit, CRM limit
    - Concurrent usage race prevented via upsert increment atomic
    - If Stripe not configured: Billing not configured, no fake payments

12. **OpenAI:**
    - Key present → real provider timeout 30s retry 2 429 Retry-After concurrency 5 token limits Zod validation malformed handling prompt injection defense cost control
    - Key absent → mock-v1 deterministic clearly labeled

13. **HubSpot:**
    - OAuth flow state verification token encryption refresh 401 429 idempotent externalId unique
    - UI statuses NOT CONFIGURED/CONNECTED/ERROR/SYNCING/READY never fake Connected

14. **Stripe:**
    - Checkout creation, webhook verification, idempotency, subscription persistence, plan activation/cancellation, failed payment, duplicate webhook
    - No fake payments, NOT CONFIGURED when absent

15. **Redis/Rate Limiting:**
    - If Upstash configured use Redis, if unavailable fail safely not disabling security-critical limits, fallback in-memory with warning documented

16. **Domain/HTTPS:**
    - NEXT_PUBLIC_APP_URL https, OAuth callback URLs, Stripe webhook URLs, HubSpot callback URL, cookie secure in prod, CSP HSTS CORS

17. **Error Handling:**
    - 400/401/403/404/409/413/429/500/503 safe understandable no stack traces

18. **Responsive QA:**
    - landing, login, onboarding, import, dashboard, inbox, opportunity, campaigns, settings, billing at mobile/tablet/desktop usable no broken layout

19. **Build:**
    - npm run lint PASS, npm test PASS 43/43, npm run build PASS 27 routes, npm run ai:evaluate 100/100 PASS

## 8. Rollback Procedure

1. Keep previous deployment artifact (Docker image tag or Vercel previous deployment)
2. If migration failed:
   ```bash
   # Restore DB from backup taken before migration
   pg_restore -d onvyra backup_before_migrate.dump
   # Or if using prisma migrate
   npx prisma migrate resolve --rolled-back "20250101_init"
   ```
3. Redeploy previous version:
   ```bash
   # Vercel
   vercel rollback
   # Docker
   docker run previous_tag
   # VPS
   pm2 restart onvyra --update-env
   ```
4. Verify health:
   ```bash
   curl https://yourapp.com/api/health # 200
   ```
5. Check logs no secrets, no errors
6. Notify users if downtime

## 9. Backup Considerations

- **Postgres:** Daily pg_dump, WAL archiving, PITR, retention 30 days daily 12 months monthly, monthly restore test to staging
- **Encryption keys:** Separately in KMS (e.g., AWS KMS, Vault)
- **Audit logs:** Retained 1 year
- **Import jobs:** 90 days
- **Usage:** 2 years for billing
- **Test restore monthly to staging**

## 10. Domain / HTTPS

- Placeholder: `https://yourapp.com` until real domain configured — do not invent final domain
- Requirements: HTTPS mandatory for secure cookies, HSTS, OAuth, Stripe webhooks
- Let's Encrypt or provider managed cert
- HSTS header enabled in prod via next.config.js max-age 63072000 includeSubDomains preload
- NEXT_PUBLIC_APP_URL must be https in prod
- Configure OAuth callback URLs and Stripe webhook URLs to https domain

## 11. Production Readiness Checklist

- [ ] DATABASE_URL postgresql://... set, not file:
- [ ] JWT_SECRET or AUTH_SECRET 32+ chars random set
- [ ] TOKEN_ENCRYPTION_KEY set if HubSpot used (32 bytes hex)
- [ ] NEXT_PUBLIC_APP_URL https://... set
- [ ] NODE_ENV=production
- [ ] OPENAI_API_KEY set if real AI (or mock documented as MOCK)
- [ ] HUBSPOT_CLIENT_ID/SECRET/REDIRECT_URI set if CRM (else NOT CONFIGURED)
- [ ] STRIPE_SECRET_KEY/WEBHOOK_SECRET/PRICE_IDS set if billing (else NOT CONFIGURED)
- [ ] UPSTASH_REDIS_REST_URL/TOKEN set for distributed rate limiting (optional, in-memory fallback with warning)
- [ ] npm run lint PASS
- [ ] npm test PASS 43/43
- [ ] npm run ai:evaluate PASS 100/100
- [ ] npm run build PASS 27 routes
- [ ] npx prisma migrate deploy applied cleanly
- [ ] /api/health returns 200
- [ ] Security headers via curl -I
- [ ] Auth flow register/login/logout/protected route/session expiration
- [ ] Tenant isolation Org A cannot access Org B
- [ ] Import small CSV and 1000-row CSV
- [ ] Dashboard Estimated vs Confirmed separated
- [ ] Recovery Inbox WHO SHOULD I CONTACT FIRST? obvious
- [ ] Opportunity detail answers 9 questions
- [ ] Human-in-the-loop no auto-send
- [ ] Billing limits enforced server-side
- [ ] No fake integrations/payments/metrics/revenue/testimonials/logos
- [ ] Logs no secrets
- [ ] Backup configured
- [ ] Domain HTTPS
- [ ] Webhook URLs configured in Stripe/HubSpot dashboards

## 12. Deployment Dry Run (Local Production Structure)

```bash
# Install
npm ci

# Generate Prisma
npx prisma generate

# Lint
npm run lint

# Tests
npm test
npm run ai:evaluate

# Build (production)
NODE_ENV=production DATABASE_URL=file:./dev.db JWT_SECRET=dev-secret-32-chars-minimum-xxxxxx npm run build

# Note: In real production, DATABASE_URL must be postgres, not file:
# During build phase, fallback allowed with warning, runtime will throw PRODUCTION_DATABASE_REQUIRED if not postgres

# Migration dry run (requires postgres)
# DATABASE_URL=postgresql://... npx prisma migrate deploy

# Start
# DATABASE_URL=postgresql://... JWT_SECRET=... NEXT_PUBLIC_APP_URL=https://yourapp.com NODE_ENV=production npm start

# Health
# curl http://localhost:3000/api/health
```

If actual external deployment platform credentials unavailable, DO NOT CLAIM DEPLOYMENT. Report READY FOR DEPLOYMENT with exact remaining steps.

## 13. Current Status

- Build PASS 27 routes
- Lint PASS
- Tests 43/43 PASS
- AI eval 100/100 PASS
- Security tests PASS
- Tenant isolation verified
- Financial Decimal-safe
- Production DB path implemented (throws in prod runtime if not postgres, allows build)
- Auth hardened
- Stripe/HubSpot/OpenAI production paths implemented with NOT CONFIGURED honest fallback
- Rate limiting implemented in-memory + Redis optional documented
- Audit logging org-scoped no secrets
- Health endpoint safe
- Security headers verified
- No fake integrations/payments/metrics/revenue/testimonials/logos
- No secrets committed

**Deployment Status:** READY FOR DEPLOYMENT (external platform credentials not supplied in this sandbox, so cannot claim actual deployment succeeded, but all code and documentation ready, exact steps provided)

