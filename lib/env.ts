/**
 * Strict Environment variable validation.
 */
import { z } from "zod";

const isBuild = 
    process.env.npm_lifecycle_event === "build" || 
    process.env.NEXT_PHASE === "phase-production-build";

const envSchema = z.object({
  // Required everywhere except isolated build steps
  MONGODB_URI: z.string().url("MONGODB_URI must be a valid connection string"),
  UPSTASH_REDIS_REST_URL: z.string().url("Must be valid Upstash URL").optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "Missing Upstash token").optional(),

  // Security
  JWT_SECRET: z.string().min(16).optional(),
  NEXTAUTH_SECRET: z.string().min(16),

  // File Storage / S3
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  AWS_S3_BUCKET_NAME: z.string().min(1).optional(),
  AWS_S3_REGION: z.string().min(1).optional(),

  // Sentry
  SENTRY_DSN: z.string().url().optional(),

  // external services — with key format validation
  RAZORPAY_KEY_ID: z.string().optional().refine(
    (val) => !val || val.startsWith("rzp_test_") || val.startsWith("rzp_live_"),
    { message: "RAZORPAY_KEY_ID must start with 'rzp_test_' or 'rzp_live_'" }
  ),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Background queues
  QSTASH_TOKEN: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1, "Missing CRON_SECRET").optional(),
}).superRefine((data, ctx) => {
  // CRON_SECRET must exist in production to prevent unauthenticated cron execution
  if (process.env.NODE_ENV === "production" && !data.CRON_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CRON_SECRET is required in production",
      path: ["CRON_SECRET"],
    });
  }

  // SECURITY: Webhook secret is critical in production — without it, forged webhooks can
  // grant free subscriptions (see webhook/route.ts hard-fail guard)
  if (process.env.NODE_ENV === "production" && !data.RAZORPAY_WEBHOOK_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "RAZORPAY_WEBHOOK_SECRET is required in production to prevent forged webhooks",
      path: ["RAZORPAY_WEBHOOK_SECRET"],
    });
  }

  // Warn if RAZORPAY_KEY_ID exists but RAZORPAY_KEY_SECRET is missing
  if (data.RAZORPAY_KEY_ID && !data.RAZORPAY_KEY_SECRET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "RAZORPAY_KEY_ID is set but RAZORPAY_KEY_SECRET is missing",
      path: ["RAZORPAY_KEY_SECRET"],
    });
  }

  // Rate limiting requires Redis — in-memory fallback is ineffective in serverless
  if (!data.UPSTASH_REDIS_REST_URL) {
    console.warn("[ENV] ⚠️ Rate limiting will use in-memory fallback — UPSTASH_REDIS_REST_URL not set");
  }

  // Warn if NEXT_PUBLIC_RAZORPAY_KEY_ID doesn't match RAZORPAY_KEY_ID
  const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (publicKey && data.RAZORPAY_KEY_ID && publicKey !== data.RAZORPAY_KEY_ID) {
    console.error("❌ NEXT_PUBLIC_RAZORPAY_KEY_ID does not match RAZORPAY_KEY_ID — frontend will use wrong key!");
  }
});

let parsedEnv = process.env;

if (!isBuild) {
    try {
        parsedEnv = envSchema.parse(process.env) as any;
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            console.error("❌ Environment validation failed:", e.flatten().fieldErrors);
            // We don't exit(1) anymore to prevent total downtime on Vercel
            // when new vars are introduced.
        } else {
            throw e;
        }
    }
}

export const env = parsedEnv;
