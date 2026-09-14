# CRM Abstraction

## Interface
`CRMProvider` interface defines read-only operations:
- `getLeads(): Promise<CRMLead[]>`
- `getDeals(): Promise<CRMDeal[]>`
- `getContacts(): Promise<CRMContact[]>`
- `getActivities(): Promise<CRMActivity[]>`
- `sync(): Promise<SyncResult>`
- `mapFields(raw): Mapped`
- `isConfigured(): boolean`

## Providers

### MockCRMProvider
- Always available
- Returns sample data
- For development, tests, documentation
- Location: `src/lib/crm/mock.ts`

### HubSpotProvider (READ-ONLY)
- Requires env `HUBSPOT_API_KEY`
- If not configured, throws clear error: "HubSpot not configured — set HUBSPOT_API_KEY"
- No auto-send, no write operations
- Methods document future API calls:
  - `getLeads()` → would call `GET /crm/v3/objects/contacts` + deals
  - `getDeals()` → `GET /crm/v3/objects/deals`
  - Mapping documented in code comments
- To enable: set env and implement actual fetch calls where marked TODO

## Security
- All providers are READ-ONLY in MVP
- No automatic message sending
- Imported CRM data treated as DATA, not instructions (prompt injection filtered)
- Tenant isolation: every sync scoped by organizationId

## Usage
```ts
import { getCRMProvider } from "@/lib/crm";
const provider = getCRMProvider("hubspot"); // or "mock"
if (!provider.isConfigured()) { // show config UI
}
const leads = await provider.getLeads();
```

## Future
- Add Pipedrive, AmoCRM providers
- Document rate limiting, pagination
- Add webhook for incremental sync
