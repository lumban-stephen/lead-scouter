'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MapPin, Search, Loader2, Star, Phone, Globe } from 'lucide-react'
import { useLeads } from '@/hooks/use-leads'
import { getHostname, normalizeUrl } from '@/lib/url'
import { runBatch, type BatchItem } from '@/lib/batch-analyze'

interface LocalBusiness {
  title: string
  website: string | null
  rating: number | null
  reviews: number | null
  phone: string | null
  address: string | null
  type: string | null
}

export default function DiscoverPage() {
  const [businessType, setBusinessType] = useState('')
  const [location, setLocation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<LocalBusiness[]>([])
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [batchItems, setBatchItems] = useState<BatchItem[] | null>(null)
  const [batchRunning, setBatchRunning] = useState(false)
  const router = useRouter()
  const { save } = useLeads()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessType.trim() || !location.trim()) return

    setIsLoading(true)
    setError('')
    setResults([])
    setSelected(new Set())
    setBatchItems(null)

    try {
      const res = await fetch(
        `/api/serp-local?q=${encodeURIComponent(businessType.trim())}&location=${encodeURIComponent(location.trim())}`
      )
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to fetch results')

      setResults(data.data || [])
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
      .filter((r, i) => selected.has(i) && r.website)
      .map((r) => ({ url: normalizeUrl(r.website!), title: r.title }))

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

  const completedCount = batchItems?.filter((i) => i.status === 'done' || i.status === 'error').length ?? 0

  return (
    <div className="max-w-6xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MapPin className="h-7 w-7 text-primary" />
          Local Business Discovery
        </h1>
        <p className="text-muted-foreground mt-1">
          Find businesses by type and location, then analyze their websites for lead opportunities.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Business type (e.g. dentist, plumber)"
              className="h-12"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              disabled={isLoading}
            />
            <Input
              placeholder="Location (e.g. Austin TX, Miami FL)"
              className="h-12"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="lg"
              className="h-12 px-6 shrink-0"
              disabled={isLoading || !businessType.trim() || !location.trim()}
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              <span className="ml-2">Search</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-center">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-semibold">
              Found {results.length} businesses with websites
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

          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => (
                  <TableRow key={i} className={selected.has(i) ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selected.has(i)}
                        onChange={() => toggleSelected(i)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.title}</div>
                      {r.website && (
                        <a
                          href={r.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <Globe className="h-3 w-3" />
                          {getHostname(r.website)}
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{r.rating}</span>
                          {r.reviews && (
                            <span className="text-muted-foreground text-xs">({r.reviews})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.phone ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {r.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {r.address || '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!r.website}
                        onClick={() => router.push(`/analysis?url=${encodeURIComponent(r.website!)}&title=${encodeURIComponent(r.title)}`)}
                      >
                        Analyze
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </Table>
        </div>
      )}

      {batchItems && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Batch Analysis</h3>
            <span className="text-sm text-muted-foreground">{completedCount} of {batchItems.length} complete</span>
          </div>
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

      {!isLoading && results.length === 0 && !error && (
        <div className="text-center py-16 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Search for a business type and location to discover leads</p>
        </div>
      )}
    </div>
  )
}
