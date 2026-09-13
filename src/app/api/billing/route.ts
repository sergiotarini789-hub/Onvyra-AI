import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanForOrganization, PLAN_LIMITS, PLAN_PRICES, getOrganizationUsage, isStripeConfigured, getPlanFeatures } from "@/lib/billing";
import { stripeClient, getStripePriceId } from "@/lib/billing/stripe";
import { rateLimit, getRateLimitHeaders, getClientIp } from "@/lib/security/rate-limit";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    const org = await prisma.organization.findUnique({ where: { id: session.orgId } });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    
    const plan = getPlanForOrganization(org);
    const limits = PLAN_LIMITS[plan];
    const usage = await getOrganizationUsage(prisma, session.orgId);
    
    const subscription = await prisma.subscription.findFirst({
      where: { organizationId: session.orgId },
      orderBy: { createdAt: "desc" },
    }).catch(() => null);
    
    // Get current period usage
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const usageRecord = await prisma.usage.findUnique({
      where: { organizationId_period: { organizationId: session.orgId, period } },
    }).catch(() => null);
    
    return NextResponse.json({
      plan,
      limits,
      prices: PLAN_PRICES,
      features: getPlanFeatures(plan),
      usage,
      usageRecord,
      subscription: subscription ? {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      } : null,
      billingConfigured: isStripeConfigured(),
      org: {
        id: org.id,
        name: org.name,
        billingPlan: org.billingPlan,
        stripeCustomerId: org.stripeCustomerId ? `${org.stripeCustomerId.slice(0, 8)}...` : null, // Don't expose full ID
      },
    });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    logger.error("Failed to get billing", { error: e.message });
    return NextResponse.json({ error: "Failed to fetch billing" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    
    const ip = getClientIp(request);
    const rl = rateLimit(`billing:${session.orgId}`, "api_default");
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: getRateLimitHeaders(rl) });
    }
    
    const body = await request.json().catch(() => ({}));
    const { plan } = body;
    
    if (!plan || !["PRO", "BUSINESS"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan. Must be PRO or BUSINESS" }, { status: 400 });
    }
    
    const org = await prisma.organization.findUnique({ where: { id: session.orgId } });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    
    // Check if already on that plan
    if (org.billingPlan === plan) {
      return NextResponse.json({ error: `Already on ${plan} plan` }, { status: 400 });
    }
    
    const priceId = getStripePriceId(plan as any);
    if (!priceId && isStripeConfigured()) {
      return NextResponse.json({ error: `Price ID not configured for ${plan}. Set STRIPE_${plan}_PRICE_ID` }, { status: 400 });
    }
    
    if (!isStripeConfigured()) {
      // In dev without Stripe, allow manual plan upgrade for testing
      if (process.env.NODE_ENV !== "production") {
        await prisma.organization.update({
          where: { id: session.orgId },
          data: { billingPlan: plan },
        });
        
        await prisma.auditLog.create({
          data: {
            organizationId: session.orgId,
            userId: session.userId,
            event: "BILLING_PLAN_CHANGED",
            entityType: "Organization",
            entityId: session.orgId,
            metadata: JSON.stringify({ from: org.billingPlan, to: plan, method: "manual-dev" }),
          },
        });
        
        logger.billing("Plan changed (dev manual)", session.orgId, { from: org.billingPlan, to: plan });
        
        return NextResponse.json({ success: true, plan, devMode: true, message: `Plan changed to ${plan} (dev mode, no payment)` }, { headers: getRateLimitHeaders(rl) });
      }
      
      return NextResponse.json({ error: "Billing integration not configured", notConfigured: true }, { status: 400 });
    }
    
    // Create Stripe checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const result = await stripeClient.createCheckoutSession({
      orgId: session.orgId,
      plan: plan as any,
      userId: session.userId,
      successUrl: `${appUrl}/billing?success=1&plan=${plan}`,
      cancelUrl: `${appUrl}/billing?canceled=1`,
      customerId: org.stripeCustomerId || undefined,
    });
    
    if (result.notConfigured || result.error) {
      return NextResponse.json({ error: result.error, notConfigured: result.notConfigured }, { status: 400 });
    }
    
    await prisma.auditLog.create({
      data: {
        organizationId: session.orgId,
        userId: session.userId,
        event: "BILLING_CHECKOUT_STARTED",
        entityType: "Organization",
        entityId: session.orgId,
        metadata: JSON.stringify({ plan, priceId }),
      },
    });
    
    return NextResponse.json({ checkoutUrl: result.url }, { headers: getRateLimitHeaders(rl) });
  } catch (e: any) {
    if (e.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    logger.error("Billing checkout failed", { error: e.message });
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
