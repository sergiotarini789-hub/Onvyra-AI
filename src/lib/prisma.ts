/**
 * Prisma client wrapper with fallback to native SQLite implementation
 * Uses Node's built-in sqlite (experimental) when Prisma binary download fails
 */

import fallback from "./prisma-fallback";

// For now, always use fallback to ensure environment compatibility
// Real Prisma client would require binary download which fails in this sandbox
// The fallback implements the same API surface used in the app
// To use real Prisma in production, set DATABASE_URL to postgres and ensure prisma generate succeeds

export const prisma = fallback as any;
export default fallback as any;
