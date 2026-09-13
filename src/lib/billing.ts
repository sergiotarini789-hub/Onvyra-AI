/**
 * Billing foundation for commercial SaaS
 * Plans: FREE, PRO, BUSINESS
 * No fake payments - if Stripe not configured, show "Billing integration not configured"
 */

export type Plan = "FREE" | "PRO" | "BUSINESS";

export type PlanLimits = {
  leads: number;
  importsPerMonth: number;
  aiAnalysesPerMonth: number;
  campaigns: number;
  users: number;
  crmIntegrations: number;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    leads: 500,
    importsPerMonth: 3,
    aiAnalysesPerMonth: 100,
    campaigns: 2,
    users: 1,
    crmIntegrations: 0,
  },
  PRO: {
    leads: 5000,
    importsPerMonth: 50,
    aiAnalysesPerMonth: 1000,
    campaigns: 20,
    users: 5,
    crmIntegrations: 1,
  },
  BUSINESS: {
    leads: 50000,
    importsPerMonth: 500,
    aiAnalysesPerMonth: 10000,
    campaigns: 100,
    users: 25,
    crmIntegrations: 5,
  },
};

export const PLAN_PRICES = {
  FREE: { monthly: 0, yearly: 0, label: "Free" },
  PRO: { monthly: 49, yearly: 490, label: "$49/mo" },
  BUSINESS: { monthly: 199, yearly: 1990, label: "$199/mo" },
};

export type Usage = {
  leads: number;
  aiAnalysesThisMonth: number;
  importsThisMonth: number;
  campaigns: number;
  users: number;
};

export function getPlanForOrganization(org: any): Plan {
  // In future, read from org.billingPlan or subscription
  // For now, default FREE unless env indicates
  const plan = (org?.billingPlan as Plan) || "FREE";
  if (["FREE", "PRO", "BUSINESS"].includes(plan)) return plan as Plan;
  return "FREE";
}

export function checkUsageLimit(plan: Plan, usage: Usage): { allowed: boolean; reason?: string; limits: PlanLimits } {
  const limits = PLAN_LIMITS[plan];
  if (usage.leads >= limits.leads) {
    return { allowed: false, reason: `Lead limit reached (${limits.leads} leads for ${plan}). Upgrade to continue.`, limits };
  }
  if (usage.aiAnalysesThisMonth >= limits.aiAnalysesPerMonth) {
    return { allowed: false, reason: `AI analysis limit reached (${limits.aiAnalysesPerMonth}/month for ${plan}).`, limits };
  }
  if (usage.campaigns >= limits.campaigns) {
    return { allowed: false, reason: `Campaign limit reached (${limits.campaigns} for ${plan}).`, limits };
  }
  return { allowed: true, limits };
}

export function isBillingConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
