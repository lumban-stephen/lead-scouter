import { describe, it, expect } from 'vitest'
import { computeOpportunityScore } from './scoring'

describe('computeOpportunityScore', () => {
  it('gives a low score for a perfect site', () => {
    const score = computeOpportunityScore(
      { performance: 100, seo: 100, bestPractices: 100 },
      { isHttps: true, hasViewport: true, hasMetaDescription: true }
    )
    expect(score).toBeLessThan(20)
  })

  it('gives a high score for a terrible site', () => {
    const score = computeOpportunityScore(
      { performance: 20, seo: 40, bestPractices: 50 },
      { isHttps: false, hasViewport: false, hasMetaDescription: false }
    )
    expect(score).toBeGreaterThan(60)
  })

  it('clamps at 0 for an ideal site', () => {
    const score = computeOpportunityScore(
      { performance: 100, seo: 100, bestPractices: 100 },
      { isHttps: true, hasViewport: true, hasMetaDescription: true }
    )
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('clamps at 100 for a maximally bad site', () => {
    const score = computeOpportunityScore(
      { performance: 0, seo: 0, bestPractices: 0 },
      { isHttps: false, hasViewport: false, hasMetaDescription: false }
    )
    expect(score).toBeLessThanOrEqual(100)
    expect(score).toBe(100)
  })
})
