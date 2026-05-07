/**
 * Sentry server-side configuration.
 * Loaded via instrumentation.ts → register() when NEXT_RUNTIME === 'nodejs'.
 * Captures unhandled exceptions in API routes, server components, and SSR.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // ── Sampling ──────────────────────────────────────────────────────────
  // TODO: Reduce to 0.1 after 2 weeks of stable production data
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0, // TODO: Disable after stable launch

  // ── Environment ───────────────────────────────────────────────────────
  environment: process.env.NODE_ENV,

  // ── Debug ─────────────────────────────────────────────────────────────
  debug: false,

  // Disable in development
  enabled: process.env.NODE_ENV !== "development",
});
