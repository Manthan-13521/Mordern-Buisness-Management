/**
 * Sentry client-side configuration.
 * This file is loaded automatically by @sentry/nextjs via instrumentation hooks.
 * It initialises Sentry in the browser for capturing unhandled exceptions,
 * promise rejections, and performance data from real users.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // ── Sampling ──────────────────────────────────────────────────────────
  // Capture 100% of errors; sample 20% of transactions for performance.
  // Tune tracesSampleRate down in high-traffic production.
  tracesSampleRate: 0.2,

  // ── Environment ───────────────────────────────────────────────────────
  environment: process.env.NODE_ENV,

  // ── Debug (dev only) ──────────────────────────────────────────────────
  debug: false,

  // ── Session Replay (optional — enable if you have a Replay quota) ─────
  // integrations: [Sentry.replayIntegration({ maskAllText: true })],
  // replaysSessionSampleRate: 0.1,
  // replaysOnErrorSampleRate: 1.0,

  // ── Filter out noisy errors ───────────────────────────────────────────
  ignoreErrors: [
    // Browser extensions & network noise
    "ResizeObserver loop",
    "Non-Error promise rejection captured",
    /Loading chunk \d+ failed/,
    /Network request failed/,
  ],

  // Disable Sentry entirely in development if you prefer silence:
  enabled: process.env.NODE_ENV !== "development",
});
