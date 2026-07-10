import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SavedLead } from './types'

function createMockStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
}

describe('leads-store', () => {
  let dispatchEvent: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    const mockStorage = createMockStorage()
    dispatchEvent = vi.fn()
    vi.stubGlobal('localStorage', mockStorage)
    vi.stubGlobal('window', { localStorage: mockStorage, dispatchEvent })
  })

  const baseLead: Omit<SavedLead, 'savedAt' | 'updatedAt'> = {
    id: 'example.com',
    url: 'https://example.com',
    title: 'Example',
    status: 'new',
    notes: '',
    opportunityScore: 50,
    performanceScore: 60,
    seoScore: 70,
    lastAnalyzedAt: null,
  }

  it('saves a new lead (upsert insert)', async () => {
    const { saveLead, loadLeads } = await import('./leads-store')
    const result = saveLead(baseLead)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('example.com')
    expect(loadLeads()).toHaveLength(1)
    expect(dispatchEvent).toHaveBeenCalled()
  })

  it('upserts an existing lead by id', async () => {
    const { saveLead } = await import('./leads-store')
    saveLead(baseLead)
    const result = saveLead({ ...baseLead, title: 'Example Updated' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Example Updated')
  })

  it('updates a lead', async () => {
    const { saveLead, updateLead } = await import('./leads-store')
    saveLead(baseLead)
    const result = updateLead('example.com', { status: 'won', notes: 'great fit' })
    expect(result[0].status).toBe('won')
    expect(result[0].notes).toBe('great fit')
  })

  it('removes a lead', async () => {
    const { saveLead, removeLead } = await import('./leads-store')
    saveLead(baseLead)
    const result = removeLead('example.com')
    expect(result).toHaveLength(0)
  })

  it('recovers from corrupt JSON', async () => {
    const { loadLeads } = await import('./leads-store')
    localStorage.setItem('lead-scouter:leads:v1', '{not valid json')
    expect(loadLeads()).toEqual([])
  })

  it('recovers from wrong version', async () => {
    const { loadLeads } = await import('./leads-store')
    localStorage.setItem('lead-scouter:leads:v1', JSON.stringify({ version: 2, leads: [baseLead] }))
    expect(loadLeads()).toEqual([])
  })
})
