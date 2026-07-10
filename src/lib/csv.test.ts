import { describe, it, expect } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'note', header: 'Note' },
  ]

  it('includes a header row', () => {
    const csv = toCsv([], columns)
    expect(csv).toBe('Name,Note')
  })

  it('escapes commas', () => {
    const csv = toCsv([{ name: 'Acme, Inc', note: 'ok' }], columns)
    expect(csv).toContain('"Acme, Inc"')
  })

  it('escapes quotes by doubling them', () => {
    const csv = toCsv([{ name: 'Say "Hi"', note: 'ok' }], columns)
    expect(csv).toContain('"Say ""Hi"""')
  })

  it('escapes embedded newlines', () => {
    const csv = toCsv([{ name: 'Line1\nLine2', note: 'ok' }], columns)
    expect(csv).toContain('"Line1\nLine2"')
  })

  it('renders null as an empty string', () => {
    const csv = toCsv([{ name: 'Acme', note: null }], columns)
    const lines = csv.split('\r\n')
    expect(lines[1]).toBe('Acme,')
  })

  it('joins rows with CRLF', () => {
    const csv = toCsv(
      [
        { name: 'A', note: '1' },
        { name: 'B', note: '2' },
      ],
      columns
    )
    expect(csv).toBe('Name,Note\r\nA,1\r\nB,2')
  })
})
