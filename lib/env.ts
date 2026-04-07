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
  UPSTASH_REDIS_REST_URL: z.string().url("Must be valid Upstash URL"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "Missing Upstash token"),

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

  // external services
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Background queues
  QSTASH_TOKEN: z.string().min(1).optional(),
});

let parsedEnv = process.env;

if (!isBuild) {
    try {
        parsedEnv = envSchema.parse(process.env) as any;
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            console.error("❌ Invalid environment variables:", e.flatten().fieldErrors);
            process.exit(1);
        }
        throw e;
    }
}

export const env = parsedEnv;
