import crypto from "crypto";
import twilio from "twilio";
import { MessageLog } from "@/models/MessageLog";
import { logger } from "@/lib/logger";
import type { IPool } from "@/models/Pool";
import type { IPlan } from "@/models/Plan";

// ── Encryption helpers ──────────────────────────────────────────────────────
// AES-256-GCM: authenticated encryption — tamper-evident + confidential

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error("[TwilioService] ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars). Run: openssl rand -hex 32");
    }
    return Buffer.from(key, "hex");
}

export function encryptToken(plainText: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

    const encrypted = Buffer.concat([
        cipher.update(plainText, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Pack: ciphertext + authTag (16 bytes) into one hex string
    return {
        encrypted: Buffer.concat([encrypted, authTag]).toString("hex"),
        iv: iv.toString("hex"),
    };
}

export function decryptToken(encryptedHex: string, ivHex: string): string {
    const iv = Buffer.from(ivHex, "hex");
    const data = Buffer.from(encryptedHex, "hex");

    // Last 16 bytes are the GCM auth tag
    const authTag = data.slice(data.length - 16);
    const ciphertext = data.slice(0, data.length - 16);

    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}

// ── Per-pool Twilio client factory ──────────────────────────────────────────

export function getTwilioClient(pool: IPool): twilio.Twilio {
    if (!pool.twilio?.sid || !pool.twilio?.authToken_encrypted || !pool.twilio?.iv) {
        throw new Error(`[TwilioService] Pool ${pool.poolId} has no Twilio credentials`);
    }
    const authToken = decryptToken(pool.twilio.authToken_encrypted, pool.twilio.iv);
    return twilio(pool.twilio.sid, authToken);
}

// ── Send WhatsApp message for a pool ────────────────────────────────────────

interface MemberRef {
    _id: any;
    phone: string;
    name: string;
}

interface MessageData {
    text: string;
    mediaUrl?: string | null;
}

export async function sendWhatsAppForPool(
    pool: IPool,
    member: MemberRef,
    messageData: MessageData,
    type: "before_expiry" | "after_expiry"
): Promise<boolean> {
    const client = getTwilioClient(pool);
    const from = pool.twilio!.whatsappNumber;

    // Ensure E.164 format with whatsapp: prefix
    const rawPhone = member.phone.replace(/\D/g, "");
    const toBase = rawPhone.startsWith("91") && rawPhone.length === 12
        ? `+${rawPhone}`
        : `+91${rawPhone}`;
    const to = toBase.startsWith("whatsapp:") ? toBase : `whatsapp:${toBase}`;

    let status: "sent" | "failed" = "sent";
    let errorMsg: string | undefined;

    try {
        const msgParams: any = {
            from,
            to,
            body: messageData.text,
        };
        if (messageData.mediaUrl) {
            msgParams.mediaUrl = [messageData.mediaUrl];
        }

        await client.messages.create(msgParams);
        logger.info("[TwilioService] Message sent", { poolId: pool.poolId, memberId: member._id, type });
    } catch (err: any) {
        status = "failed";
        errorMsg = err?.message || String(err);
        logger.error("[TwilioService] Message failed", { poolId: pool.poolId, memberId: member._id, type, error: errorMsg });
    }

    // Log every attempt
    await MessageLog.create({
        poolId: pool.poolId,
        memberId: member._id,
        phone: member.phone,
        type,
        message: messageData.text,
        mediaUrl: messageData.mediaUrl ?? undefined,
        status,
        error: errorMsg,
    });

    return status === "sent";
}
