import type { AnalysisData } from './types'
import { getHostname } from './url'

const CACHE_KEY = 'lead-scouter:analysis-cache:v1'
const TTL_MS = 60 * 60 * 1000 // 60 minutes
const MAX_ENTRIES = 25

interface CacheEnvelope {
  version: 1
  entries: Record<string, { data: AnalysisData; cachedAt: number }>
}

function readEnvelope(): CacheEnvelope {
  if (typeof window === 'undefined') return { version: 1, entries: {} }
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return { version: 1, entries: {} }
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== 1 || typeof parsed.entries !== 'object') {
      return { version: 1, entries: {} }
    }
    return parsed as CacheEnvelope
  } catch {
    return { version: 1, entries: {} }
  }
}

function writeEnvelope(envelope: CacheEnvelope): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(envelope))
}

export function getCachedAnalysis(url: string): AnalysisData | null {
  if (typeof window === 'undefined') return null
  const key = getHostname(url)
  const envelope = readEnvelope()
  const entry = envelope.entries[key]
  if (!entry) return null
  if (Date.now() - entry.cachedAt > TTL_MS) {
    delete envelope.entries[key]
    writeEnvelope(envelope)
    return null
  }
  return entry.data
}

export function setCachedAnalysis(url: string, data: AnalysisData): void {
  if (typeof window === 'undefined') return
  const key = getHostname(url)
  const envelope = readEnvelope()
  envelope.entries[key] = { data, cachedAt: Date.now() }

  const keys = Object.keys(envelope.entries)
  if (keys.length > MAX_ENTRIES) {
    const sorted = keys.sort((a, b) => envelope.entries[a].cachedAt - envelope.entries[b].cachedAt)
    const toEvict = sorted.slice(0, keys.length - MAX_ENTRIES)
    for (const k of toEvict) delete envelope.entries[k]
  }

  writeEnvelope(envelope)
}
