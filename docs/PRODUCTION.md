# Onvyra AI - Production Readiness Guide

This document describes production architecture, deployment, and operational requirements for Onvyra AI v1.0.

## Architecture Overview

Onvyra AI is a Next.js 14 application with:
- **Frontend**: Next.js App Router, React Server Components, Tailwind CSS
- **Database**: PostgreSQL (production), SQLite fallback (dev/sandbox)
- **Auth**: JWT httpOnly cookies, bcrypt hashing, org-scoped sessions
- **AI**: OpenAI API with Zod validation, caching, token tracking
- **CRM**: HubSpot OAuth 2.0 READ-ONLY integration
- **Billing**: Stripe Checkout + Webhooks with signature verification
- **Import**: CSV/XLSX parsing with security hardening

### Request Flow
```
Browser -> Next.js (middleware auth) -> API Routes (tenant isolation, rate limit, billing check) -> Prisma (Postgres) -> External APIs (OpenAI, HubSpot, Stripe)
```

## Database - PostgreSQL Production

### Provider
- **Development**: SQLite file:./dev.db via node:sqlite fallback (sandbox blocks Prisma binary download)
- **Production**: PostgreSQL required. Set `DATABASE_URL=postgresql://user:password@host:5432/onvyra`

### Schema Design
- **Monetary fields**: `Decimal(15,2)` in Postgres to avoid float errors. Fallback uses REAL but converts via `validateMonetaryAmount` and `calculatePotentialRevenue` helpers that use integer arithmetic.
- **Idempotency**: `Lead` and `Deal` have `externalId` + `provider` for CRM sync deduplication. Unique constraint on `(organizationId, externalId)`.
- **Tenant isolation**: Every table has `organizationId` with index. Every query includes `organizationId`.
- **Indexes**: Composite indexes for common queries:
  - `Lead`: `(orgId, status)`, `(orgId, isDemo)`, `(orgId, createdAt)`, `(orgId, lastContactAt)`
  - `RecoveryOpportunity`: `(orgId, status)`, `(orgId, category)`, `(orgId, score)`
  - `CampaignLead`: `(orgId, campaignId)`, `(orgId, status)`
  - `RecoveryEvent`: `(orgId, outcome)`, `(orgId, recoveredAt)`, `(orgId, createdAt)`
  - `AuditLog`: `(orgId, event)`, `(orgId, createdAt)`
  - `Integration`: `(orgId, provider)` unique
  - `Subscription`: `stripeSubscriptionId` unique
  - `Usage`: `(orgId, period)` unique for monthly accounting

### Migrations
- Located in `prisma/migrations/20250101_init/migration.sql`
- Production: Run `npx prisma migrate deploy`
- Development: Fallback auto-creates tables via `prisma-fallback.ts` with `CREATE TABLE IF NOT EXISTS` and migration ALTERs

### Transactions
- Use `prisma.$transaction` for multi-step writes (e.g., import creates lead + analysis + opportunity)
- Fallback simulates transaction by executing sequentially - logs warning
- Financial operations (outcome RECOVERED) use transaction to ensure event + opportunity + campaignLead + lead status updated atomically

### Backup & Recovery
- **Postgres**: Daily pg_dump, WAL archiving, point-in-time recovery
- **Retention**: 30 days daily, 12 months monthly
- **Restore test**: Monthly restore to staging
- **SQLite fallback**: File copy backup (not for production)

## Authentication & Session Management

### Implementation
- **Password hashing**: bcrypt with 12 rounds (configurable via `BCRYPT_ROUNDS`)
- **JWT**: HS256, 7 days expiry, issuer `onvyra`, audience `onvyra-app`, httpOnly cookie
- **Cookie**: `httpOnly`, `secure` in production, `sameSite=lax`, path `/`
- **Session validation**: `requireAuth()` checks JWT, `requireAuthWithMembership()` additionally checks org membership exists

### Security
- JWT secret min 32 chars, validated in production
- No secrets in logs - all logging sanitizes sensitive keys
- Rate limiting: login 10 per 15min per IP, register 5 per hour per IP
- Tenant isolation: every API route checks `organizationId` from session, not from client

### RBAC
- **OWNER**: Full access including billing, team management, org deletion
- **ADMIN**: Operational (campaigns, imports, integrations) but not billing
- **MEMBER**: Workflow only (view inbox, update outcomes, generate messages)
- Server-side enforcement via `requireRole()` and helper `isOwnerOrAdmin()`

