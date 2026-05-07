/**
 * Sentry edge-runtime configuration.
 * Loaded via instrumentation.ts → register() when NEXT_RUNTIME === 'edge'.
 * Captures errors from Edge middleware and Edge API routes.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // ── Sampling ──────────────────────────────────────────────────────────
  // TODO: Reduce to 0.1 after 2 weeks of stable production data
  tracesSampleRate: 1.0,

  // ── Environment ───────────────────────────────────────────────────────
  environment: process.env.NODE_ENV,

  // ── Debug ─────────────────────────────────────────────────────────────
  debug: false,

  // Disable in development
  enabled: process.env.NODE_ENV !== "development",
});
