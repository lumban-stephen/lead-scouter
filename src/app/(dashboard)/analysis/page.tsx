'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, CheckCircle2, Info, Target, Zap, Layout, FileText, Wrench, Loader2 } from 'lucide-react'

function AnalysisContent() {
  const searchParams = useSearchParams()
  const targetUrl = searchParams.get('url') || ''
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!targetUrl) return

    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/pagespeed?url=${encodeURIComponent(targetUrl)}`)
        const result = await res.json()

        if (!res.ok) throw new Error(result.error || 'Failed to fetch analysis')
        
        setData(result.data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
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
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-center">
        Error analyzing {targetUrl}: {error}
      </div>
    )
  }

  if (loading || !data) {
    return <AnalysisSkeleton url={targetUrl} />
  }

  const scores = [
    { name: 'Performance', value: data.scores.performance, icon: Zap, color: data.scores.performance < 50 ? 'text-red-500' : data.scores.performance < 90 ? 'text-yellow-500' : 'text-green-500' },
    { name: 'SEO Health', value: data.scores.seo, icon: Target, color: data.scores.seo < 80 ? 'text-yellow-500' : 'text-green-500' },
    { name: 'Best Practices', value: data.scores.bestPractices, icon: CheckCircle2, color: data.scores.bestPractices < 80 ? 'text-yellow-500' : 'text-green-500' },
  ]

  // Rule-based recommendations
  const recommendations = {
    high: [] as { title: string, desc: string }[],
    medium: [] as { title: string, desc: string }[],
    low: [] as { title: string, desc: string }[]
  }

  if (data.scores.performance < 50) {
    recommendations.high.push({ title: 'Critical Page Speed Issues', desc: `Performance score is very low (${data.scores.performance}). FCP is ${data.metrics.fcp}. Optimization is urgently required.` })
  } else if (data.scores.performance < 90) {
    recommendations.medium.push({ title: 'Improve Page Speed', desc: `Performance score is moderate (${data.scores.performance}). FCP is ${data.metrics.fcp}. There is room for improvement.` })
  }

  if (data.scores.seo < 80) {
    recommendations.high.push({ title: 'SEO Fundamentals Missing', desc: `SEO score is ${data.scores.seo}. Check meta tags, mobile-friendliness, and indexing status.` })
  } else if (data.scores.seo < 100) {
    recommendations.low.push({ title: 'Minor SEO Tweaks', desc: 'Ensure all pages have unique titles and meta descriptions.' })
  }

  if (data.scores.bestPractices < 80) {
    recommendations.medium.push({ title: 'Web Best Practices', desc: `Score is ${data.scores.bestPractices}. Avoid deprecated APIs and ensure HTTPS is fully configured.` })
  }

  if (recommendations.high.length === 0 && recommendations.medium.length === 0) {
    recommendations.low.push({ title: 'Excellent Health', desc: 'The website is performing excellently. Focus on off-page SEO and content marketing.' })
  }

  const overallScore = data.scores.opportunity

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight break-all">{data.url.replace(/^https?:\/\//, '')}</h1>
            <Badge variant="outline" className="text-sm font-medium">Analyzed Just Now</Badge>
          </div>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <a href={data.url} target="_blank" rel="noreferrer" className="hover:underline hover:text-primary">
              {data.url}
            </a>
          </p>
        </div>
        
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
      </div>

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

      <div>
        <h2 className="text-xl font-semibold mb-4">Lighthouse Breakdown</h2>
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

function AnalysisSkeleton({ url }: { url: string }) {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-10 w-[300px]" />
          <Skeleton className="h-5 w-[200px]" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Analyzing Lighthouse metrics (this can take up to 20 seconds)...
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
