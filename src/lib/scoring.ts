import type { CategoryScores } from './types'

export function computeOpportunityScore(
  mobile: CategoryScores,
  flags: { isHttps: boolean; hasViewport: boolean; hasMetaDescription: boolean }
): number {
  let base = 100 - (0.5 * mobile.performance + 0.35 * mobile.seo + 0.15 * mobile.bestPractices)

  if (!flags.isHttps) base += 10
  if (!flags.hasViewport) base += 5
  if (!flags.hasMetaDescription) base += 5

  return Math.round(Math.min(100, Math.max(0, base)))
}
