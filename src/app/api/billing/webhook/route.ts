import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, parseStripeEvent, handleStripeEvent } from "@/lib/billing/stripe";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!secret) {
    logger.error("Stripe webhook called but STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    logger.security("Stripe webhook missing signature");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  
  const payload = await request.text();
  
  // Verify signature
  const verification = verifyWebhookSignature(payload, signature, secret);
  if (!verification.valid) {
    logger.security("Stripe webhook invalid signature", { error: verification.error });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  
  const event = parseStripeEvent(payload);
  if (!event) {
    logger.error("Failed to parse Stripe event");
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  
  // Idempotency: check if event already processed
  try {
    const existingLog = await prisma.auditLog.findMany({
      where: {
        event: "STRIPE_WEBHOOK",
        entityId: event.id,
      },
      take: 1,
    }).catch(() => []);
    
    if (existingLog && existingLog.length > 0) {
      logger.info("Stripe webhook already processed", { eventId: event.id });
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch {}
  
  // Log webhook receipt (no secrets)
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: event.data.object.metadata?.organizationId || "unknown",
        event: "STRIPE_WEBHOOK",
        entityType: "StripeEvent",
        entityId: event.id,
        metadata: JSON.stringify({ type: event.type, created: event.created }),
      },
    }).catch(() => {});
  } catch {}
  
  // Handle event
  try {
    const result = await handleStripeEvent(prisma, event);
    
    if (!result.handled) {
      logger.warn("Stripe webhook not handled", { eventId: event.id, type: event.type, error: result.error });
      // Return 200 anyway to prevent Stripe retries for unhandled but valid events
      return NextResponse.json({ received: true, handled: false, error: result.error });
    }
    
    logger.billing("Stripe webhook handled", event.data.object.metadata?.organizationId || "unknown", { eventId: event.id, type: event.type });
    
    return NextResponse.json({ received: true, handled: true });
  } catch (e: any) {
    logger.error("Stripe webhook handling failed", { eventId: event.id, error: e.message });
    // Return 500 to trigger Stripe retry for transient failures
    return NextResponse.json({ error: "Failed to handle event" }, { status: 500 });
  }
}
