/**
 * Product Analytics Events
 * Simple server-side event tracking for business outcomes
 * Events: IMPORT_COMPLETED, OPPORTUNITY_VIEWED, AI_RECOMMENDATION_GENERATED, MESSAGE_GENERATED, CONTACTED, OUTCOME_RECORDED, CONFIRMED
 */

export type AnalyticsEvent =
  | "IMPORT_COMPLETED"
  | "OPPORTUNITY_VIEWED"
  | "AI_RECOMMENDATION_GENERATED"
  | "MESSAGE_GENERATED"
  | "CONTACTED"
  | "OUTCOME_RECORDED"
  | "CONFIRMED"
  | "RECOVERY_OPPORTUNITY_VIEWED"
  | "CAMPAIGN_CREATED"
  | "LEAD_VIEWED";

type TrackParams = {
  organizationId: string;
  userId?: string | null;
  event: AnalyticsEvent;
  entityType?: string;
  entityId?: string;
  metadata?: any;
};

export async function trackEvent(params: TrackParams) {
  try {
    // In production, send to analytics provider (PostHog, Mixpanel, etc)
    // For MVP, log and store in AuditLog with special prefix
    console.log(`[Analytics] ${params.event}`, {
      org: params.organizationId,
      user: params.userId,
      entity: params.entityType,
      id: params.entityId,
      meta: params.metadata,
    });

    // Optionally also store via prisma if available
    const { prisma } = await import("./prisma");
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId || null,
        event: params.event,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (e) {
    // Never break main flow
    console.warn("[Analytics] Failed to track", e);
  }
}
