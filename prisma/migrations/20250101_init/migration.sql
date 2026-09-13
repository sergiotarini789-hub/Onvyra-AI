-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'MEMBER', 'OWNER');
CREATE TYPE "IntegrationProvider" AS ENUM ('HUBSPOT', 'MOCK');
CREATE TYPE "IntegrationStatus" AS ENUM ('NOT_CONNECTED', 'CONNECTED', 'ERROR', 'DISCONNECTED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'UNPAID', 'FREE');
CREATE TYPE "PlanType" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "billingPlan" "PlanType" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "externalId" TEXT,
    "provider" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "company" TEXT,
    "manager" TEXT,
    "product" TEXT,
    "dealValue" DECIMAL(15,2),
    "dealStage" TEXT,
    "status" TEXT DEFAULT 'new',
    "lastContactAt" TIMESTAMP(3),
    "source" TEXT,
    "rawData" TEXT,
    "lastMessage" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT,
    "externalId" TEXT,
    "provider" TEXT,
    "title" TEXT,
    "value" DECIMAL(15,2),
    "stage" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AIAnalysis" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "leadStatus" TEXT NOT NULL,
    "buyingIntent" TEXT NOT NULL,
    "lossReason" TEXT NOT NULL,
    "recoveryScore" INTEGER NOT NULL,
    "recoveryProbability" DOUBLE PRECISION,
    "confidence" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "reasoningSummary" TEXT NOT NULL,
    "recommendedMessageGoal" TEXT,
    "generatedMessage" TEXT,
    "modelVersion" TEXT NOT NULL DEFAULT 'v1',
    "factors" TEXT,
    "missingInformation" TEXT,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecoveryOpportunity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "dealId" TEXT,
    "score" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "probability" DOUBLE PRECISION,
    "confidence" TEXT NOT NULL,
    "potentialRevenue" DECIMAL(15,2),
    "status" TEXT NOT NULL DEFAULT 'open',
    "factors" TEXT,
    "reasoningSummary" TEXT,
    "recommendedAction" TEXT,
    "lastContactAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RecoveryOpportunity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "targetCriteria" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignLead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'selected',
    "messageGenerated" TEXT,
    "messageEdited" TEXT,
    "messageStatus" TEXT DEFAULT 'pending',
    "contactedAt" TIMESTAMP(3),
    "response" TEXT,
    "outcome" TEXT,
    "revenue" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecoveryEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "campaignId" TEXT,
    "userId" TEXT,
    "type" TEXT,
    "outcome" TEXT NOT NULL,
    "revenue" DECIMAL(15,2),
    "recoveredAt" TIMESTAMP(3),
    "source" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecoveryEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "mapping" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "externalAccountId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Usage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "aiAnalyses" INTEGER NOT NULL DEFAULT 0,
    "aiMessages" INTEGER NOT NULL DEFAULT 0,
    "imports" INTEGER NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "campaigns" INTEGER NOT NULL DEFAULT 0,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");
CREATE UNIQUE INDEX "OrganizationMember_userId_organizationId_key" ON "OrganizationMember"("userId", "organizationId");
CREATE UNIQUE INDEX "Lead_organizationId_externalId_key" ON "Lead"("organizationId", "externalId");
CREATE UNIQUE INDEX "Deal_organizationId_externalId_key" ON "Deal"("organizationId", "externalId");
CREATE UNIQUE INDEX "CampaignLead_campaignId_leadId_key" ON "CampaignLead"("campaignId", "leadId");
CREATE UNIQUE INDEX "Integration_organizationId_provider_key" ON "Integration"("organizationId", "provider");
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");
CREATE UNIQUE INDEX "Usage_organizationId_period_key" ON "Usage"("organizationId", "period");

CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");
CREATE INDEX "Organization_stripeCustomerId_idx" ON "Organization"("stripeCustomerId");
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");
CREATE INDEX "Lead_organizationId_status_idx" ON "Lead"("organizationId", "status");
CREATE INDEX "Lead_organizationId_isDemo_idx" ON "Lead"("organizationId", "isDemo");
CREATE INDEX "Lead_organizationId_provider_idx" ON "Lead"("organizationId", "provider");
CREATE INDEX "Lead_organizationId_externalId_idx" ON "Lead"("organizationId", "externalId");
CREATE INDEX "Lead_email_idx" ON "Lead"("email");
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");
CREATE INDEX "Lead_dealValue_idx" ON "Lead"("dealValue");
CREATE INDEX "Lead_lastContactAt_idx" ON "Lead"("lastContactAt");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");
CREATE INDEX "Lead_organizationId_createdAt_idx" ON "Lead"("organizationId", "createdAt");
CREATE INDEX "Lead_organizationId_lastContactAt_idx" ON "Lead"("organizationId", "lastContactAt");
CREATE INDEX "Conversation_organizationId_idx" ON "Conversation"("organizationId");
CREATE INDEX "Conversation_leadId_idx" ON "Conversation"("leadId");
CREATE INDEX "Conversation_organizationId_leadId_idx" ON "Conversation"("organizationId", "leadId");
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");
CREATE INDEX "Deal_organizationId_idx" ON "Deal"("organizationId");
CREATE INDEX "Deal_leadId_idx" ON "Deal"("leadId");
CREATE INDEX "Deal_organizationId_externalId_idx" ON "Deal"("organizationId", "externalId");
CREATE INDEX "Deal_value_idx" ON "Deal"("value");
CREATE INDEX "Deal_stage_idx" ON "Deal"("stage");
CREATE INDEX "AIAnalysis_organizationId_idx" ON "AIAnalysis"("organizationId");
CREATE INDEX "AIAnalysis_leadId_idx" ON "AIAnalysis"("leadId");
CREATE INDEX "AIAnalysis_recoveryScore_idx" ON "AIAnalysis"("recoveryScore");
CREATE INDEX "AIAnalysis_confidence_idx" ON "AIAnalysis"("confidence");
CREATE INDEX "AIAnalysis_organizationId_recoveryScore_idx" ON "AIAnalysis"("organizationId", "recoveryScore");
CREATE INDEX "AIAnalysis_organizationId_createdAt_idx" ON "AIAnalysis"("organizationId", "createdAt");
CREATE INDEX "AIAnalysis_createdAt_idx" ON "AIAnalysis"("createdAt");
CREATE INDEX "RecoveryOpportunity_organizationId_idx" ON "RecoveryOpportunity"("organizationId");
CREATE INDEX "RecoveryOpportunity_leadId_idx" ON "RecoveryOpportunity"("leadId");
CREATE INDEX "RecoveryOpportunity_score_idx" ON "RecoveryOpportunity"("score");
CREATE INDEX "RecoveryOpportunity_status_idx" ON "RecoveryOpportunity"("status");
CREATE INDEX "RecoveryOpportunity_category_idx" ON "RecoveryOpportunity"("category");
CREATE INDEX "RecoveryOpportunity_organizationId_status_idx" ON "RecoveryOpportunity"("organizationId", "status");
CREATE INDEX "RecoveryOpportunity_organizationId_category_idx" ON "RecoveryOpportunity"("organizationId", "category");
CREATE INDEX "RecoveryOpportunity_organizationId_score_idx" ON "RecoveryOpportunity"("organizationId", "score");
CREATE INDEX "RecoveryOpportunity_potentialRevenue_idx" ON "RecoveryOpportunity"("potentialRevenue");
CREATE INDEX "Campaign_organizationId_idx" ON "Campaign"("organizationId");
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");
CREATE INDEX "Campaign_organizationId_status_idx" ON "Campaign"("organizationId", "status");
CREATE INDEX "Campaign_createdAt_idx" ON "Campaign"("createdAt");
CREATE INDEX "CampaignLead_organizationId_idx" ON "CampaignLead"("organizationId");
CREATE INDEX "CampaignLead_campaignId_idx" ON "CampaignLead"("campaignId");
CREATE INDEX "CampaignLead_leadId_idx" ON "CampaignLead"("leadId");
CREATE INDEX "CampaignLead_status_idx" ON "CampaignLead"("status");
CREATE INDEX "CampaignLead_organizationId_campaignId_idx" ON "CampaignLead"("organizationId", "campaignId");
CREATE INDEX "CampaignLead_organizationId_status_idx" ON "CampaignLead"("organizationId", "status");
CREATE INDEX "CampaignLead_revenue_idx" ON "CampaignLead"("revenue");
CREATE INDEX "RecoveryEvent_organizationId_idx" ON "RecoveryEvent"("organizationId");
CREATE INDEX "RecoveryEvent_leadId_idx" ON "RecoveryEvent"("leadId");
CREATE INDEX "RecoveryEvent_outcome_idx" ON "RecoveryEvent"("outcome");
CREATE INDEX "RecoveryEvent_campaignId_idx" ON "RecoveryEvent"("campaignId");
CREATE INDEX "RecoveryEvent_recoveredAt_idx" ON "RecoveryEvent"("recoveredAt");
CREATE INDEX "RecoveryEvent_organizationId_outcome_idx" ON "RecoveryEvent"("organizationId", "outcome");
CREATE INDEX "RecoveryEvent_organizationId_recoveredAt_idx" ON "RecoveryEvent"("organizationId", "recoveredAt");
CREATE INDEX "RecoveryEvent_organizationId_createdAt_idx" ON "RecoveryEvent"("organizationId", "createdAt");
CREATE INDEX "RecoveryEvent_createdAt_idx" ON "RecoveryEvent"("createdAt");
CREATE INDEX "ImportJob_organizationId_idx" ON "ImportJob"("organizationId");
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");
CREATE INDEX "ImportJob_createdAt_idx" ON "ImportJob"("createdAt");
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_event_idx" ON "AuditLog"("event");
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_organizationId_event_idx" ON "AuditLog"("organizationId", "event");
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");
CREATE INDEX "Integration_organizationId_idx" ON "Integration"("organizationId");
CREATE INDEX "Integration_provider_idx" ON "Integration"("provider");
CREATE INDEX "Integration_status_idx" ON "Integration"("status");
CREATE INDEX "Subscription_organizationId_idx" ON "Subscription"("organizationId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_plan_idx" ON "Subscription"("plan");
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");
CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");
CREATE INDEX "Usage_organizationId_idx" ON "Usage"("organizationId");
CREATE INDEX "Usage_period_idx" ON "Usage"("period");
CREATE INDEX "Usage_organizationId_period_idx" ON "Usage"("organizationId", "period");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecoveryOpportunity" ADD CONSTRAINT "RecoveryOpportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecoveryOpportunity" ADD CONSTRAINT "RecoveryOpportunity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecoveryOpportunity" ADD CONSTRAINT "RecoveryOpportunity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CampaignLead" ADD CONSTRAINT "CampaignLead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignLead" ADD CONSTRAINT "CampaignLead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignLead" ADD CONSTRAINT "CampaignLead_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecoveryEvent" ADD CONSTRAINT "RecoveryEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecoveryEvent" ADD CONSTRAINT "RecoveryEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecoveryEvent" ADD CONSTRAINT "RecoveryEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
