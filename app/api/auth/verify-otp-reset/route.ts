import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import { User } from "@/models/User";
import { PasswordReset } from "@/models/PasswordReset";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const { email, otp, newPassword } = body;

        // Basic input validation
        if (!email || !otp || !newPassword) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters." },
                { status: 400 }
            );
        }

        await dbConnect();

        // ── Fetch user by email to get userId ──────────────────────────────────
        // We never trust the frontend to tell us which PasswordReset record to use.
        // We validate the email → get userId → find the reset record by userId.
        const user = await User.findOne({ email: normalizedEmail }).lean();

        if (!user) {
            logger.audit({
                type: "PASSWORD_RESET_FAILED",
                meta: { email: normalizedEmail, reason: "user_not_found" },
            });
            return NextResponse.json(
                { error: "Invalid or expired OTP. Please request a new one." },
                { status: 400 }
            );
        }

        // ── Fetch PasswordReset record by userId (not email alone) ─────────────
        const resetRecord = await PasswordReset.findOne({ userId: user._id });

        if (!resetRecord) {
            logger.audit({
                type:   "PASSWORD_RESET_FAILED",
                userId: user._id.toString(),
                meta:   { email: normalizedEmail, reason: "no_reset_record" },
            });
            return NextResponse.json(
                { error: "Invalid or expired OTP. Please request a new one." },
                { status: 400 }
            );
        }

        // ── Check expiry ───────────────────────────────────────────────────────
        if (new Date() > resetRecord.expiresAt) {
            await PasswordReset.deleteOne({ userId: user._id });
            logger.audit({
                type:   "PASSWORD_RESET_FAILED",
                userId: user._id.toString(),
                meta:   { email: normalizedEmail, reason: "otp_expired" },
            });
            return NextResponse.json(
                { error: "OTP has expired. Please request a new one." },
                { status: 400 }
            );
        }

        // ── Check attempt count ────────────────────────────────────────────────
        if (resetRecord.attempts >= MAX_ATTEMPTS) {
            logger.audit({
                type:   "PASSWORD_RESET_FAILED",
                userId: user._id.toString(),
                meta:   { email: normalizedEmail, reason: "max_attempts_exceeded" },
            });
            return NextResponse.json(
                { error: "Too many incorrect attempts. Please request a new OTP." },
                { status: 429 }
            );
        }

        // ── Verify OTP (constant-time comparison via bcrypt) ──────────────────
        const isValid = await bcrypt.compare(otp.toString().trim(), resetRecord.otpHash);

        if (!isValid) {
            // Increment attempts
            await PasswordReset.updateOne(
                { userId: user._id },
                { $inc: { attempts: 1 } }
            );

            const remaining = MAX_ATTEMPTS - (resetRecord.attempts + 1);
            logger.audit({
                type:   "PASSWORD_RESET_FAILED",
                userId: user._id.toString(),
                meta:   { email: normalizedEmail, reason: "invalid_otp", attemptsRemaining: remaining },
            });

            return NextResponse.json(
                {
                    error: remaining > 0
                        ? `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`
                        : "Too many incorrect attempts. Please request a new OTP."
                },
                { status: 400 }
            );
        }

        // ── OTP is valid — hash and update password ────────────────────────────
        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        await User.updateOne(
            { _id: user._id },
            { $set: { passwordHash: newPasswordHash } }
        );

        // ── Delete the PasswordReset record (single-use, invalidate immediately) ──
        await PasswordReset.deleteOne({ userId: user._id });

        // ── Session invalidation: update a version field so all existing JWT tokens
        //    become stale. Since we use JWT sessions (not DB sessions), we track
        //    passwordChangedAt. Middleware/auth can compare token.iat to this field.
        //    For now we store it on the user — can be used in future auth checks.
        await User.updateOne(
            { _id: user._id },
            { $set: { passwordChangedAt: new Date() } }
        );

        logger.audit({
            type:   "PASSWORD_RESET_SUCCESS",
            userId: user._id.toString(),
            meta:   { email: normalizedEmail },
        });

        return NextResponse.json(
            { message: "Password reset successfully. You can now sign in with your new password." },
            { status: 200 }
        );
    } catch (error: any) {
        logger.error("[VerifyOtpReset] Unexpected error", { error: error?.message });
        return NextResponse.json(
            { error: "An unexpected error occurred. Please try again." },
            { status: 500 }
        );
    }
}
