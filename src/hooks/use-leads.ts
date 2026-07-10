'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SavedLead } from '@/lib/types'
import { isLeadSaved, loadLeads, removeLead, saveLead, updateLead } from '@/lib/leads-store'

type UpdatePatch = Partial<
  Pick<SavedLead, 'status' | 'notes' | 'opportunityScore' | 'performanceScore' | 'seoScore' | 'lastAnalyzedAt' | 'title'>
>

export function useLeads() {
  const [leads, setLeads] = useState<SavedLead[]>([])

  useEffect(() => {
    setLeads(loadLeads())

    const handleChange = () => setLeads(loadLeads())
    window.addEventListener('leads-changed', handleChange)
    return () => window.removeEventListener('leads-changed', handleChange)
  }, [])

  const save = useCallback((lead: Omit<SavedLead, 'savedAt' | 'updatedAt'>) => {
    setLeads(saveLead(lead))
  }, [])

  const update = useCallback((id: string, patch: UpdatePatch) => {
    setLeads(updateLead(id, patch))
  }, [])

  const remove = useCallback((id: string) => {
    setLeads(removeLead(id))
  }, [])

  const isSaved = useCallback(
    (id: string) => {
      return leads.some((l) => l.id === id) || isLeadSaved(id)
    },
    [leads]
  )

  return { leads, save, update, remove, isSaved }
}
