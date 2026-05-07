import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
// Fail the build/startup instantly if missing critical env 
import "./lib/env";

const nextConfig: NextConfig = {
  // Gzip all responses — important for JSON API payloads
  compress: true,
  // Remove X-Powered-By: Next.js header — prevents server fingerprinting
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "exceljs",
      "@radix-ui/react-icons",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
    ],
  },

  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90],
    deviceSizes: [640, 828, 1080],
    minimumCacheTTL: 86400, // 24 hours — photos don't change often
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          // X-XSS-Protection intentionally omitted — deprecated by all modern browsers,
          // causes false security confidence, and can open XSS vectors in IE.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
      {
        // API routes must never be CDN-cached
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
      {
        // Next.js static assets — immutable, content-hashed filenames
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Public static files (favicon, manifest, etc.)
        source: "/(.*)\\.(ico|png|jpg|jpeg|svg|webp|woff2|woff)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        // Content Security Policy — restricts script/resource origins
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-inline' needed for Next.js inline scripts; 'unsafe-eval' only in dev for HMR
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com`,
              `connect-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://upstash.io https://*.sentry.io${process.env.NEXT_PUBLIC_APP_URL ? " " + process.env.NEXT_PUBLIC_APP_URL : ""}`,
              "img-src 'self' data: blob: https://res.cloudinary.com",
              "frame-src https://checkout.razorpay.com",
              "frame-ancestors 'none'",
              "media-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "worker-src 'self' blob:",
            ].join("; "),
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self 'https://checkout.razorpay.com'), usb=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // ── Sentry Build Options ────────────────────────────────────────────
  // Suppress noisy build output
  silent: true,

  // Upload source maps for readable stack traces in Sentry
  // Requires SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT env vars in CI
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Tree-shake unused Sentry integrations for smaller client bundles
  disableLogger: true,

  // Automatically instrument Next.js data-fetching & API routes
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
});

