import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100).optional(),
  organizationName: z.string().min(2).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const leadFilterSchema = z.object({
  search: z.string().optional(),
  category: z.enum(["all", "critical", "high", "medium", "low", "high_confidence", "no_follow_up", "high_value", "no_response"]).optional(),
  sortBy: z.enum(["recoveryScore", "potentialRevenue", "dealValue", "lastContactAt", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export const importMappingSchema = z.object({
  mapping: z.record(z.string(), z.string()),
  fileName: z.string(),
  rows: z.array(z.record(z.string(), z.any())),
});

export const campaignCreateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  leadIds: z.array(z.string()).min(1).max(1000),
});

export const recoveryEventSchema = z.object({
  leadId: z.string(),
  outcome: z.enum(["no_response", "responded", "interested", "negotiation", "won", "lost", "not_interested"]),
  revenue: z.number().min(0).optional(),
  note: z.string().max(1000).optional(),
});
