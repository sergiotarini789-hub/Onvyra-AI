/**
 * Prisma client wrapper with automatic fallback for dev environment
 * - In production with DATABASE_URL postgres: uses real Prisma client
 * - In dev/sandbox with file: or when Prisma binary unavailable: uses SQLite fallback
 * 
 * Financial correctness: All monetary values stored as Decimal(15,2) in Postgres
 * to avoid floating-point errors. Fallback uses REAL but converts via safe helpers.
 */

import fallback from "./prisma-fallback";

let prismaClient: any = null;
let usingFallback = false;

// Try to load real Prisma client if DATABASE_URL is postgres
// The sandbox blocks binaries.prisma.sh, so this will fail in dev - that's expected
function getPrismaClient(): any {
  if (prismaClient) return prismaClient;
  
  const dbUrl = process.env.DATABASE_URL || "";
  const isPostgres = dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://");
  const isProduction = process.env.NODE_ENV === "production";
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  
  // Production must use PostgreSQL, never silently fall back - but allow build phase to succeed for CI
  // Build phase check: Next.js sets NEXT_PHASE=phase-production-build during `next build`
  // We allow fallback during build with warning, but runtime will throw
  if (isProduction && !isPostgres && !isBuildPhase) {
    throw new Error(
      "PRODUCTION_DATABASE_REQUIRED: DATABASE_URL must be PostgreSQL in production. " +
      "Set DATABASE_URL=postgresql://... . SQLite fallback is only allowed in development. " +
      "During build, this is allowed but runtime will fail."
    );
  }
  
  if (isPostgres) {
    try {
      // Dynamically import to avoid bundling issues
      // eslint-disable-next-line
      const { PrismaClient } = require("@prisma/client");
      prismaClient = new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });
      usingFallback = false;
      if (!isProduction) {
        console.log("[prisma] Using real PostgreSQL client");
      }
      return prismaClient;
    } catch (e) {
      if (isProduction && !isBuildPhase) {
        // In production runtime, fail loudly, never fallback
        throw new Error(`Failed to initialize PostgreSQL client in production: ${(e as Error).message}`);
      }
      console.warn("[prisma] Failed to init real client, using fallback:", (e as Error).message);
      usingFallback = true;
    }
  } else {
    usingFallback = true;
    if (isProduction && !isBuildPhase) {
      // During build, allow fallback with warning, but runtime check above will throw
      console.warn("[prisma] WARNING: Using SQLite fallback in production build. Runtime will require PostgreSQL.");
    }
  }
  
  prismaClient = fallback;
  return prismaClient;
}

// Export fallback as default for now to ensure sandbox compatibility
// In production, getPrismaClient() will return real client
export const prisma = getPrismaClient() as any;
export default prisma;

// Helper to check if using fallback
export function isUsingFallback(): boolean {
  return usingFallback;
}

// Transaction helper that works with both real and fallback
export async function withTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
  const client = getPrismaClient();
  if (client.$transaction) {
    return client.$transaction(fn);
  }
  // Fallback doesn't support real transactions, just execute
  return fn(client);
}

// Financial helpers for Decimal safety
export function toDecimal(value: number | null | undefined): any {
  if (value === null || value === undefined) return null;
  // Ensure 2 decimal precision, avoid float errors
  return Math.round(value * 100) / 100;
}

export function fromDecimal(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && value.toNumber) {
    return value.toNumber();
  }
  return Number(value);
}

export function calculatePotentialRevenue(dealValue: number | null, probability: number | null): number | null {
  if (dealValue === null || dealValue === undefined) return null;
  if (probability === null || probability === undefined) return null;
  if (dealValue < 0) return null;
  if (probability < 0 || probability > 1) return null;
  // Use integer arithmetic to avoid float errors
  const cents = Math.round(dealValue * 100);
  const result = Math.round(cents * probability) / 100;
  return Math.round(result * 100) / 100;
}

export function validateMonetaryAmount(value: number | null | undefined, fieldName: string): { valid: boolean; error?: string; value?: number | null } {
  if (value === null || value === undefined) return { valid: true, value: null };
  if (typeof value !== "number" || isNaN(value)) return { valid: false, error: `${fieldName} must be a valid number` };
  if (!isFinite(value)) return { valid: false, error: `${fieldName} must be finite` };
  if (value < 0) return { valid: false, error: `${fieldName} cannot be negative` };
  if (value > 9999999999999.99) return { valid: false, error: `${fieldName} exceeds maximum allowed` };
  // Round to 2 decimals
  const rounded = Math.round(value * 100) / 100;
  return { valid: true, value: rounded };
}
