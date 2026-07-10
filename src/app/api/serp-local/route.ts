import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit'

interface LocalResult {
  title: string
  website: string | null
  rating: number | null
  reviews: number | null
  phone: string | null
  address: string | null
  type: string | null
}

interface SerpApiLocalResult {
  title?: string
  website?: string
  rating?: number
  reviews?: number
  phone?: string
  address?: string
  type?: string
}

export function normalizeLocalResults(localResults: unknown): LocalResult[] {
  const results = Array.isArray(localResults)
    ? localResults
    : (localResults as { places?: unknown } | null)?.places

  if (!Array.isArray(results)) return []

  return results
    .filter((r): r is SerpApiLocalResult => Boolean((r as SerpApiLocalResult).website))
    .map((r) => ({
      title: r.title || '',
      website: r.website || null,
      rating: r.rating ?? null,
      reviews: r.reviews ?? null,
      phone: r.phone || null,
      address: r.address || null,
      type: r.type || null,
    }))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const location = searchParams.get('location')?.trim()

  if (!q || !location) {
    return NextResponse.json(
      { error: 'Missing q or location parameter' },
      { status: 400 }
    )
  }

  if (q.length < 2 || q.length > 100 || location.length < 2 || location.length > 100) {
    return NextResponse.json({ error: 'Invalid query or location' }, { status: 400 })
  }

  const ip = getClientIp(request)
  const rateLimit = checkRateLimit('serp-local', ip, 10, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    )
  }

  const apiKey = process.env.SERP_API_KEY
  if (!apiKey || apiKey === 'your_serp_api_key_here' || apiKey === 'test_key') {
    return NextResponse.json({ error: 'SERP_API_KEY not configured' }, { status: 500 })
  }

  const query = `${q} in ${location}`

  try {
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(query)}&type=search&api_key=${apiKey}`
    )

    if (!response.ok) {
      throw new Error(`SerpApi responded with status: ${response.status}`)
    }

    const data = await response.json()

    const localResults = normalizeLocalResults(data.local_results)

    return NextResponse.json({
      status: 'success',
      query,
      count: localResults.length,
      data: localResults,
    })
  } catch (error) {
    console.error('SERP Local API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch local results' }, { status: 502 })
  }
}
