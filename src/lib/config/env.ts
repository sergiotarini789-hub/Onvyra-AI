import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters").optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
  OPENAI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  HUBSPOT_CLIENT_ID: z.string().optional(),
  HUBSPOT_CLIENT_SECRET: z.string().optional(),
  HUBSPOT_REDIRECT_URI: z.string().url().optional(),
  HUBSPOT_SCOPES: z.string().default("crm.objects.contacts.read crm.objects.deals.read"),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),
  STRIPE_BUSINESS_PRICE_ID: z.string().optional(),
  STRIPE_PRICE_ID_PRO: z.string().optional(),
  STRIPE_PRICE_ID_BUSINESS: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  SENTRY_DSN: z.string().optional(),
  CSRF_SECRET: z.string().optional(),
  ENABLE_DEMO_MODE: z.coerce.boolean().default(true),
  ENABLE_BILLING: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function validateEnv(): Env {
  if (cachedEnv) return cachedEnv;
  
  // Support AUTH_SECRET alias for JWT_SECRET
  if (!process.env.JWT_SECRET && process.env.AUTH_SECRET) {
    process.env.JWT_SECRET = process.env.AUTH_SECRET;
  }
  
  // Production requires either JWT_SECRET or AUTH_SECRET
  if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET && !process.env.AUTH_SECRET) {
    throw new Error("Environment validation failed:\nJWT_SECRET or AUTH_SECRET: Required in production (min 32 chars)");
  }
  
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    const errors = parsed.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("\n");
    if (process.env.NODE_ENV === "production") {
      // If only JWT_SECRET missing but AUTH_SECRET present, allow
      const hasAuthSecret = !!process.env.AUTH_SECRET;
      const onlyJwtMissing = parsed.error.errors.length === 1 && parsed.error.errors[0].path[0] === "JWT_SECRET" && hasAuthSecret;
      if (onlyJwtMissing) {
        // Will be handled by fallback below
      } else {
        throw new Error(`Environment validation failed:\n${errors}`);
      }
    } else {
      console.warn(`[env] Validation warnings:\n${errors}`);
      // In dev, return with defaults where possible
      cachedEnv = {
        DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
        JWT_SECRET: process.env.JWT_SECRET || process.env.AUTH_SECRET || "onvyra-dev-secret-change-in-prod-32chars-min",
        AUTH_SECRET: process.env.AUTH_SECRET,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
        BCRYPT_ROUNDS: 12,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        NODE_ENV: (process.env.NODE_ENV as any) || "development",
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
        OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        OPENAI_TIMEOUT_MS: 30000,
        OPENAI_MAX_RETRIES: 2,
        HUBSPOT_CLIENT_ID: process.env.HUBSPOT_CLIENT_ID,
        HUBSPOT_CLIENT_SECRET: process.env.HUBSPOT_CLIENT_SECRET,
        HUBSPOT_REDIRECT_URI: process.env.HUBSPOT_REDIRECT_URI,
        HUBSPOT_SCOPES: process.env.HUBSPOT_SCOPES || "crm.objects.contacts.read crm.objects.deals.read",
        TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
        STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID || process.env.STRIPE_PRICE_ID_PRO,
        STRIPE_BUSINESS_PRICE_ID: process.env.STRIPE_BUSINESS_PRICE_ID || process.env.STRIPE_PRICE_ID_BUSINESS,
        STRIPE_PRICE_ID_PRO: process.env.STRIPE_PRICE_ID_PRO || process.env.STRIPE_PRO_PRICE_ID,
        STRIPE_PRICE_ID_BUSINESS: process.env.STRIPE_PRICE_ID_BUSINESS || process.env.STRIPE_BUSINESS_PRICE_ID,
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
        LOG_LEVEL: (process.env.LOG_LEVEL as any) || "info",
        SENTRY_DSN: process.env.SENTRY_DSN,
        CSRF_SECRET: process.env.CSRF_SECRET,
        ENABLE_DEMO_MODE: process.env.ENABLE_DEMO_MODE !== "false",
        ENABLE_BILLING: process.env.ENABLE_BILLING === "true",
      };
      return cachedEnv;
    }
  }
  
  cachedEnv = parsed.data;
  return cachedEnv;
}

export function getEnv(): Env {
  if (!cachedEnv) return validateEnv();
  return cachedEnv;
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === "production";
}

export function isDatabasePostgres(): boolean {
  const url = getEnv().DATABASE_URL;
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

export function requireEnv(key: keyof Env): string {
  const env = getEnv();
  const value = env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value as string;
}
