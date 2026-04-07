import nodemailer from "nodemailer";
import { logger } from "./logger";

async function getTransporter() {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS; // Should be Gmail App Password

    if (!user || !pass) {
        logger.error("[EmailService] Missing SMTP credentials (SMTP_USER, SMTP_PASS)");
        throw new Error("Email service configuration incomplete.");
    }

    const isProduction = process.env.NODE_ENV === "production";
    
    // Default to port 587 (STARTTLS) if not explicitly 465 (SSL/TLS)
    // Production recommendation for Gmail is often 465 for implicit SSL
    const secure = port === 465;

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: {
            // This fixes the "self-signed certificate" error common with some SMTP relays
            rejectUnauthorized: false,
        },
    });

    // Verify connection on creation to catch configuration issues early
    try {
        await transporter.verify();
        logger.info(`[EmailService] SMTP Transporter verified successfully (${host}:${port})`);
    } catch (error: any) {
        logger.error("[EmailService] SMTP Verification failed", {
            host,
            port,
            error: error?.message,
        });
        throw error;
    }

    return transporter;
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const appName = "AquaSync";
    const expiryMinutes = 5;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Password Reset OTP</title>
</head>
<body style="margin:0;padding:0;background:#020617;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#020617;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:linear-gradient(135deg,rgba(59,130,246,0.08),rgba(139,92,246,0.08));border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:40px;box-shadow:0 25px 50px rgba(0,0,0,0.5);">
          
          <!-- Logo / Brand -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:linear-gradient(135deg,#3B82F6,#8B5CF6);border-radius:16px;margin-bottom:16px;">
                <span style="font-size:24px;">🔐</span>
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${appName}</h1>
              <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">SaaS Management Platform</p>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td style="padding-bottom:24px;">
              <h2 style="margin:0;font-size:20px;font-weight:600;color:#e2e8f0;text-align:center;">Password Reset Request</h2>
              <p style="margin:8px 0 0;font-size:14px;color:#94a3b8;text-align:center;line-height:1.6;">
                We received a request to reset your password. Use the OTP below — it expires in <strong style="color:#e2e8f0;">${expiryMinutes} minutes</strong>.
              </p>
            </td>
          </tr>

          <!-- OTP Box -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:24px 40px;display:inline-block;">
                <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;text-align:center;">Your One-Time Password</p>
                <p style="margin:0;font-size:40px;font-weight:800;letter-spacing:12px;color:#ffffff;text-align:center;font-family:'Courier New',monospace;">${otp}</p>
              </div>
            </td>
          </tr>

          <!-- Security Notes -->
          <tr>
            <td style="padding-bottom:28px;">
              <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px 20px;">
                <p style="margin:0;font-size:13px;font-weight:600;color:#f87171;margin-bottom:8px;">⚠️ Security Notice</p>
                <ul style="margin:0;padding-left:16px;color:#94a3b8;font-size:13px;line-height:1.8;">
                  <li>This OTP is valid for <strong style="color:#e2e8f0;">${expiryMinutes} minutes</strong> only</li>
                  <li>Maximum <strong style="color:#e2e8f0;">5 attempts</strong> before it is locked</li>
                  <li><strong style="color:#e2e8f0;">Never share</strong> this OTP with anyone</li>
                  <li>If you didn't request this, <strong style="color:#e2e8f0;">ignore this email</strong>. Your account is safe.</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="border-top:1px solid rgba(255,255,255,0.08);padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
                This is an automated message from <strong style="color:#64748b;">${appName}</strong>.<br/>
                Do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const text = `
${appName} — Password Reset OTP

Your one-time password: ${otp}

This OTP expires in ${expiryMinutes} minutes.
Maximum 5 attempts before it is locked.

If you did not request this, please ignore this email. Your account remains secure.

— ${appName} Security Team
    `.trim();

    const transporter = await getTransporter();
    try {
        await transporter.sendMail({
            from: `"${appName} Security" <${from}>`,
            to,
            subject: `[${appName}] Your Password Reset OTP — ${otp}`,
            text,
            html,
        });
        logger.info(`[EmailService] OTP email sent successfully to ${to}`);
    } catch (error: any) {
        logger.error("[EmailService] Failed to send OTP email", {
            to,
            error: error?.message,
        });
        throw error;
    }
}
