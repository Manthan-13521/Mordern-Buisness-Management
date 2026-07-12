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
    // @ts-ignore - Turbopack requires the explicit .ts extension here to avoid 'MODULE_UNPARSABLE' 
    // errors with Sentry's valueInjectionLoader in Next.js 16.
    await import("./sentry.server.config.ts");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // @ts-ignore - Turbopack requires the explicit .ts extension here to avoid 'MODULE_UNPARSABLE'
    // errors with Sentry's valueInjectionLoader in Next.js 16.
    await import("./sentry.edge.config.ts");
  }
}

/**
 * Sentry automatically captures unhandled errors from API routes,
 * Server Components, and SSR via the withSentryConfig wrapper in
 * next.config.ts (autoInstrumentServerFunctions: true).
 */
