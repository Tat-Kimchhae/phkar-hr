export interface ReportColumn {
  key: string
  label: string
}

function cellText(value: unknown): string {
  if (typeof value === 'number') return String(value)
  const text = String(value ?? '')
  return /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text
}

function escapeCsv(value: unknown): string {
  return `"${cellText(value).replaceAll('"', '""')}"`
}

function escapeHtml(value: unknown): string {
  return cellText(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function exportReport(
  filename: string,
  format: 'csv' | 'xls',
  columns: ReportColumn[],
  rows: Record<string, unknown>[],
): void {
  const contents = format === 'csv'
    ? [
        columns.map(column => escapeCsv(column.label)).join(','),
        ...rows.map(row => columns.map(column => escapeCsv(row[column.key])).join(',')),
      ].join('\r\n')
    : [
        '<html><head><meta charset="utf-8"></head><body><table><thead><tr>',
        columns.map(column => `<th>${escapeHtml(column.label)}</th>`).join(''),
        '</tr></thead><tbody>',
        ...rows.map(row => `<tr>${columns.map(column => `<td>${escapeHtml(row[column.key])}</td>`).join('')}</tr>`),
        '</tbody></table></body></html>',
      ].join('')
  const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/vnd.ms-excel;charset=utf-8'
  const blob = new Blob([`\uFEFF${contents}`], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${filename}.${format}`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
