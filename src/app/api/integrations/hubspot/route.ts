import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isHubSpotConfigured, getHubSpotAuthUrl, createProviderFromIntegration } from "@/lib/crm/hubspot";
import { generateOAuthState } from "@/lib/security/encryption";
import { rateLimit, getRateLimitHeaders, getClientIp } from "@/lib/security/rate-limit";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    // Rate limit
    const ip = getClientIp(request);
    const rl = rateLimit(`crm_fetch:${session.orgId}`, "crm_fetch");
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: getRateLimitHeaders(rl) });
    }
    
    const integrations = await prisma.integration.findMany({
      where: { organizationId: session.orgId },
    });
    
    const hubspotIntegration = integrations.find((i: any) => i.provider === "HUBSPOT");
    
    let connectionStatus = { connected: false, lastSyncAt: null as any, error: null as any };
    let testResult = null;
    
    if (hubspotIntegration && hubspotIntegration.status === "CONNECTED") {
      connectionStatus.connected = true;
      connectionStatus.lastSyncAt = hubspotIntegration.lastSyncAt;
      
      // Test connection
      try {
        const provider = createProviderFromIntegration(hubspotIntegration);
        if (provider) {
          testResult = await provider.testConnection();
          if (!testResult.success) {
            connectionStatus.error = testResult.error;
          }
        }
      } catch (e: any) {
        connectionStatus.error = e.message;
      }
    }
    
    return NextResponse.json({
      configured: isHubSpotConfigured(),
      integration: hubspotIntegration ? {
        id: hubspotIntegration.id,
        provider: hubspotIntegration.provider,
        status: hubspotIntegration.status,
        lastSyncAt: hubspotIntegration.lastSyncAt,
        lastSyncStatus: hubspotIntegration.lastSyncStatus,
        lastSyncError: hubspotIntegration.lastSyncError,
        externalAccountId: hubspotIntegration.externalAccountId,
        createdAt: hubspotIntegration.createdAt,
      } : null,
      connectionStatus,
      testResult,
      integrations: integrations.map((i: any) => ({
        id: i.id,
        provider: i.provider,
        status: i.status,
        lastSyncAt: i.lastSyncAt,
        createdAt: i.createdAt,
      })),
    });
  } catch (e: any) {
    if (e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.error("Failed to get integrations", { error: e.message });
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    // Rate limit
    const ip = getClientIp(request);
    const rl = rateLimit(`crm_sync:${session.orgId}`, "crm_sync");
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded, please try again later" }, { status: 429, headers: getRateLimitHeaders(rl) });
    }
    
    const body = await request.json().catch(() => ({}));
    const action = body.action;
    
    if (action === "connect") {
      if (!isHubSpotConfigured()) {
        return NextResponse.json({ error: "HubSpot OAuth not configured. Set HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET." }, { status: 400 });
      }
      
      const state = generateOAuthState(session.orgId);
      
      // Store state in integration record or cache for verification
      // For now, we store pending integration
      await prisma.integration.upsert({
        where: { organizationId_provider: { organizationId: session.orgId, provider: "HUBSPOT" } },
        update: {
          status: "NOT_CONNECTED",
          metadata: JSON.stringify({ oauthState: state, initiatedBy: session.userId, initiatedAt: new Date().toISOString() }),
        },
        create: {
          organizationId: session.orgId,
          provider: "HUBSPOT",
          status: "NOT_CONNECTED",
          metadata: JSON.stringify({ oauthState: state, initiatedBy: session.userId, initiatedAt: new Date().toISOString() }),
        },
      });
      
      const authUrl = getHubSpotAuthUrl(session.orgId, state);
      
      logger.audit("INTEGRATION_CONNECT_INITIATED", session.orgId, session.userId, { provider: "HUBSPOT" });
      
      return NextResponse.json({ authUrl, state }, { headers: getRateLimitHeaders(rl) });
    }
    
    if (action === "disconnect") {
      const integration = await prisma.integration.findFirst({
        where: { organizationId: session.orgId, provider: "HUBSPOT" },
      });
      
      if (integration) {
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            status: "DISCONNECTED",
            accessToken: null,
            refreshToken: null,
          },
        });
        
        await prisma.auditLog.create({
          data: {
            organizationId: session.orgId,
            userId: session.userId,
            event: "INTEGRATION_DISCONNECTED",
            entityType: "Integration",
            entityId: integration.id,
            metadata: JSON.stringify({ provider: "HUBSPOT" }),
          },
        });
      }
      
      return NextResponse.json({ success: true }, { headers: getRateLimitHeaders(rl) });
    }
    
    if (action === "sync") {
      const integration = await prisma.integration.findFirst({
        where: { organizationId: session.orgId, provider: "HUBSPOT" },
      });
      
      if (!integration || integration.status !== "CONNECTED") {
        return NextResponse.json({ error: "HubSpot not connected" }, { status: 400 });
      }
      
      const provider = createProviderFromIntegration(integration);
      if (!provider) {
        return NextResponse.json({ error: "Failed to create HubSpot provider, please reconnect" }, { status: 400 });
      }
      
      // Perform sync with idempotency
      const syncResult = await provider.sync();
      
      // Update last sync
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: syncResult.errors.length > 0 ? "PARTIAL" : "SUCCESS",
          lastSyncError: syncResult.errors.length > 0 ? syncResult.errors.join("; ") : null,
        },
      });
      
      logger.audit("INTEGRATION_SYNC", session.orgId, session.userId, { provider: "HUBSPOT", result: syncResult });
      
      return NextResponse.json({ result: syncResult }, { headers: getRateLimitHeaders(rl) });
    }
    
    return NextResponse.json({ error: "Invalid action. Use connect, disconnect, or sync" }, { status: 400 });
  } catch (e: any) {
    if (e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.error("HubSpot integration action failed", { error: e.message });
    return NextResponse.json({ error: "Failed to process integration action" }, { status: 500 });
  }
}
