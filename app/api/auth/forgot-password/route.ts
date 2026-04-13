import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { PasswordReset } from "@/models/PasswordReset";
import { sendOtpEmail } from "@/lib/emailService";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// ── In-memory rate limiter (email-based) ──────────────────────────────────────
// Max 3 requests per email per 15 minutes
const RL_MAX = 3;
const RL_WINDOW_MS = 15 * 60 * 1000;
const rlMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
    const now = Date.now();
    const rec = rlMap.get(key);
    if (!rec || now > rec.resetAt) {
        rlMap.set(key, { count: 1, resetAt: now + RL_WINDOW_MS });
        return true;
    }
    if (rec.count >= RL_MAX) return false;
    rec.count += 1;
    return true;
}

// Generic response — always the same regardless of outcome (prevents email enumeration)
const GENERIC_MSG = "If an account with that email exists, an OTP has been sent.";

// Artificial delay: prevents timing-based email enumeration (attacker can't distinguish
// "email not found" from "email found" by measuring response time)
function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
    // Fixed 150ms base delay — always runs, even on early returns
    const baseDelay = delay(150);

    try {
        const body = await req.json().catch(() => ({}));
        const rawEmail = (body?.email || "").trim().toLowerCase();

        if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
            await baseDelay;
            return NextResponse.json({ message: GENERIC_MSG }, { status: 200 });
        }

        // Rate limit by email
        if (!checkRateLimit(rawEmail)) {
            await baseDelay;
            return NextResponse.json(
                { error: "Too many reset requests. Please wait 15 minutes before trying again." },
                { status: 429 }
            );
        }

        await Promise.all([dbConnect(), baseDelay]);

        // ── Look up user by email in DB (the ONLY source of truth for email) ──
        const user = await User.findOne({ email: rawEmail }).lean();

        if (!user) {
            // Do NOT reveal that the email wasn't found
            logger.audit({
                type: "PASSWORD_RESET_REQUESTED",
                meta: { email: rawEmail, found: false },
            });
            return NextResponse.json({ message: GENERIC_MSG }, { status: 200 });
        }

        // ── Generate 6-digit numeric OTP ──
        // crypto.randomInt is cryptographically secure
        const otp = String(crypto.randomInt(100000, 999999));
        const otpHash = await bcrypt.hash(otp, 12);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // ── Upsert: replaces any existing OTP for this user (resend invalidates old OTP) ──
        await PasswordReset.findOneAndUpdate(
            { userId: user.id },
            {
                userId:    user.id,
                email:     user.email,  // Always use the DB email, never the frontend input
                otpHash,
                expiresAt,
                attempts:  0,
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        // ── Send OTP to the DB-matched email only ──
        try {
            await sendOtpEmail(user.email, otp);
        } catch (emailErr: any) {
            logger.error("[ForgotPassword] Email send failed", {
                userId: user.id.toString(),
                error: emailErr?.message,
            });
            // Don't reveal email sending errors to the client
            return NextResponse.json({ message: GENERIC_MSG }, { status: 200 });
        }

        logger.audit({
            type:   "PASSWORD_RESET_REQUESTED",
            userId: user.id.toString(),
            meta:   { email: user.email, found: true, status: "otp_sent" },
        });

        return NextResponse.json({ message: GENERIC_MSG }, { status: 200 });
    } catch (error: any) {
        await baseDelay;
        logger.error("[ForgotPassword] Unexpected error", { error: error?.message });
        return NextResponse.json({ message: GENERIC_MSG }, { status: 200 });
    }
}
