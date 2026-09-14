/**
 * Billing foundation for commercial SaaS
 * Plans: FREE, PRO, BUSINESS
 * No fake payments - if Stripe not configured, show "Billing integration not configured"
 * 
 * Production requirements:
 * - Idempotency for Stripe operations
 * - Webhook signature verification
 * - Plan enforcement server-side
 * - Usage accounting with transactions
 */

export type Plan = "FREE" | "PRO" | "BUSINESS";

export type PlanLimits = {
  leads: number;
  importsPerMonth: number;
  aiAnalysesPerMonth: number;
  aiMessagesPerMonth: number;
  campaigns: number;
  users: number;
  crmIntegrations: number;
  tokensPerMonth: number;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    leads: 500,
    importsPerMonth: 3,
    aiAnalysesPerMonth: 100,
    aiMessagesPerMonth: 200,
    campaigns: 2,
    users: 1,
    crmIntegrations: 0,
    tokensPerMonth: 50000,
  },
  PRO: {
    leads: 5000,
    importsPerMonth: 50,
    aiAnalysesPerMonth: 1000,
    aiMessagesPerMonth: 2000,
    campaigns: 20,
    users: 5,
    crmIntegrations: 1,
    tokensPerMonth: 500000,
  },
  BUSINESS: {
    leads: 50000,
    importsPerMonth: 500,
    aiAnalysesPerMonth: 10000,
    aiMessagesPerMonth: 20000,
    campaigns: 100,
    users: 25,
    crmIntegrations: 5,
    tokensPerMonth: 5000000,
  },
};

export const PLAN_PRICES = {
  FREE: { monthly: 0, yearly: 0, label: "Free", description: "For trying out Onvyra" },
  PRO: { monthly: 49, yearly: 490, label: "$49/mo", description: "For growing businesses" },
  BUSINESS: { monthly: 199, yearly: 1990, label: "$199/mo", description: "For teams and high volume" },
};

export type Usage = {
  leads: number;
  aiAnalysesThisMonth: number;
  aiMessagesThisMonth: number;
  importsThisMonth: number;
  campaigns: number;
  users: number;
  tokensThisMonth: number;
};

export type UsageCheckResult = {
  allowed: boolean;
  reason?: string;
  limits: PlanLimits;
  usage: Usage;
  remaining: {
    leads: number;
    aiAnalyses: number;
    imports: number;
    campaigns: number;
    tokens: number;
  };
};

export function getPlanForOrganization(org: any): Plan {
  const plan = (org?.billingPlan as Plan) || "FREE";
  if (["FREE", "PRO", "BUSINESS"].includes(plan)) return plan as Plan;
  return "FREE";
}

export function checkUsageLimit(plan: Plan, usage: Usage): UsageCheckResult {
  const limits = PLAN_LIMITS[plan];
  
  const remaining = {
    leads: Math.max(0, limits.leads - usage.leads),
    aiAnalyses: Math.max(0, limits.aiAnalysesPerMonth - usage.aiAnalysesThisMonth),
    imports: Math.max(0, limits.importsPerMonth - usage.importsThisMonth),
    campaigns: Math.max(0, limits.campaigns - usage.campaigns),
    tokens: Math.max(0, limits.tokensPerMonth - usage.tokensThisMonth),
  };

  if (usage.leads >= limits.leads) {
    return { allowed: false, reason: `Lead limit reached (${limits.leads} leads for ${plan}). Upgrade to continue.`, limits, usage, remaining };
  }
  if (usage.aiAnalysesThisMonth >= limits.aiAnalysesPerMonth) {
    return { allowed: false, reason: `AI analysis limit reached (${limits.aiAnalysesPerMonth}/month for ${plan}).`, limits, usage, remaining };
  }
  if (usage.importsThisMonth >= limits.importsPerMonth) {
    return { allowed: false, reason: `Import limit reached (${limits.importsPerMonth}/month for ${plan}).`, limits, usage, remaining };
  }
  if (usage.campaigns >= limits.campaigns) {
    return { allowed: false, reason: `Campaign limit reached (${limits.campaigns} for ${plan}).`, limits, usage, remaining };
  }
  if (usage.tokensThisMonth >= limits.tokensPerMonth) {
    return { allowed: false, reason: `Token limit reached (${limits.tokensPerMonth.toLocaleString()}/month for ${plan}).`, limits, usage, remaining };
  }
  
  return { allowed: true, limits, usage, remaining };
}

export function checkSpecificLimit(plan: Plan, usage: Usage, type: "leads" | "ai" | "import" | "campaign" | "user" | "crm" | "tokens"): { allowed: boolean; reason?: string } {
  const limits = PLAN_LIMITS[plan];
  
  switch (type) {
    case "leads":
      if (usage.leads >= limits.leads) return { allowed: false, reason: `Lead limit reached (${limits.leads} for ${plan})` };
      break;
    case "ai":
      if (usage.aiAnalysesThisMonth >= limits.aiAnalysesPerMonth) return { allowed: false, reason: `AI limit reached (${limits.aiAnalysesPerMonth}/month for ${plan})` };
      break;
    case "import":
      if (usage.importsThisMonth >= limits.importsPerMonth) return { allowed: false, reason: `Import limit reached (${limits.importsPerMonth}/month for ${plan})` };
      break;
    case "campaign":
      if (usage.campaigns >= limits.campaigns) return { allowed: false, reason: `Campaign limit reached (${limits.campaigns} for ${plan})` };
      break;
    case "user":
      if (usage.users >= limits.users) return { allowed: false, reason: `User limit reached (${limits.users} for ${plan})` };
      break;
    case "crm":
      if (limits.crmIntegrations === 0) return { allowed: false, reason: `CRM integrations not available on ${plan} plan` };
      break;
    case "tokens":
      if (usage.tokensThisMonth >= limits.tokensPerMonth) return { allowed: false, reason: `Token limit reached for ${plan}` };
      break;
  }
  
  return { allowed: true };
}

