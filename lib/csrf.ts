/**
 * CSRF Token utilities — Edge Runtime compatible (Web Crypto API only).
 * No Node.js 'crypto' module import.
 *
 * Token format: base64url(timestamp) + "." + base64url(HMAC-SHA256 signature)
 * Max age: 24 hours.
 */

function getSecret(): string {
    const secret = process.env.NEXTAUTH_SECRET || process.env.CSRF_SECRET;
    if (!secret) {
        throw new Error("[Security] NEXTAUTH_SECRET or CSRF_SECRET must be set for CSRF protection.");
    }
    return secret;
}

async function importKey(secret: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    return crypto.subtle.importKey(
        "raw",
        enc.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    );
}

function toBase64Url(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

/**
 * Generate a CSRF token (async, Edge-safe).
 * Format: timestamp.hmac-sha256-signature
 */
export async function generateCSRFToken(): Promise<string> {
    const timestamp = Date.now().toString();
    const key = await importKey(getSecret());
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(timestamp));
    return `${timestamp}.${toBase64Url(sig)}`;
}

/**
 * Verify a CSRF token (async, Edge-safe).
 * Checks format, HMAC signature, and expiry (24 h).
 */
export async function verifyCSRFToken(token: string): Promise<boolean> {
    if (!token || typeof token !== "string") return false;

    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const [timestamp, signature] = parts;
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts)) return false;

    // Token expires after 24 hours
    const MAX_AGE_MS = 24 * 60 * 60 * 1000;
    if (Date.now() - ts > MAX_AGE_MS) return false;

    try {
        const key = await importKey(getSecret());
        const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(timestamp));

        // Decode incoming signature
        const incomingSig = Uint8Array.from(
            atob(signature.replace(/-/g, "+").replace(/_/g, "/")),
            (c) => c.charCodeAt(0)
        );

        // Constant-time comparison via subtle.verify
        return await crypto.subtle.verify("HMAC", key, incomingSig, new TextEncoder().encode(timestamp));
    } catch {
        return false;
    }
}
