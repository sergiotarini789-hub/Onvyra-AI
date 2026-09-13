/**
 * Rate limiting with in-memory store (production should use Redis)
 * Protects AI, imports, auth, CRM endpoints
 */

type RateLimitConfig = {
  windowMs: number;
  max: number;
};

const configs: Record<string, RateLimitConfig> = {
  ai: { windowMs: 60_000, max: 20 }, // 20 AI calls per minute per org
  ai_evaluate: { windowMs: 60_000, max: 100 }, // batch evaluation
  import_parse: { windowMs: 60_000, max: 10 },
  import_confirm: { windowMs: 60_000, max: 10 },
  auth_login: { windowMs: 15 * 60_000, max: 10 }, // 10 login attempts per 15 min per IP
  auth_register: { windowMs: 60 * 60_000, max: 5 }, // 5 registrations per hour per IP
  crm_sync: { windowMs: 60_000, max: 5 },
  crm_fetch: { windowMs: 60_000, max: 30 },
  api_default: { windowMs: 60_000, max: 100 },
};

type Entry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Entry>();

function cleanup() {
  const now = Date.now();
  const entries = Array.from(store.entries());
  for (const [key, entry] of entries) {
    if (entry.resetAt < now) store.delete(key);
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanup, 5 * 60 * 1000);
}

export function rateLimit(key: string, type: keyof typeof configs = "api_default"): { allowed: boolean; remaining: number; resetAt: number; limit: number } {
  const config = configs[type] || configs.api_default;
  const now = Date.now();
  const storeKey = `${type}:${key}`;
  
  let entry = store.get(storeKey);
  
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    store.set(storeKey, entry);
  }
  
  entry.count++;
  
  const allowed = entry.count <= config.max;
  const remaining = Math.max(0, config.max - entry.count);
  
  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
    limit: config.max,
  };
}

export function getRateLimitHeaders(result: ReturnType<typeof rateLimit>) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function rateLimitByOrgAndIp(orgId: string | null, ip: string | null, type: keyof typeof configs): { allowed: boolean; remaining: number; resetAt: number; limit: number } {
  // Combine org and IP for more robust limiting
  const key = orgId ? `org:${orgId}` : ip ? `ip:${ip}` : "unknown";
  return rateLimit(key, type);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
