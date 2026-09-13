# Onvyra AI - Production Runbook

**Version:** 0.1.0 Sprint 7
**Date:** 2026-09-13
**Status:** READY FOR DEPLOYMENT

This runbook provides exact operational procedures for production.

## 1. Deploy

### Standard Next.js Deployment

**Build:**

```bash
npm ci
npx prisma generate
npm run lint
npm test
npm run ai:evaluate
npm run build
```

Must PASS all.

**Database Migration (before start):**

```bash
# Backup first (see backup section)
export DATABASE_URL=postgresql://user:password@host:5432/onvyra?sslmode=require
npx prisma migrate deploy
```

- Uses `prisma migrate deploy` canonical, NOT `db push`
- Deterministic migrations from `prisma/migrations/`
- Verify indexes and unique constraints after migration

**Start:**

```bash
export DATABASE_URL=postgresql://...
export JWT_SECRET=32+chars-random
export NEXT_PUBLIC_APP_URL=https://yourapp.com
export NODE_ENV=production
# Optional: OPENAI_API_KEY, HUBSPOT_*, STRIPE_*, UPSTASH_*
npm start
# or: next start -p 3000 -H 0.0.0.0
```

**Docker:**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

**Vercel:**

- Set env vars in Vercel dashboard
- Build command: `prisma generate && next build`
- Install command: `npm ci`
- Output directory: `.next`
- Health check path: `/api/health`

**Railway / Fly.io / Render:**

- Set env vars via platform secrets
- Build: `npm ci && prisma generate && npm run build`
- Start: `npm start`
- Migration: as separate job or pre-start hook

## 2. Migrate

### Production Migration Procedure

1. **Backup:**

```bash
pg_dump -Fc -d $DATABASE_URL -f backup_$(date +%Y%m%d_%H%M%S).dump
```

2. **Dry run on staging:**

```bash
# Clone prod DB to staging
# Run migration on staging
DATABASE_URL=postgresql://staging... npx prisma migrate deploy
# Verify /api/health 200
```

3. **Deploy migration to prod:**

```bash
DATABASE_URL=postgresql://prod... npx prisma migrate deploy
```

4. **Verify:**

```bash
npx prisma db pull --print # check schema matches
psql $DATABASE_URL -c "\d Lead" # check Decimal(15,2), indexes
psql $DATABASE_URL -c "\di" # list indexes
curl https://yourapp.com/api/health # 200
```

5. **Rollback if failed:**

```bash
# Restore backup
pg_restore -d $DATABASE_URL backup_*.dump
# Mark migration rolled back
npx prisma migrate resolve --rolled-back "migration_name"
```

### Never Use `prisma db push` in Production

- `db push` is for prototyping, not deterministic, no migration history
- Always use `migrate deploy`

## 3. Verify Health

```bash
curl -s https://yourapp.com/api/health | jq

# Expected 200:
{
  "status": "ok",
  "timestamp": "2026-09-13T...",
  "version": "0.1.0",
  "uptime": 123,
  "latencyMs": 45,
  "checks": {
    "database": {"status":"ok", "latencyMs": 12, "details":{"provider":"postgresql"}},
    "env": {"status":"ok", "details":{"nodeEnv":"production","databaseProvider":"postgresql","billingConfigured":true/false,"hubspotConfigured":true/false,"openaiConfigured":true/false,"demoMode":true}},
    "memory": {"status":"ok", "details":{"heapUsedMb": 123}}
  }
}

# If degraded 503, check logs
```

**Uptime monitoring:** Configure uptime checker (e.g., Better Uptime, UptimeRobot) to hit `/api/health` every 1 min, alert if not 200.

## 4. Inspect Logs

### Structured Logs

Logs via `src/lib/observability/logger.ts` JSON:

```json
{"timestamp":"2026-09-13T...","level":"info","message":"Import completed","orgId":"org_...","userId":"user_...","metadata":{...}}
```

**Sensitive keys sanitized to [REDACTED]:** password, token, secret, apiKey, authorization, etc.

**What to check:**