## Tenant Isolation & IDOR Prevention

### Every Query Must Include orgId
```ts
// Correct
prisma.lead.findFirst({ where: { id, organizationId: session.orgId } })

// Wrong - vulnerable to IDOR
prisma.lead.findFirst({ where: { id } })
```

### Tested Scenarios
- Cross-tenant read: User A cannot fetch lead from Org B (returns 404)
- Cross-tenant write: User A cannot update lead from Org B
- Campaign isolation: campaignId validated belongs to orgId
- Integration isolation: HubSpot tokens scoped per org

### Audit
- Search codebase for `findFirst`, `findUnique`, `update`, `delete` without `organizationId`
- Tests in `src/tests/security.test.ts` verify IDOR protection

## AI Provider - OpenAI

### Production Hardening
- **Timeout**: 30s default, configurable via `OPENAI_TIMEOUT_MS`, AbortController
- **Retry**: 2 retries with exponential backoff for 429, 500, 502, 503, 504
- **Rate limit handling**: Respects Retry-After header
- **Cost control**: Token tracking per org, monthly limits (FREE 50k, PRO 500k, BUSINESS 5M)
- **Caching**: In-memory cache per org, 1 hour TTL, max 1000 entries, LRU eviction. Production should use Redis.
- **Structured outputs**: Zod validation for analysis and messages, prevents fabricated prices/discounts
- **Mock fallback**: When `OPENAI_API_KEY` empty, uses deterministic mock (no fake revenue)

### Data Safety
- Imported customer content treated as DATA, not instructions
- Prompt injection protection: sanitize `lastMessage`, `rawData` - replace "ignore previous instructions" with "[filtered]"
- System prompt isolates TRUSTED (system) vs UNTRUSTED (user data)
- No secrets in logs, no customer data in logs unless audit

### Validation
- `AIAnalysisSchema`: validates leadStatus, buyingIntent, lossReason, etc. - no invented values
- `AIMessageSchema`: checks for forbidden patterns like "$X discount", "limited time", "expires"
- If validation fails, falls back to mock but logs warning

## CRM Integration - HubSpot

### OAuth 2.0 Flow
1. User clicks Connect -> server generates state via `generateOAuthState(orgId)` (HMAC SHA256 + timestamp)
2. Store state in Integration metadata, redirect to `https://app.hubspot.com/oauth/authorize?client_id&redirect_uri&scope&state`
3. Callback at `/api/integrations/hubspot/callback` verifies state via `verifyOAuthState()` - checks orgId, expiry 10min, HMAC
4. Exchange code for tokens via `POST https://api.hubapi.com/oauth/v1/token`
5. Encrypt tokens via `encryptToken()` (AES-256-GCM, IV + authTag + ciphertext) with `TOKEN_ENCRYPTION_KEY`
6. Store encrypted in `Integration` table, status CONNECTED

### Security
- **CSRF**: State parameter with orgId + timestamp + random + HMAC
- **Token encryption**: At rest via AES-256-GCM, key from `TOKEN_ENCRYPTION_KEY` env (32 bytes hex)
- **No secrets in logs**: Access tokens never logged, only status
- **READ-ONLY**: Scopes `crm.objects.contacts.read`, `crm.objects.deals.read`, `crm.objects.companies.read` only
- **Rate limiting**: 5 sync per minute per org, respects HubSpot 429 with Retry-After
- **401 handling**: Auto-refresh via refresh token, if fails -> require reconnect

### Idempotency & Sync
- **externalId**: `hubspot:contact:{id}` or `hubspot:deal:{id}` - unique per org
- **Unique constraint**: `(organizationId, externalId)` prevents duplicates on re-sync
- **Upsert**: Sync fetches contacts/deals, maps to Lead/Deal, creates if not exists, updates if exists
- **Failure handling**: Partial sync allowed (contacts succeed, deals fail), errors stored in `lastSyncError`, never deletes existing data
- **Pagination**: Handles HubSpot pagination (limit 100), respects rate limits

### Billing
- CRM integrations limited by plan: FREE 0, PRO 1, BUSINESS 5
- Server-side enforcement in import and sync

## Import Security

### Validation
- **File size**: Max 10MB (`MAX_FILE_SIZE_BYTES`)
- **File type**: Only .csv, .xlsx, .xls, block dangerous mime types (application/x-msdownload, text/html)
- **Row count**: Max 10k rows per import
- **Column count**: Max 100 columns
- **Cell length**: Max 10k chars, truncated if longer

