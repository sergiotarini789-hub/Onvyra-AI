/**
 * CRM Provider Abstraction - Production Ready
 * Supports idempotency via externalId, provider, and sync status
 */

export type CRMLead = {
  id?: string;
  externalId?: string;
  provider?: string;
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
  id?: string;
  externalId?: string;
  provider?: string;
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
  rawData?: any;
};

export type CRMActivity = {
  id: string;
  leadId?: string | null;
  type: string;
  content?: string | null;
  timestamp?: Date;
  createdAt?: Date;
  rawData?: any;
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
  mapFields(): Record<string, string>;
  isConfigured(): boolean;
  testConnection?(): Promise<{ success: boolean; accountId?: string; error?: string }>;
}
