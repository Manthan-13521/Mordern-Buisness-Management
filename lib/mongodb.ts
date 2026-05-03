import mongoose from 'mongoose'
import '@/lib/env'

/**
 * Atlas M0 free tier: max 500 total connections across all functions.
 * Keep maxPoolSize=5 so even a spike of 100 concurrent serverless calls stays safe.
 * Deploy Vercel in `bom1` (Mumbai) + Atlas in `ap-south-1` (Mumbai) to keep RTT low.
 */
const MONGODB_URI = process.env.MONGODB_URI!
if (!MONGODB_URI) throw new Error('MONGODB_URI is not defined')

interface Cached { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
declare global { var _mongooseCache: Cached | undefined }
const cached: Cached = global._mongooseCache ?? { conn: null, promise: null }
global._mongooseCache = cached

export async function dbConnect() {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: process.env.NODE_ENV === "production" ? 20 : 5,
      minPoolSize: process.env.NODE_ENV === "production" ? 3 : 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      maxIdleTimeMS: 30000,        // Kill idle connections — critical for free tier
    }).catch(err => {
      cached.promise = null;       // Reset on failure so next request retries
      throw err;
    })
  }
  cached.conn = await cached.promise
  return cached.conn
}
