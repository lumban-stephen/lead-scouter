import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  const apiKey = process.env.PAGESPEED_API_KEY

  if (!apiKey || apiKey === 'your_pagespeed_api_key_here' || apiKey === 'test_key') {
    return NextResponse.json({ error: 'Valid PAGESPEED_API_KEY is not configured in the environment.' }, { status: 500 })
  }

  // Ensure url has a protocol
  const formattedUrl = url.startsWith('http') ? url : `https://${url}`

  try {
    const response = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(formattedUrl)}&key=${apiKey}&category=seo&category=performance&category=best-practices&strategy=mobile`
    )
    
    if (!response.ok) {
      throw new Error(`PageSpeed API responded with status: ${response.status}`)
    }

    const data = await response.json()
    const lighthouse = data.lighthouseResult

    if (!lighthouse || !lighthouse.categories) {
      throw new Error('Invalid Lighthouse result structure')
    }

    const perfScore = Math.round((lighthouse.categories.performance?.score || 0) * 100)
    const seoScore = Math.round((lighthouse.categories.seo?.score || 0) * 100)
    const bpScore = Math.round((lighthouse.categories['best-practices']?.score || 0) * 100)
    
    // Simplistic mock opportunity score based on inverse performance and SEO
    const opportunityScore = Math.round(100 - ((perfScore + seoScore) / 2))

    const audits = lighthouse.audits || {}
    const fcp = audits['first-contentful-paint']?.displayValue || 'N/A'
    const lcp = audits['largest-contentful-paint']?.displayValue || 'N/A'

    return NextResponse.json({
      status: 'success',
      data: {
        url: formattedUrl,
        scores: {
          performance: perfScore,
          seo: seoScore,
          bestPractices: bpScore,
          opportunity: opportunityScore
        },
        metrics: {
          fcp,
          lcp
        }
      }
    })
  } catch (error: any) {
    console.error('PageSpeed API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch PageSpeed data', details: error.message }, { status: 500 })
  }
}
