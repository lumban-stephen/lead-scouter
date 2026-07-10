'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLeads } from '@/hooks/use-leads'
import { toCsv } from '@/lib/csv'
import type { LeadStatus, SavedLead } from '@/lib/types'
import { Download, ExternalLink } from 'lucide-react'

const STATUS_OPTIONS: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

function statusBadgeVariant(status: LeadStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'won') return 'default'
  if (status === 'lost') return 'destructive'
  if (status === 'new') return 'outline'
  return 'secondary'
}

function opportunityBadge(score: number | null) {
  if (score === null) return <Badge variant="outline">N/A</Badge>
  if (score > 70) return <Badge variant="destructive">High</Badge>
  if (score > 40) return <Badge variant="secondary">Medium</Badge>
  return <Badge variant="outline">Low</Badge>
}

export default function LeadsPage() {
  const { leads, update, remove } = useLeads()
  const router = useRouter()
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({})

  const filteredLeads = useMemo(() => {
    if (filter === 'all') return leads
    return leads.filter((l) => l.status === filter)
  }, [leads, filter])

  const handleExport = () => {
    const rows = filteredLeads.map((lead) => ({
      title: lead.title,
      url: lead.url,
      status: lead.status,
      opportunityScore: lead.opportunityScore,
      performanceScore: lead.performanceScore,
      seoScore: lead.seoScore,
      notes: lead.notes,
      savedAt: lead.savedAt,
    }))

    const csv = toCsv(rows, [
      { key: 'title', header: 'Business' },
      { key: 'url', header: 'URL' },
      { key: 'status', header: 'Status' },
      { key: 'opportunityScore', header: 'Opportunity' },
      { key: 'performanceScore', header: 'Performance' },
      { key: 'seoScore', header: 'SEO' },
      { key: 'notes', header: 'Notes' },
      { key: 'savedAt', header: 'Saved At' },
    ])

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleNotesBlur = (lead: SavedLead) => {
    const draft = notesDraft[lead.id]
    if (draft !== undefined && draft !== lead.notes) {
      update(lead.id, { notes: draft })
    }
  }

  if (leads.length === 0) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center text-muted-foreground">
        <p>No saved leads yet. Analyze a website and save it to start building your pipeline.</p>
        <Button onClick={() => router.push('/')}>Find your first lead</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saved Leads</h1>
          <p className="text-sm text-muted-foreground">{filteredLeads.length} of {leads.length} leads</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
          All ({leads.length})
        </Button>
        {STATUS_OPTIONS.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
          >
            {status} ({leads.filter((l) => l.status === status).length})
          </Button>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead>Opportunity</TableHead>
            <TableHead>Perf</TableHead>
            <TableHead>SEO</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Saved</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLeads.map((lead) => (
            <>
              <TableRow key={lead.id}>
                <TableCell>
                  <div className="font-medium">{lead.title}</div>
                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {lead.id} <ExternalLink className="h-3 w-3" />
                  </a>
                </TableCell>
                <TableCell>{opportunityBadge(lead.opportunityScore)}</TableCell>
                <TableCell>{lead.performanceScore ?? 'N/A'}</TableCell>
                <TableCell>{lead.seoScore ?? 'N/A'}</TableCell>
                <TableCell>
                  <Select
                    value={lead.status}
                    onValueChange={(value) => update(lead.id, { status: value as LeadStatus })}
                  >
                    <SelectTrigger size="sm">
                      <SelectValue>
                        <Badge variant={statusBadgeVariant(lead.status)}>{lead.status}</Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="max-w-[160px] truncate">
                  <button
                    className="text-left w-full truncate hover:underline"
                    onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                  >
                    {lead.notes || <span className="text-muted-foreground">Add notes…</span>}
                  </button>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(lead.savedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(`/analysis?url=${encodeURIComponent(lead.url)}&title=${encodeURIComponent(lead.title)}`)
                      }
                    >
                      Re-analyze
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(lead.id)}>
                      Remove
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {expandedId === lead.id && (
                <TableRow key={`${lead.id}-expand`}>
                  <TableCell colSpan={8}>
                    <Textarea
                      autoFocus
                      defaultValue={lead.notes}
                      placeholder="Add notes about this lead..."
                      onChange={(e) => setNotesDraft((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                      onBlur={() => handleNotesBlur(lead)}
                      rows={3}
                    />
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