- `[env] Validation warnings` — missing optional vars
- `[prisma] Using real PostgreSQL client` — should appear in prod, not fallback
- `[prisma] WARNING: Using SQLite fallback in production build` — only allowed during build, not runtime
- `[ai] Rate limited` — OpenAI 429
- `[ai] analyst fallback to mock` — OpenAI failure, mock used
- `[hubspot] Token exchange failed` — OAuth failure
- `[hubspot] Rate limited` — HubSpot 429
- `[stripe] Would create checkout session` — Stripe checkout in dev
- `[rate-limit] Using in-memory store in production` — Redis not configured, warning

**Log levels:** LOG_LEVEL env debug/info/warn/error default info.

**Where logs:**

- Vercel: dashboard logs
- Docker: `docker logs onvyra`
- VPS: `pm2 logs onvyra` or systemd journal
- Optional: SENTRY_DSN for error tracking

**Never log:** passwords, API keys, access tokens, Stripe secrets, HubSpot tokens, full sensitive credentials.

## 5. Rollback

### Application Rollback

1. Keep previous artifact:
   - Docker: previous image tag
   - Vercel: previous deployment (automatic)
   - VPS: previous release directory

2. Redeploy previous:

```bash
# Vercel
vercel rollback
# or select previous deployment in dashboard

# Docker
docker pull onvyra:previous
docker stop onvyra && docker run -d --name onvyra onvyra:previous

# VPS
ln -sfn releases/previous current && pm2 restart onvyra
```

3. Verify health 200.

### Database Rollback

If migration caused issue:

1. Restore backup taken before migration:

```bash
pg_restore -c -d $DATABASE_URL backup_before_migrate.dump
```

2. Resolve migration:

```bash
npx prisma migrate resolve --rolled-back "20250101_init"
```

3. Verify schema and health.

## 6. Rotate Credentials

### JWT_SECRET / AUTH_SECRET

1. Generate new secret:

```bash
openssl rand -base64 48
```

2. Set new env var in platform secrets.

3. Restart application — all existing sessions invalidated (users must re-login).

4. Monitor logs for session verification failures (expected for old sessions).

### TOKEN_ENCRYPTION_KEY

1. Generate new key:

```bash
openssl rand -hex 32
```

2. **Critical:** Existing encrypted HubSpot tokens will fail to decrypt. Must re-connect all HubSpot integrations after rotation.

3. Procedure:
   - Set new key in env
   - For each Integration, set status DISCONNECTED, clear tokens
   - Notify users to reconnect HubSpot
   - Alternatively, implement key rotation with dual-key decryption (future).

### STRIPE_SECRET_KEY / WEBHOOK_SECRET

1. Roll keys in Stripe dashboard.
2. Update env vars.
3. Restart.
4. Test webhook via Stripe CLI:

```bash
stripe trigger checkout.session.completed
```

### HUBSPOT_CLIENT_SECRET

1. Rotate in HubSpot developer portal.
2. Update env.
3. Restart.
4. Existing tokens remain valid until expired, but new OAuth flows use new secret.

### DATABASE_URL password

1. Rotate in Postgres provider.
2. Update env.
3. Restart.
4. Verify health.

## 7. Handle Database Failure

**Symptoms:** `/api/health` returns 503 database error, logs `[prisma] Failed to init real client` or connection timeout.

**Steps:**

1. Check database provider status (Neon/Supabase/RDS dashboard).
2. Check DATABASE_URL correct and reachable:

```bash
psql $DATABASE_URL -c "SELECT 1"
```

3. Check connection limits, pool exhaustion.
4. If Postgres down:
   - Restore from backup if data loss
   - Failover to replica if available
   - Restart application after DB recovers
5. Verify health 200 after recovery.
6. Check for data consistency: no duplicate leads, revenue calculations Decimal-safe.

**Never fallback to SQLite in production runtime** — application throws PRODUCTION_DATABASE_REQUIRED and refuses to start if DATABASE_URL not postgres in prod.

## 8. Handle Stripe Webhook Failure

**Symptoms:** Stripe dashboard shows failed webhook deliveries, subscription not activated, logs `Failed to handle checkout.session.completed`.

**Steps:**

