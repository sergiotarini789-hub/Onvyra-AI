import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForTokens, isHubSpotConfigured } from "@/lib/crm/hubspot";
import { verifyOAuthState } from "@/lib/security/encryption";
import { encryptToken } from "@/lib/security/encryption";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  if (error) {
    logger.warn("HubSpot OAuth error", { error });
    return NextResponse.redirect(`${appUrl}/integrations?error=${encodeURIComponent(error)}`);
  }
  
  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/integrations?error=missing_code_or_state`);
  }
  
  try {
    // We need orgId from state - but we also need auth to verify
    // Try to get session
    let session: any = null;
    try {
      session = await requireAuth();
    } catch {
      // If not authenticated, redirect to login with state preserved
      return NextResponse.redirect(`${appUrl}/login?redirect=/api/integrations/hubspot/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
    }
    
    // Verify state
    const verification = verifyOAuthState(state, session.orgId);
    if (!verification.valid) {
      logger.security("Invalid OAuth state", { orgId: session.orgId, error: verification.error });
      return NextResponse.redirect(`${appUrl}/integrations?error=invalid_state`);
    }
    
    if (!isHubSpotConfigured()) {
      return NextResponse.redirect(`${appUrl}/integrations?error=hubspot_not_configured`);
    }
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    
    // Encrypt tokens at rest
    const encryptedAccess = encryptToken(tokens.access_token);
    const encryptedRefresh = encryptToken(tokens.refresh_token);
    
    // Store integration
    await prisma.integration.upsert({
      where: { organizationId_provider: { organizationId: session.orgId, provider: "HUBSPOT" } },
      update: {
        status: "CONNECTED",
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        lastSyncAt: null,
        lastSyncStatus: null,
        lastSyncError: null,
        metadata: JSON.stringify({ connectedAt: new Date().toISOString(), connectedBy: session.userId }),
      },
      create: {
        organizationId: session.orgId,
        provider: "HUBSPOT",
        status: "CONNECTED",
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        metadata: JSON.stringify({ connectedAt: new Date().toISOString(), connectedBy: session.userId }),
      },
    });
    
    await prisma.auditLog.create({
      data: {
        organizationId: session.orgId,
        userId: session.userId,
        event: "INTEGRATION_CONNECTED",
        entityType: "Integration",
        entityId: `hubspot:${session.orgId}`,
        metadata: JSON.stringify({ provider: "HUBSPOT" }),
      },
    });
    
    logger.audit("INTEGRATION_CONNECTED", session.orgId, session.userId, { provider: "HUBSPOT" });
    
    return NextResponse.redirect(`${appUrl}/integrations?success=hubspot_connected`);
  } catch (e: any) {
    logger.error("HubSpot OAuth callback failed", { error: e.message });
    return NextResponse.redirect(`${appUrl}/integrations?error=${encodeURIComponent(e.message)}`);
  }
}