### Formula Injection Prevention
- Detects `=`, `+`, `-` (if not negative number), `@`, `\t=`, `\r=`, `\n=` at start
- Neutralizes by prefixing with single quote `'`
- Allows negative numbers like `-123` or `-45.67`

### Malicious Content
- Blocks `<script`, `javascript:`, `vbscript:`, `onload=`, `onerror=`, `eval(`, `document.cookie`, `DDE(`
- Replaces with `[removed]` and logs warning
- Sanitizes headers: remove `<>"'`;`, max 200 chars, check duplicates and empty

### Resource Limits
- Buffer size check defense in depth
- Row count validation before processing
- Sanitization per row with warning count in summary

## Billing - Stripe

### Checkout
- `POST /api/billing` creates checkout session via `StripeClient`
- Requires `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID`
- Generates idempotency key: `orgId:operation:timestamp:random`
- Metadata includes `organizationId`, `plan` for webhook
- Success/cancel URLs from `NEXT_PUBLIC_APP_URL`

### Webhook
- `POST /api/billing/webhook` verifies signature via `verifyWebhookSignature()`
- Parses `t=timestamp,v1=signature`, checks tolerance 5min, HMAC SHA256 with `timingSafeEqual`
- Idempotency: checks `AuditLog` for existing event id, returns 200 if duplicate (prevents double processing)
- Handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Updates `Organization.billingPlan`, `Subscription` table, logs audit
- Returns 500 for transient failures to trigger Stripe retry, 200 for unhandled but valid events

### Security
- No secrets in logs, customer IDs partially masked (`cus_...` -> `cus_...`)
- Webhook secret from `STRIPE_WEBHOOK_SECRET`
- No fake payments: if Stripe not configured, shows "Billing integration not configured", allows dev manual upgrade only in non-production

### Plan Enforcement
- Server-side via `getOrganizationUsage()` + `checkSpecificLimit()` + `checkUsageLimit()`
- Checks before import, AI analysis, campaign creation, CRM sync
- Usage accounting: `Usage` table per org per period `YYYY-MM`, increments via `incrementUsage()` with transaction
- Tracks `aiAnalyses`, `aiMessages`, `imports`, `leads`, `campaigns`, `tokensUsed`

## Security Headers

### Next.js Config
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
- `Content-Security-Policy`: default-src 'self', script-src 'self' 'unsafe-eval' 'unsafe-inline' (needed for Next.js), style-src 'self' 'unsafe-inline', img-src 'self' data: blob: https:, connect-src 'self' https://api.openai.com https://api.hubapi.com https://api.stripe.com
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` in production
- API routes: `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`

### CSRF
- OAuth state parameter for HubSpot
- For other mutations, rely on SameSite=lax cookies + origin check
- Future: Add CSRF token for forms via `CSRF_SECRET`

## Rate Limiting

### In-Memory (Dev)
- Map with count + resetAt, cleanup every 5min
- Production should use Redis via `UPSTASH_REDIS_REST_URL`

### Limits
- AI: 20 per minute per org
- AI evaluate: 100 per minute per org (batch)
- Import parse: 10 per minute per org
- Import confirm: 10 per minute per org
- Auth login: 10 per 15min per IP
- Auth register: 5 per hour per IP
- CRM sync: 5 per minute per org
- CRM fetch: 30 per minute per org
- API default: 100 per minute per org

