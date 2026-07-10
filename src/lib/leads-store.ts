import type { SavedLead } from './types'

export const LEADS_STORAGE_KEY = 'lead-scouter:leads:v1'

interface LeadsEnvelope {
  version: 1
  leads: SavedLead[]
}

function readEnvelope(): LeadsEnvelope {
  if (typeof window === 'undefined') return { version: 1, leads: [] }
  try {
    const raw = window.localStorage.getItem(LEADS_STORAGE_KEY)
    if (!raw) return { version: 1, leads: [] }
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.leads)) {
      return { version: 1, leads: [] }
    }
    return parsed as LeadsEnvelope
  } catch {
    return { version: 1, leads: [] }
  }
}

function writeEnvelope(envelope: LeadsEnvelope): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(envelope))
  window.dispatchEvent(new CustomEvent('leads-changed'))
}

export function loadLeads(): SavedLead[] {
  if (typeof window === 'undefined') return []
  return readEnvelope().leads
}

export function saveLead(lead: Omit<SavedLead, 'savedAt' | 'updatedAt'>): SavedLead[] {
  if (typeof window === 'undefined') return []
  const envelope = readEnvelope()
  const now = new Date().toISOString()
  const existingIndex = envelope.leads.findIndex((l) => l.id === lead.id)

  if (existingIndex >= 0) {
    const existing = envelope.leads[existingIndex]
    envelope.leads[existingIndex] = {
      ...existing,
      ...lead,
      savedAt: existing.savedAt,
      updatedAt: now,
    }
  } else {
    envelope.leads.push({
      ...lead,
      savedAt: now,
      updatedAt: now,
    })
  }

  writeEnvelope(envelope)
  return envelope.leads
}

export function updateLead(
  id: string,
  patch: Partial<
    Pick<
      SavedLead,
      'status' | 'notes' | 'opportunityScore' | 'performanceScore' | 'seoScore' | 'lastAnalyzedAt' | 'title'
    >
  >
): SavedLead[] {
  if (typeof window === 'undefined') return []
  const envelope = readEnvelope()
  const index = envelope.leads.findIndex((l) => l.id === id)
  if (index >= 0) {
    envelope.leads[index] = {
      ...envelope.leads[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    writeEnvelope(envelope)
  }
  return envelope.leads
}

export function removeLead(id: string): SavedLead[] {
  if (typeof window === 'undefined') return []
  const envelope = readEnvelope()
  envelope.leads = envelope.leads.filter((l) => l.id !== id)
  writeEnvelope(envelope)
  return envelope.leads
}

export function isLeadSaved(id: string): boolean {
  if (typeof window === 'undefined') return false
  return readEnvelope().leads.some((l) => l.id === id)
}
