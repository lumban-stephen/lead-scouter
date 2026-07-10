export function toCsv(
  rows: Record<string, string | number | null>[],
  columns: { key: string; header: string }[]
): string {
  function escapeField(value: string | number | null): string {
    const str = value === null || value === undefined ? '' : String(value)
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const headerRow = columns.map((c) => escapeField(c.header)).join(',')
  const dataRows = rows.map((row) => columns.map((c) => escapeField(row[c.key])).join(','))

  return [headerRow, ...dataRows].join('\r\n')
}
