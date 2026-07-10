import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit'
import { isValidTargetUrl, normalizeUrl } from '@/lib/url'
import { computeOpportunityScore } from '@/lib/scoring'
import type { AnalysisData, CategoryScores, CwvMetrics, StrategyResult } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LighthouseAudits = Record<string, any>

function extractScores(lighthouse: { categories?: Record<string, { score?: number } | undefined> }): CategoryScores {
  const categories = lighthouse.categories || {}
  return {
    performance: Math.round((categories.performance?.score ?? 0) * 100),
    seo: Math.round((categories.seo?.score ?? 0) * 100),
    bestPractices: Math.round((categories['best-practices']?.score ?? 0) * 100),
  }
}

function extractMetrics(audits: LighthouseAudits): CwvMetrics {
  return {
    fcp: audits['first-contentful-paint']?.displayValue ?? null,
    lcp: audits['largest-contentful-paint']?.displayValue ?? null,
    cls: audits['cumulative-layout-shift']?.displayValue ?? null,
    tbt: audits['total-blocking-time']?.displayValue ?? null,
    speedIndex: audits['speed-index']?.displayValue ?? null,
  }
}

function extractTechHints(lighthouse: { audits?: LighthouseAudits; stackPacks?: { title: string }[] }): string[] {
  const hints: string[] = []
  try {
    const items = lighthouse.audits?.['js-libraries']?.details?.items || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of items as any[]) {
      hints.push(item.version ? `${item.name} ${item.version}` : item.name)
    }
    if (lighthouse.stackPacks) {
      for (const pack of lighthouse.stackPacks) {
        hints.push(pack.title)
      }
    }
  } catch {
    return []
  }
  return Array.from(new Set(hints)).slice(0, 8)
}

async function fetchStrategy(
  formattedUrl: string,
  apiKey: string,
  strategy: 'mobile' | 'desktop'
): Promise<{ result: StrategyResult; audits: LighthouseAudits; lighthouse: Record<string, unknown> }> {
  const response = await fetch(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(formattedUrl)}&key=${apiKey}&category=seo&category=performance&category=best-practices&strategy=${strategy}`
  )

  if (!response.ok) {
    throw new Error(`PageSpeed API responded with status: ${response.status}`)
  }

  const data = await response.json()
  const lighthouse = data.lighthouseResult

  if (!lighthouse || !lighthouse.categories) {
    throw new Error('Invalid Lighthouse result structure')
  }

  const audits: LighthouseAudits = lighthouse.audits || {}

  return {
    result: {
      scores: extractScores(lighthouse),
      metrics: extractMetrics(audits),
    },
    audits,
    lighthouse,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  if (!isValidTargetUrl(url)) {
    return NextResponse.json({ error: 'Invalid or disallowed URL' }, { status: 400 })
  }

  const ip = getClientIp(request)
  const rateLimit = checkRateLimit('pagespeed', ip, 8, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    )
  }

  const apiKey = process.env.PAGESPEED_API_KEY

  if (!apiKey || apiKey === 'your_pagespeed_api_key_here' || apiKey === 'test_key') {
    return NextResponse.json({ error: 'Valid PAGESPEED_API_KEY is not configured in the environment.' }, { status: 500 })
  }

  const formattedUrl = normalizeUrl(url)

  try {
    const [mobileSettled, desktopSettled] = await Promise.allSettled([
      fetchStrategy(formattedUrl, apiKey, 'mobile'),
      fetchStrategy(formattedUrl, apiKey, 'desktop'),
    ])

    if (mobileSettled.status === 'rejected') {
      console.error('PageSpeed API Error (mobile):', mobileSettled.reason)
      return NextResponse.json({ error: 'Failed to fetch PageSpeed data' }, { status: 502 })
    }

    const mobile = mobileSettled.value
    const desktop = desktopSettled.status === 'fulfilled' ? desktopSettled.value : null

    if (desktopSettled.status === 'rejected') {
      console.error('PageSpeed API Error (desktop):', desktopSettled.reason)
    }

    const finalUrl: string = mobile.lighthouse.finalDisplayedUrl as string || mobile.lighthouse.formattedUrl as string || formattedUrl
    const isHttps = String(finalUrl).startsWith('https://')
    const hasViewport = mobile.audits['viewport']?.score === 1
    const hasMetaDescription = mobile.audits['meta-description']?.score === 1

    const flags = { isHttps, hasViewport, hasMetaDescription }
    const opportunity = computeOpportunityScore(mobile.result.scores, flags)
    const techHints = extractTechHints(mobile.lighthouse)

    const data: AnalysisData = {
      url: finalUrl,
      fetchedAt: new Date().toISOString(),
      mobile: mobile.result,
      desktop: desktop ? desktop.result : null,
      opportunity,
      techHints,
      flags,
    }

    return NextResponse.json({
      status: 'success',
      data,
    })
  } catch (error) {
    console.error('PageSpeed API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch PageSpeed data' }, { status: 502 })
  }
}
