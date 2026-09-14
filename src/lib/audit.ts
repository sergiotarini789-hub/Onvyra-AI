import { prisma } from "./prisma";

export type AuditEvent =
  | "USER_REGISTERED"
  | "USER_LOGIN"
  | "IMPORT_STARTED"
  | "IMPORT_COMPLETED"
  | "LEAD_CREATED"
  | "LEAD_UPDATED"
  | "CAMPAIGN_CREATED"
  | "MESSAGE_GENERATED"
  | "RECOVERY_CONTACTED"
  | "RECOVERY_OUTCOME_UPDATED"
  | "RECOVERY_CONFIRMED"
  | "RECOVERY_OPPORTUNITY_VIEWED"
  | "AI_RECOMMENDATION_GENERATED"
  | "RECOVERY_INBOX_VIEWED"
  | "DEMO_SEEDED"
  | "DEMO_CLEARED";

export async function logAudit(params: {
  organizationId: string;
  userId?: string | null;
  event: AuditEvent | string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
}) {
  try {
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
    console.warn("Audit log failed", e);
    // Never break main flow due to audit failure
  }
}