### Headers
- Returns `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Observability & Logging

### Logger
- Structured JSON logs with timestamp, level, message, metadata
- Sanitizes sensitive keys: password, token, secret, apiKey, authorization, etc. -> "[REDACTED]"
- Levels: debug, info, warn, error, configurable via `LOG_LEVEL`
- Production: info, development: debug

### Specialized Loggers
- `logger.audit(event, orgId, userId, metadata)`: for audit trail, also stored in DB
- `logger.security(event, metadata)`: for security events (invalid OAuth state, invalid webhook sig)
- `logger.performance(operation, durationMs, metadata)`: for slow queries (>1s)
- `logger.billing(event, orgId, metadata)`: for billing events

### What NOT to Log
- Passwords, tokens, API keys, secrets, JWT contents, customer PII unless necessary
- Full request bodies with sensitive data

## Error Handling

### API Routes
- Use `sanitizeErrorForClient()` to prevent leaking internal errors
- Known safe errors: "Invalid credentials", "Unauthorized", "Not found", etc. - returned as is
- Unknown errors: logged server-side with full message, client gets "An internal error occurred"
- Never expose stack traces, DB errors, or secrets

### Import & CRM
- Partial failures allowed, errors collected and returned in summary
- Never throws away existing data on sync failure
- Errors stored in `ImportJob.errors` (max 20) and `Integration.lastSyncError`

## Performance

### Database
- Indexes for common queries (see Schema Design)
- Pagination: inbox, leads, campaigns, analytics use `take`/`skip`, default 50, max 100
- Avoid N+1: use `include` or batch fetch (e.g., existingLeads for dedup fetched once with take 10000, not per row)
- Aggregation: dashboard uses counts and sums, not loading all records

### AI
- Caching per org per lead, 1 hour TTL, prevents re-analyzing same lead
- Batch analysis in import processes sequentially but could be parallelized with concurrency limit (future)
- Token tracking for cost control

### Import
- Parse file once, normalize, dedup batch, then process
- Existing leads fetched once (take 10000) not per row
- Progress via ImportJob status

## Deployment

### Environment Variables
- See `.env.example` for full list
- Required: `DATABASE_URL`, `JWT_SECRET` (32+ chars)
- Optional but recommended: `OPENAI_API_KEY`, `HUBSPOT_CLIENT_ID/SECRET`, `STRIPE_SECRET_KEY/WEBHOOK_SECRET`, `TOKEN_ENCRYPTION_KEY`

### Build
- `npm run build` must pass (24 routes)
- `npm run lint` must pass (0 errors)
- `npm test` must pass (43 tests)

### Health Check
- `GET /api/health` returns status, checks database, env, memory
- Returns 200 if all ok, 503 if degraded
- No auth required, but rate limited
- Used by load balancer / Kubernetes liveness probe

### Migrations
- Production: `npx prisma migrate deploy` on deploy
- Backup before migrate
- Test migrations on staging first

## Incident Response

### Playbook
1. **Database down**: Health check fails, alert, check Postgres logs, restore from backup if needed
2. **High error rate**: Check logs for `logger.error`, identify failing component (AI, CRM, billing)
3. **Rate limit abuse**: Check rate limit logs, block IP if needed, increase limits if legitimate
4. **Security incident**: Check `logger.security`, revoke tokens, rotate secrets, audit `AuditLog`
5. **Billing webhook failure**: Check Stripe dashboard, replay failed events, verify signature

### Backups
- Daily automated, tested monthly
- Point-in-time recovery for Postgres
- Encryption key backup separately (KMS)

## Privacy & Data Handling

### Customer Data
- Imported leads treated as DATA, never as instructions
- No customer data in logs unless audit event with orgId only
- AI prompts include only necessary fields, not full rawData if too large (slice 1000 chars)

### Retention
- Audit logs retained 1 year
- Import jobs retained 90 days
- Usage records retained 2 years for billing

### GDPR
- User can request data export (leads, analyses, events)
- User can request deletion (cascade deletes org data via FK)
- Anonymize demo data not linked to real users

## Checklist for Production Deploy

- [ ] `DATABASE_URL` is postgres, not sqlite
- [ ] `JWT_SECRET` 32+ chars, random, not default
- [ ] `TOKEN_ENCRYPTION_KEY` set (32 bytes hex)
- [ ] `OPENAI_API_KEY` set if using real AI (or mock allowed but document)
- [ ] `HUBSPOT_CLIENT_ID/SECRET/REDIRECT_URI` set if using HubSpot
- [ ] `STRIPE_SECRET_KEY/WEBHOOK_SECRET/PRICE_IDS` set if using billing
- [ ] `NEXT_PUBLIC_APP_URL` set to production URL
- [ ] `NODE_ENV=production`
- [ ] Run `prisma migrate deploy`
- [ ] Test `/api/health` returns 200
- [ ] Test auth flow (register, login, org isolation)
- [ ] Test import with small CSV
- [ ] Test HubSpot OAuth if configured
- [ ] Test Stripe webhook via Stripe CLI `stripe listen --forward-to localhost:3000/api/billing/webhook`
- [ ] Verify security headers via `curl -I https://yourapp.com`
- [ ] Verify rate limiting via repeated requests
- [ ] Check logs no secrets
- [ ] Backup configured
