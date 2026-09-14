/**
 * Token encryption at rest for OAuth tokens
 * In production, use proper key management (KMS, Vault, etc.)
 */

import crypto from "crypto";

function getEncryptionKey(): Buffer | null {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!keyHex) return null;
  
  try {
    // Support hex (64 chars = 32 bytes) or base64
    if (/^[0-9a-fA-F]{64}$/.test(keyHex)) {
      return Buffer.from(keyHex, "hex");
    }
    // Try base64
    const buf = Buffer.from(keyHex, "base64");
    if (buf.length === 32) return buf;
    // If raw string is 32 chars, use it directly (dev only)
    if (keyHex.length >= 32) {
      return crypto.createHash("sha256").update(keyHex).digest();
    }
    return null;
  } catch {
    return null;
  }
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) {
    // In dev without encryption key, return plaintext with marker
    // In production this should fail
    if (process.env.NODE_ENV === "production") {
      throw new Error("TOKEN_ENCRYPTION_KEY required in production");
    }
    console.warn("[encryption] No TOKEN_ENCRYPTION_KEY set, storing plaintext (dev only)");
    return `plain:${plaintext}`;
  }
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptToken(encryptedValue: string): string {
  if (encryptedValue.startsWith("plain:")) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Plaintext token found in production");
    }
    return encryptedValue.slice(6);
  }
  
  const key = getEncryptionKey();
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY required to decrypt");
  }
  
  const [ivHex, authTagHex, encrypted] = encryptedValue.split(":");
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted token format");
  }
  
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

export function isTokenEncrypted(value: string): boolean {
  return !value.startsWith("plain:") && value.split(":").length === 3;
}

// For OAuth state parameter - prevents CSRF
export function generateOAuthState(orgId: string): string {
  const random = crypto.randomBytes(16).toString("hex");
  const payload = `${orgId}:${Date.now()}:${random}`;
  const key = process.env.JWT_SECRET || "dev-secret";
  const hmac = crypto.createHmac("sha256", key).update(payload).digest("hex");
  return Buffer.from(`${payload}:${hmac}`).toString("base64url");
}

export function verifyOAuthState(state: string, expectedOrgId: string): { valid: boolean; orgId?: string; error?: string } {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length < 4) return { valid: false, error: "Invalid state format" };
    
    const orgId = parts[0];
    const timestamp = parseInt(parts[1], 10);
    const random = parts[2];
    const receivedHmac = parts.slice(3).join(":");
    
    if (orgId !== expectedOrgId) {
      return { valid: false, error: "Organization mismatch" };
    }
    
    // Check expiry - 10 minutes
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      return { valid: false, error: "State expired" };
    }
    
    const payload = `${orgId}:${timestamp}:${random}`;
    const key = process.env.JWT_SECRET || "dev-secret";
    const expectedHmac = crypto.createHmac("sha256", key).update(payload).digest("hex");
    
    if (receivedHmac !== expectedHmac) {
      return { valid: false, error: "Invalid signature" };
    }
    
    return { valid: true, orgId };
  } catch (e) {
    return { valid: false, error: "Failed to verify state" };
  }
}