1. Check webhook signature: verify STRIPE_WEBHOOK_SECRET correct.
2. Check endpoint URL https://yourapp.com/api/billing/webhook reachable and https.
3. Check logs for `[stripe]` errors.
4. Replay failed events from Stripe dashboard.
5. Verify idempotency: duplicate webhooks should return 200 if already processed (via AuditLog).
6. If subscription state mismatch:
   ```bash
   # Manually check
   psql $DATABASE_URL -c "SELECT id,billingPlan,stripeCustomerId FROM Organization WHERE id='org_...'"
   psql $DATABASE_URL -c "SELECT * FROM Subscription WHERE organizationId='org_...'"
   ```
7. If needed, manually update billingPlan and log audit.

**Failed payments:** Status PAST_DUE/CANCELED, not false active. User should see billing page with status, not fake active.

## 9. Handle HubSpot OAuth Failure

**Symptoms:** Connect HubSpot fails, logs `[hubspot] Token exchange failed` or `Invalid state`.

**Steps:**

1. Check env: HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET, HUBSPOT_REDIRECT_URI set and match HubSpot app settings.
2. Check NEXT_PUBLIC_APP_URL https and matches redirect URI domain.
3. Check state verification: state param HMAC SHA256 expiry 10min, CSRF protection — if expired, user must retry Connect within 10min.
4. Check TOKEN_ENCRYPTION_KEY set in prod if HubSpot used (32 bytes hex).
5. If 401: access token expired, auto-refresh via refresh token — if refresh fails, set status ERROR, require reconnect.
6. If 429: rate limited, respects Retry-After, retry after delay.
7. Check Integration table:

```bash
psql $DATABASE_URL -c "SELECT id,provider,status,lastSyncError FROM Integration WHERE organizationId='org_...'"
```

8. If ERROR status, show error in UI, allow Disconnect and Reconnect.
9. Never show CONNECTED without real verified connection — testConnection verifies via API call.

**If credentials missing:** Product remains functional, shows NOT CONFIGURED, not fake Connected.

## 10. Handle OpenAI Outage

**Symptoms:** AI analysis fails, logs `[ai] Rate limited` or timeout, fallback to mock.

**Behavior:**

- Timeout 30s AbortController, retry 2 exponential backoff, respects Retry-After header
- 429 rate limited → retry after delay
- 500/502/503/504 → retry
- Invalid JSON → fallback to mock, logs warning
- Empty response → retry then mock
- Mock fallback deterministic mock-v1, no fabricated revenue, clearly labeled isMock true, modelVersion mock-v1

**Steps:**

1. Check OPENAI_API_KEY set and valid.
2. Check OpenAI status https://status.openai.com
3. Check logs for token usage and rate limiting.
4. If outage, application continues with mock — UI shows results but modelVersion mock-v1, honest not pretending real AI.
5. Verify financial calculations remain deterministic application logic, never AI output directly modifies revenue.
6. Verify token/cost limits enforced via Usage table.
7. If prolonged outage, consider increasing OPENAI_TIMEOUT_MS or reducing concurrency.

**Production UI must clearly distinguish AI availability:** If mock, logs warn, but UI could add more prominent MOCK badge (P2).

## 11. Handle Redis Outage

**Symptoms:** Rate limiting fails, or Upstash Redis unreachable.

**Current implementation:** In-memory Map fallback with cleanup every 5min, max 1000 entries LRU, resets on cold start (documented limitation).

**If Upstash Redis configured:**

- Future implementation should use Redis INCR+EXPIRE via REST API
- If Redis outage, should fail safely according to existing design and must not accidentally disable security-critical rate limits

**Current behavior:** If Redis not configured, uses in-memory with warning `[rate-limit] Using in-memory store in production`. Security-critical limits still enforced per instance, but not distributed across instances — acceptable for pilot, but for multi-instance prod set UPSTASH_REDIS.

**Steps:**

1. Check UPSTASH_REDIS_REST_URL and TOKEN set and reachable.
2. If Redis down, application continues with in-memory fallback, logs warning, rate limits still enforced per instance.
3. Monitor for rate limit bypass: if multiple instances, in-memory per instance could allow higher total rate — mitigate by setting Redis.
4. Document fallback behavior: in-memory resets on cold start, not distributed.

