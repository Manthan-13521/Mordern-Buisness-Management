import crypto from "crypto";

/**
 * AES-256-GCM Aadhaar Encryption Utility
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses authenticated encryption so any tampered ciphertext is rejected.
 * Supports key versioning: each encrypted string is prefixed with `v{n}:` so
 * future key rotations do not require immediate re-encryption of all records.
 *
 * Env vars:
 *   AADHAAR_ENCRYPTION_KEY   – 32 hex-encoded bytes (64 hex chars), required
 *   AADHAAR_KEY_VERSION      – integer key version label (default "1")
 *
 * Example generate:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const KEY_VERSION = process.env.AADHAAR_KEY_VERSION || "1";
const KEY_ENV = process.env.AADHAAR_ENCRYPTION_KEY;

function getKey(): Buffer {
    if (!KEY_ENV || KEY_ENV.length !== 64) {
        throw new Error(
            "[Aadhaar] AADHAAR_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). " +
            "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        );
    }
    return Buffer.from(KEY_ENV, "hex");
}

/**
 * Encrypts a plaintext Aadhaar number.
 * Returns a versioned ciphertext string: `v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 */
export function encryptAadhaar(plaintext: string): string {
    if (!plaintext) return plaintext;

    const key = getKey();
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag(); // 16-byte auth tag

    return `v${KEY_VERSION}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a versioned ciphertext produced by encryptAadhaar().
 * Returns the original plaintext or throws if tampered / invalid.
 */
export function decryptAadhaar(ciphertext: string): string {
    if (!ciphertext) return ciphertext;

    // If value doesn't look like our format, return as-is (legacy plaintext — should be re-encrypted)
    if (!ciphertext.startsWith("v")) return ciphertext;

    const parts = ciphertext.split(":");
    if (parts.length !== 4) {
        throw new Error("[Aadhaar] Invalid ciphertext format");
    }

    const [_version, ivHex, authTagHex, encryptedHex] = parts;
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encryptedData = Buffer.from(encryptedHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}

/**
 * Returns a masked version for display/export purposes.
 * e.g. "1234-5678-9012" → "XXXX-XXXX-9012"
 *      "123456789012"   → "XXXXXXXX9012"
 */
export function maskAadhaar(plaintext: string): string {
    if (!plaintext) return "";
    const digits = plaintext.replace(/\D/g, "");
    if (digits.length !== 12) return "XXXX-XXXX-XXXX";
    return `XXXX-XXXX-${digits.slice(8)}`;
}

/**
 * Safely decrypts and masks for display/export (never exposes full number).
 */
export function maskEncryptedAadhaar(ciphertext: string | undefined | null): string {
    if (!ciphertext) return "";
    try {
        const plain = decryptAadhaar(ciphertext);
        return maskAadhaar(plain);
    } catch {
        return "XXXX-XXXX-XXXX";
    }
}
