"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global crash boundary triggered:", error);
    try {
        Sentry.captureException(error);
    } catch {}
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">System Degradation</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We encountered a critical runtime issue while processing your request. The engineering team has been notified automatically.
            </p>
          </div>
          <button
            onClick={() => reset()}
            className="w-full h-11 bg-zinc-100 hover:bg-white text-zinc-900 font-medium rounded-lg transition-colors focus:ring-4 focus:ring-zinc-100/20"
          >
            Attempt Recovery
          </button>
        </div>
      </body>
    </html>
  );
}