## 12. Handle Incident

### General Incident Playbook

1. **Detect:** Health check 503, error rate spike via logs/Sentry, user reports.
2. **Triage:** Check /api/health checks, logs, metrics.
3. **Mitigate:** Rollback if needed, restart, scale, or disable failing integration (e.g., set OPENAI_API_KEY empty to use mock if OpenAI outage).
4. **Communicate:** Notify users via status page if available, honest about impact.
5. **Fix:** Identify root cause, fix code, test, deploy.
6. **Post-mortem:** Document incident, update runbook, add tests.

### Specific Incidents

- **Database down:** See section 7
- **Stripe webhook failure:** See section 8
- **HubSpot OAuth failure:** See section 9
- **OpenAI outage:** See section 10
- **Redis outage:** See section 11
- **High error rate:** Check logs for component (AI, CRM, billing), rate limiting, tenant isolation
- **Security incident:** Check logger.security, revoke tokens, rotate secrets, audit AuditLog for cross-tenant access

### Backup Considerations

- Daily pg_dump, WAL archiving, PITR, retention 30 days daily 12 months monthly, monthly restore test
- Encryption keys separately in KMS
- Audit logs 1 year, import jobs 90 days, usage 2 years

## 13. Production Verification After Deploy

Run smoke tests:

- [ ] /api/health 200
- [ ] Security headers via curl -I
- [ ] Register → Login → Logout → Protected route 401
- [ ] Tenant isolation Org A cannot access Org B
- [ ] Import small CSV and 1000-row CSV
- [ ] Dashboard Estimated vs Confirmed separated
- [ ] Inbox WHO SHOULD I CONTACT FIRST? obvious
- [ ] Opportunity detail 9 questions answered
- [ ] AI message generation (real or mock) human approval required
- [ ] Outcome CONTACTED→RECOVERED with amount/date persists correctly, page refresh not destroy state
- [ ] Billing limits enforced server-side, concurrent race prevented
- [ ] No fake integrations/payments/metrics/revenue/testimonials/logos
- [ ] Logs no secrets
- [ ] Build/Lint/Tests PASS

## 14. Domain / HTTPS

- Placeholder https://yourapp.com until real domain configured — do not invent final domain
- Requirements: HTTPS mandatory for secure cookies, HSTS, OAuth callbacks, Stripe webhooks
- Let's Encrypt or provider managed cert
- HSTS header enabled in prod max-age 63072000 includeSubDomains preload
- NEXT_PUBLIC_APP_URL must be https in prod
- Configure OAuth callback URLs and Stripe webhook URLs to https domain

## 15. Known Limitations (P2/P3)

- In-memory rate limiter resets on cold start, needs Redis for distributed prod
- Stripe webhook idempotency via AuditLog may need unique index in prod migration (handled via catch)
- Fallback prisma simulates transactions sequentially (real transaction in prod)
- No real E2E Playwright, only mocked (future)
- System font stack instead of Inter due to sandbox TLS (prod can re-enable)
- No 2FA, no refresh token rotation
- No websocket for import progress (polling via ImportJob status)
- No email sending, manual action required per spec
- Mock AI not explicit badge in UI prominently (logs show mock-v1, but UI could add badge more prominent - P2)

## 16. Final Notes

- Do NOT implement mobile app, advanced CRM bidirectional sync, automatic messaging, complex workflow automation, enterprise SSO, advanced analytics, AI agents, arbitrary new dashboards, random UI redesign, new scoring algorithms — those belong to future iterations per Sprint 7 objective MAKE CURRENT PRODUCT RELIABLE ENOUGH FOR REAL USERS.
- Purpose is genuinely deployable, not impressive report.
- REAL → show as REAL, MOCK → label as MOCK, NOT CONFIGURED → show NOT CONFIGURED, UNAVAILABLE → UNAVAILABLE.
- Never fabricate customers, revenue, payments, subscriptions, CRM connections, AI results, testimonials, logos, metrics, deployment status.

