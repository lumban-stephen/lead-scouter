import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  if (!q) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 })
  }

  const apiKey = process.env.SERP_API_KEY

  if (!apiKey || apiKey === 'your_serp_api_key_here' || apiKey === 'test_key') {
    return NextResponse.json({ error: 'Valid SERP_API_KEY is not configured in the environment.' }, { status: 500 })
  }

  try {
    const response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(q)}&api_key=${apiKey}`)
    
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
    const results = (data.organic_results || [])
      .filter((result: any) => {
        if (!result.link) return false;
        const url = result.link.toLowerCase();
        return !blockedDomains.some(domain => url.includes(domain));
      })
      .slice(0, 5)
      .map((result: any) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
      }))

    return NextResponse.json({
      status: 'success',
      data: results
    })
  } catch (error: any) {
    console.error('SERP API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch SERP data', details: error.message }, { status: 500 })
  }
}
