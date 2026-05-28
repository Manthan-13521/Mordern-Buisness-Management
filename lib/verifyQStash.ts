import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";

/**
 * ── QStash Signature Verification ──────────────────────────────────────
 * Validates that incoming worker requests originate from Upstash QStash.
 * Returns null if verification passes, or a 401 NextResponse if it fails.
 *
 * Usage:
 *   const err = await verifyQStashSignature(req);
 *   if (err) return err;
 *
 * Required env vars:
 *   QSTASH_CURRENT_SIGNING_KEY
 *   QSTASH_NEXT_SIGNING_KEY
 */

let _receiver: InstanceType<typeof Receiver> | null = null;

function getReceiver(): InstanceType<typeof Receiver> | null {
    if (_receiver) return _receiver;

    const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

    if (!currentSigningKey || !nextSigningKey) {
        console.warn("[QStash] Signing keys not configured — worker auth disabled");
        return null;
    }

    _receiver = new Receiver({
        currentSigningKey,
        nextSigningKey,
    });
    return _receiver;
}

/**
 * Verify QStash signature on an incoming request.
 * Returns null if the request is valid, or a 401 NextResponse if not.
 *
 * When signing keys are not configured (dev environment), the check is
 * skipped with a warning — this allows local development without QStash.
 */
export async function verifyQStashSignature(req: Request): Promise<NextResponse | null> {
    const receiver = getReceiver();

    // In development without signing keys, skip verification with warning
    if (!receiver) {
        if (process.env.NODE_ENV === "production") {
            console.error("[QStash] CRITICAL: Signing keys not configured in production — rejecting request");
            return NextResponse.json(
                { error: "Worker endpoint not configured" },
                { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } }
            );
        }
        return null; // Allow in development
    }

    const signature = req.headers.get("upstash-signature");
    if (!signature) {
        return NextResponse.json(
            { error: "Unauthorized — missing QStash signature" },
            { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } }
        );
    }

    try {
        // QStash Receiver.verify() needs the raw body as a string
        const body = await req.clone().text();
        const isValid = await receiver.verify({
            signature,
            body,
        });

        if (!isValid) {
            return NextResponse.json(
                { error: "Unauthorized — invalid QStash signature" },
                { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } }
            );
        }

        return null; // Verification passed
    } catch (err: any) {
        console.error("[QStash] Signature verification failed:", err?.message);
        return NextResponse.json(
            { error: "Unauthorized — signature verification failed" },
            { status: 401, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } }
        );
    }
}
