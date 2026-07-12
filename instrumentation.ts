/**
 * Next.js Instrumentation Hook
 * ─────────────────────────────
 * Called once when the Next.js server starts.
 * Registers Sentry for the correct runtime (Node.js or Edge).
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Skip in development — Sentry is disabled there anyway (enabled: NODE_ENV !== 'development'
  // in sentry.*.config.ts) and Turbopack dev mode cannot statically resolve these imports.
  if (process.env.NODE_ENV === "development") return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Sentry automatically captures unhandled errors from API routes,
 * Server Components, and SSR via the withSentryConfig wrapper in
 * next.config.ts (autoInstrumentServerFunctions: true).
 */