export function isBillingConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

// Server-side usage accounting
export async function getOrganizationUsage(prisma: any, orgId: string): Promise<Usage> {
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  
  const [leadsCount, campaignsCount, membersCount, usageRecord] = await Promise.all([
    prisma.lead.count({ where: { organizationId: orgId } }),
    prisma.campaign.count({ where: { organizationId: orgId } }),
    prisma.organizationMember.count({ where: { organizationId: orgId } }),
    prisma.usage.findUnique({ where: { organizationId_period: { organizationId: orgId, period } } }).catch(() => null),
  ]);
  
  return {
    leads: leadsCount,
    campaigns: campaignsCount,
    users: membersCount,
    aiAnalysesThisMonth: usageRecord?.aiAnalyses || 0,
    aiMessagesThisMonth: usageRecord?.aiMessages || 0,
    importsThisMonth: usageRecord?.imports || 0,
    tokensThisMonth: usageRecord?.tokensUsed || 0,
  };
}

export async function incrementUsage(prisma: any, orgId: string, type: "aiAnalysis" | "aiMessage" | "import" | "lead" | "campaign" | "tokens", amount = 1): Promise<void> {
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  
  try {
    // P1-7: Use atomic upsert to avoid race condition check->increment bypass
    // Try update with increment first, fallback to create
    if (prisma.usage.upsert) {
      const updateData: any = {};
      const createData: any = {
        organizationId: orgId,
        period,
        aiAnalyses: 0,
        aiMessages: 0,
        imports: 0,
        leads: 0,
        campaigns: 0,
        tokensUsed: 0,
      };
      switch (type) {
        case "aiAnalysis":
          updateData.aiAnalyses = { increment: amount };
          createData.aiAnalyses = amount;
          break;
        case "aiMessage":
          updateData.aiMessages = { increment: amount };
          createData.aiMessages = amount;
          break;
        case "import":
          updateData.imports = { increment: amount };
          createData.imports = amount;
          break;
        case "lead":
          updateData.leads = { increment: amount };
          createData.leads = amount;
          break;
        case "campaign":
          updateData.campaigns = { increment: amount };
          createData.campaigns = amount;
          break;
        case "tokens":
          updateData.tokensUsed = { increment: amount };
          createData.tokensUsed = amount;
          break;
      }
      await prisma.usage.upsert({
        where: { organizationId_period: { organizationId: orgId, period } },
        update: updateData,
        create: createData,
      });
      return;
    }

    // Fallback path for environments without upsert support (e.g., SQLite fallback)
    const existing = await prisma.usage.findUnique({
      where: { organizationId_period: { organizationId: orgId, period } },
    });
    
    if (existing) {
      const data: any = {};
      switch (type) {
        case "aiAnalysis": data.aiAnalyses = (existing.aiAnalyses || 0) + amount; break;
        case "aiMessage": data.aiMessages = (existing.aiMessages || 0) + amount; break;
        case "import": data.imports = (existing.imports || 0) + amount; break;
        case "lead": data.leads = (existing.leads || 0) + amount; break;
        case "campaign": data.campaigns = (existing.campaigns || 0) + amount; break;
        case "tokens": data.tokensUsed = (existing.tokensUsed || 0) + amount; break;
      }
      await prisma.usage.update({ where: { id: existing.id }, data });
    } else {
      const data: any = {
        organizationId: orgId,
        period,
        aiAnalyses: type === "aiAnalysis" ? amount : 0,
        aiMessages: type === "aiMessage" ? amount : 0,
        imports: type === "import" ? amount : 0,
        leads: type === "lead" ? amount : 0,
        campaigns: type === "campaign" ? amount : 0,
        tokensUsed: type === "tokens" ? amount : 0,
      };
      await prisma.usage.create({ data });
    }
  } catch (e) {
    console.error("[billing] Failed to increment usage", e);
  }
}

export function getPlanFeatures(plan: Plan): string[] {
  const base = [
    "Revenue recovery analysis",
    "AI-powered opportunity scoring",
    "Recovery inbox",
    "Campaign management",
    "Basic analytics",
  ];
  
  if (plan === "FREE") return base;
  
  if (plan === "PRO") {
    return [
      ...base,
      "HubSpot CRM integration",
      "Advanced analytics & breakdowns",
      "Up to 5 team members",
      "Email support",
      "5,000 leads",
      "1,000 AI analyses/month",
    ];
  }
  
  return [
    ...base,
    "All CRM integrations",
    "Advanced analytics & custom reports",
    "Up to 25 team members",
    "Priority support",
    "50,000 leads",
    "10,000 AI analyses/month",
    "API access",
    "Custom onboarding",
  ];
}
