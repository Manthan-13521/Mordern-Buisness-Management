import { LRUCache } from 'lru-cache'

export const rateLimitCache = new LRUCache({
  max: 500,
  ttl: 60000, // 1 minute
})

export function checkRateLimit(ip: string, endpoint: string, limit: number): boolean {
  const key = `${endpoint}:${ip}`
  const current = (rateLimitCache.get(key) as number) || 0
  
  if (current >= limit) return false
  
  rateLimitCache.set(key, current + 1)
  return true
}

export function getClientIp(req: Request): string {
    return (
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        req.headers.get("x-real-ip") ||
        "unknown"
    );
}
