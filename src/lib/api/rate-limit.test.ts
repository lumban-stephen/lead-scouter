import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkRateLimit } from './rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows up to the limit and blocks the next request', () => {
    const bucket = `test-${Math.random()}`
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(bucket, '1.2.3.4', 5, 60_000)
      expect(result.allowed).toBe(true)
    }
    const blocked = checkRateLimit(bucket, '1.2.3.4', 5, 60_000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('tracks separate IPs independently', () => {
    const bucket = `test-${Math.random()}`
    for (let i = 0; i < 3; i++) {
      checkRateLimit(bucket, 'ip-a', 3, 60_000)
    }
    const blockedA = checkRateLimit(bucket, 'ip-a', 3, 60_000)
    const allowedB = checkRateLimit(bucket, 'ip-b', 3, 60_000)
    expect(blockedA.allowed).toBe(false)
    expect(allowedB.allowed).toBe(true)
  })

  it('allows requests again after the window expires', () => {
    const bucket = `test-${Math.random()}`
    const ip = 'ip-expiry'
    for (let i = 0; i < 2; i++) {
      checkRateLimit(bucket, ip, 2, 1000)
    }
    expect(checkRateLimit(bucket, ip, 2, 1000).allowed).toBe(false)

    vi.advanceTimersByTime(1500)

    expect(checkRateLimit(bucket, ip, 2, 1000).allowed).toBe(true)
  })
})
