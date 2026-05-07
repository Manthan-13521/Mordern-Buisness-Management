import mongoose from 'mongoose'
import '@/lib/env'

/**
 * Atlas M10+ tier required for 500-user concurrency target.
 * M10 supports 1500 max connections. With maxPoolSize=25 and ~20 realistic
 * concurrent Vercel instances, peak usage ≈ 500 connections (safe margin).
 * Deploy Vercel in `bom1` (Mumbai) + Atlas in `ap-south-1` (Mumbai) to keep RTT low.
 */
const MONGODB_URI = process.env.MONGODB_URI!
if (!MONGODB_URI) throw new Error('MONGODB_URI is not defined')

interface Cached { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
declare global { var _mongooseCache: Cached | undefined }
const cached: Cached = global._mongooseCache ?? { conn: null, promise: null }
global._mongooseCache = cached

export async function dbConnect() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 25,             // 500-user target: ~20 instances × 25 = 500 (safe for Atlas M10 1500 limit)
      minPoolSize: 5,              // Pre-warm 5 connections to eliminate cold-start latency spikes
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,      // Allow long aggregations to complete
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      maxIdleTimeMS: 60000,        // 60s idle timeout — longer to reuse connections under sustained load
    }).catch(err => {
      cached.promise = null;       // Reset on failure so next request retries
      throw err;
    })
  }
  cached.conn = await cached.promise
  return cached.conn
}
