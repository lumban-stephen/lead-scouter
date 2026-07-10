import type { AnalysisData } from './types'
import { getCachedAnalysis, setCachedAnalysis } from './analysis-cache'

export type BatchItem = {
  url: string
  title: string
  status: 'pending' | 'running' | 'done' | 'error'
  data?: AnalysisData
  error?: string
}

export async function runBatch(
  items: { url: string; title: string }[],
  concurrency: number,
  onUpdate: (items: BatchItem[]) => void
): Promise<BatchItem[]> {
  const state: BatchItem[] = items.map((item) => ({ ...item, status: 'pending' }))
  onUpdate([...state])

  let cursor = 0

  async function worker() {
    while (cursor < state.length) {
      const index = cursor
      cursor += 1
      const item = state[index]
      item.status = 'running'
      onUpdate([...state])

      try {
        const cached = getCachedAnalysis(item.url)
        if (cached) {
          item.data = cached
          item.status = 'done'
        } else {
          const res = await fetch(`/api/pagespeed?url=${encodeURIComponent(item.url)}`)
          const result = await res.json()
          if (!res.ok) {
            item.status = 'error'
            item.error = result.error || 'Failed to analyze'
          } else {
            item.data = result.data as AnalysisData
            item.status = 'done'
            setCachedAnalysis(item.url, item.data)
          }
        }
      } catch (err) {
        item.status = 'error'
        item.error = err instanceof Error ? err.message : 'Failed to analyze'
      }

      onUpdate([...state])
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, state.length) }, () => worker())
  await Promise.all(workers)

  return state
}
