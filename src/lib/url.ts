export function normalizeUrl(input: string): string {
  let trimmed = input.trim()
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    trimmed = `https://${trimmed}`
  }

  try {
    const parsed = new URL(trimmed)
    parsed.hostname = parsed.hostname.toLowerCase()
    let result = parsed.toString()
    // Strip trailing slash when the URL is just origin + "/"
    if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
      result = result.replace(/\/$/, '')
    }
    return result
  } catch {
    return trimmed
  }
}

export function getHostname(input: string): string {
  const normalized = normalizeUrl(input)
  try {
    const hostname = new URL(normalized).hostname
    return hostname.replace(/^www\./, '')
  } catch {
    return normalized.replace(/^www\./, '')
  }
}

const PRIVATE_IPV4_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
]

export function isValidTargetUrl(input: string): boolean {
  if (!input || typeof input !== 'string') return false

  const normalized = normalizeUrl(input)

  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    return false
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false

  const hostname = parsed.hostname.toLowerCase()

  if (hostname.length > 253) return false
  if (!hostname.includes('.')) return false
  if (hostname === 'localhost') return false
  if (hostname.endsWith('.local')) return false
  if (hostname.endsWith('.internal')) return false

  // Reject IPv6 literals (hostname would be enclosed in brackets or contain ':')
  if (hostname.includes(':') || (input.includes('[') && input.includes(']'))) return false

  // Reject raw IPv4 addresses in private/loopback/link-local ranges
  const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
  if (isIpv4) {
    if (PRIVATE_IPV4_PATTERNS.some((re) => re.test(hostname))) return false
  }

  return true
}
