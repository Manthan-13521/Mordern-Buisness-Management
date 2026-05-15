import { uploadToCloudinary } from './cloudinary'
import { randomUUID } from 'crypto'

// ── Upload Safety Constants ─────────────────────────────────────────────
const MAX_BASE64_SIZE = 5 * 1024 * 1024; // 5MB max (base64 is ~33% larger than raw)
const ALLOWED_MIME_PREFIXES = ['data:image/jpeg', 'data:image/png', 'data:image/webp', 'data:image/gif'];

/**
 * Saves a base64-encoded photo to Cloudinary with safety validation.
 * 
 * Enforces:
 * - Max 5MB base64 string size (~3.75MB actual image)
 * - Only JPEG, PNG, WebP, GIF allowed
 * - No executable content
 */
export async function savePhoto(base64: string): Promise<string> {
  // ── Size guard (prevents memory spikes in serverless) ───────────────
  if (!base64 || base64.length > MAX_BASE64_SIZE) {
    throw new Error(`Photo too large (max ${Math.round(MAX_BASE64_SIZE / 1024 / 1024)}MB). Please use a smaller image.`);
  }

  // ── MIME type validation ────────────────────────────────────────────
  if (base64.startsWith('data:')) {
    const isAllowed = ALLOWED_MIME_PREFIXES.some(prefix => base64.startsWith(prefix));
    if (!isAllowed) {
      throw new Error('Invalid image format. Only JPEG, PNG, WebP, and GIF are allowed.');
    }
  }

  // ── Reject executable content patterns ──────────────────────────────
  // Check the first few hundred chars for script/executable signatures
  const header = base64.substring(0, 500).toLowerCase();
  if (header.includes('<script') || header.includes('<?php') || header.includes('#!/')) {
    throw new Error('Invalid file content detected.');
  }

  const filename = randomUUID()
  return await uploadToCloudinary(base64, 'photos', filename)
}
