/**
 * CRM Provider Abstraction
 * Prepares architecture for future CRM integrations
 * Sprint 2: interfaces + mock provider, no fake live integration
 */

export type CRMLead = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  product?: string | null;
  dealValue?: number | null;
  dealStage?: string | null;
  status?: string | null;
  lastContactAt?: Date | null;
  lastMessage?: string | null;
  source?: string | null;
  rawData?: any;
};

export type CRMDeal = {
  id: string;
  leadId?: string | null;
  title?: string | null;
  value?: number | null;
  stage?: string | null;
  status?: string | null;
  rawData?: any;
};

export type CRMContact = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
};

export type CRMActivity = {
  id: string;
  leadId?: string | null;
  type: string;
  content?: string | null;
  createdAt: Date;
};

export type SyncResult = {
  leads: number;
  deals: number;
  contacts: number;
  activities: number;
  errors: string[];
};

export interface CRMProvider {
  name: string;
  getLeads(): Promise<CRMLead[]>;
  getDeals(): Promise<CRMDeal[]>;
  getContacts(): Promise<CRMContact[]>;
  getActivities(): Promise<CRMActivity[]>;
  sync(): Promise<SyncResult>;
  mapFields(): Record<string, string>; // provider field → standard field
  isConfigured(): boolean;
}
