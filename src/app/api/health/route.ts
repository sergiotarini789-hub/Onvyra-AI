import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEnv, isDatabasePostgres } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const start = Date.now();
  
  const checks: Record<string, { status: "ok" | "error"; latencyMs?: number; error?: string; details?: any }> = {};
  
  // Database check
  try {
    const dbStart = Date.now();
    // Simple query that works with both real and fallback
    await prisma.organization.count().catch(() => prisma.lead.count({ where: { organizationId: "health-check" } }));
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart, details: { provider: isDatabasePostgres() ? "postgresql" : "sqlite-fallback" } };
  } catch (e: any) {
    checks.database = { status: "error", error: e.message };
  }
  
  // Env check
  try {
    const env = getEnv();
    checks.env = {
      status: "ok",
      details: {
        nodeEnv: env.NODE_ENV,
        databaseProvider: isDatabasePostgres() ? "postgresql" : "sqlite",
        billingConfigured: !!env.STRIPE_SECRET_KEY,
        hubspotConfigured: !!env.HUBSPOT_CLIENT_ID,
        openaiConfigured: !!env.OPENAI_API_KEY,
        demoMode: env.ENABLE_DEMO_MODE,
      },
    };
  } catch (e: any) {
    checks.env = { status: "error", error: e.message };
  }
  
  // Memory check
  try {
    const mem = process.memoryUsage();
    checks.memory = {
      status: mem.heapUsed > 500 * 1024 * 1024 ? "error" : "ok",
      details: {
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        rssMb: Math.round(mem.rss / 1024 / 1024),
      },
    };
  } catch (e: any) {
    checks.memory = { status: "error", error: e.message };
  }
  
  const allOk = Object.values(checks).every(c => c.status === "ok");
  const totalLatency = Date.now() - start;
  
  return NextResponse.json({
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    uptime: process.uptime ? Math.round(process.uptime()) : undefined,
    latencyMs: totalLatency,
    checks,
  }, {
    status: allOk ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
