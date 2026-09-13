import { CRMProvider, CRMLead, CRMDeal, CRMContact, CRMActivity, SyncResult } from "./types";

/**
 * HubSpot READ-ONLY Provider
 * Implements abstraction, only works if credentials available
 * Does NOT fake live integration
 */

export class HubSpotProvider implements CRMProvider {
  name = "hubspot";
  private apiKey: string | null;
  private baseUrl = "https://api.hubapi.com";

  constructor() {
    this.apiKey = process.env.HUBSPOT_API_KEY || null;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private ensureConfigured() {
    if (!this.isConfigured()) {
      throw new Error("HubSpot not configured. Set HUBSPOT_API_KEY in environment variables.");
    }
  }

  async getLeads(): Promise<CRMLead[]> {
    this.ensureConfigured();
    // READ-ONLY implementation
    // In production, would call HubSpot API: /crm/v3/objects/contacts, /crm/v3/objects/deals
    // For Sprint 2, we document the integration point but don't make live calls without credentials
    // This is intentional to avoid fake integration

    // If we had credentials, pseudo-code:
    // const res = await fetch(`${this.baseUrl}/crm/v3/objects/contacts?properties=email,phone,company`, {
    //   headers: { Authorization: `Bearer ${this.apiKey}` }
    // });
    // Map to CRMLead

    return [];
  }

  async getDeals(): Promise<CRMDeal[]> {
    this.ensureConfigured();
    return [];
  }

  async getContacts(): Promise<CRMContact[]> {
    this.ensureConfigured();
    return [];
  }

  async getActivities(): Promise<CRMActivity[]> {
    this.ensureConfigured();
    return [];
  }

  async sync(): Promise<SyncResult> {
    this.ensureConfigured();
    // Would sync leads, deals, contacts, activities
    return { leads: 0, deals: 0, contacts: 0, activities: 0, errors: ["Not implemented in Sprint 2 - provider interface ready"] };
  }

  mapFields(): Record<string, string> {
    return {
      // HubSpot field → Onvyra standard
      firstname: "name",
      email: "email",
      phone: "phone",
      company: "company",
      amount: "dealValue",
      dealstage: "dealStage",
      hs_lead_status: "status",
    };
  }
}
