/**
 * Security headers and CSRF protection
 */

export function getSecurityHeaders(): Record<string, string> {
  return {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-XSS-Protection": "1; mode=block",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    // CSP - strict but allows Next.js inline styles and self
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval needed for Next.js dev, unsafe-inline for styles
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.openai.com https://api.hubapi.com https://api.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
    ...(process.env.NODE_ENV === "production" ? {
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    } : {}),
  };
}

export function generateCsrfToken(): string {
  // Simple CSRF token - in production use proper crypto
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function validateCsrfToken(request: Request, expectedToken: string): boolean {
  const headerToken = request.headers.get("x-csrf-token");
  const cookieToken = request.headers.get("cookie")?.match(/csrf_token=([^;]+)/)?.[1];
  const token = headerToken || cookieToken;
  if (!token || !expectedToken) return false;
  return token === expectedToken;
}

export function sanitizeErrorForClient(error: unknown): { message: string; code: string } {
  // Never expose internal errors, stack traces, or secrets
  if (error instanceof Error) {
    // Check for known safe errors
    const safeMessages = [
      "Invalid credentials",
      "Unauthorized",
      "Forbidden",
      "Not found",
      "Validation failed",
      "Rate limit exceeded",
      "Organization not found",
      "Lead not found",
      "Campaign not found",
    ];
    
    for (const safe of safeMessages) {
      if (error.message.includes(safe)) {
        return { message: error.message, code: "CLIENT_ERROR" };
      }
    }
    
    // Log full error server-side but return generic to client
    console.error("[error]", error.message);
    return { message: "An internal error occurred. Please try again.", code: "INTERNAL_ERROR" };
  }
  
  return { message: "An unexpected error occurred", code: "UNKNOWN_ERROR" };
}
