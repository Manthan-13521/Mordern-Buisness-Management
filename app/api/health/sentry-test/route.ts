import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/health/sentry-test
 * 
 * Sends a test exception to Sentry to verify the integration is working.
 * Returns 200 with a confirmation message.
 * 
 * ⚠️  Use sparingly — this creates a real error event in your Sentry dashboard.
 *     Should be called once after setup, or when debugging Sentry connectivity.
 */
export async function GET() {
  try {
    // Deliberately throw to verify Sentry captures it
    throw new Error("[Sentry Test] Manual verification from /api/health/sentry-test");
  } catch (error) {
    Sentry.captureException(error);
    await Sentry.flush(2000); // wait up to 2s for event to be sent

    return NextResponse.json(
      {
        status: "ok",
        message: "Test error sent to Sentry. Check your Sentry dashboard.",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
