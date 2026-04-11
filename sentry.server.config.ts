/**
 * Sentry server-side configuration.
 * Loaded via instrumentation.ts → register() when NEXT_RUNTIME === 'nodejs'.
 * Captures unhandled exceptions in API routes, server components, and SSR.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // ── Sampling ──────────────────────────────────────────────────────────
  tracesSampleRate: 0.2,

  // ── Environment ───────────────────────────────────────────────────────
  environment: process.env.NODE_ENV,

  // ── Debug ─────────────────────────────────────────────────────────────
  debug: false,

  // Disable in development
  enabled: process.env.NODE_ENV !== "development",
});
