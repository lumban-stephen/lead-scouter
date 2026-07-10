'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Sparkles, Search, ArrowUpRight, Globe, Loader2 } from 'lucide-react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import type { SerpResult } from '@/lib/types'
import { getCachedSerp, setCachedSerp } from '@/lib/serp-cache'
import { runBatch, type BatchItem } from '@/lib/batch-analyze'
import { useLeads } from '@/hooks/use-leads'
import { getHostname } from '@/lib/url'
import { cn } from '@/lib/utils'

// Simple URL detection regex
const urlPattern = /^((http|https):\/\/)?(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(:\d+)?(\/.*)?$/

export default function DashboardPage() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<SerpResult[]>([])
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [batchItems, setBatchItems] = useState<BatchItem[] | null>(null)
  const [batchRunning, setBatchRunning] = useState(false)
  const router = useRouter()
  const { save } = useLeads()

  const container = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
    setSelected(new Set())
    setHighlightIndex(-1)
    setBatchItems(null)

    const cached = getCachedSerp(trimmedQuery)
    if (cached) {
      setResults(cached)
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/serp?q=${encodeURIComponent(trimmedQuery)}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to fetch results')

      setResults(data.data || [])
      setCachedSerp(trimmedQuery, data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch results')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSelected = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const selectAll = () => {
    setSelected(new Set(results.map((_, i) => i)))
  }

  const handleAnalyzeSelected = async () => {
    const items = results
      .filter((_, i) => selected.has(i))
      .map((r) => ({ url: r.link, title: r.title }))

    if (items.length === 0) return

    setBatchRunning(true)
    setBatchItems(items.map((item) => ({ ...item, status: 'pending' as const })))

    await runBatch(items, 2, (updated) => {
      setBatchItems(updated)
    })

    setBatchRunning(false)
  }

  const handleSaveBatchItem = (item: BatchItem) => {
    if (!item.data) return
    save({
      id: getHostname(item.data.url),
      url: item.data.url,
      title: item.title,
      status: 'new',
      notes: '',
      opportunityScore: item.data.opportunity,
      performanceScore: item.data.mobile.scores.performance,
      seoScore: item.data.mobile.scores.seo,
      lastAnalyzedAt: item.data.fetchedAt,
    })
  }

  // Keyboard shortcuts
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false
      const tag = target.tagName.toLowerCase()
      return tag === 'input' || tag === 'textarea' || target.isContentEditable
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && !isTypingTarget(document.activeElement)) {
        e.preventDefault()
        inputRef.current?.focus()
        return
      }

      if (e.key === 'Escape') {
        inputRef.current?.blur()
        setError('')
        return
      }

      if (results.length === 0) return
      if (isTypingTarget(document.activeElement)) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightIndex((prev) => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        if (highlightIndex >= 0 && highlightIndex < results.length) {
          const result = results[highlightIndex]
          router.push(`/analysis?url=${encodeURIComponent(result.link)}&title=${encodeURIComponent(result.title)}`)
        }
      } else if (e.key === 'x') {
        if (highlightIndex >= 0) toggleSelected(highlightIndex)
      } else if (e.key === 'a') {
        selectAll()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [results, highlightIndex, router])

  const hasSearched = results.length > 0 || isLoading || error !== ''
  const completedCount = batchItems?.filter((i) => i.status === 'done' || i.status === 'error').length ?? 0

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
                ref={inputRef}
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
        <p className="text-xs text-muted-foreground text-center mt-3">
          Press / to search &middot; &uarr;&darr; navigate &middot; Enter analyze &middot; x select
        </p>
      </div>

      {error && (
        <div className="mt-8 p-4 bg-destructive/10 text-destructive rounded-lg text-center animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-12 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-semibold flex items-center gap-2 opacity-90">
              <Globe className="h-5 w-5 text-primary" /> Top Search Results
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>Select all</Button>
              <Button
                size="sm"
                disabled={selected.size === 0 || batchRunning}
                onClick={handleAnalyzeSelected}
              >
                {batchRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Analyze selected ({selected.size})
              </Button>
            </div>
          </div>
          <div ref={resultsRef} className="grid gap-4 perspective-1000">
            {results.map((result, i) => (
              <Card
                key={i}
                className={cn(
                  'hover:border-primary/50 transition-colors bg-background/50 backdrop-blur-sm',
                  highlightIndex === i && 'ring-2 ring-primary'
                )}
              >
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 overflow-hidden">
                    <input
                      type="checkbox"
                      className="mt-1.5 h-4 w-4"
                      checked={selected.has(i)}
                      onChange={() => toggleSelected(i)}
                    />
                    <div className="space-y-1 overflow-hidden">
                      <h3 className="font-medium text-lg text-foreground truncate">{result.title}</h3>
                      <p className="text-sm text-primary truncate">
                        <a href={result.link} target="_blank" rel="noreferrer" className="hover:underline">
                          {result.link}
                        </a>
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{result.snippet}</p>
                    </div>
                  </div>
                  <Button
                    variant="default"
                    className="shrink-0 w-full sm:w-auto shadow-md"
                    onClick={() => router.push(`/analysis?url=${encodeURIComponent(result.link)}&title=${encodeURIComponent(result.title)}`)}
                  >
                    Analyze <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {batchItems && (
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Batch Analysis</h3>
            <span className="text-sm text-muted-foreground">{completedCount} of {batchItems.length} complete</span>
          </div>
          <Progress value={(completedCount / batchItems.length) * 100} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opportunity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batchItems.map((item) => (
                <TableRow key={item.url}>
                  <TableCell>{item.title}</TableCell>
                  <TableCell>
                    {item.status === 'pending' && <Badge variant="outline">Pending</Badge>}
                    {item.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {item.status === 'done' && <Badge variant="secondary">Done</Badge>}
                    {item.status === 'error' && <Badge variant="destructive">{item.error || 'Error'}</Badge>}
                  </TableCell>
                  <TableCell>{item.data ? item.data.opportunity : 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={item.status !== 'done'}
                        onClick={() => router.push(`/analysis?url=${encodeURIComponent(item.url)}&title=${encodeURIComponent(item.title)}`)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={item.status !== 'done'}
                        onClick={() => handleSaveBatchItem(item)}
                      >
                        Save
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
