/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: process.env.NODE_ENV === "production" 
        ? [process.env.NEXT_PUBLIC_APP_URL || "https://onvyra.ai"] 
        : ["*"]
    }
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { 
            key: "Content-Security-Policy", 
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.openai.com https://api.hubapi.com https://api.stripe.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; ")
          },
          ...(process.env.NODE_ENV === "production" ? [
            { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }
          ] : []),
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
};

module.exports = nextConfig;
