import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit'
import type { SerpResult } from '@/lib/types'

interface SerpApiOrganicResult {
  title?: string
  link?: string
  snippet?: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawQ = searchParams.get('q')

  if (!rawQ) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 })
  }

  const q = rawQ.trim()
  const hasControlChars = /[\x00-\x1f]/.test(q)
  if (q.length < 2 || q.length > 200 || hasControlChars) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
  }

  const ip = getClientIp(request)
  const rateLimit = checkRateLimit('serp', ip, 10, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    )
  }

  const apiKey = process.env.SERP_API_KEY

  if (!apiKey || apiKey === 'your_serp_api_key_here' || apiKey === 'test_key') {
    return NextResponse.json({ error: 'Valid SERP_API_KEY is not configured in the environment.' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://serpapi.com/search.json?q=${encodeURIComponent(q)}&num=10&api_key=${apiKey}`
    )

    if (!response.ok) {
      throw new Error(`SerpApi responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Domains to filter out (social media, directories, news)
    const blockedDomains = [
      'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com',
      'tiktok.com', 'youtube.com', 'pinterest.com',
      'yelp.com', 'yellowpages.com', 'tripadvisor.com', 'foursquare.com',
      'zomato.com', 'manta.com', 'bbb.org', 'justdial.com', 'angi.com', 'thumbtack.com',
      'wikipedia.org', 'yahoo.com', 'msn.com', 'forbes.com', 'bloomberg.com', 'nytimes.com'
    ]

    // Extract top 5 organic results, filtering out blocked domains
    const results: SerpResult[] = (data.organic_results || [])
      .filter((result: SerpApiOrganicResult) => {
        if (!result.link) return false
        const url = result.link.toLowerCase()
        return !blockedDomains.some(domain => url.includes(domain))
      })
      .slice(0, 5)
      .map((result: SerpApiOrganicResult) => ({
        title: result.title || '',
        link: result.link || '',
        snippet: result.snippet || '',
      }))

    return NextResponse.json({
      status: 'success',
      data: results
    })
  } catch (error) {
    console.error('SERP API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch search results' }, { status: 502 })
  }
}
