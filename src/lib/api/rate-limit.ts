type RateLimitResult = { allowed: boolean; retryAfterSeconds: number }

const buckets = new Map<string, number[]>()

function pruneIfNeeded(): void {
  if (buckets.size > 1000) {
    const now = Date.now()
    for (const [key, timestamps] of buckets) {
      if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > 10 * 60 * 1000) {
        buckets.delete(key)
      }
    }
  }
}

export function checkRateLimit(bucket: string, ip: string, limit: number, windowMs: number): RateLimitResult {
  const key = `${bucket}:${ip}`
  const now = Date.now()
  const timestamps = (buckets.get(key) || []).filter((t) => now - t < windowMs)

  if (timestamps.length >= limit) {
    const oldest = timestamps[0]
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000))
    buckets.set(key, timestamps)
    pruneIfNeeded()
    return { allowed: false, retryAfterSeconds }
  }

  timestamps.push(now)
  buckets.set(key, timestamps)
  pruneIfNeeded()
  return { allowed: true, retryAfterSeconds: 0 }
}

export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}
