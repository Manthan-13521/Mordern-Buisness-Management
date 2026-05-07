import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/csp-report
 * Receives Content-Security-Policy violation reports and logs them to Sentry.
 * This endpoint is referenced by the CSP report-uri directive.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const report = body["csp-report"] || body;

        logger.warn("[CSP Violation]", {
            blockedUri: report["blocked-uri"],
            documentUri: report["document-uri"],
            violatedDirective: report["violated-directive"],
            effectiveDirective: report["effective-directive"],
            originalPolicy: report["original-policy"],
            sourceFile: report["source-file"],
            lineNumber: report["line-number"],
        });

        return NextResponse.json({ received: true }, { status: 200 });
    } catch {
        return NextResponse.json({ received: true }, { status: 200 });
    }
}
