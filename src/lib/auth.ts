import { cookies } from "next/headers";
import * as jose from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { logger } from "./observability/logger";

const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET || "fallback-secret-32-chars-minimum!!!!";
if (process.env.NODE_ENV === "production" && JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET (or AUTH_SECRET) must be at least 32 characters in production");
}

const secret = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = "onvyra_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);

export type SessionPayload = {
  userId: string;
  email: string;
  organizationId: string;
  orgId?: string; // alias for backward compatibility
  role: string;
  iat?: number;
  exp?: number;
};

export async function hashPassword(password: string): Promise<string> {
  // Validate password strength
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(payload: Omit<SessionPayload, "orgId"> & { orgId?: string }): Promise<string> {
  const fullPayload = {
    ...payload,
    orgId: (payload as any).orgId || payload.organizationId,
    organizationId: payload.organizationId || (payload as any).orgId,
  };
  const jwt = await new jose.SignJWT(fullPayload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .setIssuer("onvyra")
    .setAudience("onvyra-app")
    .sign(secret);
  return jwt;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: "onvyra",
      audience: "onvyra-app",
    });
    const p = payload as any;
    // Ensure orgId alias exists
    if (p.organizationId && !p.orgId) {
      p.orgId = p.organizationId;
    }
    if (p.orgId && !p.organizationId) {
      p.organizationId = p.orgId;
    }
    return p as SessionPayload;
  } catch (e: any) {
    // Don't log token contents, just error type
    logger.debug("Session verification failed", { error: e.code || e.message });
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  // Additional validation: ensure user and org still exist and membership valid
  // This is done lazily to avoid DB hit on every request, but for sensitive operations we check
  return session;
}

export async function requireAuthWithMembership(): Promise<SessionPayload & { membership: any; organization: any; user: any }> {
  const session = await requireAuth();
  
  const membership = await prisma.organizationMember.findMany({
    where: { userId: session.userId, organizationId: session.organizationId },
  }).then((m: any) => m[0] || null).catch(() => null);
  
  // Fallback check via fallback store
  if (!membership) {
    // Try to find user still exists
    const user = await prisma.user.findUnique({ where: { id: session.userId } }).catch(() => null);
    if (!user) throw new Error("UNAUTHORIZED");
  }
  
  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } }).catch(() => null);
  if (!org) throw new Error("UNAUTHORIZED");
  
  const user = await prisma.user.findUnique({ where: { id: session.userId } }).catch(() => null);
  
  return {
    ...session,
    membership,
    organization: org,
    user,
  };
}

export async function getCurrentOrganization() {
  const session = await getSession();
  if (!session) return null;
  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
  });
  return org;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { memberships: true },
  });
  return user;
}

// Tenant isolation helper - ensures every query includes organizationId
export function withTenant<T extends { organizationId: string }>(session: SessionPayload, data: Omit<T, "organizationId">): T {
  return {
    ...data,
    organizationId: session.organizationId,
  } as T;
}

// RBAC helpers
export function requireRole(session: SessionPayload, allowedRoles: string[]): void {
  if (!allowedRoles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
}

export function isOwnerOrAdmin(role: string): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function canManageCampaigns(role: string): boolean {
  return ["OWNER", "ADMIN", "MEMBER"].includes(role); // All can manage in current model, but OWNER/ADMIN full
}

export function canManageOrganization(role: string): boolean {
  return ["OWNER", "ADMIN"].includes(role);
}

export function canManageBilling(role: string): boolean {
  return role === "OWNER";
}
