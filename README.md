# Onvyra — Revenue Recovery Platform

> **Find the customers your business is leaving behind.**

Onvyra analyzes your existing leads and customer data to identify stalled opportunities, estimate recoverable revenue, and show your team who to contact next.

## What was built (MVP)

**Full functional B2B SaaS MVP:**

- Landing page with hero, metrics preview, how-it-works
- Authentication (bcrypt, JWT httpOnly cookies, org creation)
- Organization/workspaces with tenant isolation (org A cannot access org B)
- CSV/XLSX import with AI-assisted column mapping (e.g. Имя → name, Телефон → phone, Сумма → dealValue)
- Normalization, duplicate detection, rawData preservation
- Deterministic Recovery Score engine (0-100, critical/high/medium/low)
- Recovery Probability (null when insufficient data, never invented)
- Potential Recoverable Revenue = Deal Value × Probability
- AI Lead Analyst (structured JSON, Zod validation, mock fallback when no OPENAI_API_KEY)
- AI Message Generator (contextual, no invented prices/discounts)
- Dashboard: Potential Recoverable, High Confidence, Priority Leads, Leads Analyzed, Confirmed Recovered
- Leads list with filters (All, Critical, High, Medium, High Confidence, No Follow-up, High Value, No Response) and sorting
- Lead detail: why selected, reasoning, recommended action, AI message with Copy/Regenerate/Mark Contacted
- Campaigns: select multiple leads, track selected/contacted/response/outcome/revenue
- Outcome tracking: No response, Responded, Interested, Negotiation, Won, Lost, Not interested + Actual Revenue → RecoveryEvent
- Confirmed Recovered Revenue separated from Potential
- Demo Mode: 1,000 synthetic leads covering 10 cases (high-value+quotation, rejection, won, cancelled, no response, think, insufficient data, duplicates, low-value, active)
- Security: Zod validation, file size limits (10MB), tenant isolation enforced, secure hashing
- Tests: 35 unit/integration/security tests
- Performance: pagination, indexes, server-side filtering, handles 10k leads

## Architecture

```
Frontend (Next.js 14 App Router, Tailwind, TypeScript)
   ↓
API Routes / Server Actions (Next.js Route Handlers)
   ↓
Business Logic (src/lib/recovery, src/lib/import, src/lib/ai)
   ↓
Database (Prisma schema + SQLite fallback via node:sqlite for sandbox)
   ↓
AI Service Layer (src/lib/ai/service.ts isolates LLM calls)
   ↓
LLM Provider (OpenAI gpt-4o-mini if OPENAI_API_KEY set, else deterministic mock)
```

**Key design decisions:**
- AI calls isolated behind `AIService` class, never in React components
- Recovery Score is deterministic, independent, unit-tested
- Fallback SQLite implementation using Node 22's built-in `node:sqlite` because Prisma binary download fails in this sandbox due to TLS blocking to binaries.prisma.sh (Cloudflare). Production should use PostgreSQL + Prisma (schema.prisma already PostgreSQL-ready, just change provider).
- Tenant isolation enforced in every query via `organizationId`

## Database Models (Prisma schema + fallback)

- User (id, email unique, passwordHash, name)
- Organization (id, name, slug unique)
- OrganizationMember (userId, orgId, role OWNER/ADMIN/MEMBER)
- Lead (id, orgId, name, phone, email, company, manager, product, dealValue, dealStage, status, lastContactAt, source, rawData JSON, lastMessage, isDemo)
- Conversation, Message, Deal
- AIAnalysis (leadId, leadStatus, buyingIntent, lossReason, recoveryScore, recoveryProbability, confidence, recommendedAction, reasoningSummary, recommendedMessageGoal, generatedMessage, modelVersion)
- Campaign, CampaignLead (campaignId, leadId, status, messageGenerated, outcome, revenue)
- RecoveryEvent (leadId, outcome, revenue, note)
- ImportJob (fileName, status, totalRows, processedRows, errors, mapping)

Indexes on organizationId, email, phone, dealValue, recoveryScore, etc.

## AI Components

**AIService (src/lib/ai/service.ts):**
- `analyzeLead()` → JSON with leadStatus, buyingIntent, lossReason, recommendedAction, reasoningSummary, recommendedMessageGoal
- `generateMessage()` → personalized follow-up using only available data
- `suggestColumnMapping()` → maps CSV columns to standard fields

**Mock fallback:** When `OPENAI_API_KEY` not set, deterministic mock based on keywords (price, think, rejection, won) ensures tests and demo work without API key.

**Validation:** All AI outputs validated with Zod. Invalid outputs never enter DB. Retry with fallback.

## Routes/Pages

