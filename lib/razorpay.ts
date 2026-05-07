/**
 * Centralized Razorpay SDK instance.
 * Shared across all API routes that need to create orders.
 *
 * ⚠️  Safe init: wraps constructor in try/catch so a bad key never crashes the module.
 *     Exports diagnostic info so callers can surface the exact failure.
 */
import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID || "";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
const publicKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

// ── Diagnostic flags ─────────────────────────────────────────────────────────
export const razorpayDiagnostics = {
    keyExists:       !!keyId,
    secretExists:    !!keySecret,
    publicKeyExists: !!publicKeyId,
    keyPrefix:       keyId.substring(0, 9) || "MISSING",       // "rzp_test_" or "rzp_live_"
    publicKeyPrefix: publicKeyId.substring(0, 9) || "MISSING",
    keysMatch:       keyId === publicKeyId,
    isTestMode:      keyId.startsWith("rzp_test_"),
    isLiveMode:      keyId.startsWith("rzp_live_"),
    nodeEnv:         process.env.NODE_ENV || "unknown",
    initError:       null as string | null,
    initSuccess:     false,
};

/** True when real Razorpay credentials are set */
export const isRazorpayConfigured = !!(keyId && keySecret);

// ── Boot-time warnings ───────────────────────────────────────────────────────
if (typeof process !== "undefined" && process.env) {
    if (!isRazorpayConfigured) {
        console.warn("[Razorpay] ⚠️  RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing — running in MOCK mode");
    } else {
        // Key format validation
        if (!keyId.startsWith("rzp_test_") && !keyId.startsWith("rzp_live_")) {
            console.error("[Razorpay] ❌ RAZORPAY_KEY_ID has invalid format. Expected 'rzp_test_*' or 'rzp_live_*', got prefix:", keyId.substring(0, 9));
        }
        // Warn about test/live mismatch with NODE_ENV
        if (process.env.NODE_ENV === "production" && keyId.startsWith("rzp_test_")) {
            console.warn("[Razorpay] ⚠️  Using TEST keys in production — payments will be in test mode");
        }
        if (process.env.NODE_ENV !== "production" && keyId.startsWith("rzp_live_")) {
            console.warn("[Razorpay] ⚠️  Using LIVE keys in development — real charges will occur!");
        }
        // Warn if public key differs from server key
        if (publicKeyId && publicKeyId !== keyId) {
            console.error("[Razorpay] ❌ NEXT_PUBLIC_RAZORPAY_KEY_ID does not match RAZORPAY_KEY_ID — frontend/backend key mismatch!");
        }
    }
}

/**
 * The shared Razorpay instance.
 * Wrapped in try/catch — if constructor throws (bad key format, etc.),
 * razorpay will be null and razorpayDiagnostics.initError will have the reason.
 */
let _razorpay: InstanceType<typeof Razorpay> | null = null;

if (isRazorpayConfigured) {
    try {
        _razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });
        razorpayDiagnostics.initSuccess = true;
        console.info(`[Razorpay] ✅ SDK initialized successfully (${razorpayDiagnostics.isTestMode ? "TEST" : "LIVE"} mode)`);
    } catch (err: any) {
        razorpayDiagnostics.initError = err?.message || "Unknown SDK constructor error";
        console.error("[Razorpay] ❌ SDK initialization FAILED:", razorpayDiagnostics.initError);
        _razorpay = null;
    }
}

export const razorpay = _razorpay;
