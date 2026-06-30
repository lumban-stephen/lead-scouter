'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sparkles, Search, ArrowUpRight, Globe, Loader2 } from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

// Simple URL detection regex
const urlPattern = /^((http|https):\/\/)?(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(:\d+)?(\/.*)?$/

type SerpResult = {
  title: string
  link: string
  snippet: string
}

export default function DashboardPage() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<SerpResult[]>([])
  const [error, setError] = useState('')
  const router = useRouter()
  
  const container = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const tl = gsap.timeline()
    
    // Initial 3D-like entrance animation
    tl.fromTo(heroRef.current, 
      { y: 50, opacity: 0, rotateX: -15 }, 
      { y: 0, opacity: 1, rotateX: 0, duration: 1, ease: 'power3.out', transformPerspective: 1000 }
    )
    .fromTo(searchRef.current,
      { y: 30, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)' },
      '-=0.6'
    )
  }, { scope: container })

  // Trigger animation when results load
  useGSAP(() => {
    if (results.length > 0 && resultsRef.current) {
      gsap.fromTo(resultsRef.current.children, 
        { y: 40, opacity: 0, rotateX: -10 },
        { y: 0, opacity: 1, rotateX: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out', transformPerspective: 800 }
      )
    }
  }, { dependencies: [results], scope: container })

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    const trimmedQuery = query.trim()

    // 1. Detect if URL
    if (urlPattern.test(trimmedQuery)) {
      // It's a URL, go straight to analysis
      router.push(`/analysis?url=${encodeURIComponent(trimmedQuery)}`)
      return
    }

    // 2. Otherwise, it's a business name, search SERP
    setIsLoading(true)
    setError('')
    setResults([])

    try {
      const res = await fetch(`/api/serp?q=${encodeURIComponent(trimmedQuery)}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to fetch results')
      
      setResults(data.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const hasSearched = results.length > 0 || isLoading || error !== ''

  return (
    <div 
      ref={container} 
      className={`max-w-4xl mx-auto w-full flex flex-col transition-all duration-700 ease-in-out ${hasSearched ? 'pt-10' : 'h-full justify-center pb-20'}`}
    >
      <div ref={heroRef} className="text-center space-y-4 mb-12">
        <h1 className="text-5xl font-extrabold tracking-tight text-foreground drop-shadow-sm">
          Discover & Analyze <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-400">B2B Leads</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Enter a business name to discover their online presence, or enter a website URL to immediately generate an AI-powered SEO analysis.
        </p>
      </div>

      <div ref={searchRef} className="w-full relative z-10 perspective-1000">
        <Card className="shadow-2xl shadow-primary/5 border-primary/20 bg-background/80 backdrop-blur-md overflow-hidden transition-all duration-300 hover:shadow-primary/10">
          <CardContent className="p-2 sm:p-4">
            <form onSubmit={handleSearch} className="flex items-center gap-2 relative">
              <Search className="absolute left-4 h-6 w-6 text-muted-foreground" />
              <Input
                type="text"
                placeholder="e.g. Smile Dental Clinic OR smiledental.com.ph"
                className="h-16 pl-14 pr-32 text-lg rounded-xl border-none shadow-none focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/60"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="lg" 
                className="absolute right-2 h-12 px-8 rounded-lg text-base shadow-lg shadow-primary/20 transition-transform active:scale-95"
                disabled={isLoading || !query.trim()}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Search'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="mt-8 p-4 bg-destructive/10 text-destructive rounded-lg text-center animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-12 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 opacity-90">
            <Globe className="h-5 w-5 text-primary" /> Top Search Results
          </h2>
          <div ref={resultsRef} className="grid gap-4 perspective-1000">
            {results.map((result, i) => (
              <Card key={i} className="hover:border-primary/50 transition-colors bg-background/50 backdrop-blur-sm">
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 overflow-hidden">
                    <h3 className="font-medium text-lg text-foreground truncate">{result.title}</h3>
                    <p className="text-sm text-primary truncate">
                      <a href={result.link} target="_blank" rel="noreferrer" className="hover:underline">
                        {result.link}
                      </a>
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{result.snippet}</p>
                  </div>
                  <Button 
                    variant="default" 
                    className="shrink-0 w-full sm:w-auto shadow-md"
                    onClick={() => router.push(`/analysis?url=${encodeURIComponent(result.link)}`)}
                  >
                    Analyze <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!hasSearched && (
        <div className="mt-12 text-center opacity-60 hover:opacity-100 transition-opacity">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Paste a URL directly for instant analysis
          </p>
        </div>
      )}
    </div>
  )
}
