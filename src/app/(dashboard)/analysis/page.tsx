'use client'

import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AlertCircle, CheckCircle2, Info, Target, Zap, Loader2, Bookmark, RotateCw } from 'lucide-react'
import type { AnalysisData } from '@/lib/types'
import { getHostname } from '@/lib/url'
import { getCachedAnalysis, setCachedAnalysis } from '@/lib/analysis-cache'
import { useLeads } from '@/hooks/use-leads'

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}

function AnalysisContent() {
  const searchParams = useSearchParams()
  const targetUrl = searchParams.get('url') || ''
  const titleParam = searchParams.get('title')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rateLimited, setRateLimited] = useState(false)
  const [data, setData] = useState<AnalysisData | null>(null)
  const [fromCache, setFromCache] = useState(false)

  const { save, update, isSaved, leads } = useLeads()

  const leadId = targetUrl ? getHostname(targetUrl) : ''
  const title = titleParam || (targetUrl ? getHostname(targetUrl) : '')

  const savedLead = useMemo(() => leads.find((l) => l.id === leadId), [leads, leadId])
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [notesDraft, setNotesDraft] = useState('')

  useEffect(() => {
    setNotesDraft(savedLead?.notes ?? '')
  }, [savedLead?.notes])

  const fetchData = async (bypassCache: boolean) => {
    if (!targetUrl) return
    setLoading(true)
    setError('')
    setRateLimited(false)
    setFromCache(false)

    if (!bypassCache) {
      const cached = getCachedAnalysis(targetUrl)
      if (cached) {
        setData(cached)
        setFromCache(true)
        setLoading(false)
        return
      }
    }

    try {
      const res = await fetch(`/api/pagespeed?url=${encodeURIComponent(targetUrl)}`)
      const result = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          setRateLimited(true)
          setError(result.error || 'Too many requests')
        } else {
          setError(result.error || 'Failed to fetch analysis')
        }
        return
      }

      setData(result.data as AnalysisData)
      setCachedAnalysis(targetUrl, result.data as AnalysisData)

      if (savedLead) {
        update(leadId, {
          opportunityScore: result.data.opportunity,
          performanceScore: result.data.mobile.scores.performance,
          seoScore: result.data.mobile.scores.seo,
          lastAnalyzedAt: result.data.fetchedAt,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUrl])

  if (!targetUrl) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        No URL provided for analysis. Go back and search for a lead.
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-center space-y-3">
        <p>
          {rateLimited ? 'Rate limited — wait a minute and retry.' : `Error analyzing ${targetUrl}: ${error}`}
        </p>
        <Button variant="outline" size="sm" onClick={() => fetchData(true)}>
          <RotateCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  if (loading || !data) {
    return <AnalysisSkeleton url={targetUrl} />
  }

  const isSavedLead = isSaved(leadId)

  const handleSave = () => {
    save({
      id: leadId,
      url: data.url,
      title,
      status: 'new',
      notes: '',
      opportunityScore: data.opportunity,
      performanceScore: data.mobile.scores.performance,
      seoScore: data.mobile.scores.seo,
      lastAnalyzedAt: data.fetchedAt,
    })
  }

  const handleNotesChange = (value: string) => {
    setNotesDraft(value)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => {
      update(leadId, { notes: value })
    }, 500)
  }

  const scores = [
    { name: 'Performance', value: data.mobile.scores.performance, icon: Zap, color: data.mobile.scores.performance < 50 ? 'text-red-500' : data.mobile.scores.performance < 90 ? 'text-yellow-500' : 'text-green-500' },
    { name: 'SEO Health', value: data.mobile.scores.seo, icon: Target, color: data.mobile.scores.seo < 80 ? 'text-yellow-500' : 'text-green-500' },
    { name: 'Best Practices', value: data.mobile.scores.bestPractices, icon: CheckCircle2, color: data.mobile.scores.bestPractices < 80 ? 'text-yellow-500' : 'text-green-500' },
  ]

  const desktopScores = data.desktop
    ? [
        { name: 'Performance', value: data.desktop.scores.performance, icon: Zap, color: data.desktop.scores.performance < 50 ? 'text-red-500' : data.desktop.scores.performance < 90 ? 'text-yellow-500' : 'text-green-500' },
        { name: 'SEO Health', value: data.desktop.scores.seo, icon: Target, color: data.desktop.scores.seo < 80 ? 'text-yellow-500' : 'text-green-500' },
        { name: 'Best Practices', value: data.desktop.scores.bestPractices, icon: CheckCircle2, color: data.desktop.scores.bestPractices < 80 ? 'text-yellow-500' : 'text-green-500' },
      ]
    : []

  // Rule-based recommendations
  const recommendations = {
    high: [] as { title: string, desc: string }[],
    medium: [] as { title: string, desc: string }[],
    low: [] as { title: string, desc: string }[]
  }

  if (data.mobile.scores.performance < 50) {
    recommendations.high.push({ title: 'Critical Page Speed Issues', desc: `Performance score is very low (${data.mobile.scores.performance}). FCP is ${data.mobile.metrics.fcp ?? 'N/A'}. Optimization is urgently required.` })
  } else if (data.mobile.scores.performance < 90) {
    recommendations.medium.push({ title: 'Improve Page Speed', desc: `Performance score is moderate (${data.mobile.scores.performance}). FCP is ${data.mobile.metrics.fcp ?? 'N/A'}. There is room for improvement.` })
  }

  if (data.mobile.scores.seo < 80) {
    recommendations.high.push({ title: 'SEO Fundamentals Missing', desc: `SEO score is ${data.mobile.scores.seo}. Check meta tags, mobile-friendliness, and indexing status.` })
  } else if (data.mobile.scores.seo < 100) {
    recommendations.low.push({ title: 'Minor SEO Tweaks', desc: 'Ensure all pages have unique titles and meta descriptions.' })
  }

  if (data.mobile.scores.bestPractices < 80) {
    recommendations.medium.push({ title: 'Web Best Practices', desc: `Score is ${data.mobile.scores.bestPractices}. Avoid deprecated APIs and ensure HTTPS is fully configured.` })
  }

  if (!data.flags.isHttps) {
    recommendations.high.push({ title: 'Site not on HTTPS', desc: 'The site is not served over HTTPS. This hurts trust, SEO ranking, and browser warnings will scare off visitors.' })
  }

  if (!data.flags.hasMetaDescription) {
    recommendations.medium.push({ title: 'Missing Meta Description', desc: 'The page is missing a meta description, which impacts click-through rate from search results.' })
  }

  if (recommendations.high.length === 0 && recommendations.medium.length === 0) {
    recommendations.low.push({ title: 'Excellent Health', desc: 'The website is performing excellently. Focus on off-page SEO and content marketing.' })
  }

  const overallScore = data.opportunity

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight break-all">{data.url.replace(/^https?:\/\//, '')}</h1>
            <Badge variant="outline" className="text-sm font-medium">
              {fromCache ? `Cached · ${timeAgo(data.fetchedAt)}` : 'Analyzed Just Now'}
            </Badge>
            {fromCache && (
              <Button variant="ghost" size="sm" onClick={() => fetchData(true)}>
                <RotateCw className="mr-2 h-4 w-4" /> Re-analyze
              </Button>
            )}
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <a href={data.url} target="_blank" rel="noreferrer" className="hover:underline hover:text-primary">
              {data.url}
            </a>
          </p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge variant={data.flags.isHttps ? 'secondary' : 'destructive'}>
              {data.flags.isHttps ? 'HTTPS' : 'No HTTPS'}
            </Badge>
            <Badge variant={data.flags.hasViewport ? 'secondary' : 'outline'}>
              {data.flags.hasViewport ? 'Viewport OK' : 'No Viewport Meta'}
            </Badge>
            <Badge variant={data.flags.hasMetaDescription ? 'secondary' : 'outline'}>
              {data.flags.hasMetaDescription ? 'Meta Description OK' : 'No Meta Description'}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-4 bg-background p-4 rounded-xl border shadow-sm">
            <div className="relative flex items-center justify-center h-20 w-20 rounded-full border-4 border-primary/20 bg-primary/5">
              <svg className="absolute top-0 left-0 h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-primary/10" />
                <circle cx="50" cy="50" r="46" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray={`${overallScore * 2.89} 289`} className="text-primary transition-all duration-1000 ease-in-out" />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-primary">
                <span className="text-2xl font-bold leading-none">{overallScore}</span>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Opportunity Score</div>
              <div className="text-sm mt-1">{overallScore > 70 ? 'High Potential' : overallScore > 40 ? 'Medium Potential' : 'Low Potential'}</div>
            </div>
          </div>
          <Button variant={isSavedLead ? 'secondary' : 'default'} onClick={handleSave} disabled={isSavedLead}>
            <Bookmark className="mr-2 h-4 w-4" /> {isSavedLead ? 'Saved ✓' : 'Save Lead'}
          </Button>
        </div>
      </div>

      {isSavedLead && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notesDraft}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add notes about this lead..."
              rows={3}
            />
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Zap className="h-5 w-5" />
            AI Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium leading-relaxed">
            Based on the Lighthouse analysis, {data.url.replace(/^https?:\/\//, '')} {overallScore > 70 ? 'represents a strong lead opportunity due to poor performance metrics.' : 'might be harder to sell to as their current technical foundation is decent.'} {recommendations.high.length > 0 ? `The most critical issues are ${recommendations.high[0].title.toLowerCase()}.` : ''}
          </p>
        </CardContent>
      </Card>

      {data.techHints.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Tech Stack</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.techHints.map((hint) => (
              <Badge key={hint} variant="secondary">{hint}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Lighthouse Breakdown</h2>
        <Tabs defaultValue="mobile">
          <TabsList>
            <TabsTrigger value="mobile">Mobile</TabsTrigger>
            <TabsTrigger value="desktop" disabled={!data.desktop}>Desktop{!data.desktop ? ' (unavailable)' : ''}</TabsTrigger>
          </TabsList>
          <TabsContent value="mobile" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {scores.map((score, i) => (
                <Card key={i} className="shadow-sm border-border/50">
                  <CardContent className="p-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <score.icon className={`h-5 w-5 ${score.color}`} />
                        <span className="font-medium text-sm">{score.name}</span>
                      </div>
                      <span className="font-bold">{score.value} / 100</span>
                    </div>
                    <Progress value={score.value} className={`h-1.5 ${score.value < 50 ? 'bg-red-200' : ''}`} />
                  </CardContent>
                </Card>
              ))}
            </div>
            <MetricsRow metrics={data.mobile.metrics} />
          </TabsContent>
          <TabsContent value="desktop" className="space-y-4 mt-4">
            {data.desktop ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {desktopScores.map((score, i) => (
                    <Card key={i} className="shadow-sm border-border/50">
                      <CardContent className="p-4 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <score.icon className={`h-5 w-5 ${score.color}`} />
                            <span className="font-medium text-sm">{score.name}</span>
                          </div>
                          <span className="font-bold">{score.value} / 100</span>
                        </div>
                        <Progress value={score.value} className={`h-1.5 ${score.value < 50 ? 'bg-red-200' : ''}`} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <MetricsRow metrics={data.desktop.metrics} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Desktop analysis was unavailable for this run.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Separator />

      <div>
        <h2 className="text-xl font-semibold mb-6">Prioritized Action Plan</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-semibold text-red-500">
              <AlertCircle className="h-5 w-5" /> High Impact
            </div>
            {recommendations.high.length > 0 ? recommendations.high.map((rec, i) => (
              <Card key={i} className="shadow-sm border-l-4 border-l-red-500">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">{rec.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
                  {rec.desc}
                </CardContent>
              </Card>
            )) : <p className="text-sm text-muted-foreground">No critical issues found.</p>}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 font-semibold text-yellow-500">
              <Info className="h-5 w-5" /> Medium Impact
            </div>
            {recommendations.medium.length > 0 ? recommendations.medium.map((rec, i) => (
              <Card key={i} className="shadow-sm border-l-4 border-l-yellow-500">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">{rec.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
                  {rec.desc}
                </CardContent>
              </Card>
            )) : <p className="text-sm text-muted-foreground">No medium warnings found.</p>}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 font-semibold text-blue-500">
              <Target className="h-5 w-5" /> Low Impact
            </div>
            {recommendations.low.length > 0 ? recommendations.low.map((rec, i) => (
              <Card key={i} className="shadow-sm border-l-4 border-l-blue-500">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">{rec.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
                  {rec.desc}
                </CardContent>
              </Card>
            )) : <p className="text-sm text-muted-foreground">No minor tweaks needed.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricsRow({ metrics }: { metrics: { fcp: string | null, lcp: string | null, cls: string | null, tbt: string | null, speedIndex: string | null } }) {
  const items = [
    { label: 'FCP', value: metrics.fcp },
    { label: 'LCP', value: metrics.lcp },
    { label: 'CLS', value: metrics.cls },
    { label: 'TBT', value: metrics.tbt },
    { label: 'Speed Index', value: metrics.speedIndex },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="shadow-sm border-border/50">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{item.label}</div>
            <div className="text-sm font-semibold mt-1">{item.value ?? 'N/A'}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function AnalysisSkeleton({ url }: { url: string }) {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-10 w-[300px]" />
          <Skeleton className="h-5 w-[200px]" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Analyzing Lighthouse metrics for {url} (this can take up to 20 seconds)...
          </div>
        </div>
        <Skeleton className="h-28 w-[250px] rounded-xl" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AnalysisContent />
    </Suspense>
  )
}
