export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'

export interface CategoryScores {
  performance: number   // 0-100
  seo: number
  bestPractices: number
}

export interface CwvMetrics {
  fcp: string | null    // displayValue, e.g. "1.2 s"
  lcp: string | null
  cls: string | null
  tbt: string | null
  speedIndex: string | null
}

export interface StrategyResult {
  scores: CategoryScores
  metrics: CwvMetrics
}

export interface AnalysisData {
  url: string                    // normalized final URL analyzed
  fetchedAt: string              // ISO timestamp (added server-side)
  mobile: StrategyResult
  desktop: StrategyResult | null // null if desktop fetch failed
  opportunity: number            // 0-100, higher = better sales opportunity
  techHints: string[]            // e.g. ["WordPress", "jQuery 3.6.0"]
  flags: {
    isHttps: boolean
    hasViewport: boolean         // from 'viewport' audit
    hasMetaDescription: boolean  // from 'meta-description' audit
  }
}

export interface SavedLead {
  id: string            // normalized hostname, e.g. "smiledental.com.ph"
  url: string
  title: string         // business/site name (fallback: hostname)
  snippet?: string
  status: LeadStatus
  notes: string
  opportunityScore: number | null
  performanceScore: number | null
  seoScore: number | null
  savedAt: string       // ISO
  updatedAt: string     // ISO
  lastAnalyzedAt: string | null
}

export interface SerpResult {
  title: string
  link: string
  snippet: string
}
