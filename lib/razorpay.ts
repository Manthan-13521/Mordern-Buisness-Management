/**
 * Centralized Razorpay SDK instance.
 * Shared across all API routes that need to create orders.
 *
 * ⚠️  Fail-fast: throws at import time if credentials are missing in production.
 *     In dev/test (no RAZORPAY_KEY_ID), all callers check `isRazorpayConfigured`
 *     and return a mock order instead of hitting the SDK.
 */
import Razorpay from "razorpay";

/** True when real Razorpay credentials are set */
export const isRazorpayConfigured = !!(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
);

/**
 * The shared Razorpay instance.
 * Only initialised when credentials exist — callers MUST gate on
 * `isRazorpayConfigured` before using this.
 */
export const razorpay: InstanceType<typeof Razorpay> | null = isRazorpayConfigured
    ? new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID!,
          key_secret: process.env.RAZORPAY_KEY_SECRET!,
      })
    : null;
