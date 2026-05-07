/**
 * Sentry edge-runtime configuration.
 * Loaded via instrumentation.ts → register() when NEXT_RUNTIME === 'edge'.
 * Captures errors from Edge middleware and Edge API routes.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // ── Sampling ──────────────────────────────────────────────────────────
  // 10% sampling in production to avoid Sentry quota exhaustion
  tracesSampleRate: 0.1,

  // ── Environment ───────────────────────────────────────────────────────
  environment: process.env.NODE_ENV,

  // ── Debug ─────────────────────────────────────────────────────────────
  debug: false,

  // Disable in development
  enabled: process.env.NODE_ENV !== "development",
});
