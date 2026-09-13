import { CRMProvider, CRMLead, CRMDeal, CRMContact, CRMActivity, SyncResult } from "./types";

/**
 * Mock CRM Provider - for development and documentation
 * Clearly marked as mock, does NOT fake live integration
 */
export class MockCRMProvider implements CRMProvider {
  name = "mock";

  isConfigured(): boolean {
    return true;
  }

  async getLeads(): Promise<CRMLead[]> {
    return [
      {
        id: "mock_lead_1",
        name: "Ivan Petrov",
        email: "ivan@example.com",
        phone: "+7 912 345-67-89",
        company: "Acme Corp",
        product: "CRM implementation",
        dealValue: 200000,
        dealStage: "proposal sent",
        status: "contacted",
        lastContactAt: new Date(Date.now() - 14 * 86400000),
        lastMessage: "Спасибо, получили КП, изучаем",
        source: "Website",
        rawData: { mock: true },
      },
    ];
  }

  async getDeals(): Promise<CRMDeal[]> {
    return [
      { id: "mock_deal_1", leadId: "mock_lead_1", title: "CRM Deal", value: 200000, stage: "proposal", status: "open" },
    ];
  }

  async getContacts(): Promise<CRMContact[]> {
    return [{ id: "mock_contact_1", name: "Ivan Petrov", email: "ivan@example.com", company: "Acme Corp" }];
  }

  async getActivities(): Promise<CRMActivity[]> {
    return [{ id: "mock_act_1", leadId: "mock_lead_1", type: "email", content: "Sent proposal", createdAt: new Date() }];
  }

  async sync(): Promise<SyncResult> {
    return { leads: 1, deals: 1, contacts: 1, activities: 1, errors: [] };
  }

  mapFields(): Record<string, string> {
    return {
      name: "name",
      email: "email",
      phone: "phone",
      company: "company",
      dealValue: "dealValue",
    };
  }
}
