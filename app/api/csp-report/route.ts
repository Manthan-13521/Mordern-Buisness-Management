import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requestContext } from "@/lib/requestContext";

/**
 * POST /api/csp-report
 * Receives Content-Security-Policy violation reports and logs them to Sentry.
 * This endpoint is referenced by the CSP report-uri directive.
 */
export async function POST(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "POST";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
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
        });
            
}
