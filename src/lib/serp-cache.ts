import type { SerpResult } from './types'

const CACHE_KEY = 'lead-scouter:serp-cache:v1'
const TTL_MS = 10 * 60 * 1000 // 10 minutes

interface SerpCacheEnvelope {
  version: 1
  entries: Record<string, { results: SerpResult[]; cachedAt: number }>
}

function readEnvelope(): SerpCacheEnvelope {
  if (typeof window === 'undefined') return { version: 1, entries: {} }
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY)
    if (!raw) return { version: 1, entries: {} }
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== 1 || typeof parsed.entries !== 'object') {
      return { version: 1, entries: {} }
    }
    return parsed as SerpCacheEnvelope
  } catch {
    return { version: 1, entries: {} }
  }
}

function writeEnvelope(envelope: SerpCacheEnvelope): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(envelope))
}

export function getCachedSerp(query: string): SerpResult[] | null {
  if (typeof window === 'undefined') return null
  const key = query.toLowerCase()
  const envelope = readEnvelope()
  const entry = envelope.entries[key]
  if (!entry) return null
  if (Date.now() - entry.cachedAt > TTL_MS) {
    delete envelope.entries[key]
    writeEnvelope(envelope)
    return null
  }
  return entry.results
}

export function setCachedSerp(query: string, results: SerpResult[]): void {
  if (typeof window === 'undefined') return
  const key = query.toLowerCase()
  const envelope = readEnvelope()
  envelope.entries[key] = { results, cachedAt: Date.now() }
  writeEnvelope(envelope)
}