- `/` Landing
- `/login` (+ ?demo=1 for demo seed)
- `/register`
- `/dashboard` - primary question: Where should I recover revenue today?
- `/leads` - list with filters/sorting
- `/leads/:id` - detail with score, probability, reasoning, message, outcome tracking
- `/import` - 3-step: upload → mapping confirmation → result
- `/campaigns` - list
- `/campaigns/:id` - detail with export messages
- `/settings` - org info, members, data stats, security checklist
- `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`
- `/api/import/parse`, `/api/import/confirm`
- `/api/demo/seed` (POST to seed 1000, DELETE to clear)
- `/api/campaigns`
- `/api/leads/:id/regenerate`, `/api/leads/:id/outcome`

## Tests Performed

- `npm run test` → 35 tests pass
  - Recovery Score: high-value+quotation, rejection, won, cancelled, think signal, clamping, categories, insufficient data, low-value, active
  - Revenue: calculation, null handling, edge probabilities, formatting
  - Probability: insufficient data → null, won → low prob, rejected → low, high score+high intent → high prob, inactivity adjustment, never invent
  - Normalization: Russian example mapping, deal value formats, date parsing, rawData preservation
  - Duplicate: phone normalization (8→7), email lowercasing, phone/email duplicate detection, batch deduplication
  - Security: tenant isolation, cross-tenant rejection, Zod validation, file validation

- Manual integration tests via curl:
  - Registration, login, session cookie
  - Demo seed 1000 leads
  - Dashboard metrics
  - CSV parse with Russian columns → correct mapping
  - Import confirm → normalization + AI analysis
  - Campaign creation
  - Outcome tracking → confirmed revenue
  - Cross-tenant isolation (org B cannot access org A lead → 404)

- Lint: `npm run lint` → no errors
- Build: `npm run build` → success

## Known Issues / Limitations

- **Database:** Uses SQLite fallback (`dev.db` at project root) because Prisma engine download blocked in sandbox (TLS to binaries.prisma.sh fails). Schema is PostgreSQL-ready. For production, set `DATABASE_URL` to postgres and ensure `prisma generate` succeeds (requires network to binaries.prisma.sh or prebuilt engine).
- **Google Fonts:** `next/font` fetch fails in sandbox due to same TLS issue, replaced with system font stack. Production can re-enable Inter via `next/font/google`.
- **XLSX parsing:** Works via `xlsx` library, but large files (>10k rows) rejected for performance.
- **AI:** Without `OPENAI_API_KEY`, uses deterministic mock. Mock is good for demo/tests but not as nuanced as GPT-4o-mini. Set `OPENAI_API_KEY` and `OPENAI_MODEL` in .env for real AI.
- **No real-time import progress:** MVP shows importing state, not websocket progress. Acceptable for 10k rows.
- **Campaign messages:** Manual copy/export only, no auto-sending (per spec).
- **Auth:** Simple JWT in httpOnly cookie, no refresh token rotation, no 2FA (future).
- **No pagination UI for dashboard priority list** (shows top 10), but leads page paginated.

## How to Run Locally

```bash
# Clone
git clone <repo> && cd Onvyra-AI

# Install
npm install

# Env
cp .env.example .env  # or create .env with:
# DATABASE_URL="file:./dev.db"
# JWT_SECRET="change-to-32+chars-random"
# OPENAI_API_KEY="" # optional, leave empty for mock
# OPENAI_MODEL="gpt-4o-mini"

# Dev
npm run dev
# → http://localhost:3000

# Test
npm run test
npm run lint
npm run build

# Demo flow
# 1. Go to /register → create org
# 2. Go to /import → upload CSV/XLSX or
# 3. POST /api/demo/seed to load 1000 demo leads
# 4. Check /dashboard for Potential Recoverable Revenue
# 5. Go to /leads?category=critical for priority
# 6. Open lead → see why, copy AI message, mark outcome
# 7. Create campaign from leads → track revenue
```

**Sample CSV (Russian):**
```
Имя,Телефон,Сумма,Последний контакт,Товар,Комментарий
Иван Петров,+7 912 345-67-89,200000,15.03.2024,CRM,Интересует цена
```

System suggests:
```
Имя → name
Телефон → phone
Сумма → dealValue
Последний контакт → lastContactAt
Товар → product
Комментарий → lastMessage
```

## Recommended Next Step

1. **Postgres migration:** Switch fallback to real Prisma + PostgreSQL in production (update provider in schema.prisma, run `prisma migrate dev`, remove fallback).
2. **Real AI:** Add OPENAI_API_KEY, test analyst quality, add prompt versioning and evaluation dataset.
3. **CRM integrations:** Read-only sync from HubSpot/Pipedrive before auto-messaging.
4. **Email sending (opt-in):** With user consent, allow sending via Resend/SES, but keep manual approval.
5. **Role-based access:** ADMIN vs MEMBER permissions for import/campaigns.
6. **Audit log:** Track who marked what outcome.
7. **Advanced scoring:** Add ML model trained on actual win/loss data, but keep deterministic base as fallback.

Goal achieved: smallest real functional product that proves Onvyra can identify commercially valuable stalled opportunities and help recover them.
